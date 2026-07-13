import { Op } from "sequelize";
import { format } from "date-fns";
import { toAppDateTime, nowApp } from "../../utils/appDateTime.js";
import { es } from "date-fns/locale";
import { sequelize } from "../../database/connection.js";
import {
  Supplier,
  SupplierOrder,
  SupplierOrderItem,
} from "../../models/Orders.js";
import { InventoryProduct, InventoryMovement } from "../../models/Inventory.js";
import { Expense, SupplierOrderPayment } from "../../models/Finance.js";
import { getHeaderToken, verifyJWT } from "../../libs/jwt.js";

const toNum = (v, d = 0) => {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? n : d;
};

function parseRangeDate(value, endOfDay = false) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

function formatSupplierOrderBase(order) {
  return {
    ...order.toJSON(),
    orderKind: "supplier",
    date: format(new Date(order.date), "dd/MM/yyyy HH:mm:ss", { locale: es }),
    receivedAt: order.receivedAt
      ? format(new Date(order.receivedAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
      : null,
    paidAt: order.paidAt
      ? format(new Date(order.paidAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
      : null,
    createdAt: format(new Date(order.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es }),
    updatedAt: format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm:ss", { locale: es }),
  };
}

const orderIncludes = [
  { model: Supplier, as: "ERP_supplier" },
  {
    model: SupplierOrderItem,
    as: "ERP_supplier_order_items",
    include: [{ model: InventoryProduct, as: "ERP_inventory_product" }],
  },
];

function orderTotal(items = []) {
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  let sub = 0;
  let iva = 0;
  for (const it of items) {
    const line = toNum(it.quantity) * toNum(it.unitPrice);
    sub += line;
    iva += line * (toNum(it.taxRate) / 100);
  }
  return round2(round2(sub) + round2(iva));
}

/** Incluye total / abonado / saldo para abonos parciales desde el calendario. */
async function formatSupplierOrdersList(orders) {
  const list = Array.isArray(orders) ? orders : [];
  try {
    await SupplierOrderPayment.sync();
  } catch {
    /* ignore */
  }

  const ids = list.map((o) => o.id).filter(Boolean);
  const paidByOrderId = new Map();
  const paymentsByOrderId = new Map();

  if (ids.length > 0) {
    const payments = await SupplierOrderPayment.findAll({
      where: { supplierOrderId: { [Op.in]: ids }, status: "completed" },
      attributes: ["id", "supplierOrderId", "date", "amount", "method", "note", "status"],
      order: [["date", "DESC"]],
    });
    for (const p of payments) {
      const oid = Number(p.supplierOrderId);
      paidByOrderId.set(oid, Number(((paidByOrderId.get(oid) || 0) + toNum(p.amount)).toFixed(2)));
      if (!paymentsByOrderId.has(oid)) paymentsByOrderId.set(oid, []);
      paymentsByOrderId.get(oid).push({
        id: p.id,
        date: p.date ? format(new Date(p.date), "dd/MM/yyyy HH:mm:ss", { locale: es }) : null,
        amount: Number(toNum(p.amount).toFixed(2)),
        method: p.method || "efectivo",
        note: p.note || "",
        status: p.status,
      });
    }
  }

  return list.map((order) => {
    const base = formatSupplierOrderBase(order);
    const total = orderTotal(order.ERP_supplier_order_items || []);
    let paid = toNum(paidByOrderId.get(Number(order.id)) || 0);
    if (order.paidAt && paid <= 0 && total > 0) paid = total;
    const remaining =
      order.paidAt && paid >= total - 0.009
        ? 0
        : Number(Math.max(0, total - paid).toFixed(2));

    return {
      ...base,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      payments: paymentsByOrderId.get(Number(order.id)) || [],
    };
  });
}

export const getSupplierOrders = async (req, res) => {
  try {
    const fromDate = parseRangeDate(req.query.from, false);
    const toDate = parseRangeDate(req.query.to, true);
    const where = {};
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date[Op.gte] = fromDate;
      if (toDate) where.date[Op.lte] = toDate;
    }

    const rows = await SupplierOrder.findAll({
      where,
      include: orderIncludes,
      order: [["date", "DESC"]],
    });
    res.json(await formatSupplierOrdersList(rows));
  } catch (error) {
    console.error("getSupplierOrders:", error);
    res.status(500).json({ message: "Error al obtener pedidos a proveedor" });
  }
};

export const createSupplierOrder = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);
    const { supplierId, date, notes, items = [] } = req.body || {};

    if (!supplierId || !date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Proveedor, fecha e ítems son requeridos" });
    }

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) return res.status(404).json({ message: "Proveedor no encontrado" });

    const orderId = await sequelize.transaction(async (t) => {
      const order = await SupplierOrder.create(
        {
          supplierId: Number(supplierId),
          date: new Date(date),
          notes: notes || null,
          status: "pendiente",
        },
        { transaction: t }
      );

      for (const row of items) {
        const productId = Number(row.productId);
        const quantity = toNum(row.quantity);
        if (!productId || quantity <= 0) throw new Error("Ítem inválido en el pedido");
        const product = await InventoryProduct.findByPk(productId, { transaction: t });
        if (!product) throw new Error(`Producto #${productId} no encontrado`);

        await SupplierOrderItem.create(
          {
            orderId: order.id,
            productId,
            quantity,
            unitPrice: toNum(row.unitPrice ?? row.price ?? product.price, 0),
            taxRate: Math.max(0, toNum(row.taxRate, 0)),
          },
          { transaction: t }
        );
      }
      return order.id;
    });

    const full = await SupplierOrder.findByPk(orderId, { include: orderIncludes });
    res.status(201).json((await formatSupplierOrdersList([full]))[0]);
  } catch (error) {
    console.error("createSupplierOrder:", error);
    res.status(400).json({ message: error.message || "Error al crear pedido a proveedor" });
  }
};

