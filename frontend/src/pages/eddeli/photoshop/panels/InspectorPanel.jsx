import React, { useMemo } from "react";
import {
  Box,
  TextField,
  Stack,
  Button,
  Chip,
  Typography,
  MenuItem,
} from "@mui/material";
import { useEditor } from "../EditorProvider";

const FONT_OPTIONS = [
  { label: "Inter (Normal)", value: "Inter, system-ui, Arial" },
  { label: "Poppins", value: "Poppins, system-ui, Arial" },
  { label: "Montserrat", value: "Montserrat, system-ui, Arial" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Bebas Neue (Título)", value: "Bebas Neue, Impact, system-ui" },
  { label: "Anton (Título)", value: "Anton, Impact, system-ui" },
  { label: "Abril Fatface (Título)", value: "Abril Fatface, Georgia, serif" },
  { label: "Playfair Display (Título)", value: "Playfair Display, Georgia, serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif" },
];

// ======================
// helpers para “Referencia”
// ======================
const getBindKey = (layer) => {
  if (!layer) return "";
  if (layer.type === "text") return layer.bind?.textFrom || "";
  if (layer.type === "image") return layer.bind?.srcFrom || "";
  return "";
};

// ✅ opcional: permitir que escribas "desc" y se guarde como "data.desc"
const normalizeKey = (k = "") => {
  const s = String(k || "").trim();
  if (!s) return "";

  // si ya viene con prefijos o con punto, lo respetamos
  if (
    s.startsWith("data.") ||
    s.startsWith("product.") ||
    s.startsWith("catalog.") ||
    s.startsWith("computed.")
  ) return s;

  if (s.includes(".")) return s;

  // 👇 si NO quieres normalizar, reemplaza esta línea por: return s;
  return `${s}`;
};

const patchBindKey = (layer, nextRaw) => {
  const next = normalizeKey(nextRaw);

  // si vacío: dejamos bind pero limpiamos la key
  if (!next) {
    if (layer.type === "text") return { bind: { ...(layer.bind || {}), textFrom: "" } };
    if (layer.type === "image") return { bind: { ...(layer.bind || {}), srcFrom: "" } };
    return {};
  }

  if (layer.type === "text") {
    return { bind: { ...(layer.bind || {}), textFrom: next } };
  }
  if (layer.type === "image") {
    return { bind: { ...(layer.bind || {}), srcFrom: next } };
  }
  return {};
};

export default function InspectorPanel({
  selectedLayer,
  layers,
  setLayerMeta,
  updateLayerProps,
  toggleVisible,
  toggleLocked,
}) {
  const layer = useMemo(() => {
    if (!selectedLayer) return null;
    return (layers || []).find((l) => l.id === selectedLayer) || null;
  }, [selectedLayer, layers]);

  if (!selectedLayer) {
    return (
      <Stack spacing={1.2}>
        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
          Selecciona una capa para editar. Para el fondo usa una capa tipo imagen que ocupe todo el canvas.
        </Typography>
      </Stack>
    );
  }

  if (!layer) {
    return (
      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
        Capa no encontrada.
      </Typography>
    );
  }

  const isText = layer.type === "text";
  const p = layer.props || {};

  // ✅ Lee la “referencia” real desde bind.*
  const bindKeyValue = getBindKey(layer);

  // ✅ Actualiza bind usando UPDATE_LAYER (no setLayerMeta)
  const setBindKey = (value) => {
    const patch = patchBindKey(layer, value);
    dispatch({ type: "UPDATE_LAYER", layerId: layer.id, patch });
  };

  const applyGoldTitle = () => {
    if (!isText) return;
    updateLayerProps(layer.id, {
      color: "#FFF6D1",
      stroke: "#D4AF37",
      strokeWidth: 6,
      shadowColor: "rgba(0,0,0,0.45)",
      shadowBlur: 18,
      shadowOffsetX: 0,
      shadowOffsetY: 6,
      fontWeight: 900,
      letterSpacing: 1.5,
    });
  };

  const applyNormalText = () => {
    if (!isText) return;
    updateLayerProps(layer.id, {
      color: "#FFFFFF",
      strokeWidth: 0,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      letterSpacing: 0,
      lineHeight: 1.1,
      fontWeight: 700,
    });
  };

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" label={layer.type} />
        <Button size="small" onClick={() => toggleVisible(layer.id)}>
          {layer.visible ? "👁 Visible" : "🙈 Oculta"}
        </Button>
        <Button size="small" onClick={() => toggleLocked(layer.id)}>
          {layer.locked ? "🔒 Bloqueada" : "🔓 Libre"}
        </Button>
      </Stack>

      {/* Nombre de capa */}
      <TextField
        size="small"
        label="Nombre"
        value={layer.name || layer.id}
        onChange={(e) => setLayerMeta(layer.id, { name: e.target.value })}
        fullWidth
      />

      {/* ✅ Referencia REAL (bind.textFrom / bind.srcFrom) */}
      <TextField
        size="small"
        label="Referencia (fieldKey)"
        value={bindKeyValue}
        onChange={(e) => setBindKey(e.target.value)}
        placeholder={
          layer.type === "text"
            ? "Ej: computed.priceText | product.name | desc"
            : layer.type === "image"
            ? "Ej: product.primaryImageUrl | imageUrl"
            : "—"
        }
        fullWidth
        disabled={layer.type === "shape"}
        helperText={
          layer.type === "shape"
            ? "Shapes no usan referencia."
            : "Puedes escribir corto: desc -> data.desc (si quieres)."
        }
      />

      {/* ======== PROPIEDADES POR TIPO ======== */}
      {isText && (
        <>
          <TextField
            size="small"
            label="Texto (default)"
            value={p.text || ""}
            onChange={(e) => updateLayerProps(layer.id, { text: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />

          <TextField
            select
            size="small"
            label="Fuente"
            value={p.fontFamily || "Inter, system-ui, Arial"}
            onChange={(e) => updateLayerProps(layer.id, { fontFamily: e.target.value })}
            fullWidth
          >
            {FONT_OPTIONS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Tamaño"
              type="number"
              value={Number(p.fontSize || 32)}
              onChange={(e) =>
                updateLayerProps(layer.id, { fontSize: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Peso"
              type="number"
              value={Number(p.fontWeight || 700)}
              onChange={(e) =>
                updateLayerProps(layer.id, { fontWeight: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Color"
              value={p.color || "#FFFFFF"}
              onChange={(e) => updateLayerProps(layer.id, { color: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Letter spacing (px)"
              type="number"
              value={Number(p.letterSpacing || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { letterSpacing: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              select
              label="Alineación horizontal"
              value={p.align || "left"}
              onChange={(e) => updateLayerProps(layer.id, { align: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="left">Izquierda</MenuItem>
              <MenuItem value="center">Centro</MenuItem>
              <MenuItem value="right">Derecha</MenuItem>
            </TextField>

            <TextField
              size="small"
              select
              label="Alineación vertical"
              value={p.verticalAlign || "top"}
              onChange={(e) => updateLayerProps(layer.id, { verticalAlign: e.target.value })}
              sx={{ flex: 1 }}
            >
              <MenuItem value="top">Arriba</MenuItem>
              <MenuItem value="center">Centro</MenuItem>
              <MenuItem value="bottom">Abajo</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Line height"
              type="number"
              value={Number(p.lineHeight || 1.05)}
              onChange={(e) =>
                updateLayerProps(layer.id, { lineHeight: Number(e.target.value || 1) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={applyGoldTitle}>
              ✨ Título Dorado
            </Button>
            <Button variant="outlined" onClick={applyNormalText}>
              Normal
            </Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Stroke (color)"
              value={p.stroke || "#D4AF37"}
              onChange={(e) => updateLayerProps(layer.id, { stroke: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Stroke width"
              type="number"
              value={Number(p.strokeWidth || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { strokeWidth: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Shadow blur"
              type="number"
              value={Number(p.shadowBlur || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { shadowBlur: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Shadow Y"
              type="number"
              value={Number(p.shadowOffsetY || 0)}
              onChange={(e) =>
                updateLayerProps(layer.id, { shadowOffsetY: Number(e.target.value || 0) })
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <TextField
            size="small"
            label="Shadow color"
            value={p.shadowColor || "rgba(0,0,0,0.45)"}
            onChange={(e) => updateLayerProps(layer.id, { shadowColor: e.target.value })}
            fullWidth
          />
        </>
      )}

      {layer.type === "image" && (
        <TextField
          size="small"
          label="Src (default imagen)"
          value={layer.props?.src || ""}
          onChange={(e) => updateLayerProps(layer.id, { src: e.target.value })}
          fullWidth
        />
      )}

      {layer.type === "shape" && (
        <TextField
          size="small"
          label="Fill"
          value={layer.props?.fill || ""}
          onChange={(e) => updateLayerProps(layer.id, { fill: e.target.value })}
          fullWidth
        />
      )}

      <Box sx={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
        Tip: la <b>Referencia</b> es opcional. Si la dejas vacía, esa capa no se llena con datos.
      </Box>
    </Stack>
  );
}
