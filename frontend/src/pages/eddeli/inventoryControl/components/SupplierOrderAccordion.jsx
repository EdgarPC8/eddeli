import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentsIcon from "@mui/icons-material/Payments";
import {
  deleteSupplierOrderRequest,
  markSupplierOrderPaidRequest,
  markSupplierOrderReceivedRequest,
} from "../../../../api/ordersRequest";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";
import DocumentAttachmentIcon from "./DocumentAttachmentIcon";
import { useState } from "react";

function supplierTotal(order) {
  return (order.ERP_supplier_order_items || []).reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0
  );
}

function supplierSeverity(order) {
  const received = Boolean(order.receivedAt);
  const paid = Boolean(order.paidAt);
  if (paid && received) return 3;
  if (!paid && !received) return 0;
  if (received && !paid) return 1;
  if (paid && !received) return 2;
  return 1;
}

function severityColor(severity, palette) {
  if (severity === 0) return palette.error.main;
  if (severity === 1) return palette.warning.main;
  if (severity === 2) return palette.info.main;
  return palette.success.main;
}

export default function SupplierOrderAccordion({
  order,
  canManage,
  tone,
  toast,
  onReload,
  onRemove,
  onEdit,
}) {
  const theme = useTheme();
  const [openDelete, setOpenDelete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [busy, setBusy] = useState(false);

  const severity = supplierSeverity(order);
  const base = severityColor(severity, theme.palette);
  const bg = alpha(base, tone);

  const run = async (promise) => {
    setBusy(true);
    try {
      await toast({ promise });
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const handleReceived = () =>
    run(markSupplierOrderReceivedRequest(order.id));

  const handlePaid = () =>
    run(markSupplierOrderPaidRequest(order.id, { paymentMethod }));

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await toast({ promise: deleteSupplierOrderRequest(order.id) });
      setOpenDelete(false);
      onRemove?.(order.id);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SimpleDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        tittle="Eliminar pedido a proveedor"
        onClickAccept={confirmDelete}
      >
        ¿Eliminar el pedido #{order.id} a {order.ERP_supplier?.name || "proveedor"}?
      </SimpleDialog>

      <Accordion
        sx={{
          mb: 1,
          backgroundColor: bg,
          border: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.6),
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1 }}>
            <Box>
              <Typography variant="subtitle1" color="secondary.main">
                Proveedor: {order.ERP_supplier?.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pedido #{order.id} — Total: ${supplierTotal(order).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <DocumentAttachmentIcon
                entityType="supplier_order"
                entityId={order.id}
                title="Ver factura / nota proveedor"
              />
            {canManage && !order.receivedAt && (
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDelete(true);
                  }}
                >
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip>
            )}
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Typography variant="caption">
              Recibido: {order.receivedAt || "Pendiente"}
            </Typography>
            <Typography variant="caption">
              Pagado: {order.paidAt || "Pendiente"}
            </Typography>
          </Box>

          {(order.ERP_supplier_order_items || []).map((item) => (
            <Typography key={item.id} variant="body2">
              • {item.ERP_inventory_product?.name || "Producto"} — {item.quantity} × $
              {Number(item.unitPrice).toFixed(2)}
            </Typography>
          ))}

          {order.notes && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Notas: {order.notes}
              </Typography>
            </>
          )}

          {canManage && (
            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {!order.receivedAt && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<LocalShippingIcon />}
                  disabled={busy}
                  onClick={handleReceived}
                >
                  Marcar recibido
                </Button>
              )}
              {!order.paidAt && (
                <>
                  <TextField
                    select
                    size="small"
                    label="Método pago"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="efectivo">Efectivo</MenuItem>
                    <MenuItem value="transferencia">Transferencia</MenuItem>
                    <MenuItem value="tarjeta">Tarjeta</MenuItem>
                  </TextField>
                  <Button
                    size="small"
                    variant="contained"
                    color="info"
                    startIcon={<PaymentsIcon />}
                    disabled={busy}
                    onClick={handlePaid}
                  >
                    Marcar pagado
                  </Button>
                </>
              )}
              {!order.receivedAt && onEdit && (
                <Button size="small" variant="outlined" onClick={() => onEdit(order)}>
                  Editar
                </Button>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </>
  );
}
