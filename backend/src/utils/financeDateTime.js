/**
 * Normaliza fechas de finanzas a DATETIME (con hora).
 * Si solo llega yyyy-MM-dd, conserva la fecha y usa la hora actual local del servidor.
 */
export function toFinanceDateTime(value) {
  if (value == null || value === "") return new Date();
  if (value instanceof Date) return value;

  const s = String(value).trim();
  if (!s) return new Date();

  if (s.includes("T") || s.includes(" ")) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date();

  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), 0);
}
