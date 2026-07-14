import { Container, Typography, Paper, Alert } from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

export default function MaintenancePage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <BuildCircleIcon sx={{ fontSize: 80, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Sistema en mantenimiento
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Estamos realizando tareas de mantenimiento para mejorar el sistema.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Por favor, intenta de nuevo más tarde. Disculpa las molestias.
        </Typography>
        <Alert severity="info" sx={{ textAlign: "left" }}>
          Tu suscripción no se canceló: EdDeli solo está en modo mantenimiento
          hasta que el administrador lo reactive.
        </Alert>
      </Paper>
    </Container>
  );
}
