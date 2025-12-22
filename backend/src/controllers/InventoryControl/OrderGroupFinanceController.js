import { Op } from "sequelize";


import { sequelize } from "../../database/connection.js";

import { Customer } from "../../models/Orders.js"; // ajusta
import { Order, OrderItem } from "../../models/Orders.js"; // ajusta
import { InventoryProduct } from "../../models/Inventory.js"; // ajusta

import { ItemGroup, ItemGroupItem, Payment,Income } from "../../models/Finance.js"; // ajusta
import { getHeaderToken,verifyJWT} from "../../libs/jwt.js";
const toNum = (v, def = 0) => {
    const n = Number(v ?? def);
    return Number.isFinite(n) ? n : def;
  };
  
  const isoDateOnly = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  };

  export const deleteGroupPayment = async (req, res) => {
    const { paymentId } = req.params;
  
    try {
      const token = getHeaderToken(req);
      await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const payment = await Payment.findByPk(paymentId, { transaction: t });
        if (!payment) return { status: 404, body: { message: "Pago no existe" } };
  
        // borrar income asociado
        await Income.destroy({
          where: { referenceType: "group_payment", referenceId: payment.id },
          transaction: t,
        });
  
        await payment.destroy({ transaction: t });
  
        return { status: 200, body: { mensaje: "Pago eliminado", paymentId: Number(paymentId) } };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("deleteGroupPayment:", error);
      return res.status(500).json({ message: "Error eliminando pago", error: String(error?.message || error) });
    }
  };
  
  export const updateGroupPayment = async (req, res) => {
    const { paymentId } = req.params;
    const { amount, date, note, method, status } = req.body;
  
    try {
      const token = getHeaderToken(req);
      await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const payment = await Payment.findByPk(paymentId, { transaction: t });
        if (!payment) return { status: 404, body: { message: "Pago no existe" } };
  
        if (amount != null) payment.amount = Number(Number(amount).toFixed(2));
        if (date != null) payment.date = new Date(date);
        if (note != null) payment.note = String(note);
        if (method != null) payment.method = String(method);
        if (status != null) payment.status = String(status);
  
        await payment.save({ transaction: t });
  
        // sincronizar Income
        const income = await Income.findOne({
          where: { referenceType: "group_payment", referenceId: payment.id },
          transaction: t,
        });
  
        if (income) {
          await income.update(
            {
              amount: Number(toNum(payment.amount).toFixed(2)),
              date: payment.date,
              concept: payment.note || `Abono grupo #${payment.groupId}`,
              status: payment.status === "completed" ? "paid" : "pending",
            },
            { transaction: t }
          );
        }
  
        return {
          status: 200,
          body: { mensaje: "Pago actualizado", pago: { id: payment.id, amount: payment.amount, status: payment.status } },
        };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("updateGroupPayment:", error);
      return res.status(500).json({ message: "Error actualizando pago", error: String(error?.message || error) });
    }
  };
    
  export const payItemGroup = async (req, res) => {
    const { groupId } = req.params;
    const { amount, date, note, method } = req.body;
  
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) return res.status(400).json({ message: "Monto inválido" });
  
    try {
      const token = getHeaderToken(req);
      const user = await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const group = await ItemGroup.findByPk(groupId, { transaction: t });
        if (!group) return { status: 404, body: { message: "Grupo no existe" } };
        if (group.status !== "open") return { status: 400, body: { message: "Grupo no está abierto" } };
  
        // items del grupo
        const links = await ItemGroupItem.findAll({ where: { groupId: group.id }, transaction: t });
        const itemIds = links.map((x) => x.orderItemId);
  
        if (itemIds.length === 0) {
          return { status: 400, body: { message: "El grupo no tiene items" } };
        }
  
        const items = await OrderItem.findAll({
          where: { id: { [Op.in]: itemIds } },
          attributes: ["id", "price", "quantity", "paidAt"],
          transaction: t,
        });
  
        const total = Number(items.reduce((sum, it) => sum + toNum(it.price) * toNum(it.quantity), 0).toFixed(2));
  
        const alreadyPaid = Number(
          ((await Payment.sum("amount", { where: { groupId: group.id, status: "completed" }, transaction: t })) || 0).toFixed(2)
        );
  
        const remaining = Number(Math.max(0, total - alreadyPaid).toFixed(2));
        if (payAmount > remaining + 0.0001) {
          return { status: 400, body: { message: `Abono excede saldo. Saldo: ${remaining}` } };
        }
  
        const paymentDate = date ? new Date(date) : new Date();
  
        // 1) Crear Payment
        const payment = await Payment.create(
          {
            customerId: group.customerId,
            groupId: group.id,
            date: paymentDate,
            amount: Number(payAmount.toFixed(2)),
            method: method || "efectivo",
            note: note || `Abono grupo #${group.id}`,
            status: "completed",
            createdBy: user.accountId,
          },
          { transaction: t }
        );
  
        // 2) Crear Income por ese Payment
        const income = await Income.create(
          {
            date: paymentDate,
            amount: Number(payAmount.toFixed(2)),
            concept: payment.note || `Abono grupo #${group.id}`,
            category: "Venta",
            status: "paid",
            referenceType: "group_payment",
            referenceId: payment.id,
            createdBy: user.accountId,
            counterpartyName: null,
          },
          { transaction: t }
        );
  
        const newPaid = Number((alreadyPaid + payAmount).toFixed(2));
        const newRemaining = Number(Math.max(0, total - newPaid).toFixed(2));
  
        let closed = false;
  
        if (newRemaining <= 0.0001) {
          // cerrar grupo
          group.status = "closed";
          await group.save({ transaction: t });
  
          // marcar items como pagados con fecha del ÚLTIMO pago
          for (const it of items) {
            if (!it.paidAt) {
              it.paidAt = paymentDate;
              await it.save({ transaction: t });
            }
          }
          closed = true;
        }
  
        return {
          status: 200,
          body: {
            mensaje: "Abono registrado",
            grupo: { id: group.id, status: group.status },
            pago: { paymentId: payment.id, incomeId: income.id, amount: Number(payAmount.toFixed(2)) },
            resumen: { total, abonadoAntes: alreadyPaid, abonadoAcumulado: newPaid, saldo: newRemaining, cerrado: closed },
          },
        };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("payItemGroup:", error);
      return res.status(500).json({ message: "Error registrando abono", error: String(error?.message || error) });
    }
  };
  
  export const moveItemBetweenGroups = async (req, res) => {
    const { orderItemId, toGroupId } = req.body; 
    // toGroupId = null => quitar del grupo
  
    if (!orderItemId) return res.status(400).json({ message: "orderItemId requerido" });
  
    try {
      const token = getHeaderToken(req);
      await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const current = await ItemGroupItem.findOne({ where: { orderItemId }, transaction: t });
  
        if (toGroupId == null) {
          // quitar
          if (!current) return { status: 200, body: { mensaje: "El item no estaba en ningún grupo" } };
          await current.destroy({ transaction: t });
          return { status: 200, body: { mensaje: "Item quitado del grupo", orderItemId } };
        }
  
        const group = await ItemGroup.findByPk(toGroupId, { transaction: t });
        if (!group) return { status: 404, body: { message: "Grupo destino no existe" } };
        if (group.status !== "open") return { status: 400, body: { message: "Solo puedes mover a un grupo abierto" } };
  
        // si ya estaba en un grupo, se actualiza (mover)
        if (current) {
          current.groupId = toGroupId;
          await current.save({ transaction: t });
          return { status: 200, body: { mensaje: "Item movido de grupo", orderItemId, toGroupId } };
        }
  
        // si no estaba, se crea
        await ItemGroupItem.create({ groupId: toGroupId, orderItemId }, { transaction: t });
        return { status: 201, body: { mensaje: "Item agregado al grupo", orderItemId, toGroupId } };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("moveItemBetweenGroups:", error);
      return res.status(500).json({ message: "Error moviendo item", error: String(error?.message || error) });
    }
  };
  
  export const deleteItemGroup = async (req, res) => {
    const { groupId } = req.params;
  
    try {
      const token = getHeaderToken(req);
      await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const group = await ItemGroup.findByPk(groupId, { transaction: t });
        if (!group) return { status: 404, body: { message: "Grupo no existe" } };
  
        const paymentsCount = await Payment.count({ where: { groupId: group.id, status: "completed" }, transaction: t });
        if (paymentsCount > 0) {
          return { status: 400, body: { message: "No se puede eliminar: el grupo ya tiene abonos" } };
        }
  
        await ItemGroupItem.destroy({ where: { groupId: group.id }, transaction: t });
        await group.destroy({ transaction: t });
  
        return { status: 200, body: { mensaje: "Grupo eliminado", groupId: Number(groupId) } };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("deleteItemGroup:", error);
      return res.status(500).json({ message: "Error eliminando grupo", error: String(error?.message || error) });
    }
  };
  
  export const updateItemGroup = async (req, res) => {
    const { groupId } = req.params;
    const { concept, status } = req.body; // status: open/closed/cancelled
  
    try {
      const token = getHeaderToken(req);
      await verifyJWT(token);
  
      const result = await sequelize.transaction(async (t) => {
        const group = await ItemGroup.findByPk(groupId, { transaction: t });
        if (!group) return { status: 404, body: { message: "Grupo no existe" } };
  
        if (concept != null) group.concept = String(concept);
        if (status != null) group.status = String(status);
  
        await group.save({ transaction: t });
  
        return {
          status: 200,
          body: { mensaje: "Grupo actualizado", grupo: { id: group.id, concept: group.concept, status: group.status } },
        };
      });
  
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("updateItemGroup:", error);
      return res.status(500).json({ message: "Error actualizando grupo", error: String(error?.message || error) });
    }
  };
  