export const updateSupplierOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, date, notes, items, receivedAt, paidAt } = req.body || {};
    const order = await SupplierOrder.findByPk(id);
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });

    const isReceived = Boolean(order.receivedAt);
    // Corrección manual de fechas (Programador): no re-dispara movimientos de stock.
    const hasDateOverride = receivedAt !== undefined || paidAt !== undefined;
    if (hasDateOverride) {
      const user = await verifyJWT(getHeaderToken(req));
      if (user?.loginRol !== "Programador") {
        return res
          .status(403)
          .json({ message: "Solo el rol Programador puede editar las fechas de entrega y pago" });
      }
    }
    if (isReceived && !hasDateOverride) {
      return res.status(400).json({ message: "No se puede editar un pedido ya recibido" });
    }

    await sequelize.transaction(async (t) => {
      await order.update(
        {
          ...(!isReceived && supplierId != null ? { supplierId: Number(supplierId) } : {}),
          ...(!isReceived && date ? { date: new Date(date) } : {}),
          ...(!isReceived && notes !== undefined ? { notes: notes || null } : {}),
          ...(receivedAt !== undefined ? { receivedAt: receivedAt ? new Date(receivedAt) : null } : {}),
          ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
        },
        { transaction: t }
      );

      if (!isReceived && Array.isArray(items)) {
        await SupplierOrderItem.destroy({ where: { orderId: order.id }, transaction: t });
        for (const row of items) {
          const productId = Number(row.productId);
          const quantity = toNum(row.quantity);
          if (!productId || quantity <= 0) throw new Error("Ítem inválido");
          await SupplierOrderItem.create(
            {
              orderId: order.id,
              productId,
              quantity,
              unitPrice: toNum(row.unitPrice ?? row.price, 0),
              taxRate: Math.max(0, toNum(row.taxRate, 0)),
            },
            { transaction: t }
          );
        }
      }
    });

    const full = await SupplierOrder.findByPk(id, { include: orderIncludes });
    res.json((await formatSupplierOrdersList([full]))[0]);
  } catch (error) {
    console.error("updateSupplierOrder:", error);
    res.status(400).json({ message: error.message || "Error al actualizar pedido" });
  }
};

/** POST /supplier-orders/:id/items — agregar línea a pedido proveedor pendiente. */
export const addSupplierOrderItem = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);
    const isPrivileged = ["Administrador", "Programador"].includes(user?.loginRol);
    if (!isPrivileged) {
      return res.status(403).json({
        message: "Solo Administrador o Programador pueden agregar productos al pedido",
      });
    }

    const order = await SupplierOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (order.receivedAt) {
      return res.status(400).json({ message: "No se pueden agregar productos a un pedido ya recibido" });
    }

    const productId = Number(req.body?.productId);
    const quantity = toNum(req.body?.quantity);
    const unitPrice = toNum(req.body?.unitPrice ?? req.body?.price, -1);
    if (!productId || quantity <= 0) {
      return res.status(400).json({ message: "Producto y cantidad válidos son requeridos" });
    }
    if (unitPrice < 0) {
      return res.status(400).json({ message: "Precio unitario inválido" });
    }

    const product = await InventoryProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    const item = await SupplierOrderItem.create({
      orderId: order.id,
      productId,
      quantity,
      unitPrice: unitPrice >= 0 ? unitPrice : toNum(product.distributorPrice ?? product.price, 0),
      taxRate: Math.max(0, toNum(req.body?.taxRate, 0)),
    });

    const full = await SupplierOrder.findByPk(order.id, { include: orderIncludes });
    res.status(201).json({
      message: "Producto agregado al pedido",
      item,
      order: (await formatSupplierOrdersList([full]))[0],
    });
  } catch (error) {
    console.error("addSupplierOrderItem:", error);
    res.status(500).json({ message: error.message || "Error al agregar producto" });
  }
};

