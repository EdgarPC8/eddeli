/**
 * Generadores de reportes TXT para Cobranzas.
 */
import { money, todayISO, toNum, getBillableQty } from "./helpers.js";

export function buildReportTxtByProduct({ title, customer, items }) {
  const byProduct = new Map();
  let total = 0;
  let itemsCount = 0;

  for (const it of items || []) {
    const qty = getBillableQty(it);
    const price = toNum(it.price, 0);
    const line = Number((qty * price).toFixed(2));
    if (qty <= 0) continue;

    total = Number((total + line).toFixed(2));
    itemsCount += 1;

    const key = String(it.product || "(sin nombre)");
    if (!byProduct.has(key)) byProduct.set(key, { product: key, qty: 0, total: 0 });
    const agg = byProduct.get(key);
    agg.qty = Number((agg.qty + qty).toFixed(2));
    agg.total = Number((agg.total + line).toFixed(2));
  }

  const productsSorted = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  const now = todayISO();
  const txt = [
    title,
    `Fecha: ${now}`,
    `Cliente: ${customer?.name || "—"}`,
    `Tel: ${customer?.phone || "—"}`,
    "",
    "RESUMEN",
    `Total: ${money(total)}`,
    `Ítems considerados: ${itemsCount}`,
    "",
    "DETALLE POR PRODUCTO",
    ...(productsSorted.length
      ? productsSorted.map((p) => `- ${p.product} | Cantidad: ${p.qty} | Total: ${money(p.total)}`)
      : ["(Sin datos)"]),
    "",
  ].join("\r\n");

  return { txt, total };
}

export function buildDetailedReportTxt({ title, customer, items }) {
  const now = todayISO();
  let totalAmount = 0;
  const reportLines = [];

  reportLines.push(title);
  reportLines.push(`Fecha del reporte: ${now}`);
  reportLines.push(`Cliente: ${customer?.name || "—"}`);
  reportLines.push(`Teléfono: ${customer?.phone || "—"}`);
  reportLines.push("\n====================================");
  reportLines.push("RESUMEN GENERAL DE PRODUCTOS VENDIDOS");
  reportLines.push("====================================\n");

  const generalMap = {};
  for (const item of items || []) {
    const key = `${item.product}|${item.price}`;
    if (!generalMap[key]) {
      generalMap[key] = { product: item.product, price: item.price, qty: 0 };
    }
    generalMap[key].qty += item.qty;
  }
  for (const key in generalMap) {
    const g = generalMap[key];
    const subtotal = g.qty * g.price;
    totalAmount += subtotal;
    reportLines.push(
      `Producto: ${g.product}\nCantidad: ${g.qty}\nPrecio Unitario: ${money(g.price)}\nTotal: ${money(subtotal)}\n`
    );
  }

  reportLines.push("\n=========================");
  reportLines.push("DETALLE DE VENTAS POR FECHA");
  reportLines.push("=========================\n");
  const dateMap = {};
  for (const item of items || []) {
    if (!dateMap[item.orderDate]) dateMap[item.orderDate] = [];
    dateMap[item.orderDate].push(item);
  }
  for (const date of Object.keys(dateMap).sort()) {
    reportLines.push(`Fecha: ${date}\n`);
    for (const item of dateMap[date]) {
      const subtotal = item.qty * item.price;
      reportLines.push(
        `  Producto: ${item.product}\n  Cantidad: ${item.qty}\n  Precio Unitario: ${money(item.price)}\n  Total: ${money(subtotal)}\n`
      );
    }
    reportLines.push("----------------------------------");
  }

  reportLines.push("\n=================================");
  reportLines.push("RESUMEN POR PRODUCTO (POR PRECIO)");
  reportLines.push("=================================\n");
  const productMap = {};
  for (const item of items || []) {
    if (!productMap[item.product]) productMap[item.product] = {};
    if (!productMap[item.product][item.price]) productMap[item.product][item.price] = 0;
    productMap[item.product][item.price] += item.qty;
  }
  for (const product in productMap) {
    reportLines.push(`Producto: ${product}`);
    const prices = Object.keys(productMap[product]);
    if (prices.length > 1) reportLines.push("⚠ Este producto tuvo cambios de precio");
    for (const price of prices) {
      const qty = productMap[product][price];
      reportLines.push(
        `  Precio Unitario: ${money(price)}\n  Cantidad: ${qty}\n  Total: ${money(qty * price)}`
      );
    }
    reportLines.push("----------------------------------");
  }

  reportLines.push(`\nTOTAL GENERAL DEL REPORTE: ${money(totalAmount)}`);
  return { txt: reportLines.join("\n"), total: totalAmount };
}
