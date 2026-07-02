import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from "@mui/material";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  getAllProductsAll,
  createRecipeRequest,
  updateRecipeRequest,
} from "../../../../api/inventoryControlRequest";

import { useForm, Controller } from "react-hook-form";
import SearchableSelect from "../../../../components/SearchableSelect";

function buildComponentOptions(products, productFinalId) {
  const others = products.filter((p) => String(p.id) !== String(productFinalId));

  const generics = others.filter(
    (p) => p.type === "raw" && p.isGenericIngredient && !p.genericProductId,
  );
  const genericFallback = others.filter(
    (p) => p.type === "raw" && !p.genericProductId,
  );
  const rawOptions = generics.length > 0 ? generics : genericFallback;

  const intermediates = others.filter((p) => p.type === "intermediate");

  return [
    ...intermediates.map((p) => ({
      ...p,
      optionLabel: `${p.name} (intermedio)`,
      componentKind: "intermediate",
    })),
    ...rawOptions.map((p) => ({
      ...p,
      optionLabel: `${p.name} (insumo genérico)`,
      componentKind: "raw",
    })),
  ];
}

function RecipeForm({ isEditing = false, datos = [], onClose, reload, productFinalId }) {
  const { handleSubmit, register, reset, setValue, watch, control } = useForm({
    defaultValues: {
      productRawId: "",
      quantity: "",
      isQuantityInGrams: "true",
      itemType: "insumo",
    },
  });

  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();
  const [allProducts, setAllProducts] = useState([]);

  const componentOptions = useMemo(
    () => buildComponentOptions(allProducts, productFinalId),
    [allProducts, productFinalId],
  );

  const selectedRawId = watch("productRawId");
  const selectedComponent = componentOptions.find(
    (p) => String(p.id) === String(selectedRawId),
  );
  const isIntermediate = selectedComponent?.componentKind === "intermediate";

  const resetForm = () => {
    reset({
      productRawId: "",
      quantity: "",
      isQuantityInGrams: "true",
      itemType: "insumo",
    });
  };

  const submitForm = async (formData) => {
    const body = { ...formData, productFinalId };
    body.isQuantityInGrams = formData.isQuantityInGrams === "true";
    if (isIntermediate) body.itemType = "insumo";

    if (isEditing) {
      toastAuth({
        promise: updateRecipeRequest(datos.id, body),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Receta",
            description: "Componente actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createRecipeRequest([body]),
      successMessage: "Componente agregado a la receta",
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
        resetForm();
      },
    });
  };

  const loadData = async () => {
    const { data } = await getAllProductsAll();
    setAllProducts(data);

    if (isEditing && datos) {
      setValue("productRawId", datos.productRawId);
      setValue("quantity", datos.quantity);
      setValue("isQuantityInGrams", datos.isQuantityInGrams ? "true" : "false");
      setValue("itemType", datos.itemType || "insumo");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isIntermediate) setValue("itemType", "insumo");
  }, [isIntermediate, setValue]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <SearchableSelect
            label="Componente de receta"
            items={componentOptions}
            value={watch("productRawId")}
            getOptionLabel={(item) => item.optionLabel || item.name}
            onChange={(val) => {
              setValue("productRawId", val, { shouldValidate: true, shouldDirty: true });
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Cantidad"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any", min: 0 }}
            value={watch("quantity")}
            {...register("quantity", { required: true, min: 0.0001 })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">¿Cantidad en gramos?</FormLabel>
            <Controller
              name="isQuantityInGrams"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel value="true" control={<Radio />} label="Sí" />
                  <FormControlLabel value="false" control={<Radio />} label="No (unidades)" />
                </RadioGroup>
              )}
            />
          </FormControl>
        </Grid>

        {!isIntermediate && (
          <Grid item xs={12}>
            <TextField
              label="Tipo de ítem"
              select
              fullWidth
              variant="standard"
              value={watch("itemType")}
              {...register("itemType", { required: true })}
              InputLabelProps={idData ? { shrink: true } : {}}
            >
              <MenuItem value="insumo">Insumo (costo por gramo)</MenuItem>
              <MenuItem value="material">Material (costo por unidad de empaque)</MenuItem>
            </TextField>
          </Grid>
        )}

        {isIntermediate && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Los productos intermedios (masas) se registran como insumo en la cadena de costos.
            </Typography>
          </Grid>
        )}

        <Grid item xs={4}>
          <Button variant="contained" fullWidth type="submit">
            {!isEditing ? "Guardar" : "Editar"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default RecipeForm;
