import {
  Container,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useCallback, useRef, useState } from "react";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import OrderForm from "./components/OrderForm";
import SupplierOrderForm from "./components/SupplierOrderForm";
import {
  getOrdersForMonthRequest,
  getSupplierOrdersForMonthRequest,
} from "../../../api/ordersRequest";
import OrderCalendaryTable from "./components/OrderCalendaryTable";
import {
  mergeOrdersById,
  monthCacheKey,
  patchOrderItemInList,
  removeOrderFromList,
  removeOrderItemFromList,
} from "../../../utils/orderListUtils";
import { isCajaPosOrder } from "../../../utils/eddeliPosOrderUtils.js";

function OrderPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [titleDialog, setTitleDialog] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierOrderToEdit, setSupplierOrderToEdit] = useState(null);
  const [supplierPrefill, setSupplierPrefill] = useState(null);

  const loadedMonthsRef = useRef(new Set());
  const visibleMonthRef = useRef(new Date());

  const loadOrdersForMonth = useCallback(async (visibleMonth, { force = false } = {}) => {
    const key = monthCacheKey(visibleMonth);
    if (!force && loadedMonthsRef.current.has(key)) return;

    setLoadingOrders(true);
    try {
      const [customerRes, supplierRes] = await Promise.all([
        getOrdersForMonthRequest(visibleMonth),
        getSupplierOrdersForMonthRequest(visibleMonth),
      ]);
      loadedMonthsRef.current.add(key);
      const manualOrders = (Array.isArray(customerRes.data) ? customerRes.data : [])
        .filter((o) => !isCajaPosOrder(o))
        .map((o) => ({ ...o, orderKind: o.orderKind || "customer" }));
      const supplierOrders = (Array.isArray(supplierRes.data) ? supplierRes.data : []).map(
        (o) => ({ ...o, orderKind: "supplier" })
      );
      setOrders((prev) => mergeOrdersById(prev, [...manualOrders, ...supplierOrders]));
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

  const refreshCurrentRange = useCallback(async () => {
    const month = visibleMonthRef.current;
    loadedMonthsRef.current.delete(monthCacheKey(month));
    await loadOrdersForMonth(month, { force: true });
  }, [loadOrdersForMonth]);

  const patchOrderItem = useCallback((orderId, itemId, fields) => {
    setOrders((prev) => patchOrderItemInList(prev, orderId, itemId, fields));
  }, []);

  const removeOrder = useCallback((orderId, orderKind = "customer") => {
    setOrders((prev) => removeOrderFromList(prev, orderId, orderKind));
  }, []);

  const removeOrderItem = useCallback((orderId, itemId) => {
    setOrders((prev) => removeOrderItemFromList(prev, orderId, itemId));
  }, []);

  const handleDialog = () => setOpenDialog(!openDialog);
  const handleSupplierDialog = () => setOpenSupplierDialog(!openSupplierDialog);

  const closeDialog = useCallback(async () => {
    setIsEditing(false);
    setOrderToEdit(null);
    setOpenDialog(false);
    await refreshCurrentRange();
  }, [refreshCurrentRange]);

  const closeSupplierDialog = useCallback(async () => {
    setIsEditingSupplier(false);
    setSupplierOrderToEdit(null);
    setSupplierPrefill(null);
    setOpenSupplierDialog(false);
    await refreshCurrentRange();
  }, [refreshCurrentRange]);

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.75,
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ flex: '1 1 auto', minWidth: 120, mb: 0, fontWeight: 600 }}>
          Pedidos Registrados
        </Typography>
        <Button
          size="small"
          variant="contained"
          sx={{ py: 0.4, px: 1.25, minHeight: 28, fontSize: '0.8125rem' }}
          onClick={() => {
            setIsEditing(false);
            setOrderToEdit(null);
            setTitleDialog("Registrar nuevo pedido");
            handleDialog();
          }}
        >
          Crear pedido (cliente)
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          sx={{ py: 0.4, px: 1.25, minHeight: 28, fontSize: '0.8125rem' }}
          onClick={() => {
            setIsEditingSupplier(false);
            setSupplierOrderToEdit(null);
            setSupplierPrefill(null);
            handleSupplierDialog();
          }}
        >
          Pedido a proveedor
        </Button>
      </Box>

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

      <SimpleDialog
        open={openSupplierDialog}
        onClose={() => {
          setIsEditingSupplier(false);
          setSupplierOrderToEdit(null);
          setSupplierPrefill(null);
          handleSupplierDialog();
        }}
        tittle={
          isEditingSupplier
            ? "Editar pedido a proveedor"
            : supplierPrefill?.supplierName
              ? `Nuevo pedido a ${supplierPrefill.supplierName}`
              : "Registrar pedido a proveedor"
        }
        maxWidth="lg"
        fullWidth
      >
        <SupplierOrderForm
          onClose={closeSupplierDialog}
          reload={refreshCurrentRange}
          isEditing={isEditingSupplier}
          datos={supplierOrderToEdit}
          prefillSupplierId={supplierPrefill?.supplierId}
          prefillDate={supplierPrefill?.date}
          lockSupplier={Boolean(supplierPrefill?.supplierId)}
        />
      </SimpleDialog>

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
        onEditSupplier={(pedido) => {
          setIsEditingSupplier(true);
          setSupplierOrderToEdit(pedido);
          setSupplierPrefill(null);
          setOpenSupplierDialog(true);
        }}
      />
    </Container>
  );
}

export default OrderPage;
