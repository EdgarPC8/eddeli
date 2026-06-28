import { Grid, TextField, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import {
  createSupplierOrderRequest,
  updateSupplierOrderRequest,
  getAllSuppliersRequest,
  createSupplierRequest,
} from "../../../../api/ordersRequest";
import { getAllProducts } from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import AttachmentField from "./AttachmentField.jsx";
import ProductPriceReference, {
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import { uploadSupplierOrderVoucher } from "../../../../api/documentRequest.js";

const pad2 = (n) => String(n).padStart(2, "0");

const localISODate = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalISOWithOffset = (d) => {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hhOff = pad2(Math.floor(Math.abs(off) / 60));
  const mmOff = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${sign}${hhOff}:${mmOff}`;
};

const normalizeToYYYYMMDD = (datos) => {
  if (!datos) return localISODate();
  if (typeof datos.date === "string" && datos.date.includes("/")) {
    const [datePart] = datos.date.split(" ");
    const [dd, mm, yyyy] = datePart.split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof datos.date === "string" && datos.date.includes("T")) {
    const d = new Date(datos.date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  return localISODate();
};

export default function SupplierOrderForm({
  onClose,
  reload,
  isEditing = false,
  datos = null,
  prefillSupplierId = null,
  prefillDate = null,
  lockSupplier = false,
}) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [pendingVoucherFile, setPendingVoucherFile] = useState(null);
  const { toast } = useAuth();

  const selectedProductId = watch("productId");
  const watchQuantity = watch("quantity");
  const watchUnitPrice = watch("unitPrice");

  const currentProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === Number(selectedProductId)) || null;
  }, [selectedProductId, products]);

  useEffect(() => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === Number(selectedProductId));
    if (product?.distributorPrice != null) {
      setValue("unitPrice", product.distributorPrice);
    }
  }, [selectedProductId, products, setValue]);

  const fetchCatalog = async () => {
    const [prodRes, supRes] = await Promise.all([getAllProducts(), getAllSuppliersRequest()]);
    setProducts(prodRes?.data || []);
    setSuppliers(supRes?.data || []);
  };

  const addItem = () => {
    const productId = Number(watch("productId"));
    const quantity = Number(watch("quantity"));
    const unitPrice = Number(watch("unitPrice"));
    if (!productId || !quantity || unitPrice == null || Number.isNaN(unitPrice)) {
      toast({ message: "Seleccione producto, cantidad y precio unitario", variant: "warning" });
      return;
    }
    const product = products.find((p) => p.id === productId);
    setItems((prev) => [
      ...prev,
      {
        productId,
        quantity,
        unitPrice,
        name: product?.name || "",
        unitLabel: getProductUnitLabel(product),
      },
    ]);
    setValue("productId", "");
    setSelectedProduct("");
    setValue("quantity", "");
    setValue("unitPrice", "");
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickCreateSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      toast({ message: "Escribe el nombre del proveedor", variant: "warning" });
      return;
    }
    try {
      const { data } = await toast({ promise: createSupplierRequest({ name }) });
      setSuppliers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSupplier(String(data.id));
      setNewSupplierName("");
    } catch {
      /* toast */
    }
  };

  const submitOrder = async (data) => {
    if (items.length === 0) {
      toast({ message: "Agrega al menos un producto", variant: "warning" });
      return;
    }
    if (!selectedSupplier) {
      toast({ message: "Selecciona un proveedor", variant: "warning" });
      return;
    }

    const localDT = new Date(`${data.date}T12:00:00`);
    const payload = {
      supplierId: Number(selectedSupplier),
      notes: data.notes || null,
      date: toLocalISOWithOffset(localDT),
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    };

    const voucherFile = pendingVoucherFile;

    try {
      if (isEditing) {
        await toast({
          promise: updateSupplierOrderRequest(datos.id, payload),
          onSuccess: async () => {
            if (voucherFile) {
              try {
                await uploadSupplierOrderVoucher(voucherFile, datos.id);
              } catch {
                toast({
                  message: "Pedido actualizado, pero no se pudo subir el comprobante.",
                  variant: "warning",
                });
              }
            }
          },
        });
      } else {
        await toast({
          promise: createSupplierOrderRequest(payload),
          onSuccess: async (result) => {
            const orderId = result?.data?.id;
            if (voucherFile && orderId) {
              try {
                await uploadSupplierOrderVoucher(voucherFile, orderId);
              } catch {
                toast({
                  message: "Pedido guardado, pero no se pudo subir el comprobante.",
                  variant: "warning",
                });
              }
            }
          },
        });
      }
      reset();
      setItems([]);
      setPendingVoucherFile(null);
      if (reload) await reload();
      if (onClose) await onClose();
    } catch {
      /* toast */
    }
  };

  useEffect(() => {
    fetchCatalog();

    if (isEditing && datos) {
      setSelectedSupplier(String(datos.supplierId || ""));
      setValue("notes", datos.notes || "");
      setValue("date", normalizeToYYYYMMDD(datos));
      const loaded = (datos.ERP_supplier_order_items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        name: item.ERP_inventory_product?.name || "",
        unitLabel: getProductUnitLabel(item.ERP_inventory_product),
      }));
      setItems(loaded);
      return;
    }

    setItems([]);
    setPendingVoucherFile(null);
    setValue("notes", "");
    setValue("date", prefillDate || localISODate());
    setSelectedSupplier(prefillSupplierId ? String(prefillSupplierId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, isEditing, prefillSupplierId, prefillDate]);

  const itemsTotal = useMemo(
    () => items.reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice), 0),
    [items],
  );

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitOrder)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SearchableSelect
            label="Proveedor"
            items={suppliers}
            value={selectedSupplier}
            onChange={(val) => setSelectedSupplier(val != null ? String(val) : "")}
            disabled={lockSupplier}
          />
        </Grid>
        {!lockSupplier && (
          <>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            size="small"
            label="Nuevo proveedor (rápido)"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button fullWidth variant="outlined" onClick={handleQuickCreateSupplier}>
            Crear proveedor
          </Button>
        </Grid>
          </>
        )}

        <Grid item xs={12}>
          <input type="hidden" {...register("productId")} />
          <SearchableSelect
            label="Producto"
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
              unitPrice={watchUnitPrice}
            />
          </Grid>
        )}
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            inputProps={{ min: 0.01, step: "any" }}
            {...register("quantity")}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Precio unitario (USD)"
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            {...register("unitPrice")}
          />
        </Grid>
        <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-start" }}>
          <Tooltip title="Agregar producto">
            <IconButton color="primary" onClick={addItem} sx={{ border: 1, borderColor: "primary.main" }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Grid>

        {items.map((item, index) => (
          <Grid item xs={12} key={`${item.productId}-${index}`}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">
                {item.name} — {item.quantity} {item.unitLabel || "u."} ×{" "}
                {formatProductPrice(item.unitPrice)} ={" "}
                {formatProductPrice(formatOrderLineTotal(item.quantity, item.unitPrice))}
              </Typography>
              <Button color="error" size="small" onClick={() => removeItem(index)}>
                Quitar
              </Button>
            </Box>
          </Grid>
        ))}

        {items.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700} align="right">
              Total: {formatProductPrice(itemsTotal)}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField fullWidth label="Fecha del pedido" type="date" {...register("date")} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Notas" multiline rows={2} {...register("notes")} />
        </Grid>
        <Grid item xs={12}>
          {isEditing ? (
            <AttachmentField
              entityType="supplier_order"
              entityId={datos.id}
              pendingFile={pendingVoucherFile}
              onPendingFileChange={setPendingVoucherFile}
              label="Factura / nota del proveedor"
            />
          ) : (
            <AttachmentField
              label="Factura / nota del proveedor (opcional)"
              pendingFile={pendingVoucherFile}
              onPendingFileChange={setPendingVoucherFile}
            />
          )}
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth>
            {isEditing ? "Guardar pedido a proveedor" : "Registrar pedido a proveedor"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
