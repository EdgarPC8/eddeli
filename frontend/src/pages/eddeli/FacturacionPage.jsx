import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import TablePro from "../../components/Tables/TablePro.jsx";
import PrintFormatDialog from "../../components/saleReceipt/PrintFormatDialog.jsx";
import { getPosSalesRequest } from "../../api/ordersRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  documentTypeLabel,
  formatReceiptDate,
  normalizeSaleReceipt,
  paymentMethodLabel,
} from "../../utils/saleReceiptUtils.js";

export default function FacturacionPage() {
  const { toast } = useAuth();
  const [sales, setSales] = useState([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);

  const load = async () => {
    try {
      const { data } = await getPosSalesRequest({ limit: 300 });
      setSales(data || []);
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudieron cargar las ventas de caja.",
        variant: "error",
      });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      sales.map((s) => ({
        ...s,
        dateLabel: formatReceiptDate(s.date || s.paidAt),
        docLabel: documentTypeLabel(s.documentType),
        customerLabel: s.documentType === "consumidor_final" ? "Consumidor Final" : s.customer?.name || "—",
        paymentLabel: paymentMethodLabel(s.paymentMethod),
        totalLabel: `$${Number(s.total || 0).toFixed(2)}`,
      })),
    [sales],
  );

  const openPrint = (sale) => {
    setPrintReceipt(normalizeSaleReceipt(sale));
    setPrintOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Facturación — ventas de caja
      </Typography>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Registro de ventas del punto de venta: factura, nota de venta, comprobante o consumidor final.
          Pulsa el icono de impresora para ver la vista previa y elegir formato A4 o ticket 80 mm.
        </Typography>
      </Paper>

      <TablePro
        title="Ventas de caja"
        rows={rows}
        columns={[
          { id: "id", label: "#" },
          { id: "dateLabel", label: "Fecha" },
          { id: "docLabel", label: "Tipo documento" },
          { id: "customerLabel", label: "Cliente" },
          { id: "paymentLabel", label: "Pago" },
          { id: "totalLabel", label: "Total", align: "right" },
          {
            id: "print",
            label: "Imprimir",
            render: (row) => (
              <Tooltip title="Imprimir comprobante">
                <IconButton size="small" color="primary" onClick={() => openPrint(row)}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
        ]}
        showSearch
        showPagination
        showIndex
        defaultRowsPerPage={15}
      />

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}
