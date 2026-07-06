import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  deleteDocumentRequest,
  documentViewUrl,
  listDocumentsRequest,
  uploadDocumentRequest,
} from "../../../../api/documentRequest.js";
import { useAuth } from "../../../../context/AuthContext";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function isPdf(mime, name) {
  if (mime === "application/pdf") return true;
  return String(name || "").toLowerCase().endsWith(".pdf");
}

/**
 * Botón de subida inmediata de evidencia (imagen/PDF) para una entidad.
 * Sube el archivo apenas se selecciona y lista/borra los existentes.
 * Disponible siempre, aunque el pedido ya esté entregado/pagado.
 */
export default function DocumentUploadButton({
  entityType,
  entityId,
  label = "Comprobante",
  buttonText = "Subir comprobante",
  canManage = true,
}) {
  const { toast } = useAuth();
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const [existing, setExisting] = useState([]);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(() => {
    if (!entityType || entityId == null) return;
    listDocumentsRequest({ entityType, entityId })
      .then(({ data }) => setExisting(Array.isArray(data) ? data : []))
      .catch(() => setExisting([]));
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePick = async (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await toast({
        promise: uploadDocumentRequest({ file, entityType, entityId, label }),
      });
      refresh();
    } catch {
      /* toast */
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      await toast({ promise: deleteDocumentRequest(row.id) });
      setExisting((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      /* toast */
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={handlePick}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePick}
      />

      <Stack spacing={0.75}>
        {existing.map((row) => {
          const url = documentViewUrl(row.filePath);
          return (
            <Stack
              key={row.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 0.75,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {isPdf(row.mimeType, row.originalName) ? (
                <PictureAsPdfIcon color="error" fontSize="small" />
              ) : (
                <ImageIcon color="primary" fontSize="small" />
              )}
              <Typography variant="caption" sx={{ flex: 1 }} noWrap title={row.originalName}>
                {row.originalName || row.label || "Comprobante"}
              </Typography>
              {url ? (
                <IconButton
                  size="small"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver comprobante"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              ) : null}
              {canManage ? (
                <IconButton
                  type="button"
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row);
                  }}
                  aria-label="Eliminar comprobante"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Stack>
          );
        })}

        {canManage ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Tooltip title="Tomar foto con la cámara">
              <span>
                <Button
                  type="button"
                  size="small"
                  variant="contained"
                  startIcon={<PhotoCameraIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  {uploading ? "Subiendo…" : "Tomar foto"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={label}>
              <span>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  {existing.length ? "Añadir archivo" : buttonText}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
