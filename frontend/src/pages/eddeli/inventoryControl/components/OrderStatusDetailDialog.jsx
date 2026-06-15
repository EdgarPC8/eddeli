import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getOrderStatusWorkbenchRequest } from "../../../../api/ordersRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import OrderStatusWorkbenchContent from "../orderStatus/OrderStatusWorkbenchContent.jsx";

export default function OrderStatusDetailDialog({ open, onClose, initialTab = "unpaid" }) {
  const theme = useTheme();
  const { toast } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getOrderStatusWorkbenchRequest();
      setOrders(data.orders ?? []);
    } catch (e) {
      console.error(e);
      toast?.({ message: "No se pudo cargar el detalle de pedidos", variant: "error" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      load();
    }
  }, [open, initialTab, load]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        Estados de pedido
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Tabla paginada por ítem. Solo Programador puede editar entrega, pago (con fecha) y stock; se registra en Logs.
        </Typography>
        <IconButton
          aria-label="cerrar"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 360 }}>
        {loading && orders.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              Cargando pedidos…
            </Typography>
          </Box>
        ) : (
          <OrderStatusWorkbenchContent
            orders={orders}
            loading={loading}
            initialTab={activeTab}
            onReload={load}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
