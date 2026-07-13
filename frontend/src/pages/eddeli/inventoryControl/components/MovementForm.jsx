import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddBoxIcon from "@mui/icons-material/AddBox";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import InventoryIcon from "@mui/icons-material/Inventory";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CallMadeIcon from "@mui/icons-material/CallMade";
import TuneIcon from "@mui/icons-material/Tune";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  getAllProductsAll,
  openPresentationMovementRequest,
  registerMovement,
  registerMovementsBatchRequest,
  registerProductionFinalFromPayload,
  updateMovement,
} from "../../../../api/inventoryControlRequest";
import SimulateProductionComponent from "./SimulateProduction.jsx";
import SearchableSelect from "../../../../components/SearchableSelect.jsx";
import ProductForm from "./ProductForm.jsx";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
  isoToDateInput,
} from "./ProgrammerMovementDateField.jsx";
import {
  MOVEMENT_TYPES,
  REASON_OPTIONS,
  estimateGramsPerPack,
  getUnitAbbr,
  gramsToGenericDisplay,
  getMovementQuantityLabel,
  getMovementQuantityHelper,
  getMovementCatalogPrice,
  getMovementCatalogPriceLabel,
  isGenericIngredientProduct,
  isPresentationProduct,
  isPriceRequired,
  isPriceOptional,
  showPriceField,
} from "./movementFormConfig.js";
import AttachmentField from "./AttachmentField.jsx";
import { uploadMovementVoucher } from "../../../../api/documentRequest.js";
import { formatProductPrice } from "./ProductPriceReference.jsx";

const BATCH_TYPES = new Set(["entrada", "salida", "ajuste"]);

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function reasonLabel(type, reason) {
  return REASON_OPTIONS[type]?.find((r) => r.value === reason)?.label || reason || "—";
}

function typeLabel(type) {
  return MOVEMENT_TYPES.find((t) => t.value === type)?.label || type;
}

function newCartId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Base sin IVA (unitario×cant o total según modo de la línea). */
function lineBaseAmount(line) {
  const qty = Number(line.quantity);
  const unit = Number(line.unitPriceInput);
  if (!(qty > 0) || unit === "" || Number.isNaN(unit)) return null;
  return line.shouldMultiply ? qty * unit : unit;
}

function lineTotalWithIva(line, ivaRate) {
  const base = lineBaseAmount(line);
  if (base == null) return null;
  if (!line.hasIva) return round2(base);
  return round2(base * (1 + (Number(ivaRate) || 0) / 100));
}

const TYPE_ICONS = {
  entrada: CallReceivedIcon,
  salida: CallMadeIcon,
  ajuste: TuneIcon,
  produccion: PrecisionManufacturingIcon,
  apertura: UnarchiveIcon,
};

