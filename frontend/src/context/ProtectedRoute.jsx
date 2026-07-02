/**
 * Envuelve rutas que requieren sesión, rol opcional y módulos del plan (gestor central).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";
import { useSubscriptions } from "./SubscriptionContext.jsx";
import {
  getAllowedPaths,
  isPathAllowed,
  SUBSCRIPTION_SKIP_PATHS,
} from "../utils/subscriptionAccess.js";

export default function ProtectedRoute({ requiredRol }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isLoading: isLoadingSub, subscription, checkFailed } = useSubscriptions();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={64} />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/home" replace />;

  if (!user?.loginRol) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
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

  // Páginas de suscripción: no esperar al gestor central
  if (SUBSCRIPTION_SKIP_PATHS.includes(location.pathname)) {
    return <Outlet />;
  }

  if (isLoadingSub) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={64} />
      </Box>
    );
  }

  // Gestor caído o timeout: no bloquear el acceso
  if (checkFailed) {
    return <Outlet />;
  }

  if (!subscription?.subscribed) {
    return <Navigate to="/subscription-expired" replace />;
  }

  const allowedPaths = getAllowedPaths(subscription);

  // Gestor respondió pero sin rutas mapeables: no bloquear toda la app
  if (allowedPaths.size === 0) {
    return <Outlet />;
  }

  if (!isPathAllowed(location.pathname, allowedPaths)) {
    return <Navigate to="/no-subscription" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
