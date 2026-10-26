/**
 * Backfill: ventas anotadas del viernes en turno #138 (Juliana).
 * No usa checkout en vivo (turno cerrado); replica orden + stock + ingresos + cuadre.
 */
import "dotenv/config";
import { sequelize } from "../src/database/connection.js";
import "../src/database/registerEdDeliModels.js";
import { InventoryMovement, InventoryProduct } from "../src/models/Inventory.js";
import { Customer, Order, OrderItem } from "../src/models/Orders.js";
import { Income } from "../src/models/Finance.js";
import { CashShift } from "../src/models/CashShift.js";
import {
  adjustStoreStock,
  alignOperationStoreToCatalogStock,
  getDefaultStockStoreId,
} from "../src/services/storeStockService.js";
import { consumeBatchesFefo } from "../src/services/batchStockService.js";
import { isMultiStockEnabled } from "../src/services/appSettingsService.js";
import { loadAppSettings } from "../src/services/appSettingsService.js";

const SHIFT_ID = 138;
const SELLER_ACCOUNT_ID = 250;
const SALE_AT = new Date("2026-10-23T17:05:00"); // dentro del turno, después de la venta $0.25
const NOTES =
  "[CAJA_POS] [CONTADO] Venta mostrador sin datos de cliente (consumidor final) · Registro tardío turno #138 (anotación viernes)";

/** Ítems como en el carrito de caja (totales = $17.30). */
const ITEMS = [
  { productId: 172, quantity: 1, price: 0.25 }, // big cola roja
  { productId: 173, quantity: 1, price: 0.25 }, // big cola negra
  { productId: 35, quantity: 1, price: 1.0 }, // Funda de Masapan
  { productId: 71, quantity: 24, price: 0.125 }, // Pan de Dulce → $3.00
  { productId: 103, quantity: 4, price: 0.125 }, // Pan de Sal (surtido) → $0.50
  { productId: 71, quantity: 4, price: 0.125 }, // Pan de Dulce (surtido) → $0.50
  { productId: 106, quantity: 12, price: 0.1 }, // Galletas punto rojo → $1.20
  { productId: 263, quantity: 2, price: 0.3 }, // Agua Azul Vital → $0.60
  { productId: 200, quantity: 4, price: 2.5 }, // Queso Lactofino → $10.00
];

const to2 = (n) => Number(Number(n || 0).toFixed(2));

