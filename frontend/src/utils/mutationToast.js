/**
 * Toasts para mutaciones (POST/PUT/DELETE/comandos).
 * No usar al cargar tablas (GET).
 */
import { getApiErrorMessage, getApiSuccessMessage } from "./apiMessages.js";

/**
 * Ejecuta una promesa de API y muestra toast con el mensaje del backend.
 */
export async function withMutationToast(toast, { promise, onSuccess, successMessage, errorMessage }) {
  try {
    const result = await toast({ promise, onSuccess, successMessage, errorMessage });
    return result;
  } catch {
    return null;
  }
}

/** Mutación + recargar tabla + cerrar diálogo (patrón CRUD estándar). */
export async function runMutationReload(toast, { promise, reload, onClose, successMessage, errorMessage }) {
  return withMutationToast(toast, {
    promise,
    successMessage,
    errorMessage,
    onSuccess: async () => {
      if (reload) await reload();
      if (onClose) onClose();
    },
  });
}

export { getApiErrorMessage, getApiSuccessMessage };
