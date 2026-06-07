/**
 * EditorPage.jsx
 *
 * Página del editor unificado: /editor y /editor/:id.
 * - Si hay :id en la URL, carga esa plantilla desde el backend (GET .../templates/:id/resolved).
 * - Layout: ProductSelector (opcional, toggle) | CanvasStage + ExportPanel | InspectorPanel + LayersPanel
 * - Con ProductSelector visible: puedes seleccionar productos del catálogo y ver el preview mientras editas.
 */
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Chip, Stack, IconButton, Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";

import { EditorProvider, useEditor } from "./EditorProvider";
import CanvasStage from "./canvas/CanvasStage";

import InspectorPanel from "./panels/InspectorPanel";
import LayersPanel from "./panels/LayersPanel";
import EditorToolbar from "./panels/EditorToolbar";
import ProductSelector from "./panels/ProductSelector";

export default function EditorPage() {
  const { id } = useParams();
  return (
    <EditorProvider autoload={false}>
      <EditorLayout />
    </EditorProvider>
  );
}

/* ========================================================= */
/* =================== LAYOUT + LOAD TEMPLATE =============== */
/* ========================================================= */

function EditorLayout() {
  const { id } = useParams(); // /editor/:id? (id puede ser undefined)
  const { loadTemplateById, state } = useEditor();

  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [showProductSelector, setShowProductSelector] = useState(false);

  // Debug: de dónde viene el doc (lo setea el Provider como __metaSource)
  const source = state?.doc?.__metaSource || (id ? "unknown" : "EMPTY");

  // ✅ evita refetch del mismo id (y corta duplicados de StrictMode en dev)
  const lastLoadedIdRef = useRef(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");


        // si no hay id, muestra mensaje
        if (!id) {
          lastLoadedIdRef.current = null;
          if (alive) {
            setLoading(false);
            setError("No hay ID de plantilla en la URL. Crea una nueva plantilla o selecciona una existente.");
          }
          return;
        }

        // ✅ si ya cargaste este mismo id, no repitas
        if (lastLoadedIdRef.current === String(id)) {
          if (alive) setLoading(false);
          return;
        }

        lastLoadedIdRef.current = String(id);

        if (alive) setLoading(true);
        if (alive) setError("");
        
        await loadTemplateById(id);
        
        if (alive) setError("");
      } catch (e) {
        console.error(e);
        if (alive) {
          setError(`No se pudo cargar la plantilla #${id} desde el backend. Verifica que exista o crea una nueva plantilla.`);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };

    // ❗ IMPORTANTE:
    // NO ponemos loadTemplateById en deps para evitar loop si el Provider recrea la función.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr", // Fila 1: Toolbar, Fila 2: Columnas
        gridTemplateColumns: showProductSelector ? "280px 1fr 320px" : "1fr 320px",
        overflow: "hidden",
        transition: "grid-template-columns 0.3s ease",
      }}
    >
      {/* =================== TOOLBAR (OCUPA TODO EL ANCHO, ARRIBA) =================== */}
      <Box
        sx={{
          gridColumn: "1 / -1", // Ocupa todas las columnas
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <EditorToolbar 
          showProductSelector={showProductSelector}
          onToggleProductSelector={() => setShowProductSelector(!showProductSelector)}
        />
      </Box>

      {/* =================== SELECTOR DE PRODUCTOS (LATERAL IZQUIERDO) =================== */}
      {showProductSelector && (
        <Box
          sx={{
            borderRight: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <ProductSelector />
        </Box>
      )}

      {/* =================== COLUMNA CENTRAL: CANVAS =================== */}
      <Box
        sx={{
          minWidth: 0,
          overflow: "hidden",
          height: "100%",
        }}
      >
        {/* 🟨 CANVAS */}
        <Box sx={{ height: "100%", p: 2, overflow: "hidden", position: "relative", minHeight: 0 }}>
          {/* Debug chip */}
          <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 20 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`source: ${source}`} />
              {id ? <Chip size="small" label={`id: ${id}`} /> : <Chip size="small" label="sin id" />}
            </Stack>
          </Box>

          {loading ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
              <Typography sx={{ color: "#fff", opacity: 0.85 }}>Cargando plantilla...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center", p: 3 }}>
              <Typography sx={{ color: "#ffb4b4", textAlign: "center", fontWeight: 600 }}>
                {error}
              </Typography>
              <Typography sx={{ color: "#fff", opacity: 0.7, mt: 2, textAlign: "center", fontSize: 13 }}>
                {id ? (
                  <>
                    No se encontró la plantilla con ID: <strong>{id}</strong>
                    <br />
                    Ve a "Plantillas disponibles" y crea una nueva o selecciona una existente.
                  </>
                ) : (
                  "Ve a 'Plantillas disponibles' y crea una nueva plantilla desde cero."
                )}
              </Typography>
            </Box>
          ) : (
            <CanvasStage />
          )}
        </Box>
      </Box>

      {/* =================== COLUMNA DERECHA: INSPECTOR + CAPAS =================== */}
      <RightColumn />
    </Box>
  );
}

/* ========================================================= */
/* =================== COLUMNA DERECHA ===================== */
/* ========================================================= */

function RightColumn() {
  const { layers, selectedId, setLayerMeta, updateLayerProps, toggleVisible, toggleLocked } = useEditor();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.35)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        minHeight: 0, // 🔑 permite que los hijos con flex hagan scroll dentro del viewport
      }}
    >
      {/* 🟦 ARRIBA: PROPIEDADES */}
      <Box
        sx={{
          height: "400px", // Altura fija absoluta - NO SE MUEVE
          maxHeight: "400px", // Máximo absoluto
          minHeight: "400px", // Mínimo absoluto
          display: "flex",
          flexDirection: "column",
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(6px)",
          overflow: "hidden", // Sin scroll en el contenedor principal
        }}
      >
        <Box sx={{ p: 1.5, pb: 1, flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, color: "#fff", fontSize: 13 }}>Propiedades</Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto", // Scroll solo en el contenido
            overflowX: "hidden",
            px: 1.5,
            pb: 1.5,
          }}
        >
          <InspectorPanel
            selectedLayer={selectedId}
            layers={layers}
            setLayerMeta={setLayerMeta}
            updateLayerProps={updateLayerProps}
            toggleVisible={toggleVisible}
            toggleLocked={toggleLocked}
          />
        </Box>
      </Box>

      {/* 🟪 ABAJO: CAPAS */}
      <Box
        sx={{
          p: 1.5, // Padding reducido
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flex: 1,
          minHeight: 0, // 🔑 para que LayersPanel pueda usar height:100% y scroll interno
        }}
      >
        <Typography sx={{ fontWeight: 900, color: "#fff", mb: 1, fontSize: 13 }}>Capas</Typography>
        <LayersPanel />
      </Box>
    </Box>
  );
}
