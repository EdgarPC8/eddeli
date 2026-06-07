import React from "react";
import { Box, Typography } from "@mui/material";
import { useEditor } from "../EditorProvider";
import { SCALE } from "../editorActions";
import LayerRenderer from "./LayerRenderer";

export default function CanvasStage() {
  const ctx = useEditor();
  const { state, dispatch } = ctx;
  const stageRef = ctx.stageRef;

  const doc = state?.doc;
  const docData = state?.doc?.data || {}; // ✅ datos backend

  const selectedBorder = "2px solid #00E5FF";

  // ✅ si todavía no hay template, no intentes render
  if (!doc?.canvas) {
    return (
      <Box
        sx={{
          width: 600,
          height: 340,
          border: "2px dashed rgba(255,255,255,0.25)",
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        Cargando template...
      </Box>
    );
  }

  const startMoveGroup = (groupId, e) => {
    if (!e.shiftKey) return; // mover grupo SOLO con SHIFT
    e.stopPropagation();
    dispatch({ type: "SET_SELECTED", selected: { kind: "group", id: groupId } });
    dispatch({
      type: "SET_ACTION",
      action: { type: "move-group", groupId, startX: e.clientX, startY: e.clientY },
    });
  };

  const startMoveLayer = (layerId, e) => {
    e.stopPropagation();
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layerId } });
    dispatch({
      type: "SET_ACTION",
      action: { type: "move-layer", layerId, startX: e.clientX, startY: e.clientY },
    });
  };

  const startResizeLayer = (layerId, handle, e) => {
    e.stopPropagation();
    const layer = (doc.layers || []).find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    dispatch({ type: "SET_SELECTED", selected: { kind: "layer", id: layerId } });
    dispatch({
      type: "SET_ACTION",
      action: {
        type: "resize-layer",
        layerId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
        ratio: layer.w / layer.h || 1,
      },
    });
  };

  const stop = () => dispatch({ type: "SET_ACTION", action: null });

  const onMove = (e) => {
    const a = state.action;
    if (!a) return;

    const dx = (e.clientX - a.startX) * SCALE;
    const dy = (e.clientY - a.startY) * SCALE;

    const clampMin = (v, min) => (v < min ? min : v);
    const layers = doc.layers || [];

    if (a.type === "move-group") {
      dispatch({ type: "UPDATE_GROUP_POS", groupId: a.groupId, dx, dy });
      dispatch({ type: "SET_ACTION", action: { ...a, startX: e.clientX, startY: e.clientY } });
      return;
    }

    if (a.type === "move-layer") {
      const cur = layers.find((l) => l.id === a.layerId);
      if (!cur) return;

      dispatch({
        type: "UPDATE_LAYER",
        layerId: a.layerId,
        patch: { x: Math.round((cur.x || 0) + dx), y: Math.round((cur.y || 0) + dy) },
      });

      dispatch({ type: "SET_ACTION", action: { ...a, startX: e.clientX, startY: e.clientY } });
      return;
    }

    if (a.type === "resize-layer") {
      const { x, y, w, h } = a.startRect;
      const handle = a.handle;
      const fromCenter = e.altKey;

      let nx = x, ny = y, nw = w, nh = h;
      const minSize = 20;

      if (handle.includes("e")) { nw = w + dx; if (fromCenter) { nw = w + dx * 2; nx = x - dx; } }
      if (handle.includes("w")) { nw = w - dx; nx = x + dx; if (fromCenter) { nw = w - dx * 2; nx = x + dx; } }
      if (handle.includes("s")) { nh = h + dy; if (fromCenter) { nh = h + dy * 2; ny = y - dy; } }
      if (handle.includes("n")) { nh = h - dy; ny = y + dy; if (fromCenter) { nh = h - dy * 2; ny = y + dy; } }

      nw = clampMin(nw, minSize);
      nh = clampMin(nh, minSize);

      const layer = layers.find((l) => l.id === a.layerId);
      const lockRatio = e.shiftKey && layer?.type === "image";

      if (lockRatio) {
        const ratio = a.ratio || 1;
        const affectsW = handle.includes("e") || handle.includes("w");
        const affectsH = handle.includes("n") || handle.includes("s");

        if (affectsW && !affectsH) nh = nw / ratio;
        else if (affectsH && !affectsW) nw = nh * ratio;
        else {
          if (Math.abs(dx) > Math.abs(dy)) nh = nw / ratio;
          else nw = nh * ratio;
        }

        if (handle.includes("w")) nx = x + (w - nw);
        if (handle.includes("n")) ny = y + (h - nh);
        if (fromCenter) { nx = x + (w - nw) / 2; ny = y + (h - nh) / 2; }
      }

      dispatch({
        type: "UPDATE_LAYER",
        layerId: a.layerId,
        patch: { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) },
      });
    }
  };

  const hasLayers = (doc.layers || []).length > 0;

  return (
    <Box
      ref={stageRef || undefined}
      onMouseMove={onMove}
      onMouseUp={stop}
      onMouseLeave={stop}
      onMouseDown={() => dispatch({ type: "SET_SELECTED", selected: null })}
      sx={{
        width: doc.canvas.width / SCALE,
        height: doc.canvas.height / SCALE,
        position: "relative",
        backgroundColor: "rgba(0,0,0,0.2)",
        border: "2px solid #333",
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      <LayerRenderer
        doc={doc}              // ✅ template
        docData={docData}      // ✅ datos backend
        selected={state.selected}
        selectedBorder={selectedBorder}
        onLayerMouseDown={startMoveLayer}
        onResizeStart={startResizeLayer}
        onGroupMouseDown={startMoveGroup}
      />

      {/* Mensaje cuando la plantilla está vacía */}
      {!hasLayers && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              p: 2,
              borderRadius: 2,
              background: "rgba(0,0,0,0.6)",
              border: "1px dashed rgba(255,255,255,0.3)",
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
              Plantilla vacía
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
              Usa los botones en el panel "Capas" para añadir texto, imágenes o formas
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
