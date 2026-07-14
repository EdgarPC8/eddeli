/**
 * Modal para crear cliente desde caja (nombre en 4 partes + tipo doc SRI).
 */
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";
import { createCustomerRequest } from "../../api/ordersRequest.js";
import {
  EMPTY_CUSTOMER_FORM,
  IDENT_TYPE_OPTIONS,
  formToCustomerPayload,
  validateCustomerForm,
} from "../../utils/customerUtils.js";

export default function CajaCustomerFormDialog({ open, onClose, onCreated, toast }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY_CUSTOMER_FORM });
  }, [open]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const err = validateCustomerForm(form);
    if (err) {
      void toast?.({ message: err, variant: "warning" });
      return;
    }
    try {
      setSaving(true);
      const payload = formToCustomerPayload(form);
      const { data } = await createCustomerRequest(payload);
      void toast?.({ message: "Cliente creado.", variant: "success" });
      onCreated?.(data);
      onClose?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo guardar el cliente.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo cliente</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Primer nombre"
              fullWidth
              required
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Segundo nombre"
              fullWidth
              value={form.secondName}
              onChange={(e) => setField("secondName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Primer apellido"
              fullWidth
              value={form.firstLastName}
              onChange={(e) => setField("firstLastName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Segundo apellido"
              fullWidth
              value={form.secondLastName}
              onChange={(e) => setField("secondLastName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Tipo de documento"
              fullWidth
              value={form.identType}
              onChange={(e) => setField("identType", e.target.value)}
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
              value={form.cedula}
              onChange={(e) => setField("cedula", e.target.value)}
              helperText={
                form.identType === "07" ? "Consumidor final: normalmente 9999999999999" : "Cédula 10 / RUC 13 dígitos"
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono"
              fullWidth
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              fullWidth
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Dirección"
              fullWidth
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cliente"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
