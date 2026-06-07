/**
 * Extrae mensajes de respuestas del API (tiendaapi).
 * Prioridad: backend → fallback opcional del llamador.
 */

/** Lee `message` del cuerpo JSON o cabecera X-Api-Message (descargas). */
export function getApiMessageFromData(data, headers) {
  if (headers) {
    const h = headers["x-api-message"] || headers["X-Api-Message"];
    if (h && String(h).trim()) return String(h).trim();
  }
  if (!data) return null;
  if (typeof data === "string") {
    const t = data.trim();
    return t && t !== "ok" ? t : null;
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return null;
}

/** Mensaje de error HTTP (axios). */
export function getApiErrorMessage(error, fallback = null) {
  const data = error?.response?.data;
  const fromBody = getApiMessageFromData(data);
  if (fromBody) return fromBody;
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

/** Mensaje de éxito desde axios response (o primer ítem de Promise.all). */
export function getApiSuccessMessage(response, fallback = null) {
  if (Array.isArray(response)) {
    for (const item of response) {
      const msg = getApiSuccessMessage(item, null);
      if (msg) return msg;
    }
    return fallback;
  }
  const fromBody = getApiMessageFromData(
    response?.data,
    response?.headers
  );
  return fromBody || fallback;
}
