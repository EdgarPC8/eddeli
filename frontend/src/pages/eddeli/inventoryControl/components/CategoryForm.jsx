import {
  Grid,
  TextField,
  Box,
  Button,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  createCategoryRequest,
  updateCategoryRequest,
} from "../../../../api/inventoryControlRequest";

function CategoryForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();

  // 🔹 Reset del formulario
  const resetForm = () => reset();

  // 🔹 Envío del formulario
  const submitForm = async (formData) => {
    formData.isPublic = Boolean(formData.isPublic);

    try {
      if (isEditing) {
        await toastAuth({
          promise: updateCategoryRequest(datos.id, formData),
          onSuccess: async () => {
            resetForm();
            if (reload) await reload();
            if (onClose) onClose();
          },
        });
        return;
      }

      await toastAuth({
        promise: createCategoryRequest(formData),
        successMessage: "Categoría guardada con éxito",
        onSuccess: async () => {
          resetForm();
          if (reload) await reload();
          if (onClose) onClose();
        },
      });
    } catch {
      /* toast mostró error */
    }
  };

  // 🔹 Cargar datos al editar
  const loadData = () => {
    if (isEditing && datos) {
      setValue("name", datos.name || "");
      setValue("description", datos.description || "");
      setValue("isPublic", Boolean(datos.isPublic));
    } else {
      setValue("isPublic", true);
    }
  };

  useEffect(() => {
    loadData();
  }, [isEditing, datos]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Nombre"
            fullWidth
            variant="standard"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción"
            fullWidth
            variant="standard"
            multiline
            rows={3}
            {...register("description")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        {/* 🔹 Switch de visibilidad pública */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                {...register("isPublic")}
                checked={watch("isPublic") || false}
                onChange={(e) => setValue("isPublic", e.target.checked)}
              />
            }
            label="Visible al público"
          />
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

export default CategoryForm;
