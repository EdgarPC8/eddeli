import { Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HomeIcon from "@mui/icons-material/Home";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSubscriptions } from "../hooks/useSubscriptions.js";

export default function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const { isLoading, subscription, refetch } = useSubscriptions();

  const handleRefresh = async () => {
    await refetch?.();
    // Si ya está activa, ProtectedRoute dejará pasar al salir de esta página.
    navigate("/", { replace: true });
  };

  if (isLoading) {
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

  if (subscription?.maintenance) {
    return <Navigate to="/mantenimiento" replace />;
  }

  const modules = subscription?.subscription?.modules || [];
  const planName = subscription?.subscription?.plan_name;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Suscripción inactiva
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Esta instalación de EdDeli no tiene un plan activo.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          La habilitación se hace desde el gestor central SoftEd (activar o
          cambiar el plan). Aquí ya no se pega ninguna licencia.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
          Cuando el administrador te habilite la suscripción en el gestor,
          pulsa «Comprobar de nuevo» para cargar el plan en esta app.
        </Alert>

        {planName ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Último plan registrado: <strong>{planName}</strong>
          </Typography>
        ) : null}

        {modules.length > 0 && (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Módulos del último plan
            </Typography>
            <Stack spacing={1} sx={{ mb: 3, textAlign: "left" }}>
              {modules.map((mod, i) => (
                <Box
                  key={mod.id || mod.key || i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                  }}
                >
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    {mod.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="center"
        >
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Comprobar de nuevo
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate("/home")}
          >
            Volver al inicio público
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
