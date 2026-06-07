import { Op } from "sequelize";
import { CashShift } from "../../models/CashShift.js";
import { Order, OrderItem } from "../../models/Orders.js";
import { Users } from "../../models/Users.js";
import { computeCashTotal, normalizeCashCounts } from "../../utils/shiftCashUtils.js";

const CAJA_POS_TAG = "[CAJA_POS]";
const to2 = (n) => Number(Number(n || 0).toFixed(2));
const ADMIN_ROLES = new Set(["Administrador", "Programador"]);

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

export async function getActiveShift(req, res) {
  try {
    const { accountId } = req.user;
    const shift = await findOpenShiftForAccount(accountId);
    if (!shift) return res.json(null);

    const orders = await getShiftPosOrders(shift.id);
    const sales = await sumOrderTotals(orders);
    const opening = Number(shift.openingCashTotal || 0);
    const expectedCash = to2(opening + sales.salesCash);

    res.json({
      ...shift.toJSON(),
      sales,
      expectedCashTotal: expectedCash,
      orderCount: orders.length,
    });
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

    res.json({
      ...shift.toJSON(),
      operatorName: userLabel(shift.user),
      sales,
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
    const opening = Number(shift.openingCashTotal || 0);
    const expectedCashTotal = to2(opening + sales.salesCash);
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
      closingNotes: notes || null,
    });

    res.json({
      message: "Turno cerrado correctamente.",
      shift,
      summary: {
        openingCashTotal: opening,
        ...sales,
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
