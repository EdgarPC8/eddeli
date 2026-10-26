/**
 * Sábado 24 oct 2026:
 * - Aplaza IDs: 139→141, 140→142, 141→143
 * - Cierra #138 solo el viernes
 * - Crea #139 Juliana 07:00–13:00 (72.85 + ventas 34.35+3.50)
 * - Crea #140 Propietario 13:05–15:05 (20 + 5.10 − egreso Almuerzo 4)
 */
import "dotenv/config";
import { sequelize } from "../src/database/connection.js";
import "../src/database/registerEdDeliModels.js";
import { InventoryMovement, InventoryProduct } from "../src/models/Inventory.js";
import { Customer, Order, OrderItem } from "../src/models/Orders.js";
import { Income, Expense } from "../src/models/Finance.js";
import { CashShift } from "../src/models/CashShift.js";
import { CashShiftMovement } from "../src/models/CashShiftMovement.js";
import {
  adjustStoreStock,
  alignOperationStoreToCatalogStock,
  getDefaultStockStoreId,
  getStoreStockQty,
  setStoreStockAbsolute,
  syncProductStockFromStores,
} from "../src/services/storeStockService.js";
import { consumeBatchesFefo } from "../src/services/batchStockService.js";
import { isMultiStockEnabled, loadAppSettings } from "../src/services/appSettingsService.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));
const emptyCounts = () => ({
  c_001: 0,
  c_005: 0,
  c_010: 0,
  c_025: 0,
  c_050: 0,
  c_100: 0,
  b_001: 0,
  b_005: 0,
  b_010: 0,
  b_020: 0,
  b_050: 0,
  b_100: 0,
});

/** Juliana sábado mañana $34.35 */
const JULIANA_CART_A = [
  { productId: 271, quantity: 1, price: 0.5 },
  { productId: 118, quantity: 8, price: 0.125 },
  { productId: 71, quantity: 8, price: 0.125 },
  { productId: 263, quantity: 1, price: 0.3 },
  { productId: 12, quantity: 3, price: 0.5 },
  { productId: 327, quantity: 1, price: 1 },
  { productId: 57, quantity: 10, price: 0.5 },
  { productId: 173, quantity: 1, price: 0.25 },
  { productId: 103, quantity: 2, price: 0.15 },
  { productId: 189, quantity: 2, price: 0.25 },
  { productId: 71, quantity: 24, price: 0.125 },
  { productId: 71, quantity: 8, price: 0.125 },
  { productId: 200, quantity: 4, price: 2.5 },
  { productId: 123, quantity: 4, price: 0.125 },
  { productId: 71, quantity: 4, price: 0.125 },
  { productId: 328, quantity: 1, price: 0.5 },
  { productId: 296, quantity: 1, price: 1 },
  { productId: 118, quantity: 8, price: 0.125 },
  { productId: 272, quantity: 1, price: 0.5 },
  { productId: 103, quantity: 2, price: 0.125 },
  { productId: 325, quantity: 2, price: 0.125 },
  { productId: 123, quantity: 2, price: 0.125 },
  { productId: 71, quantity: 2, price: 0.125 },
  { productId: 174, quantity: 1, price: 0.5 },
  { productId: 103, quantity: 4, price: 0.125 },
  { productId: 71, quantity: 4, price: 0.125 },
  { productId: 71, quantity: 8, price: 0.125 },
  { productId: 118, quantity: 8, price: 0.125 },
  { productId: 106, quantity: 5, price: 0.1 },
];

/** Juliana sábado $3.50 */
const JULIANA_CART_B = [
  { productId: 281, quantity: 1, price: 0.25 },
  { productId: 171, quantity: 1, price: 0.25 },
  { productId: 173, quantity: 1, price: 0.25 },
  { productId: 311, quantity: 1, price: 0.25 },
  { productId: 51, quantity: 8, price: 0.125 },
  { productId: 12, quantity: 2, price: 0.5 },
  { productId: 328, quantity: 1, price: 0.5 },
];

/** Propietario sábado tarde $5.10 */
const EDGAR_CART = [
  { productId: 57, quantity: 2, price: 0.5 },
  { productId: 118, quantity: 6, price: 0.125 },
  { productId: 71, quantity: 6, price: 0.125 },
  { productId: 35, quantity: 1, price: 1 },
  { productId: 210, quantity: 1, price: 0.25 },
  { productId: 103, quantity: 2, price: 0.125 },
  { productId: 325, quantity: 2, price: 0.125 },
  { productId: 123, quantity: 2, price: 0.125 },
  { productId: 71, quantity: 2, price: 0.125 },
  { productId: 190, quantity: 1, price: 0.35 },
];

