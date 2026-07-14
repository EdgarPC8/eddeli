/**
 * Pantalla/modal cuando se abre una sección en mantenimiento (solo producción).
 */
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Stack,
} from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HomeIcon from "@mui/icons-material/Home";

export default function SectionMaintenanceBlocked({ section }) {
  const navigate = useNavigate();
  const title = section?.name || "Esta sección";
  const moduleLabel = section?.moduleLabel;

  const goHome = () => navigate("/", { replace: true });

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Dialog open onClose={goHome} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25, fontWeight: 800 }}>
          <BuildCircleIcon color="error" />
          Sección en mantenimiento
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography variant="body1">
              <strong>{title}</strong>
              {moduleLabel ? ` (${moduleLabel})` : ""} está en mantenimiento.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tu suscripción sigue activa; esta sección solo está temporalmente
              fuera de servicio mientras se mejora o estabiliza.
            </Typography>
            {section?.description ? (
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Prueba más tarde o contacta al administrador del sistema.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={goHome}
            sx={{ fontWeight: 700 }}
          >
            Volver al inicio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
