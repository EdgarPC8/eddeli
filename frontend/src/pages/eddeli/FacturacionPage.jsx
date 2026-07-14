import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { Link as RouterLink } from "react-router-dom";
import TablePro from "../../components/Tables/TablePro.jsx";
import PrintFormatDialog from "../../components/saleReceipt/PrintFormatDialog.jsx";
import { getPosSalesRequest } from "../../api/ordersRequest.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
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
  const [loading, setLoading] = useState(true);
  const [sriSettings, setSriSettings] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, sri] = await Promise.all([
        getPosSalesRequest({ limit: 300 }),
        fetchSriBillingSettings().catch(() => null),
      ]);
      setSales(data || []);
      setSriSettings(sri);
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudieron cargar las ventas de caja.",
        variant: "error",
      });
    } finally {
      setLoading(false);
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
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Comprobantes POS
        </Typography>
        {sriSettings?.readyForInvoicing ? (
          <Chip size="small" color="success" icon={<FactCheckIcon />} label="Facturación electrónica activa" />
        ) : (
          <Chip size="small" variant="outlined" color="warning" icon={<FactCheckIcon />} label="SRI no listo" />
        )}
      </Stack>
      <Paper sx={{ p: 1, mb: 1, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Reimpresión de ventas de caja. Si en Caja eliges <strong>Factura</strong> y el SRI está listo, también
          se emite la factura electrónica (cliente con cédula/RUC o consumidor final). Detalle SRI en{" "}
          <Link component={RouterLink} to="/comprobantes-electronicos/emitidos" underline="hover">
            Documentos emitidos
          </Link>
          {" · "}
          <Link component={RouterLink} to="/sistema/configuracion?tab=sri" underline="hover">
            Configurar SRI
          </Link>
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
        loading={loading}
      />

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}
