/** Denominaciones USD (Ecuador) para arqueo de cierre de caja. */

export const CASH_COINS = [
  { key: "c_001", label: "1 ctvo", value: 0.01 },
  { key: "c_005", label: "5 ctvo", value: 0.05 },
  { key: "c_010", label: "10 ctvo", value: 0.1 },
  { key: "c_025", label: "25 ctvo", value: 0.25 },
  { key: "c_050", label: "50 ctvo", value: 0.5 },
  { key: "c_100", label: "$1.00", value: 1 },
];

export const CASH_BILLS = [
  { key: "b_001", label: "$1", value: 1 },
  { key: "b_005", label: "$5", value: 5 },
  { key: "b_010", label: "$10", value: 10 },
  { key: "b_020", label: "$20", value: 20 },
  { key: "b_050", label: "$50", value: 50 },
  { key: "b_100", label: "$100", value: 100 },
];

export const CASH_DENOMINATIONS = [...CASH_COINS, ...CASH_BILLS];

export function emptyCashCounts() {
  return Object.fromEntries(CASH_DENOMINATIONS.map((d) => [d.key, ""]));
}

export function parseQty(raw) {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Total en dólares según cantidad por denominación. */
export function computeCashTotal(counts) {
  let total = 0;
  for (const d of CASH_DENOMINATIONS) {
    const qty = parseQty(counts[d.key]);
    total += qty * d.value;
  }
  return Number(total.toFixed(2));
}

export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

/** Convierte conteos guardados en BD a strings para los inputs del arqueo. */
export function countsToFormState(counts) {
  const base = emptyCashCounts();
  if (!counts || typeof counts !== "object") return base;
  for (const d of CASH_DENOMINATIONS) {
    const raw = counts[d.key];
    base[d.key] = raw != null && Number(raw) > 0 ? String(Math.floor(Number(raw))) : "";
  }
  return base;
}

/** Si el arqueo está vacío pero hay total, devuelve el total para el campo simple. */
export function inferSimpleCashTotal(counts, storedTotal) {
  const fromCounts = computeCashTotal(countsToFormState(counts));
  if (fromCounts > 0) return fromCounts;
  return Number(storedTotal || 0);
}

export function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function datetimeLocalForApi(local) {
  if (!local) return undefined;
  const dt = new Date(local);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}
