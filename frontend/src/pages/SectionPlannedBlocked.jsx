/**
 * Aviso cuando se abre una sección marcada como «Próximamente».
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
  Alert,
} from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import HomeIcon from "@mui/icons-material/Home";

export default function SectionPlannedBlocked({ section }) {
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
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1.25, fontWeight: 800 }}
        >
          <ScheduleIcon color="warning" />
          Próximamente
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography variant="body1">
              <strong>{title}</strong>
              {moduleLabel ? ` (${moduleLabel})` : ""} estará disponible pronto.
            </Typography>
            <Alert severity="info">
              Tu suscripción sigue activa. Esta función aún no tiene pantalla
              operativa en EdDeli.
            </Alert>
            {section?.description ? (
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            ) : null}
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
