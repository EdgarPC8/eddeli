import {
  Container,
  Button,
  Typography,
} from "@mui/material";
import { useCallback, useRef, useState } from "react";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import OrderForm from "./components/OrderForm";
import { getOrdersForMonthRequest } from "../../../api/ordersRequest";
import OrderCalendaryTable from "./components/OrderCalendaryTable";
import {
  mergeOrdersById,
  monthCacheKey,
  patchOrderItemInList,
  removeOrderFromList,
  removeOrderItemFromList,
} from "../../../utils/orderListUtils";

function OrderPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [titleDialog, setTitleDialog] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  const loadedMonthsRef = useRef(new Set());
  const visibleMonthRef = useRef(new Date());

  const loadOrdersForMonth = useCallback(async (visibleMonth, { force = false } = {}) => {
    const key = monthCacheKey(visibleMonth);
    if (!force && loadedMonthsRef.current.has(key)) return;

    setLoadingOrders(true);
    try {
      const { data } = await getOrdersForMonthRequest(visibleMonth);
      loadedMonthsRef.current.add(key);
      setOrders((prev) => mergeOrdersById(prev, Array.isArray(data) ? data : []));
    } catch (e) {
      console.error("OrderPage: cargar pedidos", e);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const handleMonthChange = useCallback(
    (monthDate) => {
      visibleMonthRef.current = monthDate;
      loadOrdersForMonth(monthDate);
    },
    [loadOrdersForMonth],
  );

  /** Invalida caché del mes visible y vuelve a pedir ese rango. */
  const refreshCurrentRange = useCallback(async () => {
    const month = visibleMonthRef.current;
    loadedMonthsRef.current.delete(monthCacheKey(month));
    await loadOrdersForMonth(month, { force: true });
  }, [loadOrdersForMonth]);

  const patchOrderItem = useCallback((orderId, itemId, fields) => {
    setOrders((prev) => patchOrderItemInList(prev, orderId, itemId, fields));
  }, []);

  const removeOrder = useCallback((orderId) => {
    setOrders((prev) => removeOrderFromList(prev, orderId));
  }, []);

  const removeOrderItem = useCallback((orderId, itemId) => {
    setOrders((prev) => removeOrderItemFromList(prev, orderId, itemId));
  }, []);

  const handleDialog = () => setOpenDialog(!openDialog);

  const closeDialog = useCallback(async () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setOpenDialog(false);
    await refreshCurrentRange();
  }, [refreshCurrentRange]);

  return (
    <Container>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Pedidos Registrados
      </Typography>

      <SimpleDialog
        open={openDialog}
        onClose={() => {
          setIsEditing(false);
          setOrderToEdit(null);
          handleDialog();
        }}
        tittle={titleDialog}
      >
        <OrderForm
          onClose={closeDialog}
          reload={refreshCurrentRange}
          isEditing={isEditing}
          datos={orderToEdit}
        />
      </SimpleDialog>

      <Button
        variant="contained"
        onClick={() => {
          setIsEditing(false);
          setOrderToEdit(null);
          setTitleDialog("Registrar nuevo pedido");
          handleDialog();
        }}
        sx={{ mb: 2 }}
      >
        Crear Pedido
      </Button>

      <OrderCalendaryTable
        orders={orders}
        loadingOrders={loadingOrders}
        onMonthChange={handleMonthChange}
        onReload={refreshCurrentRange}
        onPatchItem={patchOrderItem}
        onRemoveOrder={removeOrder}
        onRemoveOrderItem={removeOrderItem}
        onEdit={(pedido) => {
          setIsEditing(true);
          setOrderToEdit(pedido);
          setTitleDialog("Editar Pedido");
          setOpenDialog(true);
        }}
      />
    </Container>
  );
}

export default OrderPage;
