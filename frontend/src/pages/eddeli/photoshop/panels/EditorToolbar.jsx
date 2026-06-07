/**
 * EditorToolbar.jsx
 *
 * Barra de herramientas del editor (similar a navbar/configuración).
 * Contiene botones de acción rápida: guardar, exportar, importar, etc.
 * Diseñada para ser escalable y fácil de extender con nuevos botones.
 */
import React, { useRef, useState } from "react";
import {
  Box,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import ImageIcon from "@mui/icons-material/Image";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";
import { useEditor } from "../EditorProvider";
import { useAuth } from "../../../../context/AuthContext";

export default function EditorToolbar({ showProductSelector, onToggleProductSelector }) {
  const {
    exportAsImage,
    copyTemplate,
    copyOps,
    downloadTemplateJson,
    importTemplateJson,
    saveTemplateDoc,
  } = useEditor();

  const { toast } = useAuth();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const onSave = async () => {
    setSaving(true);
    await toast({
      promise: saveTemplateDoc(),
      successMessage: "✅ Plantilla guardada en la base de datos",
      errorMessage: "❌ No se pudo guardar la plantilla",
    });
    setSaving(false);
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      await toast({
        promise: importTemplateJson(text),
        successMessage: "✅ Plantilla importada correctamente",
        errorMessage: "❌ No se pudo importar el JSON. Revisa que sea un template válido.",
      });
    } catch (err) {
      console.error(err);
      toast({
        info: {
          description: "❌ No se pudo importar el JSON. Revisa que sea un template válido.",
        },
      });
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.75,
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Botón toggle ProductSelector (IZQUIERDA) */}
      {onToggleProductSelector && (
        <>
          <Tooltip title={showProductSelector ? "Ocultar catálogo de productos" : "Mostrar catálogo de productos"}>
            <IconButton
              size="small"
              onClick={onToggleProductSelector}
              sx={{
                background: showProductSelector ? "rgba(0, 229, 255, 0.2)" : "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                "&:hover": {
                  background: showProductSelector ? "rgba(0, 229, 255, 0.3)" : "rgba(255,255,255,0.2)",
                  borderColor: "rgba(255,255,255,0.3)",
                },
              }}
            >
              {showProductSelector ? <CloseIcon fontSize="small" /> : <ShoppingCartIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />
        </>
      )}

      {/* Guardar en BD */}
      <Tooltip title="Guardar plantilla en la base de datos">
        <span>
          <IconButton
            size="small"
            onClick={onSave}
            disabled={saving}
            sx={{
              color: saving ? "rgba(255,255,255,0.5)" : "#fff",
              background: saving ? "rgba(255,255,255,0.1)" : "rgba(0, 229, 255, 0.2)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              "&:hover:not(:disabled)": {
                background: "rgba(0, 229, 255, 0.3)",
                borderColor: "rgba(0, 229, 255, 0.5)",
              },
            }}
          >
            <SaveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      {/* Exportar PNG */}
      <Tooltip title="Exportar como imagen PNG">
        <IconButton
          size="small"
          onClick={() => exportAsImage("png")}
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

      {/* Exportar JPG */}
      <Tooltip title="Exportar como imagen JPG">
        <IconButton
          size="small"
          onClick={() => exportAsImage("jpg")}
          sx={{
            color: "#fff",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            "&:hover": {
              background: "rgba(255,255,255,0.2)",
              borderColor: "rgba(255,255,255,0.4)",
            },
          }}
        >
          <ImageIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      {/* Descargar JSON */}
      <Tooltip title="Descargar plantilla como archivo JSON">
        <IconButton
          size="small"
          onClick={downloadTemplateJson}
          sx={{
            color: "#fff",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            "&:hover": {
              background: "rgba(255,255,255,0.15)",
              borderColor: "rgba(255,255,255,0.3)",
            },
          }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Subir/Importar JSON */}
      <Tooltip title="Importar plantilla desde archivo JSON">
        <span>
          <IconButton
            size="small"
            onClick={onPickFile}
            sx={{
              color: "#fff",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              "&:hover": {
                background: "rgba(255,255,255,0.15)",
                borderColor: "rgba(255,255,255,0.3)",
              },
            }}
          >
            <UploadIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

      {/* Copiar template (debug) */}
      <Tooltip title="Copiar template JSON al portapapeles (debug)">
        <IconButton
          size="small"
          onClick={copyTemplate}
          sx={{
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.2)",
            },
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Copiar ops (debug) */}
      <Tooltip title="Copiar historial de operaciones al portapapeles (debug)">
        <IconButton
          size="small"
          onClick={copyOps}
          sx={{
            color: "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            "&:hover": {
              background: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.2)",
            },
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* 🔮 Espacio para futuros botones */}
      {/* Aquí puedes añadir más botones fácilmente */}
    </Box>
  );
}