function cartTotal(items) {
  return to2(items.reduce((s, r) => s + r.price * r.quantity, 0));
}

async function renameShiftId(fromId, toId, t) {
  await sequelize.query(`UPDATE ERP_orders SET shiftId = ? WHERE shiftId = ?`, {
    replacements: [toId, fromId],
    transaction: t,
  });
  await sequelize.query(`UPDATE ERP_cash_shift_movements SET shiftId = ? WHERE shiftId = ?`, {
    replacements: [toId, fromId],
    transaction: t,
  });
  await sequelize.query(`UPDATE ERP_cash_shifts SET id = ? WHERE id = ?`, {
    replacements: [toId, fromId],
    transaction: t,
  });
}

async function postPosSale({
  shift,
  accountId,
  items,
  saleAt,
  notesTag,
  transaction: t,
}) {
  const customer = await Customer.findOne({
    where: { name: "Consumidor Final" },
    transaction: t,
  });
  if (!customer) throw new Error("Falta Consumidor Final");

  const orderTotal = cartTotal(items);
  const existing = await Order.findOne({
    where: { shiftId: shift.id, notes: notesTag },
    transaction: t,
  });
  if (existing) throw new Error(`Ya existe venta con nota: ${notesTag}`);

  const order = await Order.create(
    {
      customerId: customer.id,
      notes: notesTag,
      date: saleAt,
      status: "pagado",
      shiftId: shift.id,
      cashRegisterId: shift.activeCashRegisterId || 1,
      sellerAccountId: accountId,
      paymentMethod: "efectivo",
      amountReceived: orderTotal,
      paidAt: saleAt,
      documentType: "consumidor_final",
      createdAt: saleAt,
      updatedAt: saleAt,
    },
    { transaction: t },
  );

  const multi = isMultiStockEnabled();
  const stockStoreId = multi
    ? shift.storeId || (await getDefaultStockStoreId({ transaction: t }))
    : await getDefaultStockStoreId({ transaction: t });

  for (const row of items) {
    const { productId, quantity, price } = row;
    const product = await InventoryProduct.findByPk(productId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) throw new Error(`Producto #${productId} no encontrado`);

    if (!multi) {
      await alignOperationStoreToCatalogStock(productId, Number(product.stock || 0), {
        transaction: t,
      });
      await product.reload({ transaction: t });
    }

    const available = await getStoreStockQty(stockStoreId, productId, { transaction: t });
    if (available < quantity) {
      const targetAbs = to2(Number(available) + Number(quantity));
      await setStoreStockAbsolute(stockStoreId, productId, targetAbs, {
        transaction: t,
        allowNegative: false,
      });
      await InventoryMovement.create(
        {
          productId,
          quantity: targetAbs,
          type: "ajuste",
          reason: "AJUSTE_ENTRADA",
          referenceType: "caja_stock_adjust",
          referenceId: null,
          date: saleAt,
          createdBy: accountId,
          description: `Autocompletar stock desde caja · turno #${shift.id} (pedido #${order.id})`,
          price: null,
          createdAt: saleAt,
          updatedAt: saleAt,
        },
        { transaction: t },
      );
      await product.reload({ transaction: t });
    }

    await adjustStoreStock(stockStoreId, productId, -quantity, {
      transaction: t,
      allowNegative: false,
    });
    await product.reload({ transaction: t });

    try {
      await consumeBatchesFefo({
        productId,
        quantity,
        storeId: stockStoreId,
        transaction: t,
      });
    } catch (e) {
      console.warn("FEFO", product.name, e?.message || e);
    }

    await InventoryMovement.create(
      {
        productId,
        quantity,
        type: "salida",
        reason: "SALIDA_VENTA",
        referenceType: "order",
        referenceId: order.id,
        date: saleAt,
        createdBy: accountId,
        description: `Venta POS · pedido #${order.id} · local #${stockStoreId}`,
        createdAt: saleAt,
        updatedAt: saleAt,
      },
      { transaction: t },
    );

    const orderItem = await OrderItem.create(
      {
        orderId: order.id,
        productId,
        quantity,
        price,
        soldQty: quantity,
        deliveredAt: saleAt,
        paidAt: saleAt,
        createdAt: saleAt,
        updatedAt: saleAt,
      },
      { transaction: t },
    );

    await Income.create(
      {
        date: saleAt,
        amount: to2(price * quantity),
        concept: `Venta POS ${product.name} x${quantity} (Ord #${order.id})`,
        category: "Venta",
        referenceType: "order_item",
        referenceId: orderItem.id,
        status: "paid",
        createdBy: accountId,
        createdAt: saleAt,
        updatedAt: saleAt,
      },
      { transaction: t },
    );
  }

  return { orderId: order.id, orderTotal };
}