export const createItemGroup = async (req, res) => {
  const { customerId, itemIds, concept } = req.body;

  if (!customerId || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ message: "customerId e itemIds son requeridos" });
  }

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      // validar items pertenecen a customerId
      const items = await OrderItem.findAll({
        where: { id: { [Op.in]: itemIds } },
        include: [{ model: Order, as: "ERP_order", attributes: ["id", "customerId"], where: { customerId } }],
        transaction: t,
      });

      if (items.length !== itemIds.length) {
        return { status: 400, body: { message: "Items inválidos o no pertenecen al cliente" } };
      }

      // evitar items en otro grupo
      const already = await ItemGroupItem.findAll({
        where: { orderItemId: { [Op.in]: itemIds } },
        transaction: t,
      });
      if (already.length > 0) {
        return {
          status: 400,
          body: {
            message: "Algunos items ya están en otro grupo",
            itemsEnGrupo: already.map((x) => ({ orderItemId: x.orderItemId, groupId: x.groupId })),
          },
        };
      }

      // snapshot total
      const total = Number(
        items.reduce((sum, it) => sum + toNum(it.quantity) * toNum(it.price), 0).toFixed(2)
      );

      const group = await ItemGroup.create(
        {
          customerId,
          concept: concept || `Grupo cliente #${customerId}`,
          totalAmount: total,
          status: "open",
          createdBy: user.accountId,
        },
        { transaction: t }
      );

      await ItemGroupItem.bulkCreate(
        itemIds.map((id) => ({ groupId: group.id, orderItemId: id })),
        { transaction: t }
      );

      return {
        status: 201,
        body: {
          mensaje: "Grupo creado",
          grupo: { id: group.id, customerId, concept: group.concept, status: group.status, totalAmount: total },
          itemsAgregados: itemIds,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("createItemGroup:", error);
    return res.status(500).json({ message: "Error creando grupo", error: String(error?.message || error) });
  }
};

