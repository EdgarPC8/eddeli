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

    /** Solo para montos acumulados / guardados (2 dec). No usar para precio unitario antes de × cantidad. */
    const roundMoney = (x) => Number(Number(x || 0).toFixed(2));
    const EPS = 0.0001;
  
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: "Monto inválido" });
    }

    console.log("[payItemGroup] entrada", {
      groupId: Number(groupId),
      amountRaw: amount,
      payAmountParsed: payAmount,
      date,
      note,
      method,
    });
  
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
          // agrega aquí los campos que uses para el total real (dañado/yapa/etc)
          attributes: ["id", "price", "quantity", "paidAt", "damagedQty", "giftQty"],
          transaction: t,
        });
  
        // ✅ total basado en "vendido cobrable"
        // vendido = quantity - damagedQty - giftQty
        const itemLines = items.map((it) => {
          const qty = toNum(it.quantity);
          const damaged = toNum(it.damagedQty);
          const gift = toNum(it.giftQty);
          const billable = Math.max(0, qty - damaged - gift);
          const unitPrice = toNum(it.price);
          const lineTotal = roundMoney(billable * unitPrice);
          return {
            orderItemId: it.id,
            price: unitPrice,
            quantity: qty,
            damagedQty: damaged,
            giftQty: gift,
            billable,
            lineTotal,
            paidAt: it.paidAt ?? null,
          };
        });

        const total = roundMoney(itemLines.reduce((sum, row) => sum + row.lineTotal, 0));
  
        const alreadyPaid = roundMoney(
          (await Payment.sum("amount", { where: { groupId: group.id, status: "completed" }, transaction: t })) || 0
        );
  
        const remaining = roundMoney(Math.max(0, total - alreadyPaid));

        const diffPayMinusRemaining = roundMoney(payAmount - remaining);

        console.log("[payItemGroup] cálculo servidor", {
          groupId: group.id,
          customerId: group.customerId,
          EPS,
          itemLines,
          total,
          alreadyPaid,
          remaining,
          payAmountSolicitado: roundMoney(payAmount),
          diffPayMinusRemaining,
          remainingLteEps: remaining <= EPS,
          payExceedsRemaining: payAmount > remaining + EPS,
          rawTotalMinusPaid: total - alreadyPaid,
        });
  
        // =========================================================
        // ✅ 0) AUTOCIERRE: si por cambios el saldo ya es 0,
        //    cerramos sin crear un nuevo pago.
        // =========================================================
        if (remaining <= EPS) {
          console.log("[payItemGroup] autocierre (saldo ~0 en servidor, sin nuevo pago)", {
            groupId: group.id,
            payAmountSolicitado: roundMoney(payAmount),
            remaining,
            total,
            alreadyPaid,
          });
          // busca fecha del último pago (si existe)
          const lastPayment = await Payment.findOne({
            where: { groupId: group.id, status: "completed" },
            order: [["date", "DESC"], ["id", "DESC"]],
            attributes: ["date"],
            transaction: t,
          });
  
          const closeDate = lastPayment?.date ? new Date(lastPayment.date) : new Date();
  
          group.status = "closed";
          await group.save({ transaction: t });
  
          // marcar items como pagados si no tienen paidAt
          for (const it of items) {
            if (!it.paidAt) {
              it.paidAt = closeDate;
              await it.save({ transaction: t });
            }
          }
  
          return {
            status: 200,
            body: {
              mensaje: "Grupo ya estaba saldado por cambios en ítems. Se cerró y se marcaron items ✅",
              grupo: { id: group.id, status: group.status },
              resumen: { total, abonadoAcumulado: alreadyPaid, saldo: 0, cerrado: true },
            },
          };
        }
  
        // =========================================================
        // 1) Validar que el abono no exceda el saldo ACTUAL
        // =========================================================
        if (payAmount > remaining + EPS) {
          console.log("[payItemGroup] RECHAZADO abono excede saldo", {
            groupId: group.id,
            payAmountSolicitado: roundMoney(payAmount),
            remainingServidor: remaining,
            limitePermitido: roundMoney(remaining + EPS),
            delta: roundMoney(payAmount - remaining),
          });
          return { status: 400, body: { message: `Abono excede saldo. Saldo: ${remaining}` } };
        }
  
        const paymentDate = date ? new Date(date) : new Date();
  
        // 2) Crear Payment
        const payment = await Payment.create(
          {
            customerId: group.customerId,
            groupId: group.id,
            date: paymentDate,
            amount: roundMoney(payAmount),
            method: method || "efectivo",
            note: note || `Abono grupo #${group.id}`,
            status: "completed",
            createdBy: user.accountId,
          },
          { transaction: t }
        );
  
        // 3) Crear Income por ese Payment
        const income = await Income.create(
          {
            date: paymentDate,
            amount: roundMoney(payAmount),
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
  
        const newPaid = roundMoney(alreadyPaid + payAmount);
        const newRemaining = roundMoney(Math.max(0, total - newPaid));

        console.log("[payItemGroup] abono registrado OK", {
          groupId: group.id,
          paymentId: payment.id,
          monto: roundMoney(payAmount),
          total,
          alreadyPaidAntes: alreadyPaid,
          newPaid,
          newRemaining,
        });
  
        let closed = false;
  
        // 4) Cerrar si ya quedó en 0 con el abono
        if (newRemaining <= EPS) {
          group.status = "closed";
          await group.save({ transaction: t });
  
          for (const it of items) {
            if (!it.paidAt) {
              it.paidAt = paymentDate; // fecha del último pago
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
            pago: { paymentId: payment.id, incomeId: income.id, amount: roundMoney(payAmount) },
            resumen: { total, abonadoAntes: alreadyPaid, abonadoAcumulado: newPaid, saldo: newRemaining, cerrado: closed },
            closed,
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
  

export const addItemsToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { itemIds } = req.body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ message: "itemIds es requerido y debe ser un array no vacío" });
  }

  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      // 1) Validar que el grupo existe y está abierto
      const group = await ItemGroup.findByPk(groupId, { transaction: t });
      if (!group) return { status: 404, body: { message: "Grupo no existe" } };
      if (group.status !== "open") {
        return { status: 400, body: { message: "Solo se pueden agregar ítems a grupos abiertos" } };
      }

      // 2) Validar que los ítems pertenecen al mismo cliente que el grupo
      const items = await OrderItem.findAll({
        where: { id: { [Op.in]: itemIds } },
        include: [{ model: Order, as: "ERP_order", attributes: ["id", "customerId"] }],
        transaction: t,
      });

      if (items.length !== itemIds.length) {
        return { status: 400, body: { message: "Algunos ítems no existen" } };
      }

      // Verificar que todos pertenecen al mismo cliente del grupo
      const invalidItems = items.filter((it) => it.ERP_order?.customerId !== group.customerId);
      if (invalidItems.length > 0) {
        return {
          status: 400,
          body: {
            message: "Algunos ítems pertenecen a otro cliente",
            itemsInvalidos: invalidItems.map((it) => ({ orderItemId: it.id, customerId: it.ERP_order?.customerId })),
          },
        };
      }

      // 3) Evitar ítems que ya están en otro grupo (o en este mismo grupo)
      const already = await ItemGroupItem.findAll({
        where: { orderItemId: { [Op.in]: itemIds } },
        transaction: t,
      });

      if (already.length > 0) {
        const alreadyInThisGroup = already.filter((x) => x.groupId === Number(groupId));
        const alreadyInOtherGroup = already.filter((x) => x.groupId !== Number(groupId));

        if (alreadyInOtherGroup.length > 0) {
          return {
            status: 400,
            body: {
              message: "Algunos ítems ya están en otro grupo",
              itemsEnOtroGrupo: alreadyInOtherGroup.map((x) => ({ orderItemId: x.orderItemId, groupId: x.groupId })),
            },
          };
        }

        // Si ya están en este grupo, los filtramos para no duplicar
        const alreadyInThisGroupIds = new Set(alreadyInThisGroup.map((x) => x.orderItemId));
        const newItemIds = itemIds.filter((id) => !alreadyInThisGroupIds.has(id));

        if (newItemIds.length === 0) {
          return { status: 200, body: { mensaje: "Todos los ítems ya estaban en este grupo", itemsAgregados: [] } };
        }

        // Crear solo los nuevos
        await ItemGroupItem.bulkCreate(
          newItemIds.map((id) => ({ groupId: group.id, orderItemId: id })),
          { transaction: t }
        );

        return {
          status: 200,
          body: {
            mensaje: "Ítems agregados al grupo",
            grupo: { id: group.id, customerId: group.customerId, concept: group.concept },
            itemsAgregados: newItemIds,
            itemsYaEnGrupo: Array.from(alreadyInThisGroupIds),
          },
        };
      }

      // 4) Todos son nuevos, crear todos
      await ItemGroupItem.bulkCreate(
        itemIds.map((id) => ({ groupId: group.id, orderItemId: id })),
        { transaction: t }
      );

      return {
        status: 200,
        body: {
          mensaje: "Ítems agregados al grupo",
          grupo: { id: group.id, customerId: group.customerId, concept: group.concept },
          itemsAgregados: itemIds,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("addItemsToGroup:", error);
    return res.status(500).json({ message: "Error agregando ítems al grupo", error: String(error?.message || error) });
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
                attributes: ["id", "orderId", "productId", "quantity", "price", "paidAt",      "soldQty",
                "damagedQty",
                "giftQty",
                "replacedQty",],
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
        const pg = Number(p.groupId);
        if (!Number.isFinite(pg)) continue;
        paidByGroupId.set(
          pg,
          Number(((paidByGroupId.get(pg) || 0) + toNum(p.amount)).toFixed(2))
        );
      }

      // Mapa groupId -> [orderItemId]
      const itemsByGroupId = new Map();
      for (const gi of groupItems) {
        const gid = Number(gi.groupId);
        if (!Number.isFinite(gid)) continue;
        if (!itemsByGroupId.has(gid)) itemsByGroupId.set(gid, []);
        itemsByGroupId.get(gid).push(gi.orderItemId);
      }

      // Mapa itemId -> total cobrable (misma lógica que payItemGroup: billable × price)
      const itemTotals = new Map();
      for (const c of customers) {
        const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
        for (const o of ordersArr) {
          const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
          for (const it of itemsArr) {
            const qty = toNum(it.quantity);
            const billable = Math.max(0, qty - toNum(it.damagedQty) - toNum(it.giftQty));
            const total = Number((billable * toNum(it.price)).toFixed(2));
            itemTotals.set(it.id, total);
          }
        }
      }

      const outGroups = groups.map((g) => {
        const itemIds = itemsByGroupId.get(Number(g.id)) || [];
        const totalCalc = Number(
          itemIds.reduce((sum, id) => sum + toNum(itemTotals.get(id) || 0), 0).toFixed(2)
        );

        const paid = toNum(paidByGroupId.get(Number(g.id)) || 0);
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
            const qty = toNum(it.quantity);
            const billable = Math.max(0, qty - toNum(it.damagedQty) - toNum(it.giftQty));
            ungroupedPending += billable * toNum(it.price);
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
                soldQty:toNum(it.soldQty),
                damagedQty:toNum(it.damagedQty),
                giftQty:toNum(it.giftQty),
                replacedQty:toNum(it.replacedQty),

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

