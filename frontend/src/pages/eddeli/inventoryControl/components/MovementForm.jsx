import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
  Typography,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  registerMovement,
  updateMovement,
} from "../../../../api/inventoryControlRequest";
import SimulateProductionComponent from "./SimulateProduction.jsx";
import SearchableSelect from "../../../../components/SearchableSelect.jsx";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
  isoToDateInput,
} from "./ProgrammerMovementDateField.jsx";

function normalizeAbbr(abbr) {
  return String(abbr || "").trim().toLowerCase();
}

// Detecta si la unidad es "unidad" (un, u, und, unidad, pcs, etc.)
function isUnitBasedByAbbr(abbr) {
  const a = normalizeAbbr(abbr);
  return ["un", "u", "und", "unidad", "unit", "units", "pc", "pcs"].includes(a);
}

// Detecta si es basado en gramos/kilos (g, gr, kg)
function isGramBasedByAbbr(abbr) {
  const a = normalizeAbbr(abbr);
  return ["g", "gr", "gram", "grams", "kg", "kilo", "kilos"].includes(a);
}

function MovementForm({ onClose, productOptions = [], onSaved, movementToEdit = null }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: {
      productId: "",
      type: "entrada",
      reason: "", // ✅ obligatorio ahora
      quantity: "",
      price: "",
      description: "",
      referenceType: "",
      referenceId: "",
      pricingRuleMode: "auto", // ✅ NUEVO: auto | invert
    },
  });

  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const isEdit = Boolean(movementToEdit?.id);
  const [movementDate, setMovementDate] = useState(todayDateInput());
  const [simulatedData, setSimulatedData] = useState(null);

  const selectedProductId = watch("productId");
  const selectedType = watch("type");
  const selectedReason = watch("reason");
  const pricingRuleMode = watch("pricingRuleMode"); // auto | invert

  const isAjuste = selectedType === "ajuste";

  const quantityRaw = watch("quantity");
  const quantityValue = Number(quantityRaw || 0);
  const quantityIsEmpty = quantityRaw === "" || quantityRaw == null;
  const priceInputValue = watch("price") === "" ? null : Number(watch("price"));

  const productById = useMemo(() => {
    const map = new Map();
    (productOptions || []).forEach((p) => map.set(Number(p.id), p));
    return map;
  }, [productOptions]);

  const selectedProduct = useMemo(() => {
    const pid = Number(selectedProductId);
    if (!pid) return null;
    return productById.get(pid) || null;
  }, [selectedProductId, productById]);

  // ✅ IMPORTANTE:
  // Ajusta estos accesos si tu include llega con otro nombre.
  const unitAbbr =
    selectedProduct?.unit?.abbreviation ||
    selectedProduct?.InventoryUnit?.abbreviation ||
    selectedProduct?.ERP_inventory_unit?.abbreviation ||
    "";

  const quantityLabel = isAjuste
    ? unitAbbr
      ? `Nuevo stock (${unitAbbr})`
      : "Nuevo stock"
    : unitAbbr
      ? `Cantidad (${unitAbbr})`
      : "Cantidad";

  const reasonOptionsByType = {
    entrada: [
      { value: "ENTRADA_COMPRA", label: "Entrada por compra" },
      { value: "ENTRADA_DEVOLUCION", label: "Entrada por devolución" },
      { value: "ENTRADA_OTRA", label: "Otra entrada" },
    ],
    salida: [
      { value: "SALIDA_VENTA", label: "Salida por venta" },
      { value: "SALIDA_CONSUMO", label: "Salida por consumo/uso interno" },
      { value: "SALIDA_MERMA", label: "Salida por merma/daño" },
      { value: "SALIDA_OTRA", label: "Otra salida" },
    ],
    ajuste: [{ value: "AJUSTE_INVENTARIO", label: "Ajuste de inventario" }],
    produccion: [
      { value: "PRODUCCION_FINAL", label: "Producción (producto final)" },
      { value: "PRODUCCION_INTERMEDIA", label: "Producción (intermedio)" },
    ],
  };

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

  // ✅ setea producto inicial si hay opciones (solo crear)
  useEffect(() => {
    if (isEdit) return;
    if ((productOptions || []).length > 0) {
      const firstId = String(productOptions[0].id);
      setValue("productId", firstId, { shouldValidate: true, shouldDirty: false });
    }
  }, [productOptions, setValue, isEdit]);

  // Motivo por defecto según tipo (no sobrescribir al editar)
  useEffect(() => {
    if (isEdit) return;
    if (selectedType === "entrada") setValue("reason", "ENTRADA_COMPRA", { shouldDirty: false });
    else if (selectedType === "salida") setValue("reason", "SALIDA_CONSUMO", { shouldDirty: false });
    else if (selectedType === "ajuste") setValue("reason", "AJUSTE_INVENTARIO", { shouldDirty: false });
    else if (selectedType === "produccion") setValue("reason", "PRODUCCION_FINAL", { shouldDirty: false });
  }, [selectedType, setValue]);

  // ✅ si cambia tipo/producto/cantidad, resetea simulación cuando no aplique
  useEffect(() => {
    if (selectedType !== "produccion") {
      setSimulatedData(null);
      return;
    }
    if (!selectedProductId || quantityValue <= 0) {
      setSimulatedData(null);
    }
  }, [selectedType, selectedProductId, quantityValue]);

  useEffect(() => {
    if (selectedType === "ajuste") {
      setValue("price", "", { shouldDirty: false });
      setValue("pricingRuleMode", "auto", { shouldDirty: false });
    }
  }, [selectedType, setValue]);

  /**
   * ✅ REGLA CORREGIDA:
   * - Por defecto NO multiplica (el precio ingresado es el TOTAL pagado)
   * - Si el usuario quiere ingresar precio unitario, puede usar "invertir regla"
   * - Esto evita errores donde se multiplica cuando no se debe
   */
  const baseShouldMultiply = useMemo(() => {
    // Por defecto NO multiplicamos - el precio es el total
    return false;
  }, []);

  const shouldMultiply = useMemo(() => {
    if (pricingRuleMode === "invert") return !baseShouldMultiply;
    return baseShouldMultiply;
  }, [pricingRuleMode, baseShouldMultiply]);

  // ✅ Total a guardar en BD (para compras y para mostrar confirmación)
  const totalToSave = useMemo(() => {
    if (priceInputValue == null || Number.isNaN(priceInputValue)) return null;

    if (shouldMultiply) {
      const qty = Number(quantityValue || 0);
      if (!qty || Number.isNaN(qty)) return null;
      return qty * priceInputValue;
    }

    return priceInputValue;
  }, [priceInputValue, quantityValue, shouldMultiply]);

  const priceLabel = useMemo(() => {
    // Por defecto el precio es TOTAL (lo que pagaste)
    // Solo si el usuario invierte la regla, entonces es precio unitario
    if (selectedType === "entrada" && selectedReason === "ENTRADA_COMPRA") {
      return shouldMultiply ? "Precio Unitario" : "Precio Total (lo que pagaste)";
    }
    return shouldMultiply ? "Precio Unitario" : "Precio Total";
  }, [selectedType, selectedReason, shouldMultiply]);

  const ruleText = useMemo(() => {
    const u = unitAbbr ? `(${unitAbbr})` : "";
    if (shouldMultiply) {
      return `Regla aplicada: TOTAL = Cantidad ${u} × Precio Unitario.`;
    }
    return `Regla aplicada: TOTAL = Precio Total ingresado (no se multiplica).`;
  }, [shouldMultiply, unitAbbr]);

  const submitForm = async (formData) => {
    // ✅ Generar descripción automática si no hay descripción
    let description = formData.description?.trim() || null;
    
    if (!description && selectedProduct) {
      const productName = selectedProduct.name || "producto";
      const quantity = Number(formData.quantity) || 0;
      const priceTotal = totalToSave;
      
      // Determinar texto según tipo de movimiento
      let actionText = "";
      switch (formData.type) {
        case "entrada":
          actionText = "Entraron";
          break;
        case "salida":
          actionText = "Salieron";
          break;
        case "ajuste":
          actionText = "Ajuste a";
          break;
        case "produccion":
          actionText = "Producción de";
          break;
        default:
          actionText = "Movimiento de";
      }
      
      // Construir descripción base
      description = `${actionText} ${quantity} ${unitAbbr || "unidades"} de ${productName}`;
      
      // Si hay precio, agregar información del precio unitario
      if (priceTotal != null && quantity > 0) {
        const priceUnit = priceTotal / quantity;
        const priceUnitFormatted = new Intl.NumberFormat("es-EC", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(priceUnit);
        
        description += `. Precio unitario: ${priceUnitFormatted}`;
      }
    }
    
    const dateApi = isProgrammer ? movementDateForApi(movementDate) : undefined;

    const dataToSend = {
      productId: Number(formData.productId),
      type: formData.type,
      reason: formData.type === "ajuste" ? "AJUSTE_INVENTARIO" : formData.reason,
      quantity: Number(formData.quantity),
      description: description,

      price:
        formData.type === "ajuste"
          ? null
          : totalToSave == null
            ? null
            : Number(totalToSave),

      referenceType: formData.referenceType || null,
      referenceId: formData.referenceId ? Number(formData.referenceId) : null,

      simulated: isEdit ? null : simulatedData,
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
      successMessage: isEdit ? "Movimiento actualizado" : "Movimiento registrado con éxito",
      onSuccess: () => {
        if (onClose) onClose();
        if (onSaved) onSaved(Number(formData.productId));
        reset();
        setMovementDate(todayDateInput());
      },
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <ProgrammerMovementDateField
            isProgrammer={isProgrammer}
            value={movementDate}
            onChange={setMovementDate}
          />
        </Grid>

        <Grid item xs={12}>
          <SearchableSelect
            label="Producto"
            items={productOptions}
            value={selectedProductId || ""}
            disabled={isEdit}
            onChange={(val) => {
              const nextId =
                val && typeof val === "object"
                  ? String(val.id ?? "")
                  : String(val ?? "");
              setValue("productId", nextId, { shouldValidate: true, shouldDirty: true });

              // al cambiar producto, también reinicio modo de regla en auto
              setValue("pricingRuleMode", "auto", { shouldDirty: true });
            }}
            getOptionLabel={(opt) => opt?.name ?? ""}
            getOptionValue={(opt) => opt?.id ?? ""}
            placeholder="Busca un producto..."
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Tipo de Movimiento"
            select
            fullWidth
            variant="standard"
            value={selectedType || ""}
            {...register("type", { required: true })}
          >
            <MenuItem value="entrada">Entrada</MenuItem>
            <MenuItem value="salida">Salida</MenuItem>
            <MenuItem value="ajuste">Ajuste</MenuItem>
            <MenuItem value="produccion">Producción</MenuItem>
          </TextField>
        </Grid>

        {isAjuste && selectedProduct && (
          <Grid item xs={12}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2">
                <strong>Stock actual en sistema:</strong>{" "}
                {Number(selectedProduct.stock ?? 0).toLocaleString("es-EC", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })}
                {unitAbbr ? ` ${unitAbbr}` : ""}
              </Typography>
              {!quantityIsEmpty && Number.isFinite(quantityValue) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ mt: 0.75 }}
                >
                  Con el valor que ingresaste, el stock quedaría en{" "}
                  <strong>
                    {quantityValue.toLocaleString("es-EC", { maximumFractionDigits: 4 })}
                  </strong>
                  {unitAbbr ? ` ${unitAbbr}` : ""}
                  {" · "}
                  Variación:{" "}
                  <strong>
                    {(() => {
                      const diff = quantityValue - Number(selectedProduct.stock ?? 0);
                      return `${diff >= 0 ? "+" : ""}${diff.toLocaleString("es-EC", {
                        maximumFractionDigits: 4,
                      })}`;
                    })()}
                  </strong>
                  {unitAbbr ? ` ${unitAbbr}` : ""}
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {!isAjuste && (
          <Grid item xs={12}>
            <TextField
              label="Motivo (reason)"
              select
              fullWidth
              variant="standard"
              value={selectedReason || ""}
              {...register("reason", { required: true })}
              onChange={(e) => setValue("reason", e.target.value, { shouldDirty: true })}
            >
              {(reasonOptionsByType[selectedType] || []).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        {/* Precio: solo entrada/salida/producción (no ajuste) */}
        {!isAjuste && (
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>¿Cómo ingresarás el precio?</FormLabel>
              <RadioGroup
                row
                value={pricingRuleMode}
                onChange={(e) =>
                  setValue("pricingRuleMode", e.target.value, { shouldDirty: true })
                }
              >
                <FormControlLabel
                  value="auto"
                  control={<Radio />}
                  label="Precio Total (lo que pagaste)"
                />
                <FormControlLabel
                  value="invert"
                  control={<Radio />}
                  label="Precio Unitario (por cada unidad)"
                />
              </RadioGroup>

              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                {ruleText}
              </Typography>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12} md={isAjuste ? 12 : 6}>
          <TextField
            label={quantityLabel}
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any", min: 0 }}
            value={watch("quantity") || ""}
            {...register("quantity", { required: true })}
            onChange={(e) => setValue("quantity", e.target.value, { shouldDirty: true })}
            helperText={
              isAjuste
                ? `Nuevo stock físico (${unitAbbr || "unidad del producto"}). Reemplaza el stock actual.`
                : unitAbbr
                  ? `Ingresa la cantidad en ${unitAbbr}.`
                  : "Ingresa la cantidad según la unidad del producto."
            }
          />
        </Grid>

        {!isAjuste && (
          <Grid item xs={12} md={6}>
            <TextField
              label={priceLabel}
              type="number"
              fullWidth
              variant="standard"
              inputProps={{ step: "any", min: 0 }}
              value={watch("price") || ""}
              {...register("price")}
              onChange={(e) => setValue("price", e.target.value, { shouldDirty: true })}
              helperText={
                shouldMultiply
                  ? "Ingresa el precio por cada unidad. Se multiplicará por la cantidad."
                  : "Ingresa el precio total que pagaste. No se multiplicará."
              }
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ p: 1.2, borderRadius: 1, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2">
              Confirmación (se guardará en BD)
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <b>Unidad:</b> {unitAbbr || "—"}{" "}
              <b style={{ marginLeft: 12 }}>Cantidad:</b>{" "}
              {!quantityIsEmpty && Number.isFinite(quantityValue) ? quantityValue : "—"}
            </Typography>
            {isAjuste ? (
              <Typography variant="body2" sx={{ mt: 0.8 }}>
                {selectedProduct && (
                  <>
                    <b>Stock actual:</b>{" "}
                    {Number(selectedProduct.stock ?? 0).toLocaleString("es-EC", {
                      maximumFractionDigits: 4,
                    })}
                    {unitAbbr ? ` ${unitAbbr}` : ""}
                    <br />
                  </>
                )}
                <b>Stock quedará en:</b>{" "}
                {!quantityIsEmpty && Number.isFinite(quantityValue) ? quantityValue : "—"}{" "}
                {unitAbbr || ""}
                <Typography component="span" variant="caption" display="block" color="text.secondary">
                  Sin precio en ajuste.
                </Typography>
              </Typography>
            ) : (
              <>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <b>Precio ingresado:</b>{" "}
                  {priceInputValue == null || Number.isNaN(priceInputValue) ? "—" : priceInputValue}
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.8 }}>
                  <b>TOTAL a guardar:</b>{" "}
                  {totalToSave == null || Number.isNaN(totalToSave)
                    ? "—"
                    : totalToSave.toFixed(2)}
                </Typography>
              </>
            )}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción"
            fullWidth
            variant="standard"
            multiline
            rows={3}
            {...register("description")}
          />
        </Grid>

        {/* Simulación solo al crear producción */}
        {!isEdit &&
          selectedType === "produccion" &&
          selectedProductId &&
          Number(selectedProductId) > 0 &&
          quantityValue > 0 && (
            <Grid item xs={12}>
              <SimulateProductionComponent
                embedProductId={Number(selectedProductId)}
                embedQuantity={quantityValue}
                onSimulated={(data) => setSimulatedData(data)}
              />
            </Grid>
          )}

        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={
              !selectedProductId ||
              !selectedType ||
              (!isAjuste && !selectedReason) ||
              quantityIsEmpty ||
              (isAjuste
                ? !Number.isFinite(Number(quantityRaw))
                : !Number.isFinite(quantityValue) ||
                  quantityValue <= 0 ||
                  totalToSave == null)
            }
          >
            {isEdit ? "Guardar cambios" : "Registrar Movimiento"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default MovementForm;
