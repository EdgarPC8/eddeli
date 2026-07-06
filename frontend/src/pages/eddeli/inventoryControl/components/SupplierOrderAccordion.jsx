import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
import AddIcon from "@mui/icons-material/Add";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import {
  addSupplierOrderItemRequest,
  deleteSupplierOrderRequest,
  markSupplierOrderPaidRequest,
  markSupplierOrderReceivedRequest,
  updateSupplierOrderRequest,
} from "../../../../api/ordersRequest";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";
import SearchableSelect from "../../../../components/SearchableSelect";
import { useAuth } from "../../../../context/AuthContext";
import { formatDateTime } from "../../../../helpers/functions.js";
import DocumentAttachmentIcon from "./DocumentAttachmentIcon";
import DocumentUploadButton from "./DocumentUploadButton";
import ProductPriceReference, {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
  formatUnitPrice,
} from "./ProductPriceReference";
import { useState } from "react";

function supplierTotal(order) {
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  let sub = 0;
  let iva = 0;
  (order.ERP_supplier_order_items || []).forEach((it) => {
    const line = Number(it.quantity || 0) * Number(it.unitPrice || 0);
    sub += line;
    iva += line * (Number(it.taxRate || 0) / 100);
  });
  return round2(round2(sub) + round2(iva));
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

/** Convierte una fecha (ISO o "dd/MM/yyyy HH:mm:ss") a "YYYY-MM-DD" para inputs date. */
function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes("/")) {
    const [datePart] = value.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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
  products = [],
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const isProgramador = user?.loginRol === "Programador";
  const [openDelete, setOpenDelete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [busy, setBusy] = useState(false);
  const [addDraft, setAddDraft] = useState({ productId: "", quantity: "", unitPrice: "" });
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({ receivedAt: "", paidAt: "" });

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

  const openDateDialog = () => {
    setDateDraft({
      receivedAt: toDateInputValue(order.receivedAt),
      paidAt: toDateInputValue(order.paidAt),
    });
    setDateDialogOpen(true);
  };

  const handleSaveDates = async () => {
    setBusy(true);
    try {
      await toast({
        promise: updateSupplierOrderRequest(order.id, {
          receivedAt: dateDraft.receivedAt
            ? new Date(`${dateDraft.receivedAt}T12:00:00`).toISOString()
            : null,
          paidAt: dateDraft.paidAt
            ? new Date(`${dateDraft.paidAt}T12:00:00`).toISOString()
            : null,
        }),
      });
      setDateDialogOpen(false);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

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

  const handleAddProduct = async () => {
    const productId = Number(addDraft.productId);
    const quantity = Number(String(addDraft.quantity ?? "").replace(",", "."));
    const unitPrice = Number(String(addDraft.unitPrice ?? "").replace(",", "."));
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      void toast?.({ message: "Selecciona producto y cantidad válidos.", variant: "warning" });
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      void toast?.({ message: "Precio unitario inválido.", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      await toast({
        promise: addSupplierOrderItemRequest(order.id, { productId, quantity, unitPrice }),
      });
      setAddDraft({ productId: "", quantity: "", unitPrice: "" });
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

      <Dialog open={dateDialogOpen} onClose={() => setDateDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Editar fechas · Pedido #{order.id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
            Corrección manual (solo Programador). No re-dispara movimientos de stock.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Fecha de entrega"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateDraft.receivedAt}
              onChange={(e) => setDateDraft((p) => ({ ...p, receivedAt: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Fecha de pago"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateDraft.paidAt}
              onChange={(e) => setDateDraft((p) => ({ ...p, paidAt: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1 }}>
          <Button onClick={() => setDateDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveDates} disabled={busy}>
            Guardar fechas
          </Button>
        </DialogActions>
      </Dialog>

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
              Recibido: {order.receivedAt ? formatDateTime(order.receivedAt) : "Pendiente"}
            </Typography>
            <Typography variant="caption">
              Pagado: {order.paidAt ? formatDateTime(order.paidAt) : "Pendiente"}
            </Typography>
          </Box>

          {(order.ERP_supplier_order_items || []).map((item) => {
            const unit = getProductUnitLabel(item.ERP_inventory_product);
            const base = formatOrderLineTotal(item.quantity, item.unitPrice);
            const rate = Number(item.taxRate || 0);
            const lineTotal = base * (1 + rate / 100);
            return (
              <Typography key={item.id} variant="body2">
                • {item.ERP_inventory_product?.name || "Producto"} — {item.quantity} {unit} ×{" "}
                {formatUnitPrice(item.unitPrice)}
                {rate > 0 ? ` + IVA ${rate}%` : ""} = {formatProductPrice(lineTotal)}
              </Typography>
            );
          })}

          {(order.ERP_supplier_order_items || []).length > 0 && (
            <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>
              Total pedido: {formatProductPrice(supplierTotal(order))}
            </Typography>
          )}

          {order.notes && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Notas: {order.notes}
              </Typography>
            </>
          )}

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" gutterBottom>
            Factura / evidencia del proveedor
          </Typography>
          <DocumentUploadButton
            entityType="supplier_order"
            entityId={order.id}
            label="Factura / nota proveedor"
            buttonText="Subir factura"
            canManage={canManage}
          />

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
              {isProgramador && (
                <Tooltip title="Editar fechas de entrega y pago (Programador)">
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={<EditCalendarIcon />}
                    disabled={busy}
                    onClick={openDateDialog}
                  >
                    Editar fechas
                  </Button>
                </Tooltip>
              )}
            </Box>
          )}

          {canManage && !order.receivedAt && products.length > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Añadir producto a este pedido
              </Typography>
              <Grid container spacing={1} alignItems="flex-end">
                <Grid item xs={12} sm={5}>
                  <SearchableSelect
                    label="Producto"
                    items={products}
                    value={addDraft.productId}
                    onChange={(val) => {
                      const p = products.find((x) => String(x.id) === String(val));
                      setAddDraft((prev) => ({
                        ...prev,
                        productId: val != null && val !== "" ? String(val) : "",
                        unitPrice:
                          p != null
                            ? String(getDefaultDistributorPrice(p))
                            : prev.unitPrice,
                      }));
                    }}
                    getOptionLabel={(p) => p?.name ?? ""}
                    getOptionValue={(p) => p?.id ?? ""}
                    placeholder="Buscar producto…"
                  />
                  {(() => {
                    const p = addDraft.productId
                      ? products.find((x) => String(x.id) === String(addDraft.productId))
                      : null;
                    return p ? (
                      <ProductPriceReference
                        product={p}
                        compact
                        quantity={addDraft.quantity}
                        unitPrice={addDraft.unitPrice}
                      />
                    ) : null;
                  })()}
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    inputProps={{ min: 0.01, step: "any" }}
                    size="small"
                    fullWidth
                    value={addDraft.quantity}
                    onChange={(e) => setAddDraft((p) => ({ ...p, quantity: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Precio unitario"
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                    size="small"
                    fullWidth
                    value={addDraft.unitPrice}
                    onChange={(e) => setAddDraft((p) => ({ ...p, unitPrice: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <Tooltip title="Agregar producto">
                    <IconButton
                      color="primary"
                      disabled={busy}
                      onClick={() => void handleAddProduct()}
                      sx={{ border: 1, borderColor: "primary.main", borderRadius: 1 }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </>
  );
}
