/**
 * Envuelve rutas que requieren sesión y opcionalmente un rol permitido.
 */
import { Navigate, Outlet } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ requiredRol }) {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  return <Outlet />;
}
