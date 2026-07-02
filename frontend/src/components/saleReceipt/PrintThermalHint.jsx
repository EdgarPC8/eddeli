import { Alert } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { getTicketLabel, isTicketFormat } from "../../utils/receiptFormats.js";

/** Aviso: el navegador pide elegir impresora al imprimir. */
export default function PrintThermalHint({ format = "a4" }) {
  const isTicket = isTicketFormat(format);
  const ticketLabel = getTicketLabel(format);

  return (
    <Alert severity="info" icon={<PrintIcon fontSize="small" />} sx={{ py: 0.75 }}>
      {isTicket ? (
        <>
          Al pulsar <strong>Imprimir</strong>, el navegador abrirá un cuadro de impresión.
          Selecciona tu <strong>impresora térmica</strong>, formato{" "}
          <strong>{ticketLabel}</strong> y orientación <strong>Vertical (Portrait)</strong>.
          Si sale horizontal, cambia orientación a vertical en el diálogo de impresión.
        </>
      ) : (
        <>
          Al pulsar <strong>Imprimir</strong>, selecciona la impresora en el cuadro del navegador.
          Para ticket de caja, elige <strong>Ticket 80 mm</strong> o <strong>Ticket 55 mm</strong> y
          tu impresora térmica.
        </>
      )}
    </Alert>
  );
}
