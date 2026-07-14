import {
  getEntitlementResponse,
  saveEntitlement,
  pullEntitlementFromGestor,
} from "../services/entitlementService.js";

/** GET — lo que usa el frontend EdDeli (sin llamar al gestor). */
export async function getSubscription(req, res, next) {
  try {
    const data = await getEntitlementResponse();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT — el gestor empuja la habilitación aquí.
 * Header: Authorization: Bearer <GESTOR_SYNC_SECRET>
 * Body: mismo shape que /api/subscriptions/check del gestor.
 */
export async function putEntitlementFromGestor(req, res, next) {
  try {
    const data = await saveEntitlement(req.body, "gestor_push");
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
}

/** POST — Programador: forzar pull desde el gestor (diagnóstico / bootstrap). */
export async function pullSubscription(req, res, next) {
  try {
    const data = await pullEntitlementFromGestor();
    res.json({ ok: true, ...data });
  } catch (err) {
    const status = err.response?.status || err.status || 500;
    const message =
      err.response?.data?.error ||
      err.message ||
      "Error al sincronizar con el gestor";
    res.status(status).json({ error: message });
  }
}