function MovementForm({
  onClose,
  productOptions = [],
  onProductsChange,
  onSaved,
  movementToEdit = null,
}) {
  const theme = useTheme();
  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const isEdit = Boolean(movementToEdit?.id);

  const { handleSubmit, register, reset, setValue, watch, getValues } = useForm({
    defaultValues: {
      productId: "",
      type: "entrada",
      reason: "ENTRADA_COMPRA",
      quantity: "",
      price: "",
      description: "",
      referenceType: "",
      referenceId: "",
      pricingRuleMode: "auto",
      packsToOpen: "1",
    },
  });

  const [movementDate, setMovementDate] = useState(todayDateInput());
  const [simulatedData, setSimulatedData] = useState(null);
  const [cart, setCart] = useState([]);
  const [pendingVoucherFile, setPendingVoucherFile] = useState(null);
  const [ivaRate, setIvaRate] = useState(15);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [products, setProducts] = useState(() => productOptions || []);

  useEffect(() => {
    setProducts(productOptions || []);
  }, [productOptions]);

  const selectedProductId = watch("productId");
  const selectedType = watch("type");
  const selectedReason = watch("reason");
  const pricingRuleMode = watch("pricingRuleMode");
  const quantityRaw = watch("quantity");
  const packsRaw = watch("packsToOpen");

  const quantityValue = Number(quantityRaw || 0);
  const quantityIsEmpty = quantityRaw === "" || quantityRaw == null;
  const packsToOpen = Math.max(1, Math.floor(Number(packsRaw) || 1));
  const priceInputValue = watch("price") === "" ? null : Number(watch("price"));

  const isAjuste = selectedType === "ajuste";
  const isApertura = selectedType === "apertura";
  const isProduccion = selectedType === "produccion";
  const isBatchType = BATCH_TYPES.has(selectedType) && !isEdit;
  const needsPrice = showPriceField(selectedType, selectedReason);
  const priceRequired = isPriceRequired(selectedType, selectedReason);
  const priceOptional = isPriceOptional(selectedType);

  const productById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => map.set(Number(p.id), p));
    return map;
  }, [products]);

  const genericById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      if (p.isGenericIngredient && !p.genericProductId) map.set(Number(p.id), p);
    });
    return map;
  }, [products]);

  const filteredProductOptions = useMemo(() => {
    if (isApertura) {
      return (products || []).filter(isPresentationProduct);
    }
    return products || [];
  }, [products, isApertura]);

  const handleProductCreated = async (created) => {
    setProductDialogOpen(false);
    try {
      const { data } = await getAllProductsAll();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      onProductsChange?.(list);
      const id = created?.id ?? created?.data?.id;
      if (id != null) {
        setValue("productId", String(id), { shouldValidate: true, shouldDirty: true });
        toastAuth({ message: "Producto creado y seleccionado", variant: "success" });
      }
    } catch {
      toastAuth({
        message: "Producto creado, pero no se pudo refrescar el listado",
        variant: "warning",
      });
    }
  };

  const selectedProduct = useMemo(() => {
    const pid = Number(selectedProductId);
    if (!pid) return null;
    return productById.get(pid) || null;
  }, [selectedProductId, productById]);

  const linkedGeneric = useMemo(() => {
    if (!selectedProduct?.genericProductId) return null;
    return genericById.get(Number(selectedProduct.genericProductId)) || null;
  }, [selectedProduct, genericById]);

  const unitAbbr = getUnitAbbr(selectedProduct);
  const quantityLabel = getMovementQuantityLabel(selectedProduct, { isAjuste });
  const quantityHelper = getMovementQuantityHelper(selectedProduct);
  const catalogPrice = getMovementCatalogPrice(selectedProduct, selectedType, selectedReason);
  const catalogPriceLabel = getMovementCatalogPriceLabel(selectedType, selectedReason);

  const showVoucherField = useMemo(() => {
    if (isEdit) return false;
    if (cart.some((l) => l.type === "entrada" && l.reason === "ENTRADA_COMPRA")) return true;
    return selectedType === "entrada" && selectedReason === "ENTRADA_COMPRA";
  }, [isEdit, cart, selectedType, selectedReason]);

  const shouldMultiply = pricingRuleMode === "invert";

  const totalToSave = useMemo(() => {
    if (!needsPrice || priceInputValue == null || Number.isNaN(priceInputValue)) return null;
    let base;
    if (shouldMultiply) {
      const qty = Number(quantityValue || 0);
      if (!qty || Number.isNaN(qty)) return null;
      base = qty * priceInputValue;
    } else {
      base = priceInputValue;
    }
    // En edición el precio guardado ya es el total; no reaplicar IVA.
    if (isEdit) return round2(base);
    const productIva = Number(selectedProduct?.taxRate) || 0;
    if (productIva > 0) {
      return round2(base * (1 + (Number(ivaRate) || productIva) / 100));
    }
    return round2(base);
  }, [
    needsPrice,
    priceInputValue,
    quantityValue,
    shouldMultiply,
    selectedProduct,
    ivaRate,
    isEdit,
  ]);

  const cartTotals = useMemo(() => {
    const rate = (Number(ivaRate) || 0) / 100;
    let sub = 0;
    let iva = 0;
    for (const line of cart) {
      const base = lineBaseAmount(line);
      if (base == null) continue;
      sub += base;
      if (line.hasIva) iva += base * rate;
    }
    const rSub = round2(sub);
    const rIva = round2(iva);
    return { subtotal: rSub, ivaTotal: rIva, total: round2(rSub + rIva) };
  }, [cart, ivaRate]);

  const aperturaPreview = useMemo(() => {
    if (!isApertura || !selectedProduct) return null;
    const gramsPerPack = estimateGramsPerPack(selectedProduct);
    const totalGrams = gramsPerPack * packsToOpen;
    const genericDisplay = linkedGeneric
      ? gramsToGenericDisplay(linkedGeneric, totalGrams)
      : null;
    return {
      gramsPerPack,
      totalGrams,
      genericDisplay,
      presStock: Number(selectedProduct.stock ?? 0),
    };
  }, [isApertura, selectedProduct, packsToOpen, linkedGeneric]);

  useEffect(() => {
    if (!movementToEdit) return;
    const m = movementToEdit;
    setValue("productId", String(m.productId ?? ""), { shouldDirty: false });
    setValue("type", m.type || "entrada", { shouldDirty: false });
    setValue("reason", m.reason || "", { shouldDirty: false });
    setValue("quantity", String(m.quantity ?? ""), { shouldDirty: false });
    setValue("description", m.description || "", { shouldDirty: false });
    setValue("price", m.price != null ? String(m.price) : "", { shouldDirty: false });
    setMovementDate(isoToDateInput(m.date) || todayDateInput());
    setSimulatedData(null);
  }, [movementToEdit, setValue]);

  useEffect(() => {
    if (isEdit) return;
    const current = String(getValues("productId") || "");
    const stillThere = filteredProductOptions.some((p) => String(p.id) === current);
    if (current && stillThere) return;
    if (filteredProductOptions.length > 0) {
      setValue("productId", String(filteredProductOptions[0].id), {
        shouldValidate: true,
        shouldDirty: false,
      });
    } else {
      setValue("productId", "", { shouldDirty: false });
    }
  }, [filteredProductOptions, setValue, getValues, isEdit, selectedType]);

  useEffect(() => {
    if (isEdit) return;
    if (selectedType === "entrada") setValue("reason", "ENTRADA_COMPRA", { shouldDirty: false });
    else if (selectedType === "salida") setValue("reason", "SALIDA_CONSUMO", { shouldDirty: false });
    else if (selectedType === "ajuste") setValue("reason", "AJUSTE_INVENTARIO", { shouldDirty: false });
    setValue("price", "", { shouldDirty: false });
    setValue("pricingRuleMode", "auto", { shouldDirty: false });
    setSimulatedData(null);
    setPendingVoucherFile(null);
  }, [selectedType, setValue, isEdit]);

  useEffect(() => {
    if (selectedType !== "produccion") setSimulatedData(null);
  }, [selectedType, selectedProductId, quantityValue]);

  useEffect(() => {
    if (!needsPrice) setValue("price", "", { shouldDirty: false });
  }, [needsPrice, setValue]);

  useEffect(() => {
    if (isEdit || !needsPrice || !selectedProduct) return;
    const ref = getMovementCatalogPrice(selectedProduct, selectedType, selectedReason);
    if (ref > 0) {
      setValue("price", String(ref), { shouldDirty: false });
    }
    const productIva = Number(selectedProduct?.taxRate) || 0;
    if (productIva > 0) setIvaRate(productIva);
  }, [
    selectedProductId,
    selectedType,
    selectedReason,
    needsPrice,
    isEdit,
    selectedProduct,
    setValue,
  ]);

  const buildDescription = (formData, product, totalPrice) => {
    let description = formData.description?.trim() || null;
    if (description || !product) return description;

    const qty = Number(formData.quantity) || 0;
    const abbr = getUnitAbbr(product);
    const actionMap = {
      entrada: "Entraron",
      salida: "Salieron",
      ajuste: "Ajuste a",
      produccion: "Producción de",
    };
    description = `${actionMap[formData.type] || "Movimiento de"} ${qty} ${abbr || "unidades"} de ${product.name}`;
    if (totalPrice != null && qty > 0) {
      const unit = totalPrice / qty;
      description += `. Precio unitario: ${new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
      }).format(unit)}`;
    }
    return description;
  };

  const buildCurrentLinePayload = (formData) => {
    const product = productById.get(Number(formData.productId));
    const abbr = getUnitAbbr(product);
    const type = formData.type;
    const reason =
      type === "ajuste" ? "AJUSTE_INVENTARIO" : formData.reason;
    const needsPriceLine = showPriceField(type, reason);
    const productIva = Number(product?.taxRate) || 0;
    const hasIva = productIva > 0;
    const unitPriceInput =
      needsPriceLine &&
      priceInputValue != null &&
      !Number.isNaN(priceInputValue) &&
      (priceRequired || priceInputValue > 0)
        ? priceInputValue
        : null;

    const draftLine = {
      quantity: Number(formData.quantity),
      unitPriceInput: unitPriceInput ?? 0,
      shouldMultiply,
      hasIva,
    };
    let lineTotal = null;
    if (needsPriceLine && unitPriceInput != null) {
      lineTotal = lineTotalWithIva(draftLine, hasIva ? ivaRate || productIva : 0);
    }
    const description = buildDescription(formData, product, lineTotal);

    return {
      productId: Number(formData.productId),
      type,
      reason,
      quantity: Number(formData.quantity),
      description,
      price: type === "ajuste" || !needsPriceLine ? null : lineTotal,
      referenceType: formData.referenceType || null,
      referenceId: formData.referenceId ? Number(formData.referenceId) : null,
      unitPriceInput: unitPriceInput ?? "",
      shouldMultiply,
      hasIva,
      _meta: {
        productName: product?.name || "—",
        unitAbbr: abbr,
        typeLabel: typeLabel(type),
        reasonLabel: type === "ajuste" ? "Ajuste" : reasonLabel(type, reason),
        priceDisplay: lineTotal,
      },
    };
  };

  const clearLineFields = () => {
    setValue("quantity", "", { shouldDirty: false });
    setValue("price", "", { shouldDirty: false });
    setValue("description", "", { shouldDirty: false });
  };

  const addCurrentLineToCart = (formData) => {
    const product = productById.get(Number(formData.productId));
    const productIva = Number(product?.taxRate) || 0;
    if (productIva > 0) setIvaRate(productIva);

    const payload = buildCurrentLinePayload(formData);
    const { _meta, ...apiLine } = payload;
    setCart((prev) => [
      ...prev,
      {
        id: newCartId(),
        ...apiLine,
        ..._meta,
        hasIva: productIva > 0,
      },
    ]);
    clearLineFields();
  };

  const removeCartLine = (id) => {
    setCart((prev) => prev.filter((line) => line.id !== id));
  };

  const updateCartField = (id, field, rawValue) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const value = rawValue === "" ? "" : Number(rawValue);
        return { ...line, [field]: value };
      }),
    );
  };

  const toggleCartIva = (id, checked) => {
    setCart((prev) =>
      prev.map((line) => (line.id === id ? { ...line, hasIva: checked } : line)),
    );
  };

  const handleAddLineToCart = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toastAuth({
        message: "Completa producto, cantidad y precio (si aplica) antes de añadir.",
        variant: "warning",
      });
      return;
    }
    addCurrentLineToCart(getValues());
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isBatchType && cart.length > 0) {
      void submitForm(getValues());
      return;
    }
    void handleSubmit(submitForm)(e);
  };

  const submitForm = async (formData) => {
    const dateApi = isProgrammer ? movementDateForApi(movementDate) : undefined;

    if (isApertura && !isEdit) {
      const promise = openPresentationMovementRequest({
        presentationProductId: Number(formData.productId),
        packsToOpen,
        description: formData.description?.trim() || undefined,
        ...(dateApi ? { date: dateApi } : {}),
      });
      toastAuth({
        promise,
        successMessage: "Presentación abierta — stock transferido al insumo genérico",
        onSuccess: () => {
          onClose?.();
          onSaved?.(Number(formData.productId));
          reset();
          setMovementDate(todayDateInput());
        },
      });
      return;
    }

    if (isProduccion && !isEdit) {
      if (!simulatedData) return;
      const promise = registerProductionFinalFromPayload({
        productId: Number(simulatedData.id ?? formData.productId),
        quantity: Number(simulatedData.cantidadDeseada ?? formData.quantity),
        simulated: simulatedData,
        type: "produccion",
        description:
          formData.description?.trim() ||
          `Producción final de ${simulatedData.producto || selectedProduct?.name || "producto"}`,
        ...(dateApi ? { movementDate: dateApi } : {}),
      });
      toastAuth({
        promise,
        successMessage: "Producción registrada",
        onSuccess: () => {
          onClose?.();
          onSaved?.(Number(formData.productId));
          reset();
          setMovementDate(todayDateInput());
          setSimulatedData(null);
        },
      });
      return;
    }

    if (isBatchType) {
      const itemsToSave = cart.map((line) => {
        const needsPriceLine = showPriceField(line.type, line.reason);
        const total = needsPriceLine ? lineTotalWithIva(line, ivaRate) : null;
        return {
          productId: line.productId,
          type: line.type,
          reason: line.reason,
          quantity: Number(line.quantity),
          description: line.description || null,
          price: line.type === "ajuste" || !needsPriceLine ? null : total,
          referenceType: line.referenceType || null,
          referenceId: line.referenceId || null,
        };
      });

      if (itemsToSave.length === 0 && !canSubmit) {
        toastAuth({
          message: "Completa los campos del movimiento o añade líneas a la lista.",
          variant: "warning",
        });
        return;
      }

      const invalidPriced = itemsToSave.some((it) => {
        if (it.type === "ajuste") return false;
        if (!showPriceField(it.type, it.reason)) return false;
        if (isPriceRequired(it.type, it.reason) && !(Number(it.price) >= 0)) return true;
        return !(Number(it.quantity) > 0);
      });
      if (itemsToSave.length > 0 && invalidPriced) {
        toastAuth({
          message: "Revisa cantidad y precio (e IVA) de las líneas de la lista.",
          variant: "warning",
        });
        return;
      }

      const isCompraFlow =
        itemsToSave.length > 0
          ? itemsToSave.some((i) => i.type === "entrada" && i.reason === "ENTRADA_COMPRA")
          : formData.type === "entrada" && formData.reason === "ENTRADA_COMPRA";

      const voucherFile = pendingVoucherFile;

      const promise =
        itemsToSave.length > 0
          ? registerMovementsBatchRequest(itemsToSave, dateApi)
          : registerMovement({
              ...(() => {
                const { _meta, unitPriceInput, shouldMultiply: _sm, hasIva: _hi, ...line } =
                  buildCurrentLinePayload(formData);
                return line;
              })(),
              ...(dateApi ? { date: dateApi } : {}),
            });

      toastAuth({
        promise,
        successMessage:
          itemsToSave.length > 1
            ? `${itemsToSave.length} movimientos registrados`
            : "Movimiento registrado",
        onSuccess: async (result) => {
          if (voucherFile && isCompraFlow) {
            try {
              await uploadMovementVoucher(voucherFile, result);
            } catch {
              toastAuth({
                message: "Movimiento guardado, pero no se pudo subir el comprobante.",
                variant: "warning",
              });
            }
          }
          onClose?.();
          onSaved?.();
          reset();
          setCart([]);
          setPendingVoucherFile(null);
          setMovementDate(todayDateInput());
        },
      });
      return;
    }

    const description = buildDescription(formData, selectedProduct, totalToSave);
    const dataToSend = {
      productId: Number(formData.productId),
      type: formData.type,
      reason: formData.type === "ajuste" ? "AJUSTE_INVENTARIO" : formData.reason,
      quantity: Number(formData.quantity),
      description,
      price:
        formData.type === "ajuste" || !needsPrice
          ? null
          : totalToSave == null
            ? null
            : Number(totalToSave),
      referenceType: formData.referenceType || null,
      referenceId: formData.referenceId ? Number(formData.referenceId) : null,
      ...(dateApi ? { date: dateApi } : {}),
    };

    const savePromise = isEdit
      ? updateMovement(movementToEdit.id, {
          type: dataToSend.type,
          reason: dataToSend.reason,
          quantity: dataToSend.quantity,
          description: dataToSend.description,
          price: dataToSend.price,
          referenceType: dataToSend.referenceType,
          referenceId: dataToSend.referenceId,
          ...(dateApi ? { date: dateApi } : {}),
        })
      : registerMovement(dataToSend);

    toastAuth({
      promise: savePromise,
      successMessage: isEdit ? "Movimiento actualizado" : "Movimiento registrado",
      onSuccess: () => {
        onClose?.();
        onSaved?.(Number(formData.productId));
        reset();
        setMovementDate(todayDateInput());
      },
    });
  };

  const canSubmit = useMemo(() => {
    if (!selectedProductId || !selectedType) return false;
    if (isApertura && !isEdit) {
      return (
        Boolean(selectedProduct?.genericProductId) &&
        packsToOpen >= 1 &&
        Number(selectedProduct?.stock ?? 0) >= packsToOpen &&
        (aperturaPreview?.totalGrams ?? 0) > 0
      );
    }
    if (isProduccion && !isEdit) {
      return !quantityIsEmpty && quantityValue > 0 && Boolean(simulatedData);
    }
    if (isAjuste) return !quantityIsEmpty && Number.isFinite(Number(quantityRaw));
    if (quantityIsEmpty || !Number.isFinite(quantityValue) || quantityValue <= 0) return false;
    if (!isAjuste && !selectedReason) return false;
    if (priceRequired && (totalToSave == null || Number.isNaN(totalToSave))) return false;
    return true;
  }, [
    selectedProductId,
    selectedType,
    isApertura,
    isEdit,
    selectedProduct,
    packsToOpen,
    aperturaPreview,
    isProduccion,
    quantityIsEmpty,
    quantityValue,
    simulatedData,
    isAjuste,
    quantityRaw,
    selectedReason,
    priceRequired,
    totalToSave,
  ]);

  const canSaveBatch = isBatchType && (cart.length > 0 || canSubmit);

  const editableTypes = isEdit
    ? MOVEMENT_TYPES.filter((t) => t.value !== "apertura" && t.value !== "produccion")
    : MOVEMENT_TYPES;

  const submitLabel = isEdit
    ? "Guardar cambios"
    : isApertura
      ? "Abrir y transferir al genérico"
      : isProduccion
        ? "Registrar producción"
        : isBatchType && cart.length > 0
          ? `Guardar todo (${cart.length})`
          : "Registrar movimiento";

  const showMotivo = !isAjuste && !isApertura && !isProduccion;

  const summaryContent = (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: "100%" }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
        Resumen
      </Typography>
      {isApertura ? (
        aperturaPreview && selectedProduct ? (
          <Stack spacing={0.75}>
            <Typography variant="body2">
              <strong>{selectedProduct.name}</strong> → {linkedGeneric?.name || "genérico"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              −{packsToOpen} {unitAbbr || "u"} · +
              {aperturaPreview.totalGrams.toLocaleString("es-EC")} g
              {aperturaPreview.genericDisplay && (
                <>
                  {" "}
                  (
                  {aperturaPreview.genericDisplay.value.toLocaleString("es-EC", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {aperturaPreview.genericDisplay.label})
                </>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sin precio · transferencia interna
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Elige una presentación enlazada.
          </Typography>
        )
      ) : isAjuste ? (
        <Typography variant="body2" color="text.secondary">
          Nuevo stock: {!quantityIsEmpty ? quantityValue : "—"} {unitAbbr} · Sin precio
        </Typography>
      ) : isProduccion ? (
        <Typography variant="body2" color="text.secondary">
          Cantidad: {quantityValue || "—"} ·{" "}
          {simulatedData ? "Simulación lista" : "Falta simular receta"}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Cantidad: {quantityIsEmpty ? "—" : quantityValue} ·{" "}
            {isGenericIngredientProduct(selectedProduct) ? "genérico" : "unidad"} ({unitAbbr || "—"})
          </Typography>
          {needsPrice && catalogPrice > 0 && (
            <Typography variant="caption" color="text.secondary">
              Precio ref. {catalogPriceLabel}:{" "}
              {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
                catalogPrice,
              )}
            </Typography>
          )}
          {needsPrice && totalToSave != null && (
            <Typography variant="body2">
              {selectedType === "salida" ? "Valor salida" : "Total compra"}: $
              {Number(totalToSave).toFixed(2)}
            </Typography>
          )}
          {needsPrice && totalToSave == null && selectedType === "salida" && (
            <Typography variant="caption" color="text.secondary">
              Valor de salida opcional (referencia).
            </Typography>
          )}
          {!needsPrice && (
            <Typography variant="caption" color="text.secondary">
              Este movimiento no registra precio.
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  );

  return (
    <>
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", pr: 0.5 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>
              Tipo de movimiento
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={selectedType}
              onChange={(_, v) => {
                if (v) setValue("type", v, { shouldDirty: true });
              }}
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 0.5,
                "& .MuiToggleButtonGroup-grouped": {
                  border: "1px solid !important",
                  borderRadius: "10px !important",
                  m: 0,
                  flex: "1 1 0",
                  minWidth: 0,
                },
              }}
            >
              {editableTypes.map((opt) => {
                const Icon = TYPE_ICONS[opt.value] || InventoryIcon;
                const palette = theme.palette[opt.color]?.main || theme.palette.primary.main;
                const active = selectedType === opt.value;
                return (
                  <ToggleButton
                    key={opt.value}
                    value={opt.value}
                    sx={{
                      flexDirection: "column",
                      py: 0.75,
                      px: 0.25,
                      textTransform: "none",
                      gap: 0.15,
                      bgcolor: active ? alpha(palette, 0.14) : "background.paper",
                      borderColor: active ? palette : "divider",
                      color: active ? palette : "text.secondary",
                      "&.Mui-selected": {
                        bgcolor: alpha(palette, 0.14),
                        color: palette,
                        "&:hover": { bgcolor: alpha(palette, 0.2) },
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: active ? 800 : 600,
                        lineHeight: 1.1,
                        fontSize: "0.65rem",
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      {opt.label}
                    </Typography>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>

          <Grid container spacing={1.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                {isProgrammer && (
                  <ProgrammerMovementDateField
                    isProgrammer={isProgrammer}
                    value={movementDate}
                    onChange={setMovementDate}
                  />
                )}

                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <SearchableSelect
                      label={isApertura ? "Presentación a abrir" : "Producto"}
                      items={filteredProductOptions}
                      value={selectedProductId || ""}
                      disabled={isEdit}
                      onChange={(val) => {
                        const nextId =
                          val && typeof val === "object"
                            ? String(val.id ?? "")
                            : String(val ?? "");
                        setValue("productId", nextId, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                      getOptionLabel={(opt) => opt?.name ?? ""}
                      getOptionValue={(opt) => opt?.id ?? ""}
                      placeholder={
                        isApertura ? "Quintal, arroba, funda…" : "Busca un producto…"
                      }
                    />
                  </Box>
                  {!isEdit ? (
                    <Tooltip title="Crear producto nuevo">
                      <IconButton
                        color="primary"
                        onClick={() => setProductDialogOpen(true)}
                        sx={{
                          mt: 0.5,
                          border: 1,
                          borderColor: "primary.main",
                          borderRadius: 1,
                        }}
                      >
                        <AddBoxIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>

                {isApertura && selectedProduct && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Chip
                      size="small"
                      label={`Stock: ${Number(selectedProduct.stock ?? 0)} ${unitAbbr || ""}`}
                    />
                    {linkedGeneric && (
                      <Chip size="small" color="warning" variant="outlined" label={linkedGeneric.name} />
                    )}
                    <TextField
                      label="A abrir"
                      type="number"
                      size="small"
                      sx={{ width: 88 }}
                      inputProps={{ min: 1, step: 1 }}
                      value={packsRaw}
                      onChange={(e) => setValue("packsToOpen", e.target.value, { shouldDirty: true })}
                    />
                  </Stack>
                )}

                {selectedProduct && !isApertura && (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        isGenericIngredientProduct(selectedProduct)
                          ? "Insumo genérico"
                          : selectedProduct.genericProductId
                            ? "Presentación"
                            : "Producto"
                      }
                      color={isGenericIngredientProduct(selectedProduct) ? "secondary" : "default"}
                    />
                    {needsPrice && catalogPrice > 0 && (
                      <Chip
                        size="small"
                        label={`Ref. ${catalogPriceLabel} $${catalogPrice.toFixed(2)}`}
                        color={selectedType === "salida" ? "error" : "success"}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                )}

                {isAjuste && selectedProduct && (
                  <Typography variant="caption" color="text.secondary">
                    Stock actual: {Number(selectedProduct.stock ?? 0).toLocaleString("es-EC")}{" "}
                    {unitAbbr}
                  </Typography>
                )}

                {showMotivo && (
                  <TextField
                    label="Motivo"
                    select
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={selectedReason || ""}
                    {...register("reason", { required: !isBatchType })}
                    onChange={(e) => setValue("reason", e.target.value, { shouldDirty: true })}
                  >
                    {(REASON_OPTIONS[selectedType] || []).map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {needsPrice && (
                  <FormControl size="small" sx={{ width: "100%" }}>
                    <FormLabel sx={{ fontSize: "0.75rem", mb: 0.25 }}>
                      {priceOptional ? "Valor de salida (opcional)" : "Precio de compra"}
                    </FormLabel>
                    <RadioGroup
                      row
                      value={pricingRuleMode}
                      onChange={(e) =>
                        setValue("pricingRuleMode", e.target.value, { shouldDirty: true })
                      }
                    >
                      <FormControlLabel
                        value="auto"
                        control={<Radio size="small" />}
                        label="Total"
                      />
                      <FormControlLabel
                        value="invert"
                        control={<Radio size="small" />}
                        label="Unitario × cant."
                      />
                    </RadioGroup>
                    {priceOptional && (
                      <Typography variant="caption" color="text.secondary">
                        Ayuda para valorar la salida; no es obligatorio.
                      </Typography>
                    )}
                  </FormControl>
                )}

                {!isApertura && (
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={needsPrice ? 6 : 12}>
                      <TextField
                        label={quantityLabel}
                        type="number"
                        fullWidth
                        size="small"
                        variant="outlined"
                        inputProps={{ step: "any", min: 0 }}
                        value={watch("quantity") || ""}
                        {...register("quantity", { required: !isApertura && !isBatchType })}
                        onChange={(e) => setValue("quantity", e.target.value, { shouldDirty: true })}
                        helperText={quantityHelper}
                      />
                    </Grid>
                    {needsPrice && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label={
                            priceOptional
                              ? shouldMultiply
                                ? "Valor unit. (opc.)"
                                : "Valor total (opc.)"
                              : shouldMultiply
                                ? "Precio unit."
                                : "Precio total"
                          }
                          type="number"
                          fullWidth
                          size="small"
                          variant="outlined"
                          required={priceRequired && !isBatchType}
                          inputProps={{ step: "any", min: 0 }}
                          value={watch("price") || ""}
                          {...register("price")}
                          onChange={(e) => setValue("price", e.target.value, { shouldDirty: true })}
                          helperText={
                            catalogPrice > 0
                              ? `Ref. ${catalogPriceLabel}: $${catalogPrice.toFixed(2)}${
                                  priceOptional ? " (opcional)" : ""
                                }`
                              : priceOptional
                                ? "Opcional"
                                : undefined
                          }
                        />
                      </Grid>
                    )}
                    {needsPrice && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="IVA (%)"
                          type="number"
                          value={ivaRate}
                          onChange={(e) =>
                            setIvaRate(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ min: 0, step: "0.01" }}
                          helperText={
                            Number(selectedProduct?.taxRate) > 0
                              ? `Producto con IVA ${Number(selectedProduct.taxRate)}%`
                              : "Se aplica a líneas marcadas con IVA"
                          }
                        />
                      </Grid>
                    )}
                  </Grid>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={1.5} sx={{ height: "100%" }}>
                {isBatchType ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      flex: 1,
                      minHeight: 140,
                      maxHeight: 280,
                      overflow: "auto",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 0.5, px: 0.5 }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Lista ({cart.length})
                      </Typography>
                      {cart.length > 0 && (
                        <Button
                          type="button"
                          size="small"
                          color="inherit"
                          onClick={() => setCart([])}
                        >
                          Vaciar
                        </Button>
                      )}
                    </Stack>
                    {cart.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                        Añade líneas con el botón de abajo. Luego guarda todo de una vez.
                      </Typography>
                    ) : (
                      <Stack spacing={0.75}>
                        {cart.map((line, idx) => {
                          const lineTotal = lineTotalWithIva(line, ivaRate);
                          const showLinePrice = showPriceField(line.type, line.reason);
                          return (
                            <Box
                              key={line.id}
                              sx={{
                                position: "relative",
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                columnGap: 0.75,
                                rowGap: 0.5,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                                px: 0.75,
                                py: 0.5,
                                pr: 4.5,
                                bgcolor: "background.paper",
                              }}
                            >
                              <IconButton
                                type="button"
                                size="small"
                                color="error"
                                aria-label="Quitar"
                                onClick={() => removeCartLine(line.id)}
                                sx={{ position: "absolute", top: 2, right: 2 }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                              <Typography variant="body2" fontWeight={700} sx={{ width: "100%" }}>
                                {idx + 1}. {line.productName}
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ ml: 0.75 }}
                                >
                                  {line.typeLabel} · {line.reasonLabel}
                                </Typography>
                              </Typography>
                              <TextField
                                label="Cant."
                                type="number"
                                size="small"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateCartField(line.id, "quantity", e.target.value)
                                }
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0.01, step: "any" }}
                                sx={{ width: 78 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {line.unitAbbr || "u."}
                                {line.shouldMultiply ? " ×" : ""}
                              </Typography>
                              {showLinePrice ? (
                                <>
                                  <TextField
                                    label={line.shouldMultiply ? "P. unit." : "P. total"}
                                    type="number"
                                    size="small"
                                    value={line.unitPriceInput}
                                    onChange={(e) =>
                                      updateCartField(line.id, "unitPriceInput", e.target.value)
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: 0, step: "0.001" }}
                                    sx={{ width: 92 }}
                                  />
                                  <FormControlLabel
                                    sx={{
                                      ml: 0.25,
                                      mr: 0,
                                      "& .MuiFormControlLabel-label": { fontSize: "0.75rem" },
                                    }}
                                    control={
                                      <Checkbox
                                        size="small"
                                        sx={{ p: 0.25 }}
                                        checked={Boolean(line.hasIva)}
                                        onChange={(e) =>
                                          toggleCartIva(line.id, e.target.checked)
                                        }
                                      />
                                    }
                                    label={`IVA ${Number(ivaRate) || 0}%`}
                                  />
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{ ml: "auto", minWidth: 72, textAlign: "right" }}
                                  >
                                    {lineTotal != null ? formatProductPrice(lineTotal) : "—"}
                                  </Typography>
                                </>
                              ) : null}
                            </Box>
                          );
                        })}
                        {cart.some((l) => showPriceField(l.type, l.reason)) ? (
                          <Box sx={{ pt: 0.5, borderTop: 1, borderColor: "divider" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">
                                Subtotal
                              </Typography>
                              <Typography variant="body2">
                                {formatProductPrice(cartTotals.subtotal)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" color="text.secondary">
                                IVA ({Number(ivaRate) || 0}%)
                              </Typography>
                              <Typography variant="body2">
                                {formatProductPrice(cartTotals.ivaTotal)}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 0.25,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={700}>
                                Total
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {formatProductPrice(cartTotals.total)}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null}
                      </Stack>
                    )}
                  </Paper>
                ) : (
                  summaryContent
                )}
                <TextField
                  label={isBatchType ? "Notas de esta línea (opcional)" : "Notas (opcional)"}
                  fullWidth
                  size="small"
                  variant="outlined"
                  multiline
                  minRows={isBatchType ? 2 : 3}
                  sx={{ flex: 1 }}
                  {...register("description")}
                />
                {showVoucherField && (
                  <AttachmentField
                    label="Factura / comprobante de compra"
                    helperText="Opcional. Una constancia para todo el lote de compra."
                    pendingFile={pendingVoucherFile}
                    onPendingFileChange={setPendingVoucherFile}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>

          {!isEdit && isProduccion && selectedProductId && quantityValue > 0 && (
            <SimulateProductionComponent
              embedProductId={Number(selectedProductId)}
              embedQuantity={quantityValue}
              onSimulated={(data) => setSimulatedData(data)}
            />
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          pt: 1.5,
          pb: 2,
          px: 0.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          bottom: 0,
          zIndex: 2,
        }}
      >
        <Stack direction="row" spacing={1}>
          {isBatchType && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddIcon />}
              disabled={!canSubmit}
              type="button"
              onClick={handleAddLineToCart}
              sx={{ flex: 1 }}
            >
              Añadir a la lista
            </Button>
          )}
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={isBatchType ? !canSaveBatch : !canSubmit}
            size="large"
            sx={{ flex: isBatchType ? 1.2 : 1 }}
          >
            {submitLabel}
          </Button>
        </Stack>
      </Box>
    </Box>

      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 1,
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            Crear producto
          </DialogTitle>
          <IconButton
            aria-label="Cerrar"
            onClick={() => setProductDialogOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent dividers>
          <ProductForm
            key={productDialogOpen ? "new-movement-product" : "closed"}
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
          <Button
            type="submit"
            form="eddeli-product-form"
            variant="contained"
            sx={{ minWidth: 160 }}
          >
            Guardar producto
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default MovementForm;