async function main() {
  await loadAppSettings();

  const totalA = cartTotal(JULIANA_CART_A);
  const totalB = cartTotal(JULIANA_CART_B);
  const totalE = cartTotal(EDGAR_CART);
  if (Math.abs(totalA - 34.35) > 0.009) throw new Error(`Cart A ${totalA} != 34.35`);
  if (Math.abs(totalB - 3.5) > 0.009) throw new Error(`Cart B ${totalB} != 3.50`);
  if (Math.abs(totalE - 5.1) > 0.009) throw new Error(`Cart E ${totalE} != 5.10`);

  const out = await sequelize.transaction(async (t) => {
    await sequelize.query("SET FOREIGN_KEY_CHECKS=0", { transaction: t });

    // --- Aplazar domingo/lunes: 141→143, 140→142, 139→141 ---
    const s141 = await CashShift.findByPk(141, { transaction: t });
    const s140 = await CashShift.findByPk(140, { transaction: t });
    const s139 = await CashShift.findByPk(139, { transaction: t });
    if (!s141 || !s140 || !s139) throw new Error("Faltan turnos 139/140/141 para aplazar");
    if (await CashShift.findByPk(143, { transaction: t })) {
      throw new Error("ID 143 ya existe; script ya corrido?");
    }

    await renameShiftId(141, 143, t);
    await renameShiftId(140, 142, t);
    await renameShiftId(139, 141, t);

    // --- Fix viernes #138 ---
    const s138 = await CashShift.findByPk(138, { transaction: t, lock: t.LOCK.UPDATE });
    if (!s138) throw new Error("Turno 138 no encontrado");
    await s138.update(
      {
        closedAt: new Date("2026-10-23T20:00:00"),
        closingNotes: "Cierre viernes (corregido; sábado se registra aparte)",
        updatedAt: new Date(),
      },
      { transaction: t },
    );

    // --- Crear #139 Juliana sábado ---
    const julianaSales = to2(totalA + totalB);
    const julianaOpen = 72.85;
    const julianaExpected = to2(julianaOpen + julianaSales);
    const shift139 = await CashShift.create(
      {
        id: 139,
        accountId: 250,
        userId: 1195,
        storeId: 6,
        activeCashRegisterId: 1,
        status: "closed",
        openedAt: new Date("2026-10-24T07:00:00"),
        closedAt: new Date("2026-10-24T13:00:00"),
        openingCashCounts: emptyCounts(),
        openingCashTotal: julianaOpen,
        closingCashCounts: emptyCounts(),
        closingCashTotal: julianaExpected,
        expectedCashTotal: julianaExpected,
        cashDifference: 0,
        salesCashTotal: julianaSales,
        salesTransferTotal: 0,
        salesCardTotal: 0,
        salesTotal: julianaSales,
        cashOutTotal: 0,
        cashInTotal: 0,
        openingNotes: "Apertura sábado 7:00 · capital $72.85",
        closingNotes: "Cierre sábado 13:00 · ventas anotadas registradas luego",
        createdAt: new Date("2026-10-24T07:00:00"),
        updatedAt: new Date("2026-10-24T13:00:00"),
      },
      { transaction: t },
    );

    const saleA = await postPosSale({
      shift: shift139,
      accountId: 250,
      items: JULIANA_CART_A,
      saleAt: new Date("2026-10-24T10:15:00"),
      notesTag:
        "[CAJA_POS] [CONTADO] Venta mostrador sin datos de cliente (consumidor final) · Backfill sábado Juliana $34.35",
      transaction: t,
    });
    const saleB = await postPosSale({
      shift: shift139,
      accountId: 250,
      items: JULIANA_CART_B,
      saleAt: new Date("2026-10-24T11:40:00"),
      notesTag:
        "[CAJA_POS] [CONTADO] Venta mostrador sin datos de cliente (consumidor final) · Backfill sábado Juliana $3.50",
      transaction: t,
    });

    // --- Crear #140 Propietario sábado tarde ---
    const edgarSales = totalE;
    const edgarOpen = 20;
    const edgarCashOut = 4;
    const edgarExpected = to2(edgarOpen + edgarSales - edgarCashOut);
    const shift140 = await CashShift.create(
      {
        id: 140,
        accountId: 1,
        userId: 1,
        storeId: 6,
        activeCashRegisterId: 1,
        status: "closed",
        openedAt: new Date("2026-10-24T13:05:00"),
        closedAt: new Date("2026-10-24T15:05:00"),
        openingCashCounts: emptyCounts(),
        openingCashTotal: edgarOpen,
        closingCashCounts: emptyCounts(),
        closingCashTotal: edgarExpected,
        expectedCashTotal: edgarExpected,
        cashDifference: 0,
        salesCashTotal: edgarSales,
        salesTransferTotal: 0,
        salesCardTotal: 0,
        salesTotal: edgarSales,
        cashOutTotal: edgarCashOut,
        cashInTotal: 0,
        openingNotes: "Apertura sábado 13:05 · capital $20",
        closingNotes: "Cierre sábado 15:05 · egreso Almuerzo $4",
        createdAt: new Date("2026-10-24T13:05:00"),
        updatedAt: new Date("2026-10-24T15:05:00"),
      },
      { transaction: t },
    );

    const saleE = await postPosSale({
      shift: shift140,
      accountId: 1,
      items: EDGAR_CART,
      saleAt: new Date("2026-10-24T14:10:00"),
      notesTag:
        "[CAJA_POS] [CONTADO] Venta mostrador sin datos de cliente (consumidor final) · Backfill sábado Propietario $5.10",
      transaction: t,
    });

    const almuerzoAt = new Date("2026-10-24T14:30:00");
    const expense = await Expense.create(
      {
        date: almuerzoAt,
        amount: edgarCashOut,
        concept: "Almuerzo",
        category: "Egresos operativos",
        referenceType: "cash_shift_movement",
        referenceId: null,
        status: "paid",
        createdBy: 1,
        createdAt: almuerzoAt,
        updatedAt: almuerzoAt,
      },
      { transaction: t },
    );

    const mov = await CashShiftMovement.create(
      {
        shiftId: 140,
        accountId: 1,
        userId: 1,
        direction: "out",
        category: "gasto_operativo",
        amount: edgarCashOut,
        concept: "Almuerzo",
        notes: "Egreso turno sábado tarde",
        expenseId: expense.id,
        createdAt: almuerzoAt,
        updatedAt: almuerzoAt,
      },
      { transaction: t },
    );
    await expense.update({ referenceId: mov.id }, { transaction: t });

    await sequelize.query(`ALTER TABLE ERP_cash_shifts AUTO_INCREMENT = 144`, {
      transaction: t,
    });
    await sequelize.query("SET FOREIGN_KEY_CHECKS=1", { transaction: t });

    await sequelize.query(
      `INSERT INTO logs (httpMethod, action, endPoint, description, system, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          "SCRIPT",
          "shift.saturday_backfill",
          "/scripts/backfill-saturday-shifts-oct24",
          `Sábado 24: #139 Juliana ventas $${julianaSales} (ords ${saleA.orderId}+${saleB.orderId}); #140 Propietario $${edgarSales} + egreso Almuerzo $4 (ord ${saleE.orderId}); aplazados 139→141,140→142,141→143; #138 cerrado viernes 20:00`,
          "EdDeli",
          new Date("2026-10-24T15:05:00"),
        ],
        transaction: t,
      },
    );

    return {
      renamed: { "139→141": true, "140→142": true, "141→143": true },
      shift138ClosedAt: "2026-10-23 20:00:00",
      juliana: {
        shiftId: 139,
        sales: julianaSales,
        expected: julianaExpected,
        orders: [saleA, saleB],
      },
      edgar: {
        shiftId: 140,
        sales: edgarSales,
        cashOut: edgarCashOut,
        expected: edgarExpected,
        order: saleE,
        expenseId: expense.id,
        movementId: mov.id,
      },
    };
  });

  console.log(JSON.stringify(out, null, 2));
  await sequelize.close();
}

main().catch(async (e) => {
  console.error("FAIL:", e.message || e);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
