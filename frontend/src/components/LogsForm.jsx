/**
 * Formulario de solo lectura para ver detalle de un registro de log.
 */
import { Grid, TextField, Box } from "@mui/material";

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function LogsForm({ datos = {} }) {
  const readOnly = { readOnly: true };
  const shrink = Boolean(datos?.id);

  return (
    <Box sx={{ mt: 1, minWidth: 320 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Método HTTP"
            fullWidth
            size="small"
            value={datos.httpMethod ?? ""}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha"
            fullWidth
            size="small"
            value={formatDate(datos.date)}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Acción"
            fullWidth
            size="small"
            value={datos.action ?? ""}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Sistema"
            fullWidth
            size="small"
            value={datos.system ?? ""}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="URL"
            fullWidth
            size="small"
            value={datos.endPoint ?? ""}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Descripción"
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={datos.description ?? ""}
            InputProps={readOnly}
            InputLabelProps={shrink ? { shrink: true } : {}}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
