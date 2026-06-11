import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
import { CashShift } from "../../models/CashShift.js";
import { CashShiftMovement } from "../../models/CashShiftMovement.js";
import { Order, OrderItem } from "../../models/Orders.js";
import { Users } from "../../models/Users.js";
import { InventoryProduct, InventoryMovement } from "../../models/Inventory.js";
import { Expense } from "../../models/Finance.js";
import { computeCashTotal, normalizeCashCounts } from "../../utils/shiftCashUtils.js";

const CAJA_POS_TAG = "[CAJA_POS]";
const to2 = (n) => Number(Number(n || 0).toFixed(2));
const ADMIN_ROLES = new Set(["Administrador", "Programador"]);

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
  return user.username || `Usuario #${user.id}`;
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

export async function attachShiftToPosOrder(order, accountId, transaction) {
  const shift = await findOpenShiftForAccount(accountId);
  if (!shift) return null;
  await order.update({ shiftId: shift.id }, { transaction });
  return shift.id;
}
