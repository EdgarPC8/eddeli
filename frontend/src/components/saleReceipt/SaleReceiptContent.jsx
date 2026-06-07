import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { formatMoneyReceipt } from "../../utils/saleReceiptUtils.js";

const BLACK = "#000";
const cellSx = { py: 0.5, color: BLACK, borderColor: "#ccc" };
const headCellSx = { ...cellSx, fontWeight: 700 };

/** Vista previa del comprobante (A4 o ticket 80mm). */
export default function SaleReceiptContent({ receipt, format = "a4" }) {
  if (!receipt) return null;
  const isTicket = format === "ticket80";

  return (
    <Box
      sx={{
        width: isTicket ? 280 : "100%",
        maxWidth: isTicket ? 280 : 720,
        mx: "auto",
        p: isTicket ? 1 : 3,
        bgcolor: "#fff",
        color: BLACK,
        fontFamily: "Arial, sans-serif",
        fontSize: isTicket ? 11 : 14,
        border: "1px solid #ccc",
        borderRadius: 1,
        "& .MuiTypography-root": { color: BLACK },
        "& .MuiTableCell-root": { color: BLACK, borderColor: "#ccc" },
      }}
    >
      <Box sx={{ textAlign: "center", mb: isTicket ? 1 : 2 }}>
        <Typography fontWeight={700} fontSize={isTicket ? 14 : 20} color={BLACK}>
          {receipt.businessName}
        </Typography>
        {receipt.businessDescription ? (
          <Typography fontWeight={700} fontSize={isTicket ? 10 : 12} display="block" sx={{ mt: 0.5 }}>
            {receipt.businessDescription}
          </Typography>
        ) : null}
        <Typography fontWeight={700} sx={{ mt: 1 }} fontSize={isTicket ? 12 : 16} color={BLACK}>
          {receipt.documentTitle}
        </Typography>
        <Typography fontWeight={700} fontSize={isTicket ? 10 : 12} display="block" sx={{ mt: 0.5 }}>
          N° {receipt.id || "—"} · {receipt.date}
        </Typography>
      </Box>

      <Box sx={{ mb: isTicket ? 1 : 2, fontSize: isTicket ? 10 : 13 }}>
        <Typography variant="body2" color={BLACK}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            Cliente:
          </Box>{" "}
          {receipt.customerName}
        </Typography>
        {receipt.customerPhone ? (
          <Typography variant="body2" color={BLACK}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              Tel:
            </Box>{" "}
            {receipt.customerPhone}
          </Typography>
        ) : null}
        {receipt.customerAddress ? (
          <Typography variant="body2" color={BLACK}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              Dir:
            </Box>{" "}
            {receipt.customerAddress}
          </Typography>
        ) : null}
        <Typography variant="body2" color={BLACK}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            Pago:
          </Box>{" "}
          {receipt.paymentMethod}
        </Typography>
      </Box>

      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headCellSx, px: isTicket ? 0.5 : 1 }}>Producto</TableCell>
            <TableCell align="center" sx={{ ...headCellSx, px: 0.5, width: 48 }}>
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
              <TableCell sx={{ ...cellSx, py: 0.25, px: isTicket ? 0.5 : 1, fontSize: "inherit" }}>
                {it.name}
              </TableCell>
              <TableCell align="center" sx={{ ...cellSx, py: 0.25, px: 0.5, fontSize: "inherit" }}>
                {it.quantity}
              </TableCell>
              <TableCell align="right" sx={{ ...cellSx, py: 0.25, px: isTicket ? 0.5 : 1, fontSize: "inherit" }}>
                {formatMoneyReceipt(it.price)}
              </TableCell>
              <TableCell align="right" sx={{ ...cellSx, py: 0.25, px: isTicket ? 0.5 : 1, fontSize: "inherit" }}>
                {formatMoneyReceipt(it.lineTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box sx={{ borderTop: "1px dashed", borderColor: "#999", pt: 1, color: BLACK }}>
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
            fontWeight: 700,
            fontSize: isTicket ? 13 : 16,
            mt: 0.5,
          }}
        >
          <span>TOTAL</span>
          <span>{formatMoneyReceipt(receipt.total)}</span>
        </Box>
      </Box>

      {receipt.notes ? (
        <Typography variant="body2" display="block" sx={{ mt: 1, color: BLACK }}>
          {receipt.notes}
        </Typography>
      ) : null}
      <Typography variant="body2" display="block" textAlign="center" sx={{ mt: 2, color: BLACK }}>
        Gracias por su compra
      </Typography>
    </Box>
  );
}
