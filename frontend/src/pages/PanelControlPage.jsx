/** Panel admin: guardar/descargar backup (mensajes del backend). */
import { Navigate } from "react-router-dom";
import { Box, Paper, Typography, Button, Stack, Alert } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { saveBackup, downloadBackup } from "../api/comandsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";

const ALLOWED = new Set(["Administrador", "Programador"]);

export default function PanelControlPage() {
  const { user, toast } = useAuth();

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const handleSave = () => toast({ promise: saveBackup() });
  const handleDownload = () => toast({ promise: downloadBackup() });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Panel de control
      </Typography>
      <Paper variant="panel" sx={{ p: 3, maxWidth: 640 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Copia de seguridad (JSON)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Guarda o descarga el respaldo de usuarios, roles, cuentas, notificaciones y datos base del
          sistema. Para subir o recargar la BD, el rol <strong>Programador</strong> usa la sección
          Comandos.
        </Typography>
        {user?.loginRol === "Administrador" && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Como administrador puedes guardar y descargar el JSON. La recarga completa de la BD está
            restringida al programador.
          </Alert>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            Guardar en servidor
          </Button>
          <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={handleDownload}>
            Descargar JSON
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
