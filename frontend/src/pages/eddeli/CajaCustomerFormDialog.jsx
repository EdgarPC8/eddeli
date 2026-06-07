import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import { createCustomerRequest } from "../../api/ordersRequest.js";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

/** Modal para crear cliente desde caja. */
export default function CajaCustomerFormDialog({ open, onClose, onCreated, toast }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const name = String(form.name || "").trim();
    if (!name) {
      void toast?.({ message: "El nombre es obligatorio.", variant: "warning" });
      return;
    }
    try {
      setSaving(true);
      const { data } = await createCustomerRequest({
        name,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
      });
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
          <Grid item xs={12}>
            <TextField
              label="Nombre"
              fullWidth
              required
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
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
