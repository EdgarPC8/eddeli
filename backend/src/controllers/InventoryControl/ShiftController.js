import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
import { CashShift } from "../../models/CashShift.js";
import { CashShiftMovement } from "../../models/CashShiftMovement.js";
import { Order, OrderItem, Customer } from "../../models/Orders.js";
import { Users } from "../../models/Users.js";
import { InventoryProduct, InventoryMovement } from "../../models/Inventory.js";
import { Expense } from "../../models/Finance.js";
import { computeCashTotal, normalizeCashCounts } from "../../utils/shiftCashUtils.js";

const CAJA_POS_TAG = "[CAJA_POS]";
const to2 = (n) => Number(Number(n || 0).toFixed(2));
const ADMIN_ROLES = new Set(["Administrador", "Programador"]);
const USER_LIST_ATTRS = ["id", "firstName", "firstLastName", "ci"];

const OUT_CATEGORIES = new Set(["gasto_operativo", "compra_mercancia", "retiro", "otro"]);
const IN_CATEGORIES = new Set(["entrada", "otro"]);
const EXPENSE_CATEGORIES = new Set(["gasto_operativo", "compra_mercancia"]);

const CATEGORY_EXPENSE_LABEL = {
  gasto_operativo: "Gastos operativos",
  compra_mercancia: "Compras",
};

