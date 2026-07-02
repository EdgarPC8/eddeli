import { Grid, TextField, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PrintIcon from "@mui/icons-material/Print";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import {
  createOrderRequest,
  updateOrderRequest,
  getAllCustomersRequest,
  deleteOrderItem,
} from "../../../../api/ordersRequest";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import ProductPriceReference, {
  getDefaultDistributorPrice,
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import PrintFormatDialog from "../../../../components/saleReceipt/PrintFormatDialog.jsx";
import { buildReceiptFromCustomerOrder } from "../../../../utils/saleReceiptUtils.js";

/* ========= Utils de fecha en LOCAL (sin UTC) ========= */
const pad2 = (n) => String(n).padStart(2, "0");

// yyyy-MM-dd en hora local (para <input type="date">)
const localISODate = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// HH:mm:ss actual en local
const localHMS = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

// Convierte un Date a ISO con offset local (no Z)
const toLocalISOWithOffset = (d) => {
  const off = -d.getTimezoneOffset(); // minutos respecto a UTC
  const sign = off >= 0 ? "+" : "-";
  const hhOff = pad2(Math.floor(Math.abs(off) / 60));
  const mmOff = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(
    d.getSeconds()
  )}${sign}${hhOff}:${mmOff}`;
};

// Intenta normalizar cualquier forma de fecha recibida en datos.* a yyyy-MM-dd
const normalizeToYYYYMMDD = (datos) => {
  if (!datos) return localISODate();
  // 1) dateMs (epoch)
  if (datos.dateMs) {
    const d = new Date(Number(datos.dateMs));
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  // 2) ISO con T (con o sin Z)
  if (typeof datos.date === "string" && datos.date.includes("T")) {
    const d = new Date(datos.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  // 3) Formato "dd/MM/yyyy HH:mm:ss" o "dd/MM/yyyy"
  if (typeof datos.date === "string" && datos.date.includes("/")) {
    const [datePart] = datos.date.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  // Fallback
  return localISODate();
};

function OrderForm({ onClose, reload, isEditing = false, datos = null }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Estos estados son solo para controlar el UI del SearchableSelect
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [printOpen, setPrintOpen] = useState(false);

  const { toast } = useAuth();

  const selectedProductId = watch("productId");
  const watchQuantity = watch("quantity");
  const watchPrice = watch("price");

  const currentProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === Number(selectedProductId)) || null;
  }, [selectedProductId, products]);

  const printReceipt = useMemo(() => {
    if (!isEditing || !datos?.id) return null;
    return buildReceiptFromCustomerOrder({
      ...datos,
      ERP_order_items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        deliveredAt: it.deliveredAt,
        paidAt: it.paidAt,
        ERP_inventory_product: { name: it.name },
      })),
      ERP_customer: customers.find((c) => String(c.id) === String(selectedCustomer)) || datos.ERP_customer,
    });
  }, [isEditing, datos, items, customers, selectedCustomer]);

  // Autocompletar precio distribuidor al seleccionar producto
  useEffect(() => {
    if (!currentProduct) return;
    const defaultPrice = getDefaultDistributorPrice(currentProduct);
    if (defaultPrice > 0) {
      setValue("price", defaultPrice);
    }
  }, [currentProduct, setValue]);

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await getAllCustomersRequest();
    setCustomers(data || []);
  };

  const addItem = () => {
    const productId = Number(watch("productId"));
    const quantity = Number(watch("quantity"));
    const price = Number(watch("price"));

    if (!productId || !quantity || !price) {
      toast({ message: "Seleccione producto, cantidad y precio", variant: "warning" });
      return;
    }

    const product = products.find((p) => p.id === productId);

    setItems((prev) => [
      ...prev,
      {
        productId,
        quantity,
        price,
        name: product?.name || "",
        unitLabel: getProductUnitLabel(product),
      },
    ]);

    setValue("productId", "");
    setSelectedProduct("");
    setValue("quantity", "");
    setValue("price", "");
  };

  const removeItem = async (index, item) => {
    const prev = items;
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);

    if (isEditing && item?.id) {
      try {
        await toast({ promise: deleteOrderItem(item.id) });
      } catch {
        setItems(prev);
      }
    }
  };

  const resetForm = () => {
    reset();
    setItems([]);
    setSelectedCustomer("");
    setSelectedProduct("");
    setValue("productId", "");
    setValue("date", localISODate());
  };

  const submitOrder = async (data) => {
    if (items.length === 0) {
      toast({ message: "Debe agregar al menos un producto al pedido", variant: "warning" });
      return;
    }
    if (!selectedCustomer) {
      toast({ message: "Seleccione un cliente", variant: "warning" });
      return;
    }

    const localDT = new Date(`${data.date}T${localHMS()}`);

    const payload = {
      customerId: selectedCustomer,
      notes: data.notes,
      dateMs: localDT.getTime(),
      date: toLocalISOWithOffset(localDT),
      items,
    };

    try {
      if (isEditing) {
        await toast({ promise: updateOrderRequest(datos.id, payload) });
      } else {
        await toast({ promise: createOrderRequest(payload) });
      }
      resetForm();
      if (reload) await reload();
      if (onClose) await onClose();
    } catch {
      /* toast ya mostró el error del backend */
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();

    setValue("date", localISODate());

    if (isEditing && datos) {
      setSelectedCustomer(datos.customerId || "");
      setValue("notes", datos.notes || "");
      setValue("date", normalizeToYYYYMMDD(datos));

      const loadedItems = (datos.ERP_order_items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price:
          item.distributorPrice != null
            ? item.distributorPrice
            : item.price != null
            ? item.price
            : 0,
        name: item.ERP_inventory_product?.name || "",
        unitLabel: getProductUnitLabel(item.ERP_inventory_product),
        deliveredAt: item.deliveredAt || null,
        paidAt: item.paidAt || null,
      }));

      setItems(loadedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos]);

  const itemsTotal = useMemo(
    () => items.reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.price), 0),
    [items],
  );

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitOrder)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SearchableSelect
            label="Seleccionar Cliente"
            items={customers}
            value={selectedCustomer}
            onChange={(val) => {
              setSelectedCustomer(val);
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <input type="hidden" {...register("productId")} />

          <SearchableSelect
            label="Seleccionar Producto"
            items={products}
            value={selectedProduct}
            onChange={(val) => {
              setSelectedProduct(val);
              setValue("productId", val);
            }}
          />
        </Grid>

        {currentProduct && (
          <Grid item xs={12}>
            <ProductPriceReference
              product={currentProduct}
              quantity={watchQuantity}
              unitPrice={watchPrice}
            />
          </Grid>
        )}

        <Grid item xs={12} sm={4}>
          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ min: 1 }}
            {...register("quantity")}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Precio distribuidor"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any", min: 0 }}
            InputLabelProps={{ shrink: true }}
            helperText={
              currentProduct
                ? `Por defecto: $${getDefaultDistributorPrice(currentProduct).toFixed(2)}`
                : undefined
            }
            {...register("price")}
          />
        </Grid>

        <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <Tooltip title="Agregar producto">
            <IconButton color="primary" onClick={addItem} sx={{ border: 1, borderColor: "primary.main" }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Grid>

        <Grid item xs={12}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin productos en el pedido.
            </Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {items.map((item, index) => (
                <Box component="li" key={`${item.productId}-${index}`} sx={{ mb: 0.75 }}>
                  <Typography variant="body2" component="span">
                    {item.name} — {item.quantity} {item.unitLabel || "u."} ×{" "}
                    {formatProductPrice(item.price)} ={" "}
                    {formatProductPrice(formatOrderLineTotal(item.quantity, item.price))}
                  </Typography>
                  <Button
                    color="error"
                    size="small"
                    onClick={() => removeItem(index, item)}
                    sx={{ ml: 1, minWidth: 0, py: 0 }}
                  >
                    Quitar
                  </Button>
                </Box>
              ))}
            </Box>
          )}
          {items.length > 0 && (
            <Typography variant="subtitle1" fontWeight={700} align="right" sx={{ mt: 1 }}>
              Total: {formatProductPrice(itemsTotal)}
            </Typography>
          )}
        </Grid>

        <Grid item xs={6}>
          <TextField
            label="Fecha del pedido"
            type="date"
            fullWidth
            variant="standard"
            InputLabelProps={{ shrink: true }}
            {...register("date")}
          />
        </Grid>

        <Grid item xs={6}>
          <TextField
            label="Notas"
            fullWidth
            variant="standard"
            {...register("notes")}
          />
        </Grid>

        <Grid item xs={12} display="flex" justifyContent="flex-end" alignItems="center" gap={1} flexWrap="wrap">
          {isEditing && printReceipt && (
            <Tooltip title="Comprobante / factura">
              <IconButton color="primary" onClick={() => setPrintOpen(true)}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
          )}
          <Button variant="contained" fullWidth type="submit" sx={{ maxWidth: 280 }}>
            {!isEditing ? "Guardar Pedido" : "Actualizar Pedido"}
          </Button>
        </Grid>
      </Grid>

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}

export default OrderForm;
