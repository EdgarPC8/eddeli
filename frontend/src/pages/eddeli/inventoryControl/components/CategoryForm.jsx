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
import toast from "react-hot-toast";
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
    // Convertir el valor del switch a booleano real
    formData.isPublic = Boolean(formData.isPublic);

    if (isEditing) {
      toastAuth({
        promise: updateCategoryRequest(datos.id, formData),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Categoría",
            description: "Categoría actualizada correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createCategoryRequest(formData),
      successMessage: "Categoría guardada con éxito",
      onSuccess: (data) => {
        if (onClose) onClose();
        if (reload) reload();
        resetForm();
        console.log(data);
      },
    });
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
