/**
 * ExportPanel.jsx
 *
 * ⚠️ DEPRECADO: Este componente ha sido reemplazado por EditorToolbar.jsx
 * Se mantiene por compatibilidad pero ya no se usa en EditorPage ni ProductTemplateStudio.
 * 
 * Si necesitas exportar/guardar, usa EditorToolbar que está en la parte superior del editor.
 */
import React from "react";
import { Box, Typography } from "@mui/material";

export default function ExportPanel() {
  return (
    <Box>
      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
        Este componente ha sido movido a EditorToolbar.
      </Typography>
    </Box>
  );
}
