/**
 * Helpers para emitir factura electrónica SRI desde el cobro de Caja.
 */

const CONSUMIDOR_FINAL_IDENT = "9999999999999";

function isConsumidorFinalName(name) {
  const n = String(name || "").toLowerCase();
  return n.includes("consumidor") && n.includes("final");
}

/** Detecta tipo de identificación SRI a partir del cliente. */
export function resolveSriBuyerFromCustomer(customer) {
  const name =
    buildDisplayName(customer) ||
    String(customer?.name || "").trim() ||
    "Consumidor Final";
  const rawIdent = String(customer?.cedula || "").replace(/\s/g, "").trim();
  const email = String(customer?.email || "").trim();
  const address = String(customer?.address || "S/N").trim() || "S/N";
  const storedType = String(customer?.identType || "").padStart(2, "0").slice(-2);

  if (storedType === "07" || isConsumidorFinalName(name) || (!rawIdent && storedType !== "06" && storedType !== "08")) {
    return {
      identType: "07",
      ident: CONSUMIDOR_FINAL_IDENT,
      name: isConsumidorFinalName(name) ? name : "CONSUMIDOR FINAL",
      address,
      email,
    };
  }

  if (["04", "05", "06", "08"].includes(storedType) && rawIdent) {
    const ident =
      storedType === "04" || storedType === "05" ? rawIdent.replace(/\D/g, "") : rawIdent;
    return { identType: storedType, ident, name, address, email };
  }

  const digits = rawIdent.replace(/\D/g, "");
  if (digits.length === 13) {
    return { identType: "04", ident: digits, name, address, email };
  }
  if (digits.length === 10) {
    return { identType: "05", ident: digits, name, address, email };
  }
  if (rawIdent) {
    return { identType: "06", ident: rawIdent, name, address, email };
  }

  return {
    identType: "07",
    ident: CONSUMIDOR_FINAL_IDENT,
    name,
    address,
    email,
  };
}

function buildDisplayName(customer) {
  const parts = [
    customer?.firstName,
    customer?.secondName,
    customer?.firstLastName,
    customer?.secondLastName,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  return parts.join(" ");
}

export function mapPosPaymentToSriFormaPago(paymentMethod) {
  switch (String(paymentMethod || "").toLowerCase()) {
    case "tarjeta":
      return "19";
    case "transferencia":
      return "20";
    case "credito":
      return "20";
    case "efectivo":
    default:
      return "01";
  }
}

/**
 * Armar payload POST /sri/invoices/emit desde carrito POS (precios con IVA).
 * @param {{ customer: object, cartRows: array, paymentMethod?: string }} opts
 */
export function buildSriInvoicePayloadFromCaja({ customer, cartRows, paymentMethod }) {
  const buyer = resolveSriBuyerFromCustomer(customer);
  const items = (cartRows || [])
    .map((row) => {
      const qty = Number(row.quantity || 0);
      if (!(qty > 0)) return null;
      const usesLineTotal =
        row.lineTotal != null &&
        (row.pricingMode === "package" ||
          row.pricingMode === "category_package" ||
          row.pricingMode === "tier_group_package");
      const lineTotal = usesLineTotal
        ? Number(row.lineTotal)
        : Number(row.price || 0) * qty;
      const unitPrice = qty > 0 ? lineTotal / qty : 0;
      const taxType = String(row.taxType || "gravado");
      const taxRate =
        taxType !== "gravado" ? 0 : Number(row.taxRate != null ? row.taxRate : 15);
      return {
        description: String(row.name || row.productName || "Producto").trim() || "Producto",
        qty,
        unitPrice,
        taxRate: Number.isFinite(taxRate) ? taxRate : 15,
        code: String(row.productId || row.code || "").slice(0, 25),
      };
    })
    .filter(Boolean);

  if (!items.length) {
    throw new Error("No hay ítems para factura electrónica");
  }

  return {
    documentType: "01",
    pricesIncludeTax: true,
    paymentMethod: mapPosPaymentToSriFormaPago(paymentMethod),
    buyer,
    items,
  };
}