async function main() {
  await loadAppSettings();
  const multi = isMultiStockEnabled();

  const result = await sequelize.transaction(async (t) => {
    const shift = await CashShift.findByPk(SHIFT_ID, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!shift) throw new Error(`Turno #${SHIFT_ID} no encontrado`);
    if (Number(shift.accountId) !== SELLER_ACCOUNT_ID) {
      throw new Error(`Turno #${SHIFT_ID} no pertenece a cuenta ${SELLER_ACCOUNT_ID}`);
    }

    const opened = new Date(shift.openedAt);
    const closed = shift.closedAt ? new Date(shift.closedAt) : null;
    if (SALE_AT < opened || (closed && SALE_AT > closed)) {
      throw new Error("Fecha de venta fuera del rango del turno #138");
    }

    // Evitar duplicar si ya se corrió el script
    const existing = await Order.findOne({
      where: {
        shiftId: SHIFT_ID,
        sellerAccountId: SELLER_ACCOUNT_ID,
        notes: NOTES,
      },
      transaction: t,
    });
    if (existing) {
      throw new Error(`Ya existe el backfill como pedido #${existing.id}`);
    }

    const customer = await Customer.findOne({
      where: { name: "Consumidor Final" },
      transaction: t,
    });
    if (!customer) throw new Error("No hay cliente Consumidor Final");

    let orderTotal = 0;
    for (const row of ITEMS) {
      orderTotal = to2(orderTotal + row.price * row.quantity);
    }
    if (Math.abs(orderTotal - 17.3) > 0.009) {
      throw new Error(`Total esperado 17.30, calculado ${orderTotal}`);
    }

    const order = await Order.create(
      {
        customerId: customer.id,
        notes: NOTES,
        date: SALE_AT,
        status: "pagado",
        shiftId: SHIFT_ID,
        cashRegisterId: shift.activeCashRegisterId || 1,
        sellerAccountId: SELLER_ACCOUNT_ID,
        paymentMethod: "efectivo",
        amountReceived: orderTotal,
        paidAt: SALE_AT,
        documentType: "consumidor_final",
        createdAt: SALE_AT,
        updatedAt: SALE_AT,
      },
      { transaction: t },
    );

    const stockStoreId = multi
      ? shift.storeId || (await getDefaultStockStoreId({ transaction: t }))
      : await getDefaultStockStoreId({ transaction: t });

    const stockBefore = {};
    const stockAfter = {};

    for (const row of ITEMS) {
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

      stockBefore[productId] = Number(product.stock || 0);

      // Como en Caja: si no alcanza, autocompletar (ajuste absoluto) y después la salida.
      const { getStoreStockQty } = await import("../src/services/storeStockService.js");
      const available = await getStoreStockQty(stockStoreId, productId, { transaction: t });
      if (available < quantity) {
        const targetAbs = Number(available) + Number(quantity);
        const { setStoreStockAbsolute } = await import("../src/services/storeStockService.js");
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
            date: SALE_AT,
            createdBy: SELLER_ACCOUNT_ID,
            description: `Autocompletar stock desde caja · backfill turno #138 (pedido #${order.id})`,
            price: null,
            createdAt: SALE_AT,
            updatedAt: SALE_AT,
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
      stockAfter[productId] = Number(product.stock || 0);

      try {
        await consumeBatchesFefo({
          productId,
          quantity,
          storeId: stockStoreId,
          transaction: t,
        });
      } catch (e) {
        console.warn("FEFO:", product.name, e?.message || e);
      }

      await InventoryMovement.create(
        {
          productId,
          quantity,
          type: "salida",
          reason: "SALIDA_VENTA",
          referenceType: "order",
          referenceId: order.id,
          date: SALE_AT,
          createdBy: SELLER_ACCOUNT_ID,
          description: `Venta POS · pedido #${order.id} · local #${stockStoreId} · backfill turno #138`,
          createdAt: SALE_AT,
          updatedAt: SALE_AT,
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
          deliveredAt: SALE_AT,
          paidAt: SALE_AT,
          createdAt: SALE_AT,
          updatedAt: SALE_AT,
        },
        { transaction: t },
      );

      const amount = to2(price * quantity);
      await Income.create(
        {
          date: SALE_AT,
          amount,
          concept: `Venta POS ${product.name} x${quantity} (Ord #${order.id})`,
          category: "Venta",
          referenceType: "order_item",
          referenceId: orderItem.id,
          status: "paid",
          createdBy: SELLER_ACCOUNT_ID,
          createdAt: SALE_AT,
          updatedAt: SALE_AT,
        },
        { transaction: t },
      );
    }

    // Totales del turno: 0.25 existente + 17.30
    const prevSales = to2(Number(shift.salesTotal || 0));
    const newSalesCash = to2(prevSales + orderTotal);
    const opening = to2(Number(shift.openingCashTotal || 0));
    const cashIn = to2(Number(shift.cashInTotal || 0));
    const cashOut = to2(Number(shift.cashOutTotal || 0));
    const expectedCashTotal = to2(opening + newSalesCash + cashIn - cashOut);
    const closingCashTotal = expectedCashTotal;
    const cashDifference = 0;

    let closingCashCounts = shift.closingCashCounts;
    try {
      const counts =
        typeof closingCashCounts === "string"
          ? JSON.parse(closingCashCounts)
          : { ...(closingCashCounts || {}) };
      // Antes: 39×$1 + 7×$0.10 = 39.70 → sumar $17.30 → 56×$1 + 10×$0.10 = 57.00
      counts.c_100 = Number(counts.c_100 || 0) + 17;
      counts.c_010 = Number(counts.c_010 || 0) + 3;
      closingCashCounts = counts;
    } catch {
      /* leave as-is */
    }

    await shift.update(
      {
        salesCashTotal: newSalesCash,
        salesTransferTotal: to2(Number(shift.salesTransferTotal || 0)),
        salesCardTotal: to2(Number(shift.salesCardTotal || 0)),
        salesTotal: newSalesCash,
        expectedCashTotal,
        closingCashTotal,
        cashDifference,
        closingCashCounts,
        updatedAt: new Date(),
      },
      { transaction: t },
    );

    await sequelize.query(
      `INSERT INTO logs (httpMethod, action, endPoint, description, system, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          "SCRIPT",
          "order.pos_backfill",
          "/scripts/backfill-juliana-shift138-friday",
          `Backfill turno #138 Juliana: pedido #${order.id} total $${orderTotal.toFixed(2)} (anotación viernes ${SALE_AT.toISOString()})`,
          "EdDeli",
          SALE_AT,
        ],
        transaction: t,
      },
    );

    return {
      orderId: order.id,
      orderTotal,
      shiftSales: newSalesCash,
      expectedCashTotal,
      closingCashTotal,
      stockBefore,
      stockAfter,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await sequelize.close();
}

main().catch(async (err) => {
  console.error("FAIL:", err.message || err);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
