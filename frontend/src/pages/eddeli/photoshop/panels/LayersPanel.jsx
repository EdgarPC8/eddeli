import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ImageIcon from "@mui/icons-material/Image";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

import { useEditor } from "../EditorProvider";
import SimpleDialog from "../../../../components/Dialogs/SimpleDialog";

export default function LayersPanel() {
  const { state, dispatch, deleteLayer } = useEditor();
  const { doc, selected, dragId } = state;

  const [layerToDelete, setLayerToDelete] = useState(null);

  const selectedLayer =
    selected?.kind === "layer"
      ? doc.layers.find((l) => l.id === selected.id)
      : null;

  const sortedLayers = useMemo(() => {
    return [...doc.layers].sort((a, b) => {
      const za = a.zIndex || 0;
      const zb = b.zIndex || 0;
      if (za !== zb) return zb - za;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [doc.layers]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* BOTONES AGREGAR (ARRIBA, SIEMPRE VISIBLES) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 0.5,
          pb: 0.5,
        }}
      >
        <Tooltip title="Añadir capa de texto">
          <IconButton
            size="small"
            onClick={() => dispatch({ type: "ADD_LAYER", layerType: "text" })}
            sx={{
              color: "#fff",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              "&:hover": {
                background: "rgba(0, 229, 255, 0.25)",
                borderColor: "rgba(0, 229, 255, 0.5)",
              },
            }}
          >
            <TextFieldsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Añadir capa de imagen">
          <IconButton
            size="small"
            onClick={() => dispatch({ type: "ADD_LAYER", layerType: "image" })}
            sx={{
              color: "#fff",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              "&:hover": {
                background: "rgba(0, 229, 255, 0.25)",
                borderColor: "rgba(0, 229, 255, 0.5)",
              },
            }}
          >
            <ImageIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Añadir capa de forma">
          <IconButton
            size="small"
            onClick={() => dispatch({ type: "ADD_LAYER", layerType: "shape" })}
            sx={{
              color: "#fff",
              background: "rgba(0, 229, 255, 0.15)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              "&:hover": {
                background: "rgba(0, 229, 255, 0.25)",
                borderColor: "rgba(0, 229, 255, 0.5)",
              },
            }}
          >
            <ShapeLineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 1 }} />

      {/* LISTA DE CAPAS (con scroll, ocupa el resto del alto) */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.5,
        }}
      >
        <Stack spacing={0.7}>
          {sortedLayers.length === 0 ? (
            <Box
              sx={{
                p: 2,
                textAlign: "center",
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
              }}
            >
              No hay capas. Usa los botones de abajo para añadir.
            </Box>
          ) : (
            sortedLayers.map((l) => (
          <Box
            key={l.id}
            draggable
            onDragStart={() =>
              dispatch({ type: "SET_DRAG_ID", dragId: l.id })
            }
            onDragOver={(e) => e.preventDefault()}
            onDrop={() =>
              dispatch({
                type: "REORDER_BY_DROP",
                fromId: dragId,
                toId: l.id,
              })
            }
            onClick={() =>
              dispatch({
                type: "SET_SELECTED",
                selected: { kind: "layer", id: l.id },
              })
            }
            sx={{
              p: 1,
              borderRadius: 1,
              border:
                selectedLayer?.id === l.id
                  ? "2px solid #00E5FF"
                  : "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            {/* IZQUIERDA */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={l.visible ? "Ocultar capa" : "Mostrar capa"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "TOGGLE_VISIBLE", layerId: l.id });
                  }}
                  sx={{
                    color: l.visible ? "#fff" : "rgba(255,255,255,0.4)",
                    p: 0.5,
                  }}
                >
                  {l.visible ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title={l.locked ? "Desbloquear capa" : "Bloquear capa"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "TOGGLE_LOCKED", layerId: l.id });
                  }}
                  sx={{
                    color: l.locked ? "#ffb74d" : "rgba(255,255,255,0.4)",
                    p: 0.5,
                  }}
                >
                  {l.locked ? (
                    <LockIcon fontSize="small" />
                  ) : (
                    <LockOpenIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>

              <Chip
                size="small"
                label={l.type}
                sx={{
                  fontSize: 10,
                  height: 20,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Stack>

            {/* DERECHA */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                value={l.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_LAYER",
                    layerId: l.id,
                    patch: { name: e.target.value },
                  })
                }
                sx={{
                  width: 120,
                  "& .MuiInputBase-root": {
                    fontSize: 11,
                    height: 28,
                  },
                }}
              />

              {/* ELIMINAR */}
              <Tooltip title="Eliminar capa">
                <Button
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayerToDelete(l);
                  }}
                  sx={{ minWidth: 32 }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </Button>
              </Tooltip>
            </Stack>
          </Box>
            ))
          )}
        </Stack>
      </Box>

      {/* CONFIRMACIÓN */}
      <SimpleDialog
        open={!!layerToDelete}
        onClose={() => setLayerToDelete(null)}
        tittle="Eliminar capa"
        message={`¿Deseas eliminar la capa "${layerToDelete?.name}"? Esta acción no se puede deshacer.`}
        onClickAccept={() => {
          deleteLayer(layerToDelete.id);
          setLayerToDelete(null);
        }}
      />
    </Box>
  );
}
