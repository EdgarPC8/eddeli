/**
 * Modal: elegir sucursal/local al abrir turno (solo si hay más de uno).
 */
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

function storeCodes(store) {
  const est = store?.establishmentCode || "001";
  const emi = store?.emissionPointCode || "001";
  return `${est}-${emi}`;
}

/** Estado visible respecto a la config SRI global (sin secretos). */
export function storeSriStatus(store, sri) {
  const codes = storeCodes(store);
  if (!sri) {
    return {
      codes,
      label: "Sin datos SRI",
      color: "default",
      detail: "No se pudo leer la configuración fiscal.",
    };
  }
  if (!sri.hasCertificate || !sri.hasCertificatePassword) {
    return {
      codes,
      label: "Firma pendiente",
      color: "warning",
      detail: "Falta certificado .p12 o contraseña en Configuración → Facturación electrónica.",
    };
  }
  if (!sri.readyForInvoicing) {
    return {
      codes,
      label: "Emisor incompleto",
      color: "warning",
      detail: "Completa RUC, razón social y firma en Configuración SRI.",
    };
  }
  const matchesDefault =
    String(store?.establishmentCode || "001") === String(sri.establishmentCode || "001") &&
    String(store?.emissionPointCode || "001") === String(sri.emissionPointCode || "001");
  return {
    codes,
    label: matchesDefault ? "Listo SRI (principal)" : "Listo SRI",
    color: "success",
    detail: matchesDefault
      ? `Coincide con el establecimiento configurado en SRI (${sri.environment}).`
      : `Usará ${codes}. Ambiente SRI: ${sri.environment}.`,
  };
}

export default function OpenShiftStoreDialog({
  open,
  stores = [],
  sri = null,
  selectedId,
  onSelect,
  onCancel,
  onConfirm,
  confirming = false,
}) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        ¿Dónde deseas abrir la caja?
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Elige tu <strong>sucursal propia</strong> (no vitrinas de entrega). Cada una tiene su
          código de establecimiento (001, 002…) para facturación SRI.
        </Typography>
        <List disablePadding>
          {stores.map((store) => {
            const status = storeSriStatus(store, sri);
            const selected = String(selectedId) === String(store.id);
            return (
              <ListItemButton
                key={store.id}
                selected={selected}
                onClick={() => onSelect(String(store.id))}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.75,
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  alignItems: "flex-start",
                }}
              >
                <StorefrontIcon sx={{ mt: 0.5, mr: 1.5, color: "text.secondary" }} />
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={700}>{store.name}</Typography>
                      <Chip size="small" label={status.codes} variant="outlined" />
                      <Chip
                        size="small"
                        color={status.color}
                        icon={
                          status.color === "success" ? (
                            <CheckCircleOutlineIcon />
                          ) : (
                            <WarningAmberIcon />
                          )
                        }
                        label={status.label}
                      />
                    </Stack>
                  }
                  secondary={
                    <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                      {store.address || "Sin dirección"}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {status.detail}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onCancel} disabled={confirming}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!selectedId || confirming}
        >
          {confirming ? "Abriendo…" : "Abrir caja aquí"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
