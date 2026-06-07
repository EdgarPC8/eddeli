import React from "react";
import { Box } from "@mui/material";

import { EditorProvider } from "./EditorProvider";
import CanvasStage from "./canvas/CanvasStage";
import EditorToolbar from "./panels/EditorToolbar";
import ProductSelector from "./panels/ProductSelector";

export default function ProductTemplateStudio() {
  return (
    <EditorProvider>
      <StudioLayout />
    </EditorProvider>
  );
}

function StudioLayout() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr", // Fila 1: Toolbar, Fila 2: Columnas
        gridTemplateColumns: "280px 1fr",
        overflow: "hidden",
        minHeight: 0,
        background: "#0b0f14",
      }}
    >
      {/* ===================== TOOLBAR (OCUPA TODO EL ANCHO, ARRIBA) ===================== */}
      <Box
        sx={{
          gridColumn: "1 / -1", // Ocupa todas las columnas
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <EditorToolbar />
      </Box>

      {/* ===================== IZQUIERDA: SELECTOR DE PRODUCTOS ===================== */}
      <ProductSelector autoSelectFirst={true} />

      {/* ===================== DERECHA: CANVAS ===================== */}
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: "100%", p: 2, minHeight: 0, overflow: "hidden" }}>
          <CanvasStage />
        </Box>
      </Box>
    </Box>
  );
}
