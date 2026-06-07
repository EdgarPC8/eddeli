/**
 * ProductSelector.jsx
 *
 * Componente compartido para seleccionar productos del catálogo y ver el estado de las capas.
 * - Carga productos del catálogo (getCatalogTemplateItems)
 * - Selector con búsqueda
 * - Al seleccionar producto → actualiza doc.data con SET_DOC_DATA_PATCH
 * - Vista rápida: muestra doc.data (JSON), textos e imágenes con su estado de bind
 * 
 * Se usa en:
 * - ProductTemplateStudio (siempre visible)
 * - EditorPage (opcional, con toggle)
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";

import { useEditor } from "../EditorProvider";
import { getCatalogTemplateItems } from "../../../../api/inventoryControlRequest";
import { pathImg } from "../../../../api/axios";
import { resolveLayer } from "../bind/resolveTemplate";
import { normalizeKey, resolveValue } from "../bind/resolveMedia";

export default function ProductSelector({ autoSelectFirst = false }) {
  const { state, dispatch } = useEditor();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const selectedId = state?.doc?.data?.id ?? "";

  // ✅ Aplica selección de producto: actualiza doc.data con los datos del catálogo
  const applySelection = useCallback(
    (it) => {
      if (!it) return;

      const product = it.product || {};
      const { product: _p, ...catalogItem } = it;

      const imageUrl =
        catalogItem.imageUrl ??
        product.primaryImageUrl ??
        (typeof catalogItem.data?.imageUrl === "string" ? catalogItem.data.imageUrl : "");

      dispatch({
        type: "SET_DOC_DATA_PATCH",
        patch: {
          ...catalogItem,
          product,
          imageUrl: imageUrl || undefined,
        },
      });
    },
    [dispatch]
  );

  // Cargar productos del catálogo
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const { data } = await getCatalogTemplateItems();
        if (!alive) return;

        const arr = Array.isArray(data) ? data : [];
        setItems(arr);

        // Si autoSelectFirst está activo y no hay producto seleccionado, toma el primero
        if (autoSelectFirst && (!state?.doc?.data || !state.doc.data?.id) && arr.length) {
          applySelection(arr[0]);
        }
      } catch (e) {
        console.error("getCatalogTemplateItems error:", e);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySelection, autoSelectFirst]);

  // Filtrar productos por búsqueda
  const filtered = useMemo(() => {
    const q = String(search || "").toLowerCase().trim();
    if (!q) return items;

    return items.filter((it) => {
      const name = String(it?.displayName || it?.title || it?.product?.name || "").toLowerCase();
      const badge = String(it?.badge || "").toLowerCase();
      const section = String(it?.section || "").toLowerCase();
      return name.includes(q) || badge.includes(q) || section.includes(q);
    });
  }, [items, search]);

  const handleSelect = (id) => {
    const it = items.find((x) => String(x?.id) === String(id));
    applySelection(it);
  };

  // Datos del documento y capas
  const doc = state?.doc || {};
  const docData = state?.doc?.data || {};
  const layers = state?.doc?.layers || [];

  const textLayers = useMemo(() => layers.filter((l) => l?.type === "text"), [layers]);
  const imageLayers = useMemo(() => layers.filter((l) => l?.type === "image"), [layers]);

  // ✅ Verificar estado de carga de imágenes
  const [imgStatus, setImgStatus] = useState({});

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const next = {};

      for (const rawLayer of imageLayers) {
        const resolved = resolveLayer(doc, docData, rawLayer);
        const src = resolved?.props?.src || "";

        if (!src) {
          next[rawLayer?.id || ""] = false;
          continue;
        }

        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) next[rawLayer?.id || ""] = true;
            resolve(true);
          };
          img.onerror = () => {
            if (!cancelled) next[rawLayer?.id || ""] = false;
            resolve(false);
          };
          img.src = src;
        });
      }

      if (!cancelled) setImgStatus(next);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [doc, docData, imageLayers]);

  // Helpers para obtener keys de bind y estado del valor
  const getRawKeyForText = (l) => l?.fieldKey || l?.bind?.textFrom || "";
  const getRawKeyForImage = (l) => l?.fieldKey || l?.bind?.srcFrom || "";
  
  const getValueState = (rawKey) => {
    if (!rawKey) return { k: "", value: undefined, state: "no-key" };

    const v = resolveValue(docData, rawKey);

    // ❌ solo undefined significa que no existe
    if (v === undefined) return { k: rawKey, value: v, state: "missing" };

    // ⚠️ null es un valor válido pero vacío
    if (v === null) return { k: rawKey, value: v, state: "null" };

    // 🔢 números SIEMPRE son válidos
    if (typeof v === "number") {
      if (Number.isNaN(v)) {
        return { k: rawKey, value: v, state: "nan" };
      }
      return { k: rawKey, value: v, state: "ok" };
    }

    // 🧵 strings
    if (typeof v === "string") {
      if (!v.trim()) return { k: rawKey, value: v, state: "empty" };
      return { k: rawKey, value: v, state: "ok" };
    }

    // 📦 otros tipos (boolean, object)
    return { k: rawKey, value: v, state: "ok" };
  };

  return (
    <Box
      sx={{
        minHeight: 0,
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* ===================== SELECTOR DE PRODUCTOS ===================== */}
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, color: "#fff", mb: 1 }}>Catálogo</Typography>

        <TextField
          size="small"
          label="Buscar (nombre, badge, sección)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <Box sx={{ height: 10 }} />

        <FormControl size="small" fullWidth>
          <InputLabel id="catalog-item-select">Seleccionar item</InputLabel>
          <Select
            labelId="catalog-item-select"
            label="Seleccionar item"
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
          >
            {loading && (
              <MenuItem value="">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <span>Cargando...</span>
                </Stack>
              </MenuItem>
            )}

            {!loading && filtered.length === 0 && <MenuItem value="">No hay items</MenuItem>}

            {!loading &&
              filtered.map((it) => {
                const name = it?.displayName || it?.title || it?.product?.name || `Item #${it.id}`;
                const sec = it.section ? `[${it.section}] ` : "";
                const price =
                  typeof it.displayPrice !== "undefined"
                    ? ` — $${it.displayPrice}`
                    : typeof it.price !== "undefined"
                    ? ` — $${it.price}`
                    : "";
                return (
                  <MenuItem key={it.id} value={it.id}>
                    {sec}
                    {name}
                    {price}
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>

        <Box sx={{ mt: 1, color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
          Selecciona un producto para ver el preview en el canvas.
        </Box>

        <Box sx={{ mt: 1, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          base pathImg: <span style={{ wordBreak: "break-all" }}>{String(pathImg)}</span>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* ===================== VISTA RÁPIDA DE CAPAS ===================== */}
      <Box sx={{ p: 2, overflow: "auto", minHeight: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 900, color: "#fff", mb: 1 }}>Vista rápida (capas)</Typography>

        {/* DOC DATA (JSON) */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            doc.data (lo que leen las capas)
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              borderRadius: 1.5,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              overflow: "auto",
              maxHeight: 180,
            }}
          >
            {JSON.stringify(docData || {}, null, 2)}
          </Box>
        </Box>

        {/* TEXTOS */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            Textos ({textLayers.length})
          </Typography>

          <Stack spacing={1}>
            {textLayers.length === 0 ? (
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                No hay capas de texto
              </Typography>
            ) : (
              textLayers.map((rawLayer) => {
                const resolved = resolveLayer(doc, docData, rawLayer);
                const rawKey = getRawKeyForText(rawLayer);
                const s = getValueState(rawKey);

                const defaultText = rawLayer?.props?.text ?? "";
                const shown = resolved?.props?.text ?? defaultText;

                let statusLabel = "❌ vacío";
                if (!rawKey) statusLabel = "🟡 default";
                else if (s.state === "ok") statusLabel = "✅ cargó";
                else if (s.state === "missing") statusLabel = "❌ no existe";
                else if (s.state === "null") statusLabel = "⚠️ nulo";
                else if (s.state === "empty") statusLabel = "🟡 default";

                const from =
                  !rawKey
                    ? "default(no-key)"
                    : s.state === "ok"
                    ? `data(${s.k})`
                    : s.state === "null"
                    ? `data(null:${s.k})`
                    : s.state === "missing"
                    ? "missing"
                    : "default";

                const hasShown =
                  shown !== undefined &&
                  shown !== null &&
                  !(typeof shown === "string" && !shown.trim());

                return (
                  <Box
                    key={rawLayer.id}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
                        {rawLayer.id}
                      </Typography>
                      <Chip size="small" label={rawKey || "sin fieldKey/textFrom"} />
                      <Chip size="small" label={statusLabel} />
                      <Chip size="small" label={from} />
                    </Stack>

                    <Typography sx={{ color: "#fff", fontSize: 12 }}>
                      {hasShown ? shown : <span style={{ color: "rgba(255,255,255,0.45)" }}>(vacío)</span>}
                    </Typography>

                    {!!rawKey && (
                      <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                        key usada: {s.k}
                      </Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>

        {/* IMÁGENES */}
        <Box>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 12, mb: 1 }}>
            Imágenes ({imageLayers.length})
          </Typography>

          <Stack spacing={1}>
            {imageLayers.length === 0 ? (
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                No hay capas de imagen
              </Typography>
            ) : (
              imageLayers.map((rawLayer) => {
                const resolved = resolveLayer(doc, docData, rawLayer);
                const rawKey = getRawKeyForImage(rawLayer);
                const s = getValueState(rawKey);

                const src = resolved?.props?.src || "";
                const loaded = imgStatus[rawLayer?.id || ""] === true;

                let from =
                  !rawKey
                    ? "default(no-key)"
                    : s.state === "ok"
                    ? `data(${s.k})`
                    : s.state === "null"
                    ? `data(null:${s.k})`
                    : s.state === "missing"
                    ? "missing"
                    : "default";

                return (
                  <Box
                    key={rawLayer.id}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
                        {rawLayer.id}
                      </Typography>
                      <Chip size="small" label={rawKey || "sin fieldKey/srcFrom"} />
                      <Chip size="small" label={src ? (loaded ? "✅ cargó" : "❌ error") : "sin src"} />
                      <Chip size="small" label={from} />
                    </Stack>

                    <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 11, wordBreak: "break-all" }}>
                      {src || "(sin ruta)"}
                    </Typography>

                    {!!rawKey && (
                      <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                        key usada: {s.k}
                      </Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
