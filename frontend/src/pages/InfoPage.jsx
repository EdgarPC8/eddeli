/**
 * Información del sistema (metadatos de la app Tienda).
 */
import { Box, Typography, Paper, Divider } from "@mui/material";
import { LOGO_PATH } from "../config.js";
import { activeApp } from "../config/appInfo.js";

export default function InfoPage() {
  const year = new Date().getFullYear();

  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <Paper elevation={3} sx={{ maxWidth: 520, width: "100%", p: 4, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          <Box
            component="img"
            src={LOGO_PATH}
            alt={activeApp.name}
            sx={{
              width: 100,
              height: 100,
              mb: 2,
              borderRadius: "50%",
              objectFit: "cover",
              border: 3,
              borderColor: "primary.main",
              boxShadow: 2,
            }}
          />

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {activeApp.name}
          </Typography>

          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Versión {activeApp.version}
          </Typography>

          <Divider sx={{ my: 2, width: "100%" }} />

          <Typography variant="body1" gutterBottom sx={{ lineHeight: 1.7 }}>
            {activeApp.description}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Desarrollado por {activeApp.author}
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={2}>
            © {year} {activeApp.author} — Todos los derechos reservados.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
