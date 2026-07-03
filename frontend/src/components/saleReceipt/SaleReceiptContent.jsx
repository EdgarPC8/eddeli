import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { getReceiptLayout } from "../../utils/receiptFormats.js";
import {
  formatMoneyReceipt,
  formatUnitMoneyReceipt,
  RECEIPT_FIELD_LABELS,
} from "../../utils/saleReceiptUtils.js";

const BLACK = "#000";
const cellSx = { py: 0.5, color: BLACK, borderColor: "#ccc" };
const headCellSx = { ...cellSx, fontWeight: 800 };

/** Bloque de firmas entrega / recibe. */
function ReceiptSignatures({ isTicket, signatureSize }) {
  const lineSx = {
    borderTop: "1.5px solid",
    borderColor: BLACK,
    pt: 0.75,
    mt: isTicket ? 3.5 : 5,
    textAlign: "center",
    fontWeight: 800,
    fontSize: signatureSize,
  };

  if (isTicket) {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography sx={lineSx}>Entrega</Typography>
        <Typography sx={lineSx}>Recibe</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 4, mt: 4 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={lineSx}>Entrega</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={lineSx}>Recibe</Typography>
      </Box>
    </Box>
  );
}

/** Vista previa del comprobante (A4 o ticket térmico). */
export default function SaleReceiptContent({ receipt, format = "a4", showNotes = true }) {
  if (!receipt) return null;
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const items = receipt.items || [];
  const totalQuantity = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

  return (
    <Box
      sx={{
        width: isTicket ? layout.previewWidth : "100%",
        maxWidth: isTicket ? layout.maxWidth : 720,
        mx: "auto",
        p: layout.pad,
        bgcolor: "#fff",
        color: BLACK,
        fontFamily: "Arial, sans-serif",
        fontSize: layout.baseFont,
        fontWeight: 600,
        border: "1px solid #ccc",
        borderRadius: 1,
        "& .MuiTypography-root": { color: BLACK },
        "& .MuiTableCell-root": { color: BLACK, borderColor: "#ccc" },
      }}
    >
      <Box sx={{ textAlign: "center", mb: isTicket ? 1 : 2 }}>
        <Typography fontWeight={800} fontSize={layout.businessName} color={BLACK}>
          {receipt.businessName}
        </Typography>
        {receipt.businessDescription ? (
          <Typography fontWeight={800} fontSize={layout.businessDesc} display="block" sx={{ mt: 0.5 }}>
            {receipt.businessDescription}
          </Typography>
        ) : null}
        <Typography fontWeight={800} sx={{ mt: 1 }} fontSize={layout.docTitle} color={BLACK}>
          {receipt.documentTitle}
        </Typography>
        <Typography fontWeight={800} fontSize={layout.meta} display="block" sx={{ mt: 0.5 }}>
          N° {receipt.id || "—"}
        </Typography>
        <Typography
          fontWeight={900}
          fontSize={layout.date}
          display="block"
          sx={{ mt: 0.35, letterSpacing: 0.2 }}
        >
          {receipt.date}
        </Typography>
      </Box>

      <Box sx={{ mb: isTicket ? 1.25 : 2, fontSize: layout.customer, fontWeight: 700, lineHeight: 1.4 }}>
        <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            {RECEIPT_FIELD_LABELS.name}
          </Box>{" "}
          {receipt.customerName}
        </Typography>
        {receipt.customerCedula ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.cedula}
            </Box>{" "}
            {receipt.customerCedula}
          </Typography>
        ) : null}
        {receipt.customerPhone ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.phone}
            </Box>{" "}
            {receipt.customerPhone}
          </Typography>
        ) : null}
        {receipt.customerAddress ? (
          <Typography variant="body2" color={BLACK} sx={{ mb: 0.35 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>
              {RECEIPT_FIELD_LABELS.address}
            </Box>{" "}
            {receipt.customerAddress}
          </Typography>
        ) : null}
        <Typography variant="body2" color={BLACK}>
          <Box component="span" sx={{ fontWeight: 800 }}>
            {RECEIPT_FIELD_LABELS.payment}
          </Box>{" "}
          {receipt.paymentMethod}
        </Typography>
      </Box>

      <Table size="small" sx={{ mb: 1, tableLayout: isTicket ? "fixed" : "auto" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headCellSx, px: isTicket ? 0.5 : 1, width: layout.tableProductWidth }}>Producto</TableCell>
            <TableCell align="center" sx={{ ...headCellSx, px: 0.5, width: isTicket ? 40 : 48 }}>
              Cant
            </TableCell>
            <TableCell align="right" sx={{ ...headCellSx, px: isTicket ? 0.5 : 1 }}>
              P.U.
            </TableCell>
            <TableCell align="right" sx={{ ...headCellSx, px: isTicket ? 0.5 : 1 }}>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(receipt.items || []).map((it, idx) => (
            <TableRow key={`line-${idx}`}>
              <TableCell
                sx={{
                  ...cellSx,
                  py: 0.35,
                  px: isTicket ? 0.5 : 1,
                  fontSize: "inherit",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  verticalAlign: "top",
                  lineHeight: 1.35,
                  fontWeight: 600,
                }}
              >
                {it.name}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  py: 0.35,
                  px: 0.5,
                  fontSize: "inherit",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                }}
              >
                {it.quantity}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...cellSx,
                  py: 0.35,
                  px: isTicket ? 0.5 : 1,
                  fontSize: "inherit",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                }}
              >
                {formatUnitMoneyReceipt(it.price)}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...cellSx,
                  py: 0.35,
                  px: isTicket ? 0.5 : 1,
                  fontSize: "inherit",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                }}
              >
                {formatMoneyReceipt(it.lineTotal)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell
              align="right"
              sx={{ ...cellSx, py: 0.5, px: isTicket ? 0.5 : 1, fontWeight: 800, borderTop: "1px solid #ccc" }}
            >
              Total Cant
            </TableCell>
            <TableCell
              align="center"
              sx={{ ...cellSx, py: 0.5, px: 0.5, fontWeight: 800, borderTop: "1px solid #ccc" }}
            >
              {totalQuantity}
            </TableCell>
            <TableCell sx={{ ...cellSx, py: 0.5, borderTop: "1px solid #ccc" }} />
            <TableCell sx={{ ...cellSx, py: 0.5, borderTop: "1px solid #ccc" }} />
          </TableRow>
        </TableBody>
      </Table>

      <Box sx={{ borderTop: "1px dashed", borderColor: "#999", pt: 1, color: BLACK, fontWeight: 700 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>{formatMoneyReceipt(receipt.subtotal)}</span>
        </Box>
        {receipt.iva > 0 ? (
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>IVA</span>
            <span>{formatMoneyReceipt(receipt.iva)}</span>
          </Box>
        ) : null}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            fontSize: layout.total,
            mt: 0.5,
          }}
        >
          <span>TOTAL</span>
          <span>{formatMoneyReceipt(receipt.total)}</span>
        </Box>
      </Box>

      {showNotes && receipt.notes ? (
        <Typography variant="body2" display="block" sx={{ mt: 1, color: BLACK, fontWeight: 700 }}>
          {receipt.notes}
        </Typography>
      ) : null}
      <Typography
        variant="body2"
        display="block"
        textAlign="center"
        sx={{ mt: 2, color: BLACK, fontWeight: 800, fontSize: layout.footer }}
      >
        Gracias por su compra
      </Typography>
      <ReceiptSignatures isTicket={isTicket} signatureSize={layout.signature} />
    </Box>
  );
}
