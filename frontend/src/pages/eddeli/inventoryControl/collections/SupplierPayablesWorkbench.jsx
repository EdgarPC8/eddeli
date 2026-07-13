/**
 * Cuentas por pagar: abonos a pedidos de proveedores.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  getSupplierPayablesWorkbenchRequest,
  paySupplierOrderRequest,
  deleteSupplierOrderPaymentRequest,
} from "../../../../api/ordersRequest";
import { useAuth } from "../../../../context/AuthContext";
import {
  money,
  nowLocalDateTime,
  toNum,
} from "./helpers.js";

export default function SupplierPayablesWorkbench() {
  const isMobile = useMediaQuery("(max-width:900px)");
  const { toast: toastAuth } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uiMsg, setUiMsg] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payOrderId, setPayOrderId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payNote, setPayNote] = useState("Abono a proveedor");
  const [payMethod, setPayMethod] = useState("efectivo");

  const load = async (keepSelection = true) => {
    try {
      setLoading(true);
      setUiMsg(null);
      const res = await getSupplierPayablesWorkbenchRequest();
      const data = res?.data || {};
      const nextSuppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
      const nextOrders = Array.isArray(data.orders) ? data.orders : [];
      const nextPayments = Array.isArray(data.payments) ? data.payments : [];
      setSuppliers(nextSuppliers);
      setOrders(nextOrders);
      setPayments(nextPayments);

      if (!keepSelection || !selectedSupplierId) {
        const firstWithDebt = nextSuppliers.find((s) => toNum(s.debtTotal) > 0);
        setSelectedSupplierId(firstWithDebt?.id ?? nextSuppliers[0]?.id ?? null);
        setSelectedOrderId(null);
        return;
      }
      if (!nextSuppliers.some((s) => s.id === selectedSupplierId)) {
        setSelectedSupplierId(nextSuppliers[0]?.id ?? null);
        setSelectedOrderId(null);
      }
    } catch (err) {
      console.error("supplier payables load:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error cargando cuentas por pagar",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  const supplierOrders = useMemo(
    () =>
      orders
        .filter((o) => o.supplierId === selectedSupplierId)
        .slice()
        .sort((a, b) => {
          const ra = toNum(b.remainingAmount) - toNum(a.remainingAmount);
          if (ra !== 0) return ra;
          return String(b.date || "").localeCompare(String(a.date || ""));
        }),
    [orders, selectedSupplierId]
  );

  const pendingOrders = useMemo(
    () => supplierOrders.filter((o) => toNum(o.remainingAmount) > 0.009),
    [supplierOrders]
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const orderPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          selectedOrderId != null &&
          Number(p.supplierOrderId) === Number(selectedOrderId) &&
          p.status === "completed"
      ),
    [payments, selectedOrderId]
  );

  const totalDebt = useMemo(
    () => roundSum(suppliers.map((s) => toNum(s.debtTotal))),
    [suppliers]
  );

  const openPay = (order) => {
    setPayOrderId(order.id);
    setPayAmount(String(toNum(order.remainingAmount) || ""));
    setPayDate(nowLocalDateTime());
    setPayMethod("efectivo");
    setPayNote(`Abono pedido #${order.id}`);
    setPayOpen(true);
    setSelectedOrderId(order.id);
  };

  const confirmPay = async () => {
    try {
      const amt = Number(payAmount);
      if (!(amt > 0)) {
        setUiMsg({ type: "error", text: "Ingresa un monto válido" });
        return;
      }
      setLoading(true);
      const res = await paySupplierOrderRequest(payOrderId, {
        amount: amt,
        date: payDate,
        note: payNote,
        method: payMethod,
      });
      setPayOpen(false);
      await load(true);
      const fully = res?.data?.fullyPaid;
      toastAuth?.({
        message: fully
          ? `Pedido #${payOrderId} liquidado`
          : `Abono de ${money(amt)} registrado`,
        variant: "success",
      });
      setUiMsg({
        type: "success",
        text: fully
          ? `Pedido #${payOrderId} pagado por completo.`
          : `Abono registrado. Saldo restante: ${money(res?.data?.remainingAmount)}.`,
      });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo registrar el abono",
      });
    } finally {
      setLoading(false);
    }
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm("¿Eliminar este abono? Se revertirá el gasto contable.")) return;
    try {
      setLoading(true);
      await deleteSupplierOrderPaymentRequest(paymentId);
      await load(true);
      setUiMsg({ type: "success", text: "Abono eliminado" });
    } catch (err) {
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "No se pudo eliminar el abono",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.error.main}14 0%, ${t.palette.background.paper} 55%)`,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Cuentas por pagar (proveedores)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abona por pedido lo que debes a cada proveedor. Puedes pagar parcial o total.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                color="error"
                variant="outlined"
                label={`Deuda total: ${money(totalDebt)}`}
                sx={{ fontWeight: 800 }}
              />
              <Tooltip title="Refrescar">
                <span>
                  <IconButton onClick={() => load(true)} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {loading ? <LinearProgress sx={{ mt: 1.5 }} /> : null}

          {uiMsg ? (
            <Alert
              severity={uiMsg.type || "info"}
              sx={{ mt: 1.5 }}
              onClose={() => setUiMsg(null)}
            >
              {uiMsg.text}
            </Alert>
          ) : null}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Proveedores con deuda (primero los que más debes)
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              maxHeight: isMobile ? 120 : "none",
              overflowY: isMobile ? "auto" : "visible",
            }}
          >
            {suppliers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay proveedores registrados.
              </Typography>
            ) : (
              suppliers.map((s) => {
                const active = s.id === selectedSupplierId;
                const amount = toNum(s.debtTotal);
                return (
                  <Chip
                    key={s.id}
                    clickable
                    onClick={() => {
                      setSelectedSupplierId(s.id);
                      setSelectedOrderId(null);
                      setUiMsg(null);
                    }}
                    color={active ? "error" : amount > 0 ? "warning" : "default"}
                    variant={active ? "filled" : "outlined"}
                    label={`${s.name} · ${money(amount)}`}
                    size="small"
                  />
                );
              })
            )}
          </Box>
        </CardContent>
      </Card>

      {!supplier ? (
        <Alert severity="info">Selecciona un proveedor.</Alert>
      ) : (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pedidos con saldo: {pendingOrders.length} · Debes{" "}
                    <b>{money(supplier.debtTotal)}</b>
                  </Typography>
                </Box>
              </Stack>

              {pendingOrders.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  No debes nada a este proveedor (o todos sus pedidos están liquidados).
                </Alert>
              ) : (
                <Stack spacing={1.25}>
                  {pendingOrders.map((o) => {
                    const pct =
                      o.totalAmount > 0
                        ? Math.min(100, Math.round((o.paidAmount / o.totalAmount) * 100))
                        : 0;
                    const active = o.id === selectedOrderId;
                    return (
                      <Box
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        sx={{
                          border: 1,
                          borderColor: active ? "error.main" : "divider",
                          borderRadius: 2,
                          p: 1.5,
                          cursor: "pointer",
                          bgcolor: active ? "action.selected" : "background.paper",
                          transition: "border-color .15s, background-color .15s",
                          "&:hover": { borderColor: "error.light" },
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ xs: "stretch", sm: "center" }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Typography sx={{ fontWeight: 800 }}>
                                Pedido #{o.id}
                              </Typography>
                              <Chip size="small" label={o.date || "—"} variant="outlined" />
                              <Chip
                                size="small"
                                label={o.status}
                                color={o.status === "recibido" ? "success" : "default"}
                                variant="outlined"
                              />
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                              <Chip size="small" label={`Total ${money(o.totalAmount)}`} />
                              <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label={`Abonado ${money(o.paidAmount)}`}
                              />
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label={`Saldo ${money(o.remainingAmount)}`}
                              />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              color="error"
                              sx={{ mt: 1, height: 6, borderRadius: 99 }}
                            />
                          </Box>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<PaymentsIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPay(o);
                            }}
                            disabled={loading}
                          >
                            Abonar
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>

          {selectedOrder ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                  Detalle pedido #{selectedOrder.id}
                </Typography>
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  {(selectedOrder.items || []).map((it) => (
                    <Stack
                      key={it.id}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="body2">
                        {it.product} × {it.quantity}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {money(it.lineTotal)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Historial de abonos
                </Typography>
                {orderPayments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay abonos en este pedido.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {orderPayments.map((p) => (
                      <Stack
                        key={p.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {money(p.amount)} · {p.method}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.date} {p.note ? `· ${p.note}` : ""}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removePayment(p.id)}
                          disabled={loading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      )}

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Abonar a proveedor</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Pedido #{payOrderId}. Puedes abonar solo una parte; el saldo queda pendiente.
            </Alert>
            <TextField
              label="Monto"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={confirmPay} disabled={loading}>
            Registrar abono
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function roundSum(nums) {
  return Number(nums.reduce((a, b) => a + toNum(b), 0).toFixed(2));
}
