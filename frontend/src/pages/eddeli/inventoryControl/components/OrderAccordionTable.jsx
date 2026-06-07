import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Typography,
  Box,
  TablePagination,
  Tooltip,
  TextField
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EditIcon from '@mui/icons-material/Edit';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from 'react';
import { 
  markItemAsPaidRequest,
  markItemAsDeliveredRequest,
  updateOrderItemRequest
} from '../../../../api/ordersRequest';

import {  formatDate } from '../../../../helpers/functions';
import { useAuth } from "../../../../context/AuthContext";
import { withMutationToast } from "../../../../utils/mutationToast";

function OrderRow({ order, onReload, onEdit }) {
  const [open, setOpen] = useState(false);
  const { user, toast: toastAuth } = useAuth();

  const total = order.ERP_order_items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const handleDeliver = async (itemId) => {
    await withMutationToast(toastAuth, {
      promise: markItemAsDeliveredRequest(itemId),
      onSuccess: () => onReload?.(),
    });
  };

  const handlePaid = async (itemId) => {
    await withMutationToast(toastAuth, {
      promise: markItemAsPaidRequest(itemId),
      onSuccess: () => onReload?.(),
    });
  };

  const handleUpdateItem = async (itemId, data) => {
    if (isNaN(data.quantity) || isNaN(data.price)) {
      toastAuth({ message: "Cantidad o precio inválido", variant: "warning" });
      return;
    }
    await withMutationToast(toastAuth, {
      promise: updateOrderItemRequest(itemId, data),
      onSuccess: () => onReload?.(),
    });
  };

  const totalItems = order.ERP_order_items.length;
  const entregados = order.ERP_order_items.filter(i => !!i.deliveredAt).length;
  const pagados = order.ERP_order_items.filter(i => !!i.paidAt).length;

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton onClick={() => setOpen(!open)} size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{order.ERP_customer?.name}</TableCell>
        <TableCell>{order.date}</TableCell>
        <TableCell>
          <Typography variant="body2">
            {`${entregados}/${totalItems}`} entregados
          </Typography>
          <Typography variant="body2">
            {`${pagados}/${totalItems}`} pagados
          </Typography>
        </TableCell>
        <TableCell>{order.notes}</TableCell>
        <TableCell>{totalItems}</TableCell>
        <TableCell>${total.toFixed(2)}</TableCell>
        <TableCell>
          {(['Administrador', 'Programador'].includes(user.loginRol) || order.status === 'pendiente') && (
            <Tooltip title="Editar Pedido">
              <IconButton onClick={() => onEdit(order)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Detalles del Pedido:
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Precio Unitario</TableCell>
                    <TableCell>Subtotal</TableCell>
                    <TableCell>Pagado</TableCell>
                    <TableCell>Entregado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.ERP_order_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.ERP_inventory_product?.name}</TableCell>
                      <TableCell>
                        {!!item.deliveredAt ? (
                          item.quantity
                        ) : (
                          <TextField
                            type="number"
                            variant="standard"
                            defaultValue={item.quantity}
                            onBlur={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value), price: item.price })}
                            inputProps={{ min: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!!item.deliveredAt ? (
                          `$${item.price.toFixed(2)}`
                        ) : (
                          <TextField
                            type="number"
                            variant="standard"
                            defaultValue={item.price}
                            onBlur={(e) => handleUpdateItem(item.id, { quantity: item.quantity, price: parseFloat(e.target.value) })}
                            inputProps={{ min: 0, step: "any" }}
                          />
                        )}
                      </TableCell>
                      <TableCell>${(item.quantity * item.price).toFixed(2)}</TableCell>
                      <TableCell>
                        {!!item.paidAt && (
                          <>
                            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="caption" display="inline">
                              {item.paidAt}
                            </Typography>
                          </>
                        )}
                        {!item.paidAt && (
                          <Tooltip title="Marcar como Pagado">
                            <IconButton onClick={() => handlePaid(item.id)}>
                              <MonetizationOnIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {!!item.deliveredAt && (
                          <>
                            <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="caption" display="inline">
                              {item.deliveredAt}
                            </Typography>
                          </>
                        )}
                        {!item.deliveredAt && (
                          <Tooltip title="Marcar como Entregado">
                            <IconButton onClick={() => handleDeliver(item.id)}>
                              <LocalShippingIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function OrderAccordionTable({ orders, onReload, onEdit }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!orders || orders.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Pedidos Detallados
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Cliente</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell># Productos</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((order) => (
                <OrderRow key={order.id} order={order} onReload={onReload} onEdit={onEdit} />
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={orders.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Pedidos por página"
        />
      </TableContainer>
    </Box>
  );
}
