import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const PROGRAMMER_HINT =
  "Modo Programador: puedes registrar con fecha pasada o corregir el historial.";

/** Campo de fecha personalizada — visible solo para rol Programador. */
export default function ProgrammerMovementDateField({
  isProgrammer,
  value,
  onChange,
  label = "Fecha del movimiento",
}) {
  if (!isProgrammer) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
      <TextField
        label={label}
        type="date"
        fullWidth
        size="small"
        variant="outlined"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        helperText="Vacío = fecha y hora actuales"
      />
      <Tooltip title={PROGRAMMER_HINT} arrow placement="top">
        <IconButton size="small" color="info" sx={{ mt: 0.5 }} aria-label={PROGRAMMER_HINT}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
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
