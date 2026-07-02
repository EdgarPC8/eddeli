import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  CircularProgress,
  TextField,
  Alert,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HomeIcon from "@mui/icons-material/Home";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { useSubscriptions } from "../hooks/useSubscriptions.js";
import { activateSubscription } from "../api/subscriptionsRequest.js";

export default function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const { isLoading, subscription, refetch } = useSubscriptions();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    setError("");
    try {
      await activateSubscription(licenseKey.trim());
      setSuccess(true);
      await refetch();
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Error al activar la licencia");
    } finally {
      setActivating(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={64} />
      </Box>
    );
  }

  const modules = subscription?.subscription?.modules || [];

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Suscripción inactiva
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Tu plan no está activo. Activa una licencia para usar EdDeli.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Pega la clave que te entregó el administrador del gestor central.
        </Typography>

        {success ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Licencia activada. Redirigiendo...
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Pegar licencia"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
              <Button
                variant="contained"
                onClick={handleActivate}
                disabled={activating || !licenseKey.trim()}
                startIcon={activating ? <CircularProgress size={18} /> : <VpnKeyIcon />}
              >
                Activar
              </Button>
            </Stack>
          </>
        )}

        {modules.length > 0 && (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Módulos del plan anterior
            </Typography>
            <Stack spacing={1} sx={{ mb: 4, textAlign: "left" }}>
              {modules.map((mod) => (
                <Box
                  key={mod.key}
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
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {mod.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(mod.sections || [])
                        .map((s) => (typeof s === "string" ? s : s.route_path))
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}

        <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate("/home")}>
          Volver al inicio público
        </Button>
      </Paper>
    </Container>
  );
}
