// RenderFromFinal.jsx
import React, { useEffect, useRef, useState } from "react";

import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Chip,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

// API (ajusta la ruta si hace falta)
import {
  simulateProduction,
  registerProductionFinalFromPayload,
} from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
} from "./ProgrammerMovementDateField.jsx";
/* ---------------- Utils ---------------- */
const numberOrZero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function toArray(req) {
  if (Array.isArray(req)) return req;
  if (req && Array.isArray(req.requiere)) return req.requiere;
  return [];
}
const clone = (obj) => JSON.parse(JSON.stringify(obj));

/** Aplica una actualización inmutable en la ruta dada (path) dentro del árbol. */
function applyAtPath(rootArray, path, updater) {
  const root = clone(rootArray);
  let cursor = root;

  for (let i = 0; i < path.length; i++) {
    const idx = path[i];

    if (i === path.length - 1) {
      cursor[idx] = updater(cursor[idx]);
    } else {
      const node = cursor[idx];
      const childArr = toArray(node.requiere);
      const nextChild = childArr.slice();
      cursor[idx] = { ...node, requiere: nextChild };
      cursor = nextChild;
    }
  }
  return root;
}

/* ---------- Editor de Árbol (integrado) ---------- */
/* ---------- Editor de Árbol (integrado) ---------- */
function TreeEditor({ requiere = [], level = 0, onChange }) {
  const [editValues, setEditValues] = React.useState({});
  const inputRefs = React.useRef({}); // refs por campo

  // Siempre trabajar sobre el array raíz actual
  const rootArray = React.useMemo(() => toArray(requiere), [requiere]);

  const getInputRef = (pathKey) => {
    if (!inputRefs.current[pathKey]) {
      inputRefs.current[pathKey] = React.createRef();
    }
    return inputRefs.current[pathKey];
  };

  const handleEditClick = (pathKey, initial) => {
    setEditValues((p) => ({ ...p, [pathKey]: { editing: true, ...initial } }));
    requestAnimationFrame(() => {
      inputRefs.current[pathKey]?.current?.focus?.();
    });
  };

  const handleValueChange = (pathKey, field, value) => {
    setEditValues((p) => ({ ...p, [pathKey]: { ...p[pathKey], [field]: value } }));
    requestAnimationFrame(() => {
      inputRefs.current[pathKey]?.current?.focus?.();
    });
  };

  const stopEditing = (pathKey) => {
    setEditValues((p) => ({ ...p, [pathKey]: { ...p[pathKey], editing: false } }));
  };

  const handleSaveClick = React.useCallback(
    (path, pathKey) => {
      const st = editValues[pathKey];
      if (!st) return;

      // ✅ Aplicar sobre el ARREGLO RAÍZ completo
      const updatedRoot = applyAtPath(rootArray, path, (item) => {
        const draft = { ...item };
        const qty = Number.parseFloat(st.cantidad ?? "");
        if (Number.isFinite(qty)) {
          if (draft.cantidadGramos !== undefined) draft.cantidadGramos = qty;
          else if (draft.cantidadUnidades !== undefined) draft.cantidadUnidades = qty;
        }
        const sobr = Number.parseFloat(st.sobrante ?? "");
        if (Number.isFinite(sobr)) draft.sobrante = sobr;
        return draft;
      });

      onChange?.(updatedRoot);
      stopEditing(pathKey);
    },
    [editValues, onChange, rootArray]
  );

  const RenderNode = ({ items, level, pathPrefix = [] }) => {
    if (!Array.isArray(items)) return null;

    return (
      <List dense sx={{ pl: level * 2 }}>
        {items.map((item, idx) => {
          if (!item) return null;
          const path = [...pathPrefix, idx];
          const pathKey = path.join(">");
          const editState = editValues[pathKey] || {};
          const editing = !!editState.editing;

          const cantidadOriginal = item.cantidadGramos ?? item.cantidadUnidades ?? 0;

          const rawStock = Number(item.stockActual || 0);
          const mostrarStock =
            item.unit === "unidad" || item.unitId === 1
              ? `${rawStock} unidades`
              : `${rawStock.toFixed(2)}g`;

          return (
            <Box
              key={item.id ?? pathKey}
              sx={{
                mb: 1,
                pl: 2,
                ...(level > 0 && {
                  borderLeft: 2,
                  borderStyle: "solid",
                  borderColor: "divider",
                }),
              }}
            >
              <ListItem
                secondaryAction={
                  editing ? (
                    <IconButton
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSaveClick(path, pathKey)}
                    >
                      <SaveIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        handleEditClick(pathKey, {
                          cantidad: cantidadOriginal,
                          sobrante: item.sobrante ?? 0,
                        })
                      }
                    >
                      <EditIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      <strong>{item.producto}</strong> —{" "}
                      {editing ? (
                        <>
                          <TextField
                            type="number"
                            size="small"
                            variant="outlined"
                            label="Cantidad"
                            value={editState.cantidad ?? ""}
                            onChange={(e) => handleValueChange(pathKey, "cantidad", e.target.value)}
                            sx={{ width: 110, mr: 1 }}
                            inputProps={{ step: "0.01", min: 0 }}
                            inputRef={getInputRef(pathKey)}
                            autoFocus
                            onWheel={(e) => e.target.blur()}
                          />
                          {item.sobrante !== undefined && (
                            <TextField
                              type="number"
                              size="small"
                              variant="outlined"
                              label="Sobrante"
                              value={editState.sobrante ?? ""}
                              onChange={(e) =>
                                handleValueChange(pathKey, "sobrante", e.target.value)
                              }
                              sx={{ width: 110 }}
                              inputProps={{ step: "0.01", min: 0 }}
                              onWheel={(e) => e.target.blur()}
                            />
                          )}
                        </>
                      ) : item.cantidadGramos !== undefined ? (
                        `${Number(item.cantidadGramos).toFixed(2)} g necesarios`
                      ) : (
                        `${item.cantidadUnidades} unidades necesarias`
                      )}
                    </Typography>
                  }
                  secondary={
                    <>
                      Stock disponible: {mostrarStock}
                      {item.esIntermedio && (
                        <>
                          {" • "}Lotes necesarios: <strong>{item.lotesNecesarios}</strong>
                          {item.productionYield !== undefined && (
                            <>
                              {" • "}Producción por lote:{" "}
                              <strong>{item.productionYield}</strong>
                              {item.unitId === 1 ? " unidades" : "g"}
                            </>
                          )}
                          {item.sobrante !== undefined && (
                            <>
                              {" • "}Sobrante estimado:{" "}
                              <strong>{Number(item.sobrante).toFixed(2)}</strong>
                              {item.unitId === 1 ? " unidades" : "g"}
                            </>
                          )}
                        </>
                      )}
                    </>
                  }
                />
              </ListItem>

              {item.esIntermedio && item.requiere && (
                <RenderNode items={toArray(item.requiere)} level={level + 1} pathPrefix={path} />
              )}
            </Box>
          );
        })}
      </List>
    );
  };

  return <RenderNode items={rootArray} level={level} pathPrefix={[]} />;
}


