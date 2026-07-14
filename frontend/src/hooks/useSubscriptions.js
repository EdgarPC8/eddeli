/**
 * Suscripción local (backend EdDeli). El gestor solo EMPUJA el entitlement;
 * en runtime EdDeli lee su propio backend — el gestor puede estar apagado.
 */
import { useEffect, useState } from "react";
import axios from "../api/axios.js";

/**
 * Switch en frontend/.env → `VITE_SUBSCRIPTIONS_ENABLED`:
 *   - "true"  → limitar por entitlement guardado en el backend EdDeli.
 *   - "false" → acceso total (desarrollo libre).
 *   - sin definir → desactivado en `npm run dev`, activado en build de producción.
 */
const ENV_OVERRIDE = import.meta.env.VITE_SUBSCRIPTIONS_ENABLED;
export const SUBSCRIPTIONS_ENABLED =
  ENV_OVERRIDE === "true"
    ? true
    : ENV_OVERRIDE === "false"
      ? false
      : import.meta.env.PROD;

const BYPASS_SUBSCRIPTION = {
  subscribed: true,
  subscription: { modules: [] },
  maintenance: false,
};

const CACHE_KEY = "eddeli_entitlement_cache_v1";

function readCachedEntitlement() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedEntitlement(data) {
  try {
    if (data?.subscribed && data?.subscription) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function computeExpired(data) {
  if (!data?.subscription?.expires_at) return false;
  return new Date(data.subscription.expires_at) < new Date();
}

export const useSubscriptions = () => {
  const cached = SUBSCRIPTIONS_ENABLED ? readCachedEntitlement() : null;
  const [isLoading, setIsLoading] = useState(SUBSCRIPTIONS_ENABLED && !cached);
  const [subscription, setSubscription] = useState(
    SUBSCRIPTIONS_ENABLED ? cached : BYPASS_SUBSCRIPTION,
  );
  const [expired, setExpired] = useState(
    SUBSCRIPTIONS_ENABLED ? computeExpired(cached) : false,
  );

  const fetchSub = async () => {
    try {
      const { data } = await axios.get("/subscription");
      setSubscription(data);
      setExpired(computeExpired(data));
      writeCachedEntitlement(data);
      setIsLoading(false);
    } catch (err) {
      console.error("Error al cargar suscripción local:", err);
      // Fallback local: EdDeli no depende del gestor en runtime.
      const fallback = readCachedEntitlement();
      if (fallback) {
        setSubscription(fallback);
        setExpired(computeExpired(fallback));
      } else {
        setSubscription((prev) =>
          prev ?? {
            subscribed: false,
            subscription: null,
            maintenance: false,
          },
        );
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED) return;
    fetchSub();
    const onFocus = () => {
      fetchSub();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return { isLoading, subscription, expired, refetch: fetchSub };
};
