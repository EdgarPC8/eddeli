import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import {
  getCustomerOrderCollectionSummaryRequest,
  payCustomerOrderRequest,
} from "../../../../api/ordersRequest";

function money(n) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    Number(n || 0)
  );
}

function nowLocalDateTime() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Diálogo para abonar un pedido de cliente desde el calendario.
 * Usa la misma lógica de grupos de Cobranzas.
 */
export default function CustomerOrderPayDialog({
  open,
  order,
  onClose,
  onPaid,
  toast,
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    if (!open || !order?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSummary(null);
      try {
        const res = await getCustomerOrderCollectionSummaryRequest(order.id);
        if (cancelled) return;
        const data = res?.data || {};
        setSummary(data);
        const suggested = Number(data.suggestedAmount || 0);
        setPayAmount(suggested > 0 ? String(suggested) : "");
        setPayDate(nowLocalDateTime());
        setPayMethod("efectivo");
        setPayNote(`Abono pedido #${order.id}`);
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || "No se pudo cargar el saldo del pedido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, order?.id]);

  const suggested = Number(summary?.suggestedAmount || 0);

  const handlePay = async () => {
    const amount = Number(String(payAmount).replace(",", "."));
    if (!(amount > 0)) {
      void toast?.({ message: "Ingresa un monto válido", variant: "warning" });
      return;
    }
    if (suggested > 0 && amount > suggested + 0.009) {
      void toast?.({
        message: `El abono no puede superar ${money(suggested)}`,
        variant: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      await toast?.({
        promise: payCustomerOrderRequest(order.id, {
          amount,
          date: payDate,
          method: payMethod,
          note: payNote || `Abono pedido #${order.id}`,
        }),
      });
      onPaid?.();
      onClose?.();
    } catch {
      /* toast */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Abonar pedido #{order?.id}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!error && summary ? (
            <>
              <Alert severity="info" sx={{ py: 0.5 }}>
                Se usa Cobranzas:{" "}
                {summary.willCreate
                  ? "se creará un grupo con los productos pendientes de este pedido."
                  : summary.willAddToGroup
                    ? "se añadirán al grupo abierto existente y luego se abona."
                    : "se abona al grupo ya vinculado."}{" "}
                Para mezclar varios pedidos o fechas, arma el grupo en{" "}
                <b>Cobranzas</b>.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Cliente: <b>{summary.customerName || order?.ERP_customer?.name || "—"}</b>
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Pendiente ${money(summary.orderUnpaidTotal)}`} />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`A cobrar ahora ${money(suggested)}`}
                />
                {summary.concept ? (
                  <Chip size="small" variant="outlined" label={summary.concept} />
                ) : null}
              </Stack>
            </>
          ) : null}

          <TextField
            label="Monto a abonar"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            fullWidth
            disabled={loading || !!error}
            helperText="Puedes abonar solo una parte; el resto queda en el grupo"
          />
          {suggested > 0 ? (
            <Button
              size="small"
              onClick={() => setPayAmount(String(suggested))}
              disabled={loading || !!error}
            >
              Usar saldo completo ({money(suggested)})
            </Button>
          ) : null}
          <TextField
            label="Fecha"
            type="datetime-local"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            disabled={loading || !!error}
          />
          <TextField
            select
            label="Método"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            fullWidth
            disabled={loading || !!error}
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
            disabled={loading || !!error}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PaymentsIcon />}
          onClick={handlePay}
          disabled={loading || !!error || !summary}
        >
          Registrar abono
        </Button>
      </DialogActions>
    </Dialog>
  );
}
