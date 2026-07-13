import React, { useState } from "react";
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CollectionsWorkbench from "./collections/CollectionsWorkbench.jsx";
import SupplierPayablesWorkbench from "./collections/SupplierPayablesWorkbench.jsx";

/**
 * Cobranzas: clientes (por cobrar) y proveedores (por pagar).
 */
export default function CollectionsPage() {
  const [mode, setMode] = useState("customers");

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: 1.5,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          background: (t) =>
            mode === "suppliers"
              ? `linear-gradient(120deg, ${t.palette.error.main}12, transparent 60%)`
              : `linear-gradient(120deg, ${t.palette.primary.main}12, transparent 60%)`,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            Cobranzas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === "customers"
              ? "Lo que te deben los clientes (abonos a pedidos / grupos)."
              : "Lo que debes a proveedores (abonos a pedidos de compra)."}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, v) => {
            if (v) setMode(v);
          }}
          sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
        >
          <ToggleButton value="customers" sx={{ px: 2, flex: { xs: 1, sm: "none" } }}>
            <PeopleAltOutlinedIcon sx={{ mr: 0.75, fontSize: 18 }} />
            Clientes
          </ToggleButton>
          <ToggleButton value="suppliers" sx={{ px: 2, flex: { xs: 1, sm: "none" } }}>
            <LocalShippingOutlinedIcon sx={{ mr: 0.75, fontSize: 18 }} />
            Proveedores
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {mode === "customers" ? <CollectionsWorkbench /> : <SupplierPayablesWorkbench />}
    </Box>
  );
}
