import {
    Grid,
    TextField,
    Box,
    Button,
  } from "@mui/material";
  
  import { useForm } from "react-hook-form";
  import { useEffect } from "react";
  import toast from "react-hot-toast";
  import { useAuth } from "../../../../context/AuthContext";
import { createUnitRequest,updateUnitRequest } from "../../../../api/inventoryControlRequest";
  
  function UnitForm({ isEditing = false, datos = [], onClose, reload }) {
    const { handleSubmit, register, reset, setValue } = useForm();
    const idData = datos.id;
    const { toast: toastAuth } = useAuth();
  
    const resetForm = () => {
      reset();
    };
  
    const submitForm = async (formData) => {
      if (isEditing) {
        toastAuth({
          promise: updateUnitRequest(datos.id, formData),
          onSuccess: () => {
            if (onClose) onClose();
            if (reload) reload();
            resetForm();
            return {
              title: "Unidad",
              description: "Unidad actualizada correctamente",
            };
          },
        });
        return;
      }
  
      toastAuth({
        promise: createUnitRequest(formData),
        successMessage: "Unidad guardada con éxito",
        onSuccess: (data) => {
          if (onClose) onClose();
          if (reload) reload();
          resetForm();
          console.log(data);
        },
      });
    };
  
    const loadData = async () => {
      if (isEditing && datos) {
        setValue("name", datos.name || "");
        setValue("abbreviation", datos.abbreviation || "");
        setValue("description", datos.description || "");
      }
    };
  
    useEffect(() => {
      loadData();
    }, []);
  
    return (
      <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
        <Grid spacing={2} container>
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
              label="Abreviatura"
              fullWidth
              variant="standard"
              {...register("abbreviation", { required: true })}
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
  
          <Grid item xs={4}>
            <Button variant="contained" fullWidth type="submit">
              {!isEditing ? "Guardar" : "Editar"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  }
  
  export default UnitForm;
  