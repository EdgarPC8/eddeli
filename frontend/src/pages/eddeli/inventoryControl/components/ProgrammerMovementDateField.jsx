import { TextField, Alert } from "@mui/material";

/** Campo de fecha personalizada — visible solo para rol Programador. */
export default function ProgrammerMovementDateField({
  isProgrammer,
  value,
  onChange,
  label = "Fecha del movimiento",
}) {
  if (!isProgrammer) return null;

  return (
    <>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Modo Programador: puedes registrar con fecha pasada o corregir el historial.
      </Alert>
      <TextField
        label={label}
        type="date"
        fullWidth
        variant="standard"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        helperText="Si lo dejas vacío, se usa la fecha y hora actual."
      />
    </>
  );
}

export const movementDateForApi = (dateStr) => {
  if (!dateStr) return undefined;
  return `${dateStr}T12:00:00.000Z`;
};

export const todayDateInput = () => new Date().toISOString().slice(0, 10);

export const isoToDateInput = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};