export const deleteSupplierOrder = async (req, res) => {
  try {
    const order = await SupplierOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (order.receivedAt) {
      return res.status(400).json({ message: "No se puede eliminar un pedido ya recibido" });
    }
    await order.destroy();
    res.json({ message: "Pedido a proveedor eliminado" });
  } catch (error) {
    console.error("deleteSupplierOrder:", error);
    res.status(500).json({ message: "Error al eliminar pedido" });
  }
};

export const markSupplierOrderReceived = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);
    const order = await SupplierOrder.findByPk(req.params.id, {
      include: [{ model: SupplierOrderItem, as: "ERP_supplier_order_items" }],
    });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (order.receivedAt) {
      return res.status(400).json({ message: "El pedido ya fue marcado como recibido" });
    }

    const receivedAt = req.body?.receivedAt ? new Date(req.body.receivedAt) : new Date();

    await sequelize.transaction(async (t) => {
      for (const item of order.ERP_supplier_order_items || []) {
        const product = await InventoryProduct.findByPk(item.productId, { transaction: t });
        if (!product) continue;
        const qty = toNum(item.quantity);
        if (qty <= 0) continue;

        await product.update({ stock: toNum(product.stock) + qty }, { transaction: t });

        await InventoryMovement.create(
          {
            productId: product.id,
            type: "entrada",
            reason: "ENTRADA_COMPRA",
            quantity: qty,
            description: `Recepción pedido proveedor #${order.id}`,
            price: toNum(item.unitPrice) * qty,
            referenceType: "supplier_order",
            referenceId: order.id,
            createdBy: user.accountId,
            date: receivedAt,
          },
          { transaction: t }
        );
      }

      order.receivedAt = receivedAt;
      order.status = "recibido";
      await order.save({ transaction: t });
    });

    const full = await SupplierOrder.findByPk(order.id, { include: orderIncludes });
    res.json((await formatSupplierOrdersList([full]))[0]);
  } catch (error) {
    console.error("markSupplierOrderReceived:", error);
    res.status(500).json({ message: "Error al marcar pedido como recibido" });
  }
};

export const markSupplierOrderPaid = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);
    const { paymentMethod = "efectivo", paidAt } = req.body || {};

    const order = await SupplierOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: "ERP_supplier" },
        { model: SupplierOrderItem, as: "ERP_supplier_order_items" },
      ],
    });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    if (order.paidAt) {
      return res.status(400).json({ message: "El pedido ya fue marcado como pagado" });
    }

    const payDate = paidAt ? toAppDateTime(paidAt) : nowApp();
    const total = orderTotal(order.ERP_supplier_order_items || []);
    const supplierName = order.ERP_supplier?.name || "Proveedor";

    await sequelize.transaction(async (t) => {
      await SupplierOrderPayment.sync();

      const alreadyPaid = await SupplierOrderPayment.sum("amount", {
        where: { supplierOrderId: order.id, status: "completed" },
        transaction: t,
      });
      const remaining = Math.max(0, Number((total - toNum(alreadyPaid)).toFixed(2)));
      if (remaining <= 0.009) {
        order.paidAt = payDate;
        order.paymentMethod = paymentMethod;
        await order.save({ transaction: t });
        return;
      }

      const expense = await Expense.create(
        {
          date: payDate,
          amount: Number(remaining.toFixed(2)),
          concept: `Pago pedido proveedor #${order.id} — ${supplierName}`,
          category: "Compras",
          referenceType: "supplier_order_payment",
          referenceId: order.id,
          counterpartyName: supplierName,
          createdBy: user.accountId,
          status: "paid",
        },
        { transaction: t }
      );

      await SupplierOrderPayment.create(
        {
          supplierOrderId: order.id,
          supplierId: order.supplierId,
          date: payDate,
          amount: Number(remaining.toFixed(2)),
          method: paymentMethod,
          note: `Liquidación pedido #${order.id}`,
          status: "completed",
          expenseId: expense.id,
          createdBy: user.accountId,
        },
        { transaction: t }
      );

      order.paidAt = payDate;
      order.paymentMethod = paymentMethod;
      order.financeExpenseId = expense.id;
      await order.save({ transaction: t });
    });

    const full = await SupplierOrder.findByPk(order.id, { include: orderIncludes });
    res.json((await formatSupplierOrdersList([full]))[0]);
  } catch (error) {
    console.error("markSupplierOrderPaid:", error);
    res.status(500).json({ message: "Error al marcar pedido como pagado" });
  }
};
