import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { checkSubscription } from "../api/subscriptionsRequest.js";
import { SUBSCRIPTIONS_ENABLED } from "../utils/subscriptionAccess.js";
import { useAuth } from "./AuthContext.jsx";

const SUBSCRIPTION_TIMEOUT_MS = 10_000;

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [checkFailed, setCheckFailed] = useState(false);

  const refetch = useCallback(async () => {
    // Licencias desactivadas: no llamamos al gestor central.
    // Para reactivar, pon SUBSCRIPTIONS_ENABLED = true en subscriptionAccess.js.
    if (!SUBSCRIPTIONS_ENABLED) {
      setSubscription({ subscribed: true, subscription: null });
      setCheckFailed(false);
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated) {
      setSubscription(null);
      setCheckFailed(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCheckFailed(false);

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("subscription check timeout")), SUBSCRIPTION_TIMEOUT_MS);
    });

    try {
      const res = await Promise.race([checkSubscription(), timeout]);
      setSubscription(res.data);
    } catch (error) {
      console.error("SubscriptionProvider:", error);
      setCheckFailed(true);
      setSubscription({ subscribed: false, subscription: null });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <SubscriptionContext.Provider value={{ isLoading, subscription, checkFailed, refetch }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscriptions debe usarse dentro de SubscriptionProvider");
  }
  return ctx;
}
