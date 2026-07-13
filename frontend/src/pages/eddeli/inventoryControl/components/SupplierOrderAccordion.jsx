import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
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
  markSupplierOrderReceivedRequest,
  paySupplierOrderRequest,
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
  if (order?.totalAmount != null && Number.isFinite(Number(order.totalAmount))) {
    return Number(Number(order.totalAmount).toFixed(2));
  }
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

function supplierPaid(order) {
  if (order?.paidAmount != null && Number.isFinite(Number(order.paidAmount))) {
    return Number(Number(order.paidAmount).toFixed(2));
  }
  return order?.paidAt ? supplierTotal(order) : 0;
}

function supplierRemaining(order) {
  if (order?.remainingAmount != null && Number.isFinite(Number(order.remainingAmount))) {
    return Number(Number(order.remainingAmount).toFixed(2));
  }
  return Number(Math.max(0, supplierTotal(order) - supplierPaid(order)).toFixed(2));
}

function supplierSeverity(order) {
  const received = Boolean(order.receivedAt);
  const remaining = supplierRemaining(order);
  const paid = supplierPaid(order);
  const fullyPaid = remaining <= 0.009;
  const partial = !fullyPaid && paid > 0.009;

  if (fullyPaid && received) return 3;
  if (!fullyPaid && !received && !partial) return 0;
  if (partial) return received ? 1 : 0;
  if (received && !fullyPaid) return 1;
  if (fullyPaid && !received) return 2;
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

function nowLocalDateTime() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function severityColor(severity, palette) {
  if (severity === 0) return palette.error.main;
  if (severity === 1) return palette.warning.main;
  if (severity === 2) return palette.info.main;
  return palette.success.main;
}

function money(n) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    Number(n || 0)
  );
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
  const [busy, setBusy] = useState(false);
  const [addDraft, setAddDraft] = useState({ productId: "", quantity: "", unitPrice: "" });
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({ receivedAt: "", paidAt: "" });

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNote, setPayNote] = useState("");

  const total = supplierTotal(order);
  const paid = supplierPaid(order);
  const remaining = supplierRemaining(order);
  const fullyPaid = remaining <= 0.009;
  const payPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

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

  const handleReceived = () => run(markSupplierOrderReceivedRequest(order.id));

  const openPayDialog = (full = false) => {
    const rem = remaining > 0 ? remaining : total;
    setPayAmount(full || rem > 0 ? String(rem) : "");
    setPayDate(nowLocalDateTime());
    setPayMethod("efectivo");
    setPayNote(full ? `Liquidación pedido #${order.id}` : `Abono pedido #${order.id}`);
    setPayOpen(true);
  };

  const handleConfirmPay = async () => {
    const amount = Number(String(payAmount).replace(",", "."));
    if (!(amount > 0)) {
      void toast?.({ message: "Ingresa un monto válido", variant: "warning" });
      return;
    }
    if (amount > remaining + 0.009) {
      void toast?.({
        message: `El abono no puede superar el saldo (${money(remaining)})`,
        variant: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await toast({
        promise: paySupplierOrderRequest(order.id, {
          amount,
          date: payDate,
          method: payMethod,
          note: payNote || `Abono pedido #${order.id}`,
        }),
      });
      setPayOpen(false);
      await onReload?.();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

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

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Abonar pedido #{order.id}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Puedes abonar después de crear el pedido. Saldo actual: <b>{money(remaining)}</b>
            </Alert>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Total ${money(total)}`} />
              <Chip size="small" color="success" variant="outlined" label={`Abonado ${money(paid)}`} />
              <Chip size="small" color="error" variant="outlined" label={`Saldo ${money(remaining)}`} />
            </Stack>
            <TextField
              label="Monto a abonar"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              helperText="Deja el saldo o cámbialo por un abono parcial"
            />
            <Button size="small" onClick={() => setPayAmount(String(remaining))} disabled={remaining <= 0}>
              Usar saldo completo ({money(remaining)})
            </Button>
            <TextField
              label="Fecha"
              type="datetime-local"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Método"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
              <MenuItem value="otro">Otro</MenuItem>
            </TextField>
            <TextField
              label="Nota"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setPayOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmPay} disabled={busy}>
            Registrar abono
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              pr: 1,
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" color="secondary.main">
                Proveedor: {order.ERP_supplier?.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Pedido #{order.id} — Total: {money(total)}
                {!fullyPaid ? (
                  <>
                    {" "}
                    · Saldo: <b>{money(remaining)}</b>
                  </>
                ) : (
                  " · Pagado"
                )}
              </Typography>
              {!fullyPaid && total > 0 ? (
                <LinearProgress
                  variant="determinate"
                  value={payPct}
                  color="error"
                  sx={{ mt: 0.75, height: 4, borderRadius: 99, maxWidth: 220 }}
                />
              ) : null}
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
              Pago:{" "}
              {fullyPaid
                ? order.paidAt
                  ? formatDateTime(order.paidAt)
                  : "Liquidado"
                : paid > 0
                  ? `Parcial (${money(paid)} de ${money(total)})`
                  : "Pendiente"}
            </Typography>
          </Box>

          {(order.ERP_supplier_order_items || []).map((item) => {
            const unit = getProductUnitLabel(item.ERP_inventory_product);
            const lineBase = formatOrderLineTotal(item.quantity, item.unitPrice);
            const rate = Number(item.taxRate || 0);
            const lineTotal = lineBase * (1 + rate / 100);
            return (
              <Typography key={item.id} variant="body2">
                • {item.ERP_inventory_product?.name || "Producto"} — {item.quantity} {unit} ×{" "}
                {formatUnitPrice(item.unitPrice)}
                {rate > 0 ? ` + IVA ${rate}%` : ""} = {formatProductPrice(lineTotal)}
              </Typography>
            );
          })}

          {(order.ERP_supplier_order_items || []).length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={700}>
                Total pedido: {formatProductPrice(total)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abonado: {money(paid)} · Saldo: {money(remaining)}
              </Typography>
            </Stack>
          )}

          {Array.isArray(order.payments) && order.payments.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Abonos registrados
              </Typography>
              {order.payments.map((p) => (
                <Typography key={p.id} variant="caption" display="block" color="text.secondary">
                  · {p.date || "—"} — {money(p.amount)} ({p.method}
                  {p.note ? ` · ${p.note}` : ""})
                </Typography>
              ))}
            </Box>
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
              {!fullyPaid && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<PaymentsIcon />}
                    disabled={busy}
                    onClick={() => openPayDialog(false)}
                  >
                    Abonar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={busy || remaining <= 0}
                    onClick={() => openPayDialog(true)}
                  >
                    Liquidar todo
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
                          p != null ? String(getDefaultDistributorPrice(p)) : prev.unitPrice,
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
