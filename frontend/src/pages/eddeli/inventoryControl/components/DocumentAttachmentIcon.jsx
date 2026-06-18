import { useEffect, useState } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { documentViewUrl, listDocumentsRequest } from "../../../../api/documentRequest.js";

/** Icono que abre el comprobante si existe. */
export default function DocumentAttachmentIcon({ entityType, entityId, batchKey, title = "Ver comprobante" }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityType || (!entityId && !batchKey)) return;
    let cancelled = false;
    setLoading(true);
    listDocumentsRequest({ entityType, entityId, batchKey })
      .then(({ data }) => {
        if (!cancelled) setRow(Array.isArray(data) && data.length ? data[0] : null);
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, batchKey]);

  if (loading) {
    return <CircularProgress size={18} sx={{ m: 0.5 }} />;
  }
  if (!row) return null;

  const url = documentViewUrl(row.filePath);
  if (!url) return null;

  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        color="primary"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      >
        <AttachFileIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
