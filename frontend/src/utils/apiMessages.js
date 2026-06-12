/**
 * Extrae mensajes de respuestas del API (eddeliapi).
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

const AXIOS_GENERIC_STATUS_RE = /^request failed with status code \d+$/i;

/** Mensaje legible para el usuario según tipo de fallo HTTP/red. */
export function getFriendlyHttpErrorMessage(error, fallback = null) {
  const status = error?.response?.status;

  if (!error?.response) {
    const code = error?.code;
    const msg = String(error?.message || "").toLowerCase();
    if (code === "ERR_NETWORK" || msg.includes("network error")) {
      return (
        fallback ||
        "No se pudo conectar con el servidor. Compruebe su conexión a internet o que el servicio esté activo."
      );
    }
    if (code === "ECONNABORTED" || msg.includes("timeout")) {
      return fallback || "El servidor tardó demasiado en responder. Intente de nuevo.";
    }
    return fallback || "No se pudo conectar con el servidor.";
  }

  if (status >= 500) {
    return "Error en el servidor. Intente más tarde o contacte al administrador.";
  }
  if (status === 401 || status === 403) {
    return "Usuario o contraseña incorrectos.";
  }
  if (status === 404) {
    return "Servicio no encontrado. Verifique la configuración del sistema.";
  }
  if (status === 503 || status === 502 || status === 504) {
    return "El servidor no está disponible en este momento. Intente más tarde.";
  }

  return fallback;
}

/** Mensaje de error HTTP (axios). */
export function getApiErrorMessage(error, fallback = null) {
  const data = error?.response?.data;
  const fromBody = getApiMessageFromData(data);
  if (fromBody) return fromBody;

  const rawMsg =
    typeof error?.message === "string" ? error.message.trim() : "";
  if (rawMsg && !AXIOS_GENERIC_STATUS_RE.test(rawMsg)) {
    return rawMsg;
  }

  return getFriendlyHttpErrorMessage(error, fallback) || "Ocurrió un error. Intente de nuevo.";
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
