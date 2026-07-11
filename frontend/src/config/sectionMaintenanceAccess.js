/**
 * Acceso a secciones/módulos en mantenimiento según entorno (producción vs desarrollo).
 */
import { API_MODE } from "./deployEnv.js";
import {
  APP_MODULE_GROUPS,
  resolveModuleStatus,
} from "./appModulesCatalog.js";

/** Producción: build de deploy (Vite prod) o API_MODE=production. */
export function isAppInProduction() {
  if (API_MODE === "production") return true;
  if (API_MODE === "local" || API_MODE === "server") return false;
  return !import.meta.env.DEV;
}

/** Programador puede abrir secciones en mantenimiento aunque esté en producción. */
export function canBypassSectionMaintenance(loginRol) {
  return loginRol === "Programador";
}

function normalizePath(path) {
  return String(path || "").split("?")[0].replace(/\/+$/, "") || "/";
}

/** Alias legacy que deben bloquearse con el módulo en mantenimiento. */
const MAINTENANCE_PATH_ALIASES = {
  diseno: [
    { path: "/editor", name: "Editor de diseño" },
    { path: "/templates", name: "Plantillas" },
    { path: "/publicity_edit", name: "Editor de diseño" },
    { path: "/editorDefault", name: "Editor de diseño" },
  ],
};

/**
 * Rutas (y meta) en mantenimiento: sección con status maintenance
 * o todas las secciones de un módulo marcado en mantenimiento.
 */
export function listMaintenanceSections() {
  const out = [];
  const seen = new Set();

  const push = (path, name, moduleLabel, description) => {
    const p = normalizePath(path);
    if (!p || p.includes(":") || seen.has(p)) return;
    seen.add(p);
    out.push({ path: p, name, moduleLabel, description: description || "" });
  };

  for (const group of APP_MODULE_GROUPS) {
    const groupMaint = group.status === "maintenance";
    for (const section of group.sections || []) {
      const sectionMaint = resolveModuleStatus(section) === "maintenance";
      if (!groupMaint && !sectionMaint) continue;
      push(section.path, section.name, group.label, section.description || group.summary);
    }
    if (groupMaint && MAINTENANCE_PATH_ALIASES[group.id]) {
      for (const alias of MAINTENANCE_PATH_ALIASES[group.id]) {
        push(alias.path, alias.name, group.label, group.summary);
      }
    }
  }
  return out;
}

let cachedPaths = null;
let cachedList = null;

function getMaintenanceList() {
  if (!cachedList) {
    cachedList = listMaintenanceSections();
    cachedPaths = cachedList.map((s) => s.path).sort((a, b) => b.length - a.length);
  }
  return { list: cachedList, paths: cachedPaths };
}

export function findMaintenanceSectionForPath(pathname) {
  const p = normalizePath(pathname);
  const { list, paths } = getMaintenanceList();
  const match = paths.find((mp) => p === mp || p.startsWith(`${mp}/`));
  if (!match) return null;
  return list.find((s) => s.path === match) || { path: match, name: "Esta sección", moduleLabel: "", description: "" };
}

export function isPathInMaintenance(pathname) {
  return Boolean(findMaintenanceSectionForPath(pathname));
}

/** En producción, bloquear la ruta salvo Programador. */
export function shouldBlockMaintenancePath(pathname, loginRol) {
  if (!isAppInProduction()) return false;
  if (canBypassSectionMaintenance(loginRol)) return false;
  return isPathInMaintenance(pathname);
}

/** En producción, ocultar ítem de menú salvo Programador. */
export function shouldHideMaintenanceMenuLink(link, loginRol) {
  if (!isAppInProduction()) return false;
  if (canBypassSectionMaintenance(loginRol)) return false;
  return isPathInMaintenance(link);
}
