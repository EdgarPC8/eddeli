/**
 * Página de sección del módulo (factura, retención, etc.).
 * Por ahora: bandeja vacía lista para conectar emisión SRI.
 */
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { getElectronicDocSection } from "./electronicDocsCatalog.js";

export default function ElectronicDocsSectionPage() {
  const { sectionId } = useParams();
  const section = getElectronicDocSection(sectionId);

  if (!section || section.id === "hub" || section.external) {
    return (
      <Alert severity="warning">
        Sección no encontrada.{" "}
        <Button component={RouterLink} to="/comprobantes-electronicos" size="small">
          Volver al inicio
        </Button>
      </Alert>
    );
  }

  const Icon = section.icon;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Icon color="primary" />
        <Typography variant="h6" fontWeight={800}>
          {section.name}
        </Typography>
        {section.sriCode && (
          <Chip size="small" label={`Tipo SRI ${section.sriCode}`} variant="outlined" />
        )}
        <Chip size="small" color="warning" label="Emisión pendiente" />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {section.description}
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Aquí irá el listado, alta y autorización de <strong>{section.name.toLowerCase()}</strong>.
        Mientras tanto configura el emisor (firma .p12, RUC, ambiente) y las sucursales propias con
        códigos 001 / 002.
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Sin documentos aún
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: "auto" }}>
          Cuando se active la emisión al SRI, verás aquí los comprobantes de esta sección con
          estado (borrador, enviado, autorizado, rechazado), clave de acceso y RIDE.
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/sistema/configuracion?tab=sri" variant="contained">
            Configurar SRI
          </Button>
          <Button component={RouterLink} to="/comprobantes-electronicos/emitidos" variant="outlined">
            Ver documentos emitidos
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