/* ======================= Componente: RenderFromFinal ======================= */
/**
 * Modo página: `productId` + `fetchData` (Producción).
 * Modo embebido (movimientos): `embedProductId`, `embedQuantity`, `onSimulated`.
 */
export default function RenderFromFinal({
  fetchData,
  productId,
  embedProductId,
  embedQuantity,
  onSimulated,
}) {
  const isEmbed =
    typeof onSimulated === "function" &&
    embedProductId != null &&
    Number(embedQuantity) > 0;

  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [movementDate, setMovementDate] = useState(todayDateInput());
  const onSimulatedRef = useRef(onSimulated);
  onSimulatedRef.current = onSimulated;

  /* --- Embebido: simular para el formulario de movimiento --- */
  useEffect(() => {
    if (!isEmbed) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await simulateProduction(Number(embedProductId), Number(embedQuantity));
        const r = res?.data?.resultado ?? res?.data ?? null;
        if (cancelled) return;
        if (r) {
          const cloned = clone(r);
          setResultado(cloned);
          onSimulatedRef.current?.(cloned);
        } else {
          setResultado(null);
        }
      } catch (e) {
        console.error("Error en simulación (embed):", e);
        if (!cancelled) setResultado(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEmbed, embedProductId, embedQuantity]);

  /* --- Página: simular al tener producto y cantidad --- */
  useEffect(() => {
    if (isEmbed || !productId) return;
    const n = Number(quantity);
    if (!Number.isFinite(n) || n <= 0) {
      setResultado(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await simulateProduction(Number(productId), n);
        const r = res?.data?.resultado ?? res?.data ?? null;
        if (cancelled) return;
        if (r) setResultado(clone(r));
        else setResultado(null);
      } catch (e) {
        console.error("Error en simulación:", e);
        if (!cancelled) setResultado(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEmbed, productId, quantity]);

  const handleProcess = async () => {
    if (!resultado) return;

    const dateApi = isProgrammer ? movementDateForApi(movementDate) : undefined;
    const payload = {
      productId: Number(resultado.id ?? productId),
      quantity: Number(resultado.cantidadDeseada ?? quantity),
      simulated: resultado,
      type: "produccion",
      description: `Producción final de ${resultado.producto}`,
      ...(dateApi ? { movementDate: dateApi } : {}),
    };

    toastAuth({
      promise: registerProductionFinalFromPayload(payload),
      onSuccess: () => {
        fetchData?.();
        setResultado(null);
        setQuantity("1");
        return {
          title: "Producción",
          description: "Producción registrada correctamente",
        };
      },
    });
  };

  if (isEmbed) {
    return (
      <Box>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {resultado && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
              Requerimientos según receta (producción)
            </Typography>
            <TreeEditor
              requiere={resultado.requiere}
              onChange={(newTree) => setResultado((prev) => ({ ...prev, requiere: newTree }))}
            />
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              type="number"
              label="Cantidad a producir"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ step: "0.01", min: 0 }}
              onWheel={(e) => e.target.blur()}
              helperText="La simulación se actualiza al cambiar la cantidad."
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {loading && <CircularProgress size={28} />}
          </Grid>
        </Grid>
      </Paper>

      {resultado && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              Simulación / Edición — <strong>{resultado.producto}</strong>
            </Typography>
            <Chip
              size="small"
              color="primary"
              label={`Cantidad: ${numberOrZero(resultado.cantidadDeseada)} ${resultado.unidad || "u"}`}
            />
          </Stack>

          <TreeEditor
            requiere={resultado.requiere}
            onChange={(newTree) => setResultado((prev) => ({ ...prev, requiere: newTree }))}
          />

          <Stack spacing={2} sx={{ mt: 2 }}>
            <ProgrammerMovementDateField
              isProgrammer={isProgrammer}
              value={movementDate}
              onChange={setMovementDate}
              label="Fecha de la producción"
            />
            <Button
              variant="contained"
              onClick={handleProcess}
              disabled={!resultado || !resultado?.requiere}
            >
              Procesar producción
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
