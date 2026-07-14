/**
 * Envuelve rutas que requieren sesión, rol opcional y módulos del plan (gestor central).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";
import {
  useSubscriptions,
  SUBSCRIPTIONS_ENABLED,
} from "../hooks/useSubscriptions.js";
import {
  findMaintenanceSectionForPath,
  findPlannedSectionForPath,
  shouldBlockMaintenancePath,
  shouldBlockPlannedPath,
} from "../config/sectionMaintenanceAccess.js";
import SectionMaintenanceBlocked from "../pages/SectionMaintenanceBlocked.jsx";
import SectionPlannedBlocked from "../pages/SectionPlannedBlocked.jsx";

export default function ProtectedRoute({ requiredRol }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { isLoading: isLoadingSub, subscription, expired } = useSubscriptions();

  if (isLoading || isLoadingSub) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={64} />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/home" replace />;

  if (!user?.loginRol) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={64} />
      </Box>
    );
  }

  if (requiredRol?.length && !requiredRol.includes(user.loginRol)) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Acceso denegado
        </Typography>
        <Typography color="text.secondary">
          Tu rol ({user.loginRol}) no tiene permiso para ver esta sección.
        </Typography>
      </Box>
    );
  }

  const subModules = subscription?.subscription?.modules;

  // Licencias desactivadas (desarrollo): acceso solo por rol.
  if (!SUBSCRIPTIONS_ENABLED) return <Outlet />;

  // Mantenimiento de la app: solo avisa. No cancela ni “quita” la suscripción.
  if (subscription?.maintenance) {
    return <Navigate to="/mantenimiento" replace />;
  }

  if (
    shouldBlockMaintenancePath(location.pathname, user.loginRol, subModules)
  ) {
    return (
      <SectionMaintenanceBlocked
        section={findMaintenanceSectionForPath(
          location.pathname,
          subModules,
        )}
      />
    );
  }

  if (shouldBlockPlannedPath(location.pathname, user.loginRol, subModules)) {
    return (
      <SectionPlannedBlocked
        section={findPlannedSectionForPath(location.pathname, subModules)}
      />
    );
  }

  if (!subscription?.subscribed || expired) {
    return <Navigate to="/subscription-expired" replace />;
  }

  // Exacto o prefijo (rutas anidadas: /editor/123, /publicidad/campanas/:id, ?query).
  const path = location.pathname;
  const sectionMatches = (sectionKey) => {
    if (!sectionKey) return false;
    const key = String(sectionKey).split("?")[0];
    return path === key || path.startsWith(`${key}/`);
  };
  const hasAccess = subscription.subscription?.modules?.find((m) =>
    m.sections.some((s) => sectionMatches(s.key)),
  );

  if (!hasAccess) {
    return (
      <Navigate
        to="/no-subscription"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
