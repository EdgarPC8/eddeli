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
} from "@mui/material";

import { useEffect, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  getAllProducts,
  createRecipeRequest,
  updateRecipeRequest,
} from "../../../../api/inventoryControlRequest";

import { useForm, Controller } from "react-hook-form";
import SearchableSelect from "../../../../components/SearchableSelect";




function RecipeForm({ isEditing = false, datos = [], onClose, reload, productFinalId }) {
  const { handleSubmit, register, reset, setValue, watch,control } = useForm({
    defaultValues: {
      productRawId: "",
      quantity: "",
      isQuantityInGrams: "false",
      itemType: "insumo",   // valor por defecto
    },
    
  });

  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();
  const [rawOptions, setRawOptions] = useState([]);

  const resetForm = () => {
    reset({
      productRawId: "",
      quantity: "",
      isQuantityInGrams: "false",
      itemType: "insumo",
    });
    
  };

  const submitForm = async (formData) => {
    const body = { ...formData, productFinalId };

    // asegurar que isQuantityInGrams sea boolean
    body.isQuantityInGrams = formData.isQuantityInGrams === "true";

    if (isEditing) {
      toastAuth({
        promise: updateRecipeRequest(datos.id, body),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Receta",
            description: "Insumo actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createRecipeRequest([body]),
      successMessage: "Insumo agregado a la receta con éxito",
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
        resetForm();
      },
    });
  };

  const loadData = async () => {
    const { data } = await getAllProducts();
    const options = data.filter(
      (p) =>
        p.id !== productFinalId &&
        p.type === "raw" &&
        p.isGenericIngredient &&
        !p.genericProductId
    );
    // Compatibilidad: si aún no hay flags, mostrar raw sin padre genérico
    setRawOptions(
      options.length > 0
        ? options
        : data.filter(
            (p) => p.id !== productFinalId && p.type === "raw" && !p.genericProductId
          )
    );
    if (isEditing && datos) {
      setValue("productRawId", datos.productRawId);
      setValue("quantity", datos.quantity);
      setValue("isQuantityInGrams", datos.isQuantityInGrams ? "true" : "false");
      setValue("itemType", datos.itemType || "insumo"); // por si no está definido
    }
    
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
      <Grid item xs={12}>
  <SearchableSelect
    label="Insumo genérico (receta)"
    items={rawOptions}
    value={watch("productRawId")}
    onChange={(val) => {
      // val debe ser el ID (igual que en RecipePage)
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
            {...register("quantity", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

<Grid item xs={12}>
  <FormControl component="fieldset">
    <FormLabel component="legend">¿Cantidad en gramos?</FormLabel>
    <Controller
      name="isQuantityInGrams"
      control={control}
      defaultValue="false"
      render={({ field }) => (
        <RadioGroup row {...field}>
          <FormControlLabel value="true" control={<Radio />} label="Sí" />
          <FormControlLabel value="false" control={<Radio />} label="No" />
        </RadioGroup>
      )}
    />
  </FormControl>
</Grid>
<Grid item xs={12}>
  <TextField
    label="Tipo de Item"
    select
    fullWidth
    variant="standard"
    value={watch("itemType")}
    {...register("itemType", { required: true })}
    InputLabelProps={idData ? { shrink: true } : {}}
  >
    <MenuItem value="insumo">Insumo</MenuItem>
    <MenuItem value="material">Material</MenuItem>
  </TextField>
</Grid>




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
