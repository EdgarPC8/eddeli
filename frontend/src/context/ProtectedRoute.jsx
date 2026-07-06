/**
 * Envuelve rutas que requieren sesión, rol opcional y módulos del plan (gestor central).
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";
import { useSubscriptions, SUBSCRIPTIONS_ENABLED } from "../hooks/useSubscriptions.js";

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

  // Licencias desactivadas (desarrollo): acceso solo por rol, sin gestor.
  if (!SUBSCRIPTIONS_ENABLED) return <Outlet />;

  // Gestor caído o timeout: no bloquear el acceso
  // if (checkFailed) {
  //   return <Outlet />;
  // }

  if (!subscription?.subscribed || expired) {
    return <Navigate to="/subscription-expired" replace />;
  }

  const hasAccess = subscription.subscription.modules.find((m) =>
    m.sections.includes(location.pathname),
  );

  if (!hasAccess) {
    return <Navigate to="/no-subscription" replace />;
  }

  return <Outlet />;
}
