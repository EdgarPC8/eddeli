import {
  Grid,
  TextField,
  Box,
  Button,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  createSupplierRequest,
  updateSupplierRequest,
} from "../../../../api/inventoryControlRequest.js";

function SupplierForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue } = useForm();
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();

  const resetForm = () => {
    reset();
  };

  const submitForm = async (formData) => {
    const payload = {
      name: String(formData.name || "").trim(),
      phone: formData.phone?.trim() || null,
      email: formData.email?.trim() || null,
      address: formData.address?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    if (isEditing) {
      toastAuth({
        promise: updateSupplierRequest(datos.id, payload),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Proveedor",
            description: "Proveedor actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createSupplierRequest(payload),
      successMessage: "Proveedor guardado con éxito",
      onSuccess: (result) => {
        if (onClose) onClose();
        if (reload) reload(result?.data);
        resetForm();
      },
    });
  };

  const loadData = () => {
    if (isEditing && datos) {
      setValue("name", datos.name || "");
      setValue("phone", datos.phone || "");
      setValue("email", datos.email || "");
      setValue("address", datos.address || "");
      setValue("notes", datos.notes || "");
    }
  };

  useEffect(() => {
    loadData();
  }, [isEditing, datos]);

  return (
    <Box
      component="form"
      id="eddeli-supplier-form"
      sx={{ mt: 1 }}
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(submitForm)(e);
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Nombre"
            fullWidth
            required
            variant="standard"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Teléfono"
            fullWidth
            variant="standard"
            {...register("phone")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Correo"
            fullWidth
            type="email"
            variant="standard"
            {...register("email")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Dirección"
            fullWidth
            variant="standard"
            {...register("address")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción / notas"
            fullWidth
            variant="standard"
            multiline
            minRows={2}
            {...register("notes")}
            InputLabelProps={idData ? { shrink: true } : {}}
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

export default SupplierForm;
