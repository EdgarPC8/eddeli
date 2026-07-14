/**
 * Página de sección del módulo (factura, retención, etc.).
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
import SriInvoiceEmitPanel from "../../../components/SriInvoiceEmitPanel.jsx";

const SECTION_DOC_TYPE = {
  facturas: "01",
  "liquidacion-compras": "03",
  "notas-credito": "04",
  "notas-debito": "05",
  "guias-remision": "06",
  retenciones: "07",
};

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
  const sriCode = SECTION_DOC_TYPE[section.id] || section.sriCode;
  const isEmitidos = section.id === "emitidos";
  const isNotaVenta = section.id === "notas-venta";
  const canEmit = Boolean(sriCode) && !isNotaVenta;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Icon color="primary" />
        <Typography variant="h6" fontWeight={800}>
          {section.name}
        </Typography>
        {sriCode && <Chip size="small" label={`Tipo SRI ${sriCode}`} variant="outlined" />}
        {canEmit || isEmitidos ? (
          <Chip size="small" color="success" label="Emisión activa" />
        ) : (
          <Chip size="small" color="warning" label="No envía al SRI" />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {section.description}
      </Typography>

      {isNotaVenta ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          La <strong>nota de venta</strong> es un comprobante operativo interno. No se envía al SRI.
          Para el fisco usa <strong>Factura (01)</strong> (incluso a consumidor final).
        </Alert>
      ) : null}

      {canEmit ? (
        <SriInvoiceEmitPanel showForm documentType={sriCode} />
      ) : isEmitidos ? (
        <SriInvoiceEmitPanel showForm={false} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 4, textAlign: "center", bgcolor: "action.hover" }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Sin emisión electrónica
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: "auto" }}>
            Usa Facturas u otro comprobante electrónico SRI (03–07) para enviar al servicio de rentas.
          </Typography>
          <Button component={RouterLink} to="/comprobantes-electronicos/facturas" variant="contained">
            Ir a Facturas
          </Button>
        </Paper>
      )}
    </Box>
  );
}
