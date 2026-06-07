import {
    Grid,
    TextField,
    Box,
    Button,
  } from '@mui/material';
  import { useForm } from 'react-hook-form';
  import { useEffect } from 'react';
  import { useAuth } from '../../../../context/AuthContext';
import { createCustomerRequest,updateCustomerRequest } from '../../../../api/ordersRequest.js';

  
  function CustomerForm({ isEditing = false, datos = [], onClose, reload }) {
    const { handleSubmit, register, reset, setValue } = useForm();
    const idData = datos.id;
    const { toast: toastAuth } = useAuth();
  
    const resetForm = () => {
      reset();
    };
  
    const submitForm = async (formData) => {
      if (isEditing) {
        toastAuth({
          promise: updateCustomerRequest(datos.id, formData),
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
        promise: createCustomerRequest(formData),
        successMessage: "Cliente guardado con éxito",
        onSuccess: (data) => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
        },
      });
    };
  
    const loadData = async () => {
      if (isEditing && datos) {
        setValue("name", datos.name || "");
        setValue("phone", datos.phone || "");
        setValue("email", datos.email || "");
        setValue("address", datos.address || "");
      }
    };
  
    useEffect(() => {
      loadData();
    }, []);
  
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
              label="Teléfono"
              fullWidth
              variant="standard"
              {...register("phone", { required: true })}
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
  