export const getFinanceWorkbenchAll = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      // 1) Clientes + pedidos + items + producto
      const customers = await Customer.findAll({
        attributes: ["id", "name", "phone", "email"],
        include: [
          {
            model: Order,
            as: "ERP_orders",
            attributes: ["id", "customerId", "date", "createdAt"],
            include: [
              {
                model: OrderItem,
                as: "ERP_order_items",
                attributes: ["id", "orderId", "productId", "quantity", "price", "paidAt"],
                include: [
                  {
                    model: InventoryProduct,
                    as: "ERP_inventory_product",
                    attributes: ["id", "name"],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          ["name", "ASC"],
          [{ model: Order, as: "ERP_orders" }, "createdAt", "DESC"],
        ],
        transaction: t,
      });

      // 2) Grupos
      const groups = await ItemGroup.findAll({
        attributes: ["id", "customerId", "concept", "status", "totalAmount", "createdAt"],
        order: [["createdAt", "DESC"]],
        transaction: t,
      });

      // 3) Items de grupos (links)
      const groupItems = await ItemGroupItem.findAll({
        attributes: ["id", "groupId", "orderItemId"],
        transaction: t,
      });

      // ✅ Set: items agrupados
      const groupedItemIdSet = new Set(groupItems.map((x) => x.orderItemId));

      // ✅ Mapa: orderItemId -> groupId  (CLAVE para el frontend)
      const groupIdByItemId = new Map();
      for (const gi of groupItems) {
        groupIdByItemId.set(gi.orderItemId, gi.groupId);
      }

      // 4) Pagos/abonos de grupo
      const payments = await Payment.findAll({
        attributes: ["id", "groupId", "customerId", "date", "amount", "note", "status", "createdAt"],
        order: [["createdAt", "DESC"]],
        transaction: t,
      });

      // =========================
      // Formato EXACTO frontend
      // =========================

      // paidByGroupId (solo completed)
      const paidByGroupId = new Map();
      for (const p of payments) {
        if (p.status !== "completed") continue;
        paidByGroupId.set(
          p.groupId,
          Number(((paidByGroupId.get(p.groupId) || 0) + toNum(p.amount)).toFixed(2))
        );
      }

      // Mapa groupId -> [orderItemId]
      const itemsByGroupId = new Map();
      for (const gi of groupItems) {
        if (!itemsByGroupId.has(gi.groupId)) itemsByGroupId.set(gi.groupId, []);
        itemsByGroupId.get(gi.groupId).push(gi.orderItemId);
      }

      // Mapa itemId -> total (qty*price) tomado de customers->orders->items
      const itemTotals = new Map();
      for (const c of customers) {
        const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
        for (const o of ordersArr) {
          const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
          for (const it of itemsArr) {
            const total = Number((toNum(it.quantity) * toNum(it.price)).toFixed(2));
            itemTotals.set(it.id, total);
          }
        }
      }

      const outGroups = groups.map((g) => {
        const itemIds = itemsByGroupId.get(g.id) || [];
        const totalCalc = Number(
          itemIds.reduce((sum, id) => sum + toNum(itemTotals.get(id) || 0), 0).toFixed(2)
        );

        const paid = toNum(paidByGroupId.get(g.id) || 0);
        const remaining = Number(Math.max(0, totalCalc - paid).toFixed(2));

        return {
          id: g.id,
          customerId: g.customerId,
          concept: g.concept,
          status: g.status,
          createdAt: isoDateOnly(g.createdAt),
          totalAmount: totalCalc, // ✅ siempre real (recalculado)
          paidAmount: paid,
          remainingAmount: remaining,
          itemsCount: itemIds.length,
        };
      });

      const outPayments = payments.map((p) => ({
        id: p.id,
        groupId: p.groupId,
        customerId: p.customerId,
        date: isoDateOnly(p.date) || isoDateOnly(p.createdAt),
        amount: Number(toNum(p.amount).toFixed(2)),
        note: p.note ?? "",
        status: p.status,
      }));

      // Deuda por cliente = (saldo de grupos abiertos) + (items no pagados y NO agrupados)
      const debtByCustomerId = new Map();

      // (a) saldo de grupos
      for (const g of outGroups) {
        if (g.status !== "open") continue;
        if (toNum(g.remainingAmount) <= 0) continue;
        debtByCustomerId.set(
          g.customerId,
          Number(((debtByCustomerId.get(g.customerId) || 0) + toNum(g.remainingAmount)).toFixed(2))
        );
      }

      // (b) items sin pagar y no agrupados
      for (const c of customers) {
        const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
        let ungroupedPending = 0;

        for (const o of ordersArr) {
          const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
          for (const it of itemsArr) {
            if (it.paidAt) continue;
            if (groupedItemIdSet.has(it.id)) continue; // ✅ ya está en grupo
            ungroupedPending += toNum(it.quantity) * toNum(it.price);
          }
        }

        if (ungroupedPending > 0) {
          debtByCustomerId.set(
            c.id,
            Number(((debtByCustomerId.get(c.id) || 0) + ungroupedPending).toFixed(2))
          );
        }
      }

      // customers
      let outCustomers = customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        email: c.email ?? null,
        debtTotal: Number(toNum(debtByCustomerId.get(c.id) || 0).toFixed(2)),
      }));

      outCustomers.sort((a, b) => {
        const diff = toNum(b.debtTotal) - toNum(a.debtTotal);
        if (diff !== 0) return diff;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });

      // orders (🔥 aquí va la corrección: itemGroupId real)
      const outOrders = [];
      for (const c of customers) {
        const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
        for (const o of ordersArr) {
          const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
          outOrders.push({
            id: o.id,
            customerId: o.customerId ?? c.id,
            date: isoDateOnly(o.date) || isoDateOnly(o.createdAt),
            items: itemsArr.map((it) => {
              const gid = groupIdByItemId.get(it.id) || null;

              return {
                id: it.id,
                product: it.ERP_inventory_product?.name ?? "(sin nombre)",
                qty: toNum(it.quantity),
                price: toNum(it.price),
                paidAt: it.paidAt ? isoDateOnly(it.paidAt) : null,

                // ✅ IMPORTANTÍSIMO para el frontend
                inGroup: !!gid,
                itemGroupId: gid,
              };
            }),
          });
        }
      }

      return {
        customers: outCustomers,
        orders: outOrders,
        groups: outGroups,
        payments: outPayments,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("getFinanceWorkbenchAll:", error);
    return res.status(500).json({
      message: "Error al cargar Workbench",
      error: String(error?.message || error),
    });
  }
};

