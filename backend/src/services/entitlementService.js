/**
 * Suscripción local: leída por el frontend; escrita por el gestor (push) o pull manual.
 */
import axios from "axios";
import { AppEntitlement } from "../models/AppEntitlement.js";
import { subscription as gestorConfig } from "../config/subscription-api.js";

const EMPTY = {
  maintenance: false,
  subscribed: false,
  subscription: null,
};

/** MySQL/SQLite a veces devuelve JSON como string. */
function coerceJson(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value;
  return null;
}

function normalizePayload(body) {
  const parsed = coerceJson(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const subscribed = Boolean(parsed.subscribed);
  const maintenance = Boolean(parsed.maintenance);
  const subscription = parsed.subscription ?? null;
  return { maintenance, subscribed, subscription };
}

export async function getEntitlementResponse() {
  const row = await AppEntitlement.findByPk(1);
  if (!row?.payload) return { ...EMPTY };

  const payload = coerceJson(row.payload) || EMPTY;
  const out = {
    maintenance: Boolean(payload.maintenance),
    subscribed: Boolean(payload.subscribed),
    subscription: payload.subscription ?? null,
    meta: {
      source: row.source,
      syncedAt: row.syncedAt,
    },
  };

  if (out.subscription?.expires_at) {
    const expired = new Date(out.subscription.expires_at) < new Date();
    if (expired && out.subscription.status === "ACTIVE") {
      out.subscribed = false;
    }
  }

  return out;
}

export async function saveEntitlement(rawPayload, source = "gestor_push") {
  const payload = normalizePayload(rawPayload);
  if (!payload) {
    throw Object.assign(new Error("Payload de suscripción inválido"), {
      status: 400,
    });
  }

  const [row] = await AppEntitlement.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      payload,
      source,
      syncedAt: new Date(),
    },
  });

  await row.update({
    payload,
    source,
    syncedAt: new Date(),
  });

  return getEntitlementResponse();
}

/** Trae del gestor y guarda localmente (bootstrap / refresh manual). */
export async function pullEntitlementFromGestor() {
  if (!gestorConfig.apikey) {
    throw Object.assign(
      new Error("SUBSCRIPTION_API_KEY no configurada en el backend"),
      { status: 500 },
    );
  }

  const url = `${String(gestorConfig.api).replace(/\/$/, "")}/subscriptions/check`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${gestorConfig.apikey}` },
    timeout: 15000,
  });

  return saveEntitlement(data, "gestor_pull");
}

export async function ensureEntitlementTable() {
  await AppEntitlement.sync({ alter: true });
  // Fila singleton: el gestor escribe encima con PUT /subscription/entitlement.
  await AppEntitlement.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      payload: { ...EMPTY },
      source: "bootstrap",
      syncedAt: null,
    },
  });
}