function userLabel(user) {
  if (!user) return "—";
  const parts = [user.firstName, user.firstLastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (user.ci) return user.ci;
  return `Usuario #${user.id}`;
}

const billableQty = (item) => {
  const sold = Number(item.soldQty || 0);
  if (sold > 0) return sold;
  return Number(item.quantity || 0);
};

export async function findOpenShiftForAccount(accountId) {
  return CashShift.findOne({
    where: { accountId, status: "open" },
    order: [["openedAt", "DESC"]],
  });
}

async function sumOrderTotals(orders) {
  let salesCash = 0;
  let salesTransfer = 0;
  let salesCard = 0;
  let salesTotal = 0;

  for (const order of orders) {
    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const orderTotal = items.reduce(
      (acc, it) => acc + Number(it.price || 0) * billableQty(it),
      0,
    );
    const t = to2(orderTotal);
    salesTotal += t;
    const method = String(order.paymentMethod || "").toLowerCase();
    if (method === "transferencia") salesTransfer += t;
    else if (method === "tarjeta") salesCard += t;
    else salesCash += t;
  }

  return {
    salesCash: to2(salesCash),
    salesTransfer: to2(salesTransfer),
    salesCard: to2(salesCard),
    salesTotal: to2(salesTotal),
  };
}

async function getShiftPosOrders(shiftId) {
  return Order.findAll({
    where: {
      shiftId,
      status: "pagado",
      notes: { [Op.like]: `%${CAJA_POS_TAG}%` },
    },
    order: [["paidAt", "ASC"]],
  });
}

async function getShiftMovementsSummary(shiftId) {
  const movements = await CashShiftMovement.findAll({
    where: { shiftId },
    order: [["createdAt", "ASC"]],
  });

  let cashOut = 0;
  let cashIn = 0;
  for (const m of movements) {
    const amt = Number(m.amount || 0);
    if (m.direction === "out") cashOut += amt;
    else cashIn += amt;
  }

  return {
    movements,
    cashOut: to2(cashOut),
    cashIn: to2(cashIn),
  };
}

function computeExpectedCash(opening, salesCash, cashOut, cashIn) {
  return to2(opening + salesCash - cashOut + cashIn);
}

function validateMovementPayload({ direction, category, amount, concept, productId, quantity }) {
  if (!direction || !["out", "in"].includes(direction)) {
    return "Indica si es salida o entrada de efectivo.";
  }
  if (!category) return "Indica la categoría del movimiento.";
  if (direction === "out" && !OUT_CATEGORIES.has(category)) {
    return "Categoría no válida para salida de efectivo.";
  }
  if (direction === "in" && !IN_CATEGORIES.has(category)) {
    return "Categoría no válida para entrada de efectivo.";
  }
  const amt = Number(amount);
  if (!amt || amt <= 0) return "El monto debe ser mayor a cero.";
  const conceptTrim = String(concept || "").trim();
  if (!conceptTrim) return "Indica un concepto para el movimiento.";

  if (category === "compra_mercancia") {
    const hasProduct = productId != null && productId !== "";
    const hasQty = quantity != null && quantity !== "";
    if (hasProduct !== hasQty) {
      return "Para compra de mercancía indica producto y cantidad, o deja ambos vacíos.";
    }
    if (hasQty && Number(quantity) <= 0) {
      return "La cantidad debe ser mayor a cero.";
    }
  }

  return null;
}

async function registerInventoryPurchase({ productId, quantity, amount, concept, accountId, shiftMovementId, transaction }) {
  const product = await InventoryProduct.findByPk(productId, { transaction });
  if (!product) throw new Error("Producto no encontrado.");

  const qty = parseFloat(quantity);
  product.stock = parseFloat(product.stock || 0) + qty;
  await product.save({ transaction });

  const invMovement = await InventoryMovement.create(
    {
      productId,
      type: "entrada",
      reason: "ENTRADA_COMPRA",
      quantity: qty,
      description: concept,
      price: amount,
      referenceType: "cash_shift_movement",
      referenceId: shiftMovementId,
      createdBy: accountId,
      date: new Date(),
    },
    { transaction },
  );

  return invMovement;
}

async function registerExpenseForMovement({ category, amount, concept, accountId, referenceId, referenceType, transaction }) {
  if (!EXPENSE_CATEGORIES.has(category)) return null;

  return Expense.create(
    {
      date: new Date(),
      amount,
      concept,
      category: CATEGORY_EXPENSE_LABEL[category] || "Gastos",
      referenceId: referenceId ?? null,
      referenceType: referenceType ?? "cash_shift_movement",
      status: "paid",
      createdBy: accountId,
    },
    { transaction },
  );
}

function movementToJson(m) {
  return {
    id: m.id,
    shiftId: m.shiftId,
    direction: m.direction,
    category: m.category,
    amount: to2(m.amount),
    concept: m.concept,
    notes: m.notes,
    productId: m.productId,
    quantity: m.quantity != null ? Number(m.quantity) : null,
    createdAt: m.createdAt,
  };
}

async function buildShiftResponse(shift) {
  const orders = await getShiftPosOrders(shift.id);
  const sales = await sumOrderTotals(orders);
  const { movements, cashOut, cashIn } = await getShiftMovementsSummary(shift.id);
  const opening = Number(shift.openingCashTotal || 0);
  const expectedCash = computeExpectedCash(opening, sales.salesCash, cashOut, cashIn);

  return {
    ...shift.toJSON(),
    sales,
    cashMovements: {
      cashOut,
      cashIn,
      items: movements.map(movementToJson),
    },
    expectedCashTotal: expectedCash,
    orderCount: orders.length,
  };
}

export async function getActiveShift(req, res) {
  try {
    const { accountId } = req.user;
    const shift = await findOpenShiftForAccount(accountId);
    if (!shift) return res.json(null);

    res.json(await buildShiftResponse(shift));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getShifts(req, res) {
  try {
    const { accountId, loginRol } = req.user;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const where = ADMIN_ROLES.has(loginRol) ? {} : { accountId };

    const shifts = await CashShift.findAll({
      where,
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["id", "firstName", "firstLastName"],
        },
      ],
      order: [["openedAt", "DESC"]],
      limit,
    });

    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getShiftById(req, res) {
  try {
    const { accountId, loginRol } = req.user;
    const shift = await CashShift.findByPk(req.params.id, {
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["id", "firstName", "firstLastName"],
        },
      ],
    });
    if (!shift) return res.status(404).json({ message: "Turno no encontrado." });
    if (!ADMIN_ROLES.has(loginRol) && shift.accountId !== accountId) {
      return res.status(403).json({ message: "No autorizado." });
    }

    const orders = await getShiftPosOrders(shift.id);
    const sales = await sumOrderTotals(orders);
    const { movements, cashOut, cashIn } = await getShiftMovementsSummary(shift.id);

    res.json({
      ...shift.toJSON(),
      operatorName: userLabel(shift.user),
      sales,
      cashMovements: {
        cashOut,
        cashIn,
        items: movements.map(movementToJson),
      },
      orders: orders.map((o) => ({
        id: o.id,
        date: o.date,
        paidAt: o.paidAt,
        paymentMethod: o.paymentMethod,
        notes: o.notes,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getShiftMovements(req, res) {
  try {
    const { accountId, loginRol } = req.user;
    const shift = await CashShift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: "Turno no encontrado." });
    if (!ADMIN_ROLES.has(loginRol) && shift.accountId !== accountId) {
      return res.status(403).json({ message: "No autorizado." });
    }

    const { movements, cashOut, cashIn } = await getShiftMovementsSummary(shift.id);
    res.json({
      cashOut,
      cashIn,
      items: movements.map(movementToJson),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function createShiftMovement(req, res) {
  try {
    const { accountId, userId } = req.user;
    const { id } = req.params;
    const { direction, category, amount, concept, notes, productId, quantity } = req.body;

    const shift = await CashShift.findByPk(id);
    if (!shift) return res.status(404).json({ message: "Turno no encontrado." });
    if (shift.accountId !== accountId) {
      return res.status(403).json({ message: "Solo puedes registrar movimientos en tu turno." });
    }
    if (shift.status !== "open") {
      return res.status(400).json({ message: "El turno está cerrado; no se pueden agregar movimientos." });
    }

    const validationError = validateMovementPayload({
      direction,
      category,
      amount,
      concept,
      productId,
      quantity,
    });
    if (validationError) return res.status(400).json({ message: validationError });

    const amt = to2(amount);
    const conceptTrim = String(concept).trim();

    const movement = await sequelize.transaction(async (transaction) => {
      const row = await CashShiftMovement.create(
        {
          shiftId: shift.id,
          accountId,
          userId,
          direction,
          category,
          amount: amt,
          concept: conceptTrim,
          notes: notes?.trim() || null,
          productId: productId || null,
          quantity: quantity != null && quantity !== "" ? parseFloat(quantity) : null,
        },
        { transaction },
      );

      let inventoryMovementId = null;
      let expenseId = null;

      if (category === "compra_mercancia" && productId && quantity) {
        const invMovement = await registerInventoryPurchase({
          productId,
          quantity,
          amount: amt,
          concept: conceptTrim,
          accountId,
          shiftMovementId: row.id,
          transaction,
        });
        inventoryMovementId = invMovement.id;
      }

      const expense = await registerExpenseForMovement({
        category,
        amount: amt,
        concept: conceptTrim,
        accountId,
        referenceId: row.id,
        referenceType: "cash_shift_movement",
        transaction,
      });
      if (expense) expenseId = expense.id;

      if (inventoryMovementId || expenseId) {
        await row.update({ inventoryMovementId, expenseId }, { transaction });
      }

      return row;
    });

    const { cashOut, cashIn } = await getShiftMovementsSummary(shift.id);
    const orders = await getShiftPosOrders(shift.id);
    const sales = await sumOrderTotals(orders);
    const opening = Number(shift.openingCashTotal || 0);
    const expectedCashTotal = computeExpectedCash(opening, sales.salesCash, cashOut, cashIn);

    res.status(201).json({
      message: "Movimiento registrado.",
      movement: movementToJson(movement),
      summary: {
        cashOut,
        cashIn,
        expectedCashTotal,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function openShift(req, res) {
  try {
    const { accountId, userId } = req.user;
    const { cashCounts, notes } = req.body;

    const existing = await findOpenShiftForAccount(accountId);
    if (existing) {
      return res.status(400).json({
        message: "Ya tienes un turno abierto. Ciérralo antes de abrir otro.",
        shiftId: existing.id,
      });
    }

    const counts = normalizeCashCounts(cashCounts);
    const openingCashTotal = computeCashTotal(counts);
    if (openingCashTotal <= 0) {
      return res.status(400).json({
        message: "Ingresa el capital inicial (al menos una moneda o billete).",
      });
    }

    const shift = await CashShift.create({
      accountId,
      userId,
      status: "open",
      openedAt: new Date(),
      openingCashCounts: counts,
      openingCashTotal,
      openingNotes: notes || null,
    });

    res.status(201).json({
      message: "Turno abierto correctamente.",
      shift,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function closeShift(req, res) {
  try {
    const { accountId } = req.user;
    const { id } = req.params;
    const { cashCounts, notes } = req.body;

    const shift = await CashShift.findByPk(id);
    if (!shift) return res.status(404).json({ message: "Turno no encontrado." });
    if (shift.accountId !== accountId) {
      return res.status(403).json({ message: "Solo puedes cerrar tu propio turno." });
    }
    if (shift.status !== "open") {
      return res.status(400).json({ message: "Este turno ya está cerrado." });
    }

    const counts = normalizeCashCounts(cashCounts);
    const closingCashTotal = computeCashTotal(counts);

    const orders = await getShiftPosOrders(shift.id);
    const sales = await sumOrderTotals(orders);
    const { cashOut, cashIn } = await getShiftMovementsSummary(shift.id);
    const opening = Number(shift.openingCashTotal || 0);
    const expectedCashTotal = computeExpectedCash(opening, sales.salesCash, cashOut, cashIn);
    const cashDifference = to2(closingCashTotal - expectedCashTotal);

    await shift.update({
      status: "closed",
      closedAt: new Date(),
      closingCashCounts: counts,
      closingCashTotal,
      expectedCashTotal,
      cashDifference,
      salesCashTotal: sales.salesCash,
      salesTransferTotal: sales.salesTransfer,
      salesCardTotal: sales.salesCard,
      salesTotal: sales.salesTotal,
      cashOutTotal: cashOut,
      cashInTotal: cashIn,
      closingNotes: notes || null,
    });

    res.json({
      message: "Turno cerrado correctamente.",
      shift,
      summary: {
        openingCashTotal: opening,
        ...sales,
        cashOut,
        cashIn,
        expectedCashTotal,
        closingCashTotal,
        cashDifference,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

function parseDayRange(dateStr) {
  const value = String(dateStr || "").slice(0, 10);
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
  return {
    date: safe,
    dayStart: new Date(`${safe}T00:00:00`),
    dayEnd: new Date(`${safe}T23:59:59.999`),
  };
}

const billableQtyFromItem = (item) => {
  const sold = Number(item.soldQty || 0);
  if (sold > 0) return sold;
  return Number(item.quantity || 0);
};

function formatPosOrderItems(orderItems = []) {
  return orderItems.map((item) => {
    const qty = billableQtyFromItem(item);
    const price = Number(item.price || 0);
    const product = item.ERP_inventory_product;
    const lineTotal = to2(qty * price);
    return {
      id: item.id,
      productId: item.productId,
      name: product?.name || `Producto #${item.productId}`,
      quantity: qty,
      price,
      lineTotal,
    };
  });
}

function inferDocumentTypeFromNotes(notes) {
  const n = String(notes || "").toLowerCase();
  if (n.includes("consumidor final") || n.includes("mostrador sin datos")) {
    return "consumidor_final";
  }
  return "documento";
}

function shiftOpenedOnDay(shift, dayStart, dayEnd) {
  const opened = new Date(shift.openedAt);
  return opened >= dayStart && opened <= dayEnd;
}

function sumMovementAmounts(movements = []) {
  return to2(movements.reduce((acc, m) => acc + Number(m.amount || 0), 0));
}

function buildShiftDayMetrics(shiftId, salesRows, outflowRows, inflowRows) {
  let salesCashDay = 0;
  let salesTotalDay = 0;
  let ordersCountDay = 0;

  for (const sale of salesRows) {
    if (sale.shiftId !== shiftId) continue;
    ordersCountDay += 1;
    salesTotalDay += Number(sale.total || 0);
    const method = String(sale.paymentMethod || "").toLowerCase();
    if (method !== "transferencia" && method !== "tarjeta") {
      salesCashDay += Number(sale.total || 0);
    }
  }

  const cashOutDay = sumMovementAmounts(outflowRows.filter((m) => m.shiftId === shiftId));
  const cashInDay = sumMovementAmounts(inflowRows.filter((m) => m.shiftId === shiftId));

  return {
    salesCashDay: to2(salesCashDay),
    salesTotalDay: to2(salesTotalDay),
    cashOutDay,
    cashInDay,
    cashEnteredDay: to2(salesCashDay + cashInDay),
    ordersCountDay,
  };
}

function parseWeekRange(dateStr) {
  const { date, dayStart } = parseDayRange(dateStr);
  const d = new Date(dayStart);
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekStartDate = new Date(d);
  weekStartDate.setDate(d.getDate() + mondayOffset);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const dayKeys = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartDate);
    day.setDate(weekStartDate.getDate() + i);
    dayKeys.push(formatDateKey(day));
  }

  return {
    anchorDate: date,
    weekStart: formatDateKey(weekStartDate),
    weekEnd: formatDateKey(weekEndDate),
    weekStartDate,
    weekEndDate,
    dayKeys,
  };
}

function formatDateKey(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeClosingTotal(opening, sales) {
  return to2(Number(opening || 0) + Number(sales || 0));
}

function emptyDaySummary(date) {
  return {
    date,
    openingCashTotal: 0,
    closingCashTotal: 0,
    salesTotal: 0,
    salesCash: 0,
    salesTransfer: 0,
    salesCard: 0,
    cashOutTotal: 0,
    ordersCount: 0,
  };
}

function orderPaidDateKey(order) {
  return formatDateKey(order.paidAt || order.date);
}

function computeOrderTotalFromItems(order) {
  const items = order.ERP_order_items || [];
  return to2(
    items.reduce((acc, it) => acc + Number(it.price || 0) * billableQtyFromItem(it), 0),
  );
}

function addDaySummaries(target, source) {
  target.openingCashTotal = to2(target.openingCashTotal + source.openingCashTotal);
  target.closingCashTotal = to2(target.closingCashTotal + source.closingCashTotal);
  target.salesTotal = to2(target.salesTotal + source.salesTotal);
  target.salesCash = to2(target.salesCash + source.salesCash);
  target.salesTransfer = to2(target.salesTransfer + source.salesTransfer);
  target.salesCard = to2(target.salesCard + source.salesCard);
  target.cashOutTotal = to2(target.cashOutTotal + source.cashOutTotal);
  target.ordersCount += source.ordersCount;
}

/** GET /shifts/reports/weekly — resumen de 7 días (lunes a domingo). */
export async function getWeeklyShiftReport(req, res) {
  try {
    const { loginRol } = req.user;
    if (!ADMIN_ROLES.has(loginRol)) {
      return res.status(403).json({ message: "Solo administradores pueden ver el reporte semanal." });
    }

    const week = parseWeekRange(req.query.date);

    const [posOrders, shiftsInWeek, outflows] = await Promise.all([
      Order.findAll({
        where: {
          status: "pagado",
          notes: { [Op.like]: `%${CAJA_POS_TAG}%` },
          [Op.or]: [
            { paidAt: { [Op.between]: [week.weekStartDate, week.weekEndDate] } },
            { paidAt: null, date: { [Op.between]: [week.weekStartDate, week.weekEndDate] } },
          ],
        },
        include: [
          {
            model: OrderItem,
            as: "ERP_order_items",
            attributes: ["price", "quantity", "soldQty"],
          },
        ],
        attributes: ["id", "paidAt", "date", "paymentMethod"],
      }),
      CashShift.findAll({
        where: {
          openedAt: { [Op.between]: [week.weekStartDate, week.weekEndDate] },
        },
        attributes: ["openedAt", "openingCashTotal"],
      }),
      CashShiftMovement.findAll({
        where: {
          direction: "out",
          createdAt: { [Op.between]: [week.weekStartDate, week.weekEndDate] },
        },
        attributes: ["amount", "createdAt"],
      }),
    ]);

    const byDay = Object.fromEntries(week.dayKeys.map((k) => [k, emptyDaySummary(k)]));

    for (const order of posOrders) {
      const key = orderPaidDateKey(order);
      if (!byDay[key]) continue;
      const total = computeOrderTotalFromItems(order);
      const row = byDay[key];
      row.ordersCount += 1;
      row.salesTotal = to2(row.salesTotal + total);
      const method = String(order.paymentMethod || "").toLowerCase();
      if (method === "transferencia") row.salesTransfer = to2(row.salesTransfer + total);
      else if (method === "tarjeta") row.salesCard = to2(row.salesCard + total);
      else row.salesCash = to2(row.salesCash + total);
    }

    for (const shift of shiftsInWeek) {
      const openKey = formatDateKey(shift.openedAt);
      if (byDay[openKey]) {
        byDay[openKey].openingCashTotal = to2(
          byDay[openKey].openingCashTotal + Number(shift.openingCashTotal || 0),
        );
      }
    }

    for (const movement of outflows) {
      const key = formatDateKey(movement.createdAt);
      if (!byDay[key]) continue;
      byDay[key].cashOutTotal = to2(
        byDay[key].cashOutTotal + Number(movement.amount || 0),
      );
    }

    const days = week.dayKeys.map((key) => {
      const row = byDay[key];
      row.closingCashTotal = computeClosingTotal(row.openingCashTotal, row.salesTotal);
      const dt = new Date(`${key}T12:00:00`);
      row.weekday = dt.toLocaleDateString("es-EC", { weekday: "long" });
      row.weekdayShort = dt.toLocaleDateString("es-EC", { weekday: "short" });
      row.dateLabel = dt.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
      return row;
    });

    const summary = emptyDaySummary("week");
    for (const day of days) addDaySummaries(summary, day);

    res.json({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      anchorDate: week.anchorDate,
      days,
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/** GET /shifts/reports/daily — salidas y ventas POS de la fecha elegida (solo admin/programador). */
export async function getDailyShiftReport(req, res) {
  try {
    const { loginRol } = req.user;
    if (!ADMIN_ROLES.has(loginRol)) {
      return res.status(403).json({ message: "Solo administradores pueden ver el reporte diario." });
    }

    const { date: dateStr, dayStart, dayEnd } = parseDayRange(req.query.date);

    const [outflows, inflows, posOrders] = await Promise.all([
      CashShiftMovement.findAll({
        where: {
          direction: "out",
          createdAt: { [Op.between]: [dayStart, dayEnd] },
        },
        include: [
          {
            model: Users,
            as: "user",
            attributes: USER_LIST_ATTRS,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),
      CashShiftMovement.findAll({
        where: {
          direction: "in",
          createdAt: { [Op.between]: [dayStart, dayEnd] },
        },
        include: [
          {
            model: Users,
            as: "user",
            attributes: USER_LIST_ATTRS,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),
      Order.findAll({
        where: {
          status: "pagado",
          notes: { [Op.like]: `%${CAJA_POS_TAG}%` },
          [Op.or]: [
            { paidAt: { [Op.between]: [dayStart, dayEnd] } },
            { paidAt: null, date: { [Op.between]: [dayStart, dayEnd] } },
          ],
        },
        include: [
          { model: Customer, as: "ERP_customer", attributes: ["id", "name"] },
          {
            model: OrderItem,
            as: "ERP_order_items",
            include: [{ model: InventoryProduct, as: "ERP_inventory_product", attributes: ["id", "name"] }],
          },
          {
            model: CashShift,
            as: "shift",
            include: [
              {
                model: Users,
                as: "user",
                attributes: USER_LIST_ATTRS,
              },
            ],
          },
        ],
        order: [["paidAt", "ASC"], ["id", "ASC"]],
      }),
    ]);

    const shiftIdsFromActivity = new Set([
      ...outflows.map((m) => m.shiftId),
      ...inflows.map((m) => m.shiftId),
      ...posOrders.map((o) => o.shiftId).filter(Boolean),
    ]);

    const shiftsActiveOnDay = await CashShift.findAll({
      where: {
        openedAt: { [Op.lte]: dayEnd },
        [Op.or]: [
          { closedAt: { [Op.gte]: dayStart } },
          { closedAt: null },
        ],
      },
      include: [
        {
          model: Users,
          as: "user",
          attributes: USER_LIST_ATTRS,
        },
      ],
      order: [["openedAt", "ASC"]],
    });

    const shiftById = new Map(shiftsActiveOnDay.map((s) => [s.id, s]));
    const missingShiftIds = [...shiftIdsFromActivity].filter((id) => !shiftById.has(id));
    if (missingShiftIds.length) {
      const extraShifts = await CashShift.findAll({
        where: { id: { [Op.in]: missingShiftIds } },
        include: [
          {
            model: Users,
            as: "user",
            attributes: USER_LIST_ATTRS,
          },
        ],
      });
      for (const shift of extraShifts) shiftById.set(shift.id, shift);
    }

    const shifts = [...shiftById.values()].sort(
      (a, b) => new Date(a.openedAt) - new Date(b.openedAt),
    );

    let salesCash = 0;
    let salesTransfer = 0;
    let salesCard = 0;
    let salesTotal = 0;
    let cashOutTotal = 0;
    let cashInMovementsTotal = 0;

    const sales = posOrders.map((order) => {
      const items = formatPosOrderItems(order.ERP_order_items || []);
      const total = to2(items.reduce((acc, it) => acc + it.lineTotal, 0));
      salesTotal += total;
      const method = String(order.paymentMethod || "").toLowerCase();
      if (method === "transferencia") salesTransfer += total;
      else if (method === "tarjeta") salesCard += total;
      else salesCash += total;

      const shift = order.shift || shiftById.get(order.shiftId);
      const customer = order.ERP_customer;
      const docType = order.documentType || inferDocumentTypeFromNotes(order.notes);

      return {
        id: order.id,
        shiftId: order.shiftId,
        paidAt: order.paidAt || order.date,
        paymentMethod: order.paymentMethod,
        documentType: docType,
        customerName:
          docType === "consumidor_final"
            ? "Consumidor final"
            : customer?.name || "—",
        operatorName: userLabel(shift?.user),
        total,
        items,
      };
    });

    for (const movement of outflows) {
      cashOutTotal += Number(movement.amount || 0);
    }
    for (const movement of inflows) {
      cashInMovementsTotal += Number(movement.amount || 0);
    }

    const cashEnteredTotal = to2(salesCash + cashInMovementsTotal);

    const openingCashTotal = to2(
      shifts.reduce((acc, shift) => {
        if (!shiftOpenedOnDay(shift, dayStart, dayEnd)) return acc;
        return acc + Number(shift.openingCashTotal || 0);
      }, 0),
    );
    const closingCashTotal = computeClosingTotal(openingCashTotal, salesTotal);

    res.json({
      date: dateStr,
      summary: {
        shiftsCount: shifts.length,
        ordersCount: sales.length,
        openingCashTotal,
        closingCashTotal,
        salesTotal: to2(salesTotal),
        salesCash: to2(salesCash),
        salesTransfer: to2(salesTransfer),
        salesCard: to2(salesCard),
        cashOutTotal: to2(cashOutTotal),
        cashInMovementsTotal: to2(cashInMovementsTotal),
        cashEnteredTotal,
        outflowsCount: outflows.length,
        inflowsCount: inflows.length,
      },
      shifts: shifts.map((shift) => {
        const dayMetrics = buildShiftDayMetrics(shift.id, sales, outflows, inflows);
        const openedOnDay = shiftOpenedOnDay(shift, dayStart, dayEnd);
        const openingCashOnDay = openedOnDay ? to2(shift.openingCashTotal) : null;
        return {
          id: shift.id,
          status: shift.status,
          operatorName: userLabel(shift.user),
          openedAt: shift.openedAt,
          closedAt: shift.closedAt,
          openingCashOnDay,
          closingCashOnDay: computeClosingTotal(openingCashOnDay, dayMetrics.salesTotalDay),
          ...dayMetrics,
          cashDifference: shift.cashDifference != null ? to2(shift.cashDifference) : null,
        };
      }),
      outflows: outflows.map((m) => {
        const shift = shiftById.get(m.shiftId);
        return {
          id: m.id,
          shiftId: m.shiftId,
          createdAt: m.createdAt,
          category: m.category,
          concept: m.concept,
          amount: to2(m.amount),
          notes: m.notes,
          operatorName: userLabel(m.user || shift?.user),
        };
      }),
      inflows: inflows.map((m) => {
        const shift = shiftById.get(m.shiftId);
        return {
          id: m.id,
          shiftId: m.shiftId,
          createdAt: m.createdAt,
          category: m.category,
          concept: m.concept,
          amount: to2(m.amount),
          notes: m.notes,
          operatorName: userLabel(m.user || shift?.user),
        };
      }),
      sales,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function attachShiftToPosOrder(order, accountId, transaction) {
  const shift = await findOpenShiftForAccount(accountId);
  if (!shift) return null;
  await order.update({ shiftId: shift.id }, { transaction });
  return shift.id;
}
