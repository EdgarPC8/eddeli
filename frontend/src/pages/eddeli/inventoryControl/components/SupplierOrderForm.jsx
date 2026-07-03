import { Grid, TextField, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import {
  createSupplierOrderRequest,
  updateSupplierOrderRequest,
  getAllSuppliersRequest,
  createSupplierRequest,
} from "../../../../api/ordersRequest";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest";
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

/** Convierte una fecha (ISO o "dd/MM/yyyy HH:mm:ss") a "YYYY-MM-DD" para inputs date. */
const dateToInputValue = (value) => {
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
  const { toast, user } = useAuth();
  const isProgramador = user?.loginRol === "Programador";

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
    const [prodRes, supRes] = await Promise.all([getAllProductsAll(), getAllSuppliersRequest()]);
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

  const moveItem = (index, direction) => {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateItemField = (index, field, rawValue) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const value = rawValue === "" ? "" : Number(rawValue);
        return { ...it, [field]: value };
      }),
    );
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

    const invalidItem = items.some(
      (it) => !(Number(it.quantity) > 0) || !(Number(it.unitPrice) >= 0) || it.unitPrice === "",
    );
    if (invalidItem) {
      toast({ message: "Revisa la cantidad y el precio de los productos", variant: "warning" });
      return;
    }

    const localDT = new Date(`${data.date}T12:00:00`);
    const payload = {
      supplierId: Number(selectedSupplier),
      notes: data.notes || null,
      date: toLocalISOWithOffset(localDT),
      items: items.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
    };

    // Solo el rol Programador puede corregir manualmente las fechas de entrega y pago.
    if (isProgramador) {
      payload.receivedAt = data.receivedAt
        ? toLocalISOWithOffset(new Date(`${data.receivedAt}T12:00:00`))
        : null;
      payload.paidAt = data.paidAt
        ? toLocalISOWithOffset(new Date(`${data.paidAt}T12:00:00`))
        : null;
    }

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
      setValue("receivedAt", dateToInputValue(datos.receivedAt));
      setValue("paidAt", dateToInputValue(datos.paidAt));
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
    setValue("receivedAt", "");
    setValue("paidAt", "");
    setSelectedSupplier(prefillSupplierId ? String(prefillSupplierId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, isEditing, prefillSupplierId, prefillDate]);

  const itemsTotal = useMemo(
    () => items.reduce((acc, it) => acc + formatOrderLineTotal(it.quantity, it.unitPrice), 0),
    [items],
  );

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitOrder)}>
      <Grid container spacing={3}>
        {/* Columna izquierda: entradas */}
        <Grid item xs={12} md={6}>
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
                inputProps={{ min: 0, step: "0.001" }}
                {...register("unitPrice")}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Tooltip title="Agregar producto">
                <IconButton
                  color="primary"
                  onClick={addItem}
                  sx={{ border: 1, borderColor: "primary.main" }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Fecha del pedido" type="date" {...register("date")} />
            </Grid>
            {isProgramador && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de entrega"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    helperText="Solo Programador · corrección manual"
                    {...register("receivedAt")}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de pago"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    helperText="Solo Programador · corrección manual"
                    {...register("paidAt")}
                  />
                </Grid>
              </>
            )}
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
        </Grid>

        {/* Columna derecha: lista de productos */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              bgcolor: "background.default",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Productos del pedido ({items.length})
            </Typography>

            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aún no has agregado productos. Selecciona un producto, cantidad y precio, y presiona el
                botón +.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {items.map((item, index) => (
                  <Box
                    key={`${item.productId}-${index}`}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 1,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box
                      sx={{
                        flex: "1 1 100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                        {index + 1}. {item.name}
                      </Typography>
                      <Tooltip title="Subir">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Bajar">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === items.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <TextField
                      label="Cantidad"
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                      inputProps={{ min: 0.01, step: "any" }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.unitLabel || "u."} ×
                    </Typography>
                    <TextField
                      label="Precio unit."
                      type="number"
                      size="small"
                      value={item.unitPrice}
                      onChange={(e) => updateItemField(index, "unitPrice", e.target.value)}
                      inputProps={{ min: 0, step: "0.001" }}
                      sx={{ width: 110 }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ ml: "auto", minWidth: 80, textAlign: "right" }}
                    >
                      {formatProductPrice(formatOrderLineTotal(item.quantity, item.unitPrice))}
                    </Typography>
                    <Button color="error" size="small" onClick={() => removeItem(index)}>
                      Quitar
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {items.length > 0 && (
              <Typography variant="subtitle1" fontWeight={700} align="right" sx={{ mt: "auto" }}>
                Total: {formatProductPrice(itemsTotal)}
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
