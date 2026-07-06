import { useEffect, useState } from "react";
import Subify from "subify";

/**
 * Control de licencias/suscripciones.
 *
 * - En desarrollo (`npm run dev`) queda DESACTIVADO por defecto, para no depender
 *   del gestor central y evitar que la app se quede cargando.
 * - En producción (build compilado / `npm run build` + preview) queda ACTIVADO.
 * - Se puede forzar manualmente con la variable de entorno
 *   `VITE_SUBSCRIPTIONS_ENABLED` = "true" | "false" (en un archivo .env del frontend).
 */
const ENV_OVERRIDE = import.meta.env.VITE_SUBSCRIPTIONS_ENABLED;
export const SUBSCRIPTIONS_ENABLED =
  ENV_OVERRIDE === "true"
    ? true
    : ENV_OVERRIDE === "false"
      ? false
      : import.meta.env.PROD;

/** Suscripción simulada cuando el control está desactivado (acceso total). */
const BYPASS_SUBSCRIPTION = {
  subscribed: true,
  subscription: { modules: [] },
};

export const useSubscriptions = () => {
  const [isLoading, setIsLoading] = useState(SUBSCRIPTIONS_ENABLED);
  const [subscription, setSubscription] = useState(
    SUBSCRIPTIONS_ENABLED ? null : BYPASS_SUBSCRIPTION,
  );
  const [expired, setExpired] = useState(false);

  const fetchSub = async () => {
    const { error, data } = await Subify.getSubscriptionInfo();

    if (error) {
      console.error(error);
      // Evita que la pantalla se quede cargando si el gestor falla.
      setIsLoading(false);
      return;
    }

    setSubscription(data);
    setIsLoading(false);

    if (data.subscription) {
      const expireDate = new Date(data.subscription.expires_at);
      const now = new Date();

      setExpired(now > expireDate);
    }
  };

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED) return;
    fetchSub();
  }, []);

  return { isLoading, subscription, expired };
};
