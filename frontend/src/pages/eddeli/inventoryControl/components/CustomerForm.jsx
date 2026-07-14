import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { createCustomerRequest, updateCustomerRequest } from "../../../../api/ordersRequest.js";
import {
  IDENT_TYPE_OPTIONS,
  customerToForm,
  formToCustomerPayload,
  validateCustomerForm,
} from "../../../../utils/customerUtils.js";

function CustomerForm({ isEditing = false, datos = [], onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: customerToForm(null),
  });
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();
  const identType = watch("identType");

  const resetForm = () => {
    reset(customerToForm(null));
  };

  const submitForm = async (formData) => {
    const err = validateCustomerForm(formData);
    if (err) {
      void toastAuth?.({ message: err, variant: "warning" });
      return;
    }
    const payload = formToCustomerPayload(formData);

    if (isEditing) {
      toastAuth({
        promise: updateCustomerRequest(datos.id, payload),
        onSuccess: () => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          return {
            title: "Cliente",
            description: "Cliente actualizado correctamente",
          };
        },
      });
      return;
    }

    toastAuth({
      promise: createCustomerRequest(payload),
      successMessage: "Cliente guardado con éxito",
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
        resetForm();
      },
    });
  };

  useEffect(() => {
    if (isEditing && datos) {
      const form = customerToForm(datos);
      Object.entries(form).forEach(([k, v]) => setValue(k, v));
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, datos?.id]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Primer nombre"
            fullWidth
            required
            variant="standard"
            {...register("firstName", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Segundo nombre"
            fullWidth
            variant="standard"
            {...register("secondName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Primer apellido"
            fullWidth
            variant="standard"
            {...register("firstLastName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Segundo apellido"
            fullWidth
            variant="standard"
            {...register("secondLastName")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Tipo de documento"
            fullWidth
            variant="standard"
            {...register("identType")}
            value={identType || "05"}
            onChange={(e) => setValue("identType", e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            {IDENT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Número de documento"
            fullWidth
            variant="standard"
            {...register("cedula")}
            InputLabelProps={idData ? { shrink: true } : {}}
            helperText="Cédula 10 / RUC 13 / pasaporte según tipo"
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
            label="Email"
            fullWidth
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
        <Grid item xs={4}>
          <Button variant="contained" fullWidth type="submit">
            {!isEditing ? "Guardar" : "Editar"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CustomerForm;
