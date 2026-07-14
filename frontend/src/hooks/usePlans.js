/**
 * Catálogo local de planes (informativo).
 * La activación real la hace el gestor SoftEd (push entitlement).
 */
import { useMemo } from "react";
import { SYSTEM_PLANS } from "../config/systemPlansCatalog.js";

export const usePlans = () => {
  const plans = useMemo(() => SYSTEM_PLANS, []);
  return { plans, isLoading: false };
};
