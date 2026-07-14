/**
 * Panel inicial del módulo: tarjetas a cada tipo de comprobante.
 */
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CardActionArea,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ELECTRONIC_DOC_SECTIONS } from "./electronicDocsCatalog.js";

const cards = ELECTRONIC_DOC_SECTIONS.filter((s) => s.id !== "hub");

export default function ElectronicDocsHubPage() {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configura el emisor (firma .p12, RUC, ambiente Pruebas) y emite desde cada sección: Facturas,
        notas de crédito/débito, retenciones, guías o liquidaciones. Verás estado y clave en
        Documentos emitidos.
      </Alert>

      <Grid container spacing={1.5}>
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Grid item xs={12} sm={6} key={item.id}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  height: "100%",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  "&:hover": { borderColor: "primary.main", boxShadow: 2 },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={item.path}
                  sx={{ p: 2, height: "100%", alignItems: "stretch" }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: "action.hover",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon color="primary" fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {item.name}
                        </Typography>
                        {item.sriCode && (
                          <Chip size="small" label={item.sriCode} variant="outlined" sx={{ height: 20 }} />
                        )}
                        {item.status === "soon" ? (
                          <Chip size="small" color="warning" label="Próximamente" sx={{ height: 20 }} />
                        ) : (
                          <Chip size="small" color="success" label="Disponible" sx={{ height: 20 }} />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
        <Button component={RouterLink} to="/sistema/configuracion?tab=sri" variant="contained">
          Ir a configuración SRI
        </Button>
        <Button component={RouterLink} to="/facturacion" variant="outlined">
          Comprobantes POS (caja)
        </Button>
        <Button component={RouterLink} to="/inventory/puntos-venta" variant="outlined">
          Sucursales / locales
        </Button>
      </Stack>
    </Box>
  );
}
