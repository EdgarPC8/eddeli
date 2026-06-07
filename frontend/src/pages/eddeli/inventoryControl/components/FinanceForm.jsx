import { useForm, Controller } from "react-hook-form";
import { Box, Button, Grid, MenuItem, TextField } from "@mui/material";
import { useEffect, useMemo } from "react";
import {
  createIncomeRequest, updateIncomeRequest,
  createExpenseRequest, updateExpenseRequest
} from "../../../../api/financeRequest";
import { useAuth } from "../../../../context/AuthContext";

const categories = {
  income: ["Venta", "Donación", "Carrera", "Servicio", "Otro"],
  expense: ["Pago de servicios", "Compra de insumos", "Honorarios", "Pago Empleados", "Otro"],
};

const FinanceForm = ({ type = "income", data = null, onClose, onSaved }) => {
  const { toast } = useAuth();
  const isEditing = !!data;

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      date: todayISO,
      amount: "",
      concept: "",
      category: "",
    },
  });

  // Opciones según tipo; si edito y la categoría no existe en el catálogo, la inyecto para que se vea
  const categoryOptions = useMemo(() => {
    const base = categories[type] ?? [];
    const current = (data?.category ?? "").toString();
    return current && !base.includes(current) ? [...base, current] : base;
  }, [type, data]);

  // Sincroniza el formulario cuando cambian data o type
  useEffect(() => {
    reset({
      date: data?.date || todayISO,
      amount: data?.amount ?? "",
      concept: data?.concept ?? "",
      category: data?.category ?? "",   // <- aquí se precarga
    });
  }, [data, type, todayISO, reset]);

  const onSubmit = async (formData) => {
    const payload = {
      ...formData,
      amount: Number(formData.amount || 0),
    };

    const requestFn = isEditing
      ? type === "income" ? (id, body) => updateIncomeRequest(id, body)
                          : (id, body) => updateExpenseRequest(id, body)
      : type === "income" ? createIncomeRequest
                          : createExpenseRequest;

    const call = isEditing ? requestFn(data.id, payload) : requestFn(payload);

    try {
      await toast({
        promise: call,
        successMessage: isEditing ? "Actualizado correctamente" : "Registrado correctamente",
        errorMessage: "Hubo un error",
        onSuccess: async () => {
          if (onSaved) await onSaved();
          if (onClose) onClose();
          reset();
        },
      });
    } catch {
      /* toast mostró error */
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Fecha"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            {...register("date", { required: true })}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Monto"
            type="number"
            fullWidth
            inputProps={{ step: "0.01", min: "0" }}
            {...register("amount", { required: true })}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Concepto"
            fullWidth
            {...register("concept", { required: true })}
          />
        </Grid>

        <Grid item xs={12}>
          {/* ⚠️ CONTROLADO CON Controller */}
          <Controller
            name="category"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField
                select
                label="Categoría"
                fullWidth
                value={field.value ?? ""}         // <- asegura que nunca sea undefined
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
              >
                {categoryOptions.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid item xs={12} display="flex" justifyContent="flex-end">
          <Button onClick={onClose} color="inherit" sx={{ mr: 2 }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={type === "income" ? "success" : "error"}
            disabled={isSubmitting}
          >
            {isEditing ? "Actualizar" : "Guardar"}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default FinanceForm;
