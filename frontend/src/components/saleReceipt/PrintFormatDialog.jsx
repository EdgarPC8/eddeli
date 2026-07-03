import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SaleReceiptContent from "./SaleReceiptContent.jsx";
import {
  DOCUMENT_TYPE_OPTIONS,
  applyReceiptDocumentType,
  printSaleReceipt,
} from "../../utils/saleReceiptUtils.js";
import {
  downloadReceiptAsPdf,
  downloadReceiptAsPng,
} from "../../utils/saleReceiptExport.js";

/** Modal: formato de impresión, tipo de documento y vista previa. */
export default function PrintFormatDialog({ open, onClose, receipt, initialFormat = "a4" }) {
  const [format, setFormat] = useState(initialFormat);
  const [documentType, setDocumentType] = useState("documento");
  const [showNotes, setShowNotes] = useState(true);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setDocumentType(receipt?.documentType || "documento");
      setShowNotes(true);
    }
  }, [open, initialFormat, receipt?.documentType]);

  const previewReceipt = useMemo(
    () => applyReceiptDocumentType(receipt, documentType),
    [receipt, documentType],
  );

  const baseFilename = `comprobante-${receipt?.id || "pedido"}`;

  const handlePrint = () => {
    if (!previewReceipt) return;
    printSaleReceipt(previewReceipt, format, { showNotes });
  };

  const hasNotes = Boolean(previewReceipt?.notes);

  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPng(previewRef.current, `${baseFilename}.png`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await downloadReceiptAsPdf(previewRef.current, format, `${baseFilename}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Comprobante / factura</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tipo de documento (solo para esta impresión o descarga)
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={documentType}
              onChange={(_, v) => v && setDocumentType(v)}
              size="small"
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: "none" }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Formato
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={format}
              onChange={(_, v) => v && setFormat(v)}
              size="small"
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              <ToggleButton value="a4">
                <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                A4
              </ToggleButton>
              <ToggleButton value="ticket80">
                <ReceiptLongIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ticket 80 mm
              </ToggleButton>
              <ToggleButton value="ticket55">
                <ReceiptLongIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ticket 55 mm
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                disabled={!hasNotes}
              />
            }
            label={
              hasNotes
                ? "Mostrar descripción / notas del pedido"
                : "Mostrar descripción / notas (este pedido no tiene)"
            }
          />

          <Typography variant="subtitle2" fontWeight={700}>
            Vista previa
          </Typography>
          <Box
            ref={previewRef}
            sx={{
              overflow: "auto",
              maxHeight: "55vh",
              bgcolor: "#fff",
              p: 2,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <SaleReceiptContent receipt={previewReceipt} format={format} showNotes={showNotes} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<ImageIcon />}
          onClick={handleDownloadPng}
          disabled={!previewReceipt || exporting}
        >
          PNG
        </Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleDownloadPdf}
          disabled={!previewReceipt || exporting}
        >
          PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={!previewReceipt || exporting}
        >
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
