/**
 * Resuelve tipo de acción de un log (para tabla; también reclasifica logs viejos).
 * Espejo ligero de backend/src/log/logActionCatalog.js
 */

const RESOURCE_LABELS = {
  login: "Login",
  logout: "Logout",
  changeRole: "Cambio de rol",
  users: "usuario",
  accounts: "cuenta",
  products: "producto",
  categories: "categoría",
  units: "unidad",
  movements: "movimiento",
  recipes: "receta",
  stores: "sucursal/local",
  catalog: "catálogo",
  customers: "cliente",
  suppliers: "proveedor",
  orders: "pedido",
  shifts: "turno",
  incomes: "ingreso",
  expenses: "gasto",
  notifications: "notificación",
  publicidad: "publicidad",
  campaigns: "campaña",
  sri: "facturación SRI",
  settings: "configuración",
  logs: "logs",
  backups: "backup",
  pos: "caja POS",
  checkout: "cobro",
};

const EXPLICIT = [
  [/\/login\/?$/i, "POST", "Login"],
  [/\/logout\/?$/i, "POST", "Logout"],
  [/\/changeRole\/?$/i, "POST", "Cambio de rol"],
  [/\/shifts\/open\/?$/i, "POST", "Abrir turno"],
  [/\/shifts\/\d+\/close\/?$/i, "POST", "Cerrar turno"],
  [/\/shifts\/\d+\/movements\/?$/i, "POST", "Movimiento de caja"],
  [/\/orders\/pos\/checkout\/?$/i, "POST", "Cobro en caja"],
  [/\/orders\/?$/i, "POST", "Crear pedido"],
  [/\/inventory\/products\/\d+\/stock\/?$/i, "PATCH", "Ajustar stock"],
  [/\/inventory\/products\/?$/i, "POST", "Crear producto"],
  [/\/inventory\/products\/\d+\/?$/i, "PUT", "Actualizar producto"],
  [/\/inventory\/products\/\d+\/?$/i, "DELETE", "Eliminar producto"],
  [/\/inventory\/stores\/?$/i, "POST", "Crear sucursal/local"],
  [/\/app\/settings\/?$/i, "PUT", "Actualizar configuración"],
  [/\/sri\/settings\/?$/i, "PUT", "Actualizar config SRI"],
  [/\/sri\/certificate\/?$/i, "POST", "Subir certificado SRI"],
  [/\/comands\/logs/i, "DELETE", "Borrar logs"],
];

const METHOD_VERB = {
  POST: "Crear",
  PUT: "Actualizar",
  PATCH: "Actualizar",
  DELETE: "Eliminar",
};

function normalizePath(endPoint) {
  let p = String(endPoint || "").split("?")[0];
  try {
    if (p.startsWith("http")) p = new URL(p).pathname;
  } catch {
    /* ignore */
  }
  const known = [
    "login",
    "users",
    "orders",
    "inventory",
    "shifts",
    "finance",
    "notifications",
    "publicidad",
    "sri",
    "app",
    "comands",
    "img",
    "files",
    "documents",
    "changeRole",
  ];
  const parts = p.split("/").filter(Boolean);
  if (parts.length >= 2 && !known.includes(parts[0])) {
    return "/" + parts.slice(1).join("/");
  }
  return p.startsWith("/") ? p : `/${p}`;
}

export function resolveLogAction(httpMethod, endPoint) {
  const method = String(httpMethod || "").toUpperCase();
  const path = normalizePath(endPoint);

  for (const [re, m, action] of EXPLICIT) {
    if (m === method && re.test(path)) return action;
  }

  const parts = path.split("/").filter(Boolean);
  if (parts.includes("login")) return "Login";
  if (parts.includes("logout")) return "Logout";

  const verb = METHOD_VERB[method] || method || "Acción";
  let resource = null;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) continue;
    resource = RESOURCE_LABELS[parts[i]] || parts[i].replace(/-/g, " ");
    break;
  }
  return resource ? `${verb} ${resource}` : `${verb} recurso`;
}

/** Usa action guardada si es útil; si no, reclasifica. */
export function displayLogAction(row) {
  const stored = String(row?.action || "").trim();
  if (
    stored &&
    stored !== "Acción desconocida" &&
    !/^acción desconocida$/i.test(stored)
  ) {
    return stored;
  }
  return resolveLogAction(row?.httpMethod, row?.endPoint);
}
