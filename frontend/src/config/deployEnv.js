/**
 * Despliegue del frontend (frontend/.env → prefijo VITE_*).
 * Otra app: copia .env.example, cambia rutas/puerto/prefijo API y rebuild.
 */

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || "eddeliapi";

export const API_PORT = Number(import.meta.env.VITE_API_PORT || 3001);

export const API_HOST = import.meta.env.VITE_API_HOST || "127.0.0.1";

export const API_ORIGIN = String(
  import.meta.env.VITE_API_ORIGIN || "https://aplicaciones.marianosamaniego.edu.ec",
).replace(/\/$/, "");

/** local = proxy Vite | server = IP:puerto | production = dominio */
export const API_MODE =
  import.meta.env.VITE_API_MODE || (import.meta.env.DEV ? "local" : "production");

/** Base de rutas React (sale de VITE_BASE_PATH en vite.config). Ej: /eddeli/ */
export const APP_BASE_PATH = import.meta.env.BASE_URL || "/";

/** Prefijo carpeta img en servidor si aún no cargó app_settings */
export const MEDIA_PREFIX_FALLBACK = import.meta.env.VITE_MEDIA_PREFIX || "sistema";

export function apiBaseLabel() {
  if (API_MODE === "production") return `${API_ORIGIN}/${API_PREFIX}`;
  if (API_MODE === "server") return `${API_HOST}:${API_PORT}/${API_PREFIX}`;
  return `localhost:${API_PORT}/${API_PREFIX}`;
}
