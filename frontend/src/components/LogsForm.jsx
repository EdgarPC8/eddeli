/**
 * Detalle ampliado de un log HTTP (solo lectura).
 */
import {
  Box,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { formatDateTime } from "../helpers/functions.js";
import { displayLogAction } from "../utils/logActionCatalog.js";

const METHOD_COLOR = {
  POST: "success",
  PUT: "info",
  PATCH: "secondary",
  DELETE: "error",
};

function Field({ label, children }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        display="block"
        sx={{ mb: 0.35, textTransform: "uppercase", letterSpacing: 0.4 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function MonoBlock({ children }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: "action.hover",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "0.8rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: 220,
        overflow: "auto",
      }}
    >
      {children || "—"}
    </Paper>
  );
}

export default function LogsForm({ datos = {} }) {
  const method = String(datos.httpMethod || "").toUpperCase();
  const system = String(datos.system || "");
  const actionLabel = displayLogAction(datos);
  const shortUa =
    system.length > 120 ? `${system.slice(0, 120)}…` : system;

  return (
    <Box sx={{ pt: 0.5, pb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label={method || "—"}
          color={METHOD_COLOR[method] || "default"}
          size="small"
        />
        <Chip label={actionLabel} color="primary" size="small" variant="outlined" />
        <Chip label={`#${datos.id ?? "—"}`} size="small" variant="outlined" />
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(datos.date)}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Field label="Tipo de acción">
            <Typography variant="body1" fontWeight={600}>
              {actionLabel}
            </Typography>
          </Field>
        </Grid>
        <Grid item xs={12} md={6}>
          <Field label="Fecha y hora">
            <Typography variant="body1">{formatDateTime(datos.date)}</Typography>
          </Field>
        </Grid>

        <Grid item xs={12}>
          <Field label="Endpoint / URL">
            <MonoBlock>{datos.endPoint}</MonoBlock>
          </Field>
        </Grid>

        <Grid item xs={12}>
          <Field label="Descripción">
            <MonoBlock>{datos.description}</MonoBlock>
          </Field>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 0.5 }} />
        </Grid>

        <Grid item xs={12}>
          <Field label="Cliente / User-Agent">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              Navegador o app que hizo la petición.
            </Typography>
            <MonoBlock>{system || shortUa}</MonoBlock>
          </Field>
        </Grid>
      </Grid>
    </Box>
  );
}
