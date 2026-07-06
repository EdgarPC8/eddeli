import {
  Grid,
  TextField,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddBoxIcon from "@mui/icons-material/AddBox";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupplierOrderRequest,
  updateSupplierOrderRequest,
  getAllSuppliersRequest,
} from "../../../../api/ordersRequest";
import { getAllProductsAll } from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect";
import AttachmentField from "./AttachmentField.jsx";
import ProductForm from "./ProductForm.jsx";
import SupplierForm from "./SupplierForm.jsx";
import ProductPriceReference, {
  getProductUnitLabel,
  formatOrderLineTotal,
  formatProductPrice,
} from "./ProductPriceReference";
import { uploadSupplierOrderVoucher } from "../../../../api/documentRequest.js";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import {
  findEddeliProductByCode,
  normalizeProductBarcode,
} from "../../../../utils/productLookup.js";

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
  active = true,
}) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [pendingVoucherFile, setPendingVoucherFile] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [ivaRate, setIvaRate] = useState(15);
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
    if (product?.supplierPrice != null) {
      setValue("unitPrice", product.supplierPrice);
    }
  }, [selectedProductId, products, setValue]);

  const fetchCatalog = async () => {
    const [prodRes, supRes] = await Promise.all([getAllProductsAll(), getAllSuppliersRequest()]);
    const list = prodRes?.data || [];
    setProducts(list);
    setSuppliers(supRes?.data || []);
    return list;
  };

  const handleProductCreated = async (created) => {
    setProductDialogOpen(false);
    await fetchCatalog();
    const id = created?.id ?? created?.data?.id;
    if (id != null) {
      setSelectedProduct(String(id));
      setValue("productId", String(id));
    }
  };

  const handleBarcodeScan = useCallback(
    (rawCode) => {
      const found = findEddeliProductByCode(products, rawCode);
      if (found) {
        setSelectedProduct(String(found.id));
        setValue("productId", String(found.id));
        toast({ message: `Producto: ${found.name}`, variant: "success" });
        return;
      }
      const code = normalizeProductBarcode(rawCode) || String(rawCode || "").trim();
      toast({
        message: code ? `No se encontró producto con código "${code}"` : "Código vacío",
        variant: "warning",
      });
    },
    [products, setValue, toast],
  );

  useBarcodeScanner({
    enabled: active && products.length > 0 && !productDialogOpen && !supplierDialogOpen,
    onScan: handleBarcodeScan,
    ignoreWhenTypingInInputs: true,
  });

  const addItem = () => {
    const productId = Number(watch("productId"));
    const quantity = Number(watch("quantity"));
    const unitPrice = Number(watch("unitPrice"));
    if (!productId || !quantity || unitPrice == null || Number.isNaN(unitPrice)) {
      toast({ message: "Seleccione producto, cantidad y precio unitario", variant: "warning" });
      return;
    }
    const product = products.find((p) => p.id === productId);
    const productIva = Number(product?.taxRate) || 0;
    if (productIva > 0) setIvaRate(productIva);
    setItems((prev) => [
      ...prev,
      {
        productId,
        quantity,
        unitPrice,
        hasIva: productIva > 0,
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

  const toggleItemIva = (index, checked) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, hasIva: checked } : it)),
    );
  };

  const handleSupplierCreated = async (created) => {
    setSupplierDialogOpen(false);
    await fetchCatalog();
    const id = created?.id ?? created?.data?.id;
    if (id != null) setSelectedSupplier(String(id));
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
        taxRate: it.hasIva ? Number(ivaRate) || 0 : 0,
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
        hasIva: Number(item.taxRate) > 0,
        name: item.ERP_inventory_product?.name || "",
        unitLabel: getProductUnitLabel(item.ERP_inventory_product),
      }));
      setItems(loaded);
      const firstIva = (datos.ERP_supplier_order_items || []).find(
        (item) => Number(item.taxRate) > 0,
      );
      if (firstIva) setIvaRate(Number(firstIva.taxRate));
      return;
    }

    setItems([]);
    setPendingVoucherFile(null);
    setValue("notes", "");
    setValue("date", prefillDate || localISODate());
    setSelectedSupplier(prefillSupplierId ? String(prefillSupplierId) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, isEditing, prefillSupplierId, prefillDate]);

  const { subtotal, ivaTotal, itemsTotal } = useMemo(() => {
    const rate = (Number(ivaRate) || 0) / 100;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    let sub = 0;
    let iva = 0;
    items.forEach((it) => {
      const line = formatOrderLineTotal(it.quantity, it.unitPrice);
      sub += line;
      if (it.hasIva) iva += line * rate;
    });
    const rSub = round2(sub);
    const rIva = round2(iva);
    return { subtotal: rSub, ivaTotal: rIva, itemsTotal: round2(rSub + rIva) };
  }, [items, ivaRate]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitOrder)}>
      <Grid container spacing={3}>
        {/* Columna izquierda: entradas */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Proveedor"
                    items={suppliers}
                    value={selectedSupplier}
                    onChange={(val) => setSelectedSupplier(val != null ? String(val) : "")}
                    disabled={lockSupplier}
                  />
                </Box>
                {!lockSupplier && (
                  <Tooltip title="Agregar proveedor nuevo">
                    <IconButton
                      color="primary"
                      onClick={() => setSupplierDialogOpen(true)}
                      sx={{ border: 1, borderColor: "primary.main" }}
                    >
                      <AddBusinessIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <input type="hidden" {...register("productId")} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <SearchableSelect
                    label="Producto"
                    items={products}
                    value={selectedProduct}
                    onChange={(val) => {
                      setSelectedProduct(val);
                      setValue("productId", val);
                    }}
                    placeholder="Buscar o escanear código de barras…"
                    getSearchText={(p) =>
                      [p?.barcode, p?.sku].filter(Boolean).join(" ")
                    }
                    onEnterWithInput={handleBarcodeScan}
                  />
                </Box>
                <Tooltip title="Crear producto nuevo">
                  <IconButton
                    color="primary"
                    onClick={() => setProductDialogOpen(true)}
                    sx={{ border: 1, borderColor: "primary.main" }}
                  >
                    <AddBoxIcon />
                  </IconButton>
                </Tooltip>
              </Box>
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
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0.01, step: "any" }}
                {...register("quantity")}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Precio unit."
                type="number"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: "0.001" }}
                {...register("unitPrice")}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="IVA (%)"
                type="number"
                value={ivaRate}
                onChange={(e) =>
                  setIvaRate(e.target.value === "" ? "" : Number(e.target.value))
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: "0.01" }}
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
              p: 1.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              bgcolor: "background.default",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Productos del pedido ({items.length})
            </Typography>

            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aún no has agregado productos. Selecciona un producto, cantidad y precio, y presiona el
                botón +.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {items.map((item, index) => (
                  <Box
                    key={`${item.productId}-${index}`}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      columnGap: 0.75,
                      rowGap: 0.25,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.5,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box
                      sx={{
                        flex: "1 1 100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ flex: 1, lineHeight: 1.2 }}
                      >
                        {index + 1}. {item.name}
                      </Typography>
                      <Tooltip title="Subir">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ p: 0.25 }}
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
                            sx={{ p: 0.25 }}
                            onClick={() => moveItem(index, 1)}
                            disabled={index === items.length - 1}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Quitar">
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ p: 0.25 }}
                          onClick={() => removeItem(index)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      label="Cant."
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, "quantity", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 0.01, step: "any" }}
                      sx={{ width: 78 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item.unitLabel || "u."} ×
                    </Typography>
                    <TextField
                      label="P. unit."
                      type="number"
                      size="small"
                      value={item.unitPrice}
                      onChange={(e) => updateItemField(index, "unitPrice", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 0, step: "0.001" }}
                      sx={{ width: 92 }}
                    />
                    <FormControlLabel
                      sx={{ ml: 0.25, mr: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
                      control={
                        <Checkbox
                          size="small"
                          sx={{ p: 0.25 }}
                          checked={Boolean(item.hasIva)}
                          onChange={(e) => toggleItemIva(index, e.target.checked)}
                        />
                      }
                      label={`IVA ${Number(ivaRate) || 0}%`}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ ml: "auto", minWidth: 72, textAlign: "right" }}
                    >
                      {formatProductPrice(
                        formatOrderLineTotal(item.quantity, item.unitPrice) *
                          (item.hasIva ? 1 + (Number(ivaRate) || 0) / 100 : 1),
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {items.length > 0 && (
              <Box sx={{ mt: "auto", pt: 1, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{formatProductPrice(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">
                    IVA ({Number(ivaRate) || 0}%)
                  </Typography>
                  <Typography variant="body2">{formatProductPrice(ivaTotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {formatProductPrice(itemsTotal)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            Crear producto
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={() => setProductDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <ProductForm
            key={productDialogOpen ? "new-supplier-product" : "closed"}
            isEditing={false}
            datos={{}}
            onClose={() => setProductDialogOpen(false)}
            reload={handleProductCreated}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
          <Button type="button" onClick={() => setProductDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button type="submit" form="eddeli-product-form" variant="contained" sx={{ minWidth: 160 }}>
            Guardar producto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 1 }}>
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            Agregar proveedor
          </DialogTitle>
          <IconButton aria-label="Cerrar" onClick={() => setSupplierDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <SupplierForm
            key={supplierDialogOpen ? "new-supplier" : "closed"}
            isEditing={false}
            datos={{}}
            onClose={() => setSupplierDialogOpen(false)}
            reload={handleSupplierCreated}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
