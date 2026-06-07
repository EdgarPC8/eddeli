import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SaleReceiptContent from "./SaleReceiptContent.jsx";
import {
  DOCUMENT_TYPE_OPTIONS,
  applyReceiptDocumentType,
  printSaleReceipt,
} from "../../utils/saleReceiptUtils.js";

/** Modal: formato de impresión, tipo de documento (solo al imprimir) y vista previa. */
export default function PrintFormatDialog({ open, onClose, receipt, initialFormat = "a4" }) {
  const [format, setFormat] = useState(initialFormat);
  const [documentType, setDocumentType] = useState("documento");

  useEffect(() => {
    if (open) {
      setFormat(initialFormat);
      setDocumentType(receipt?.documentType || "documento");
    }
  }, [open, initialFormat, receipt?.documentType]);

  const previewReceipt = useMemo(
    () => applyReceiptDocumentType(receipt, documentType),
    [receipt, documentType],
  );

  const handlePrint = () => {
    if (!previewReceipt) return;
    printSaleReceipt(previewReceipt, format);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Imprimir comprobante</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tipo de documento (solo para esta impresión)
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
              Formato de impresión
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={format}
              onChange={(_, v) => v && setFormat(v)}
              size="small"
            >
              <ToggleButton value="a4">
                <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                A4
              </ToggleButton>
              <ToggleButton value="ticket80">
                <ReceiptLongIcon fontSize="small" sx={{ mr: 0.5 }} />
                Ticket 80 mm
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="subtitle2" fontWeight={700}>
            Vista previa
          </Typography>
          <Box
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
            <SaleReceiptContent receipt={previewReceipt} format={format} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} disabled={!previewReceipt}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
