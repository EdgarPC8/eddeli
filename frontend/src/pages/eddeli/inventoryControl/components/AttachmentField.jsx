import {
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect, useRef, useState } from "react";
import {
  deleteDocumentRequest,
  documentViewUrl,
  listDocumentsRequest,
} from "../../../../api/documentRequest.js";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function isPdf(mime, name) {
  if (mime === "application/pdf") return true;
  return String(name || "").toLowerCase().endsWith(".pdf");
}

export default function AttachmentField({
  label = "Comprobante (opcional)",
  helperText = "Imagen o PDF como constancia. No es obligatorio.",
  entityType,
  entityId,
  batchKey,
  pendingFile,
  onPendingFileChange,
  disabled = false,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(false);

  const bound = Boolean(entityType && (entityId || batchKey));

  useEffect(() => {
    if (!bound) {
      setExisting([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listDocumentsRequest({ entityType, entityId, batchKey })
      .then(({ data }) => {
        if (!cancelled) setExisting(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setExisting([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bound, entityType, entityId, batchKey]);

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (file && onPendingFileChange) onPendingFileChange(file);
    e.target.value = "";
  };

  const handleRemovePending = () => onPendingFileChange?.(null);

  const handleDeleteExisting = async (row) => {
    if (!row?.id) return;
    await deleteDocumentRequest(row.id);
    setExisting((prev) => prev.filter((r) => r.id !== row.id));
  };

  const pendingPreview = pendingFile ? (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
        border: "1px dashed",
        borderColor: "primary.light",
      }}
    >
      {isPdf(pendingFile.type, pendingFile.name) ? (
        <PictureAsPdfIcon color="error" fontSize="small" />
      ) : (
        <ImageIcon color="primary" fontSize="small" />
      )}
      <Typography variant="body2" sx={{ flex: 1 }} noWrap title={pendingFile.name}>
        {pendingFile.name}
      </Typography>
      <IconButton size="small" onClick={handleRemovePending} aria-label="Quitar archivo">
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Stack>
  ) : null;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {!compact && helperText ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {helperText}
        </Typography>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={handlePick}
        disabled={disabled}
      />

      {onPendingFileChange && !bound ? (
        <Stack spacing={1}>
          {!pendingFile ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AttachFileIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Adjuntar archivo
            </Button>
          ) : (
            pendingPreview
          )}
        </Stack>
      ) : null}

      {bound ? (
        <Stack spacing={1}>
          {loading ? (
            <Typography variant="caption" color="text.secondary">
              Cargando…
            </Typography>
          ) : null}
          {existing.map((row) => {
            const url = documentViewUrl(row.filePath);
            return (
              <Stack
                key={row.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  p: 1,
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
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
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
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteExisting(row)}
                  aria-label="Eliminar comprobante"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
          {onPendingFileChange ? (
            !pendingFile ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                {existing.length ? "Añadir otro" : "Adjuntar archivo"}
              </Button>
            ) : (
              pendingPreview
            )
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
