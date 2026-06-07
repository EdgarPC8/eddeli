/**
 * Toasts para mutaciones (POST/PUT/DELETE/comandos).
 * No usar al cargar tablas (GET).
 */
import { getApiErrorMessage, getApiSuccessMessage } from "./apiMessages.js";

/**
 * Ejecuta una promesa de API y muestra toast con el mensaje del backend.
 * @param {Function} toast - toast del AuthContext
 * @param {object} opts
 * @param {Promise} opts.promise - llamada axios
 * @param {Function} [opts.onSuccess] - recarga silenciosa tras éxito
 */
export async function withMutationToast(toast, { promise, onSuccess }) {
  try {
    const result = await toast({ promise });
    if (onSuccess) await onSuccess(result);
    return result;
  } catch {
    throw new Error("mutation_failed");
  }
}

export { getApiErrorMessage, getApiSuccessMessage };
