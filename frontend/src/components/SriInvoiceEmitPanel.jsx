/**
 * Emisión de comprobantes electrónicos SRI (01, 03–07) + bandeja.
 */
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchSriBillingSettings } from "../api/sriBillingRequest.js";
import { emitSriInvoice, fetchSriInvoices, refreshSriInvoice } from "../api/sriInvoicesRequest.js";

const IDENT_TYPES = [
  { value: "05", label: "Cédula (05)" },
  { value: "04", label: "RUC (04)" },
  { value: "06", label: "Pasaporte (06)" },
  { value: "08", label: "Id. exterior (08)" },
  { value: "07", label: "Consumidor final (07)" },
];

const DOC_META = {
  "01": { title: "Nueva factura", needsItems: true, needsBuyer: true, needsModified: false },
  "03": { title: "Nueva liquidación de compra", needsItems: true, needsBuyer: true, needsModified: false, buyerLabel: "Proveedor" },
  "04": { title: "Nueva nota de crédito", needsItems: true, needsBuyer: true, needsModified: true },
  "05": { title: "Nueva nota de débito", needsItems: true, needsBuyer: true, needsModified: true },
  "06": { title: "Nueva guía de remisión", needsItems: true, needsBuyer: false, needsGuide: true },
  "07": { title: "Nueva retención", needsItems: false, needsBuyer: false, needsRetention: true },
};

const emptyItem = () => ({
  description: "Producto / servicio",
  qty: "1",
  unitPrice: "1.00",
  taxRate: "15",
});

const STATUS_CHIP = {
  draft: { color: "default", label: "Borrador" },
  signed: { color: "info", label: "Firmado" },
  sent: { color: "warning", label: "Enviado" },
  authorized: { color: "success", label: "Autorizado" },
  rejected: { color: "error", label: "Rechazado" },
  cancelled: { color: "default", label: "Anulado" },
};

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}

export default function SriInvoiceEmitPanel({
  showForm = true,
  documentType = null,
}) {
  const { toast } = useAuth();
  const docType = documentType ? String(documentType).padStart(2, "0") : null;
  const meta = DOC_META[docType] || DOC_META["01"];

  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [emitting, setEmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);

  const [buyer, setBuyer] = useState({
    identType: docType === "03" || docType === "07" ? "04" : "05",
    ident: "",
    name: "",
    address: "",
    email: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);
  const [motivo, setMotivo] = useState(docType === "04" ? "DEVOLUCION" : "AJUSTE");
  const [modifiedDoc, setModifiedDoc] = useState({
    number: "",
    codDoc: "01",
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const [transport, setTransport] = useState({
    placa: "",
    dirPartida: "",
    identType: "04",
    ident: "",
    name: "",
  });
  const [destinatario, setDestinatario] = useState({
    identType: "05",
    ident: "",
    name: "",
    address: "",
    email: "",
    motivo: "TRASLADO DE MERCADERIA",
    ruta: "LOCAL",
  });
  const [retention, setRetention] = useState({
    baseImponible: "100.00",
    porcentaje: "10",
    codigo: "2",
    codigoRetencion: "9",
    periodoFiscal: "",
  });
  const [sustento, setSustento] = useState({
    number: "",
    codDoc: "01",
    issueDate: new Date().toISOString().slice(0, 10),
    subtotal: "100.00",
    taxRate: "15",
  });

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      setSettings(await fetchSriBillingSettings());
    } catch (err) {
      void toast?.({
        variant: "error",
        message: err?.response?.data?.message || "No se pudo cargar config SRI",
      });
    } finally {
      setLoadingSettings(false);
    }
  }, [toast]);

  const loadInvoices = useCallback(async () => {
    setLoadingList(true);
    try {
      setInvoices(await fetchSriInvoices(50, docType || undefined));
    } catch (err) {
      void toast?.({
        variant: "error",
        message: err?.response?.data?.message || "No se pudo cargar la bandeja",
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast, docType]);

  useEffect(() => {
    loadSettings();
    loadInvoices();
  }, [loadSettings, loadInvoices]);

  const onBuyer = (field) => (e) => setBuyer((b) => ({ ...b, [field]: e.target.value }));
  const onItem = (index, field) => (e) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: e.target.value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const onEmit = async () => {
    setEmitting(true);
    try {
      const type = docType || "01";
      const payload = { documentType: type, pricesIncludeTax, paymentMethod: "01" };

      if (type === "06") {
        payload.transport = {
          ...transport,
          ident: transport.ident || settings?.ruc,
          name: transport.name || settings?.legalName,
        };
        payload.destinatario = { ...destinatario };
        payload.items = items.map((it) => ({
          description: it.description.trim(),
          qty: Number(it.qty),
          code: it.code,
        }));
      } else if (type === "07") {
        payload.subject = {
          identType: buyer.identType,
          ident: String(buyer.ident || "").replace(/\s/g, ""),
          name: buyer.name.trim(),
          address: buyer.address.trim() || "S/N",
          email: buyer.email.trim(),
        };
        payload.sustento = { ...sustento };
        payload.retention = { ...retention };
      } else {
        payload.buyer = {
          identType: buyer.identType,
          ident: String(buyer.ident || "").replace(/\s/g, ""),
          name: buyer.name.trim(),
          address: buyer.address.trim() || "S/N",
          email: buyer.email.trim(),
        };
        payload.items = items.map((it) => ({
          description: it.description.trim(),
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          taxRate: Number(it.taxRate),
        }));
        if (type === "04" || type === "05") {
          payload.modifiedDoc = { ...modifiedDoc };
          payload.motivo = motivo;
        }
      }

      const data = await emitSriInvoice(payload);
      void toast?.({
        variant:
          data?.invoice?.status === "authorized"
            ? "success"
            : data?.invoice?.status === "rejected"
              ? "error"
              : "info",
        message: data?.message || "Comprobante procesado",
      });
      await loadInvoices();
      await loadSettings();
    } catch (err) {
      void toast?.({
        variant: "error",
        message: err?.response?.data?.message || err.message || "Error al emitir",
      });
      if (err?.response?.data?.invoice) await loadInvoices();
    } finally {
      setEmitting(false);
    }
  };

  const onRefresh = async (id) => {
    setRefreshingId(id);
    try {
      const data = await refreshSriInvoice(id);
      void toast?.({
        variant: data?.invoice?.status === "authorized" ? "success" : "info",
        message: data?.message || "Consulta actualizada",
      });
      await loadInvoices();
    } catch (err) {
      void toast?.({
        variant: "error",
        message: err?.response?.data?.message || "No se pudo consultar",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const ready = Boolean(settings?.readyForInvoicing);
  const partyLabel = meta.buyerLabel || "Cliente / comprador";

  return (
    <Stack spacing={2.5}>
      {loadingSettings ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {ready ? (
            <Chip size="small" color="success" label="Config SRI lista" />
          ) : (
            <Chip size="small" color="error" label="Falta configurar SRI" />
          )}
          <Chip
            size="small"
            variant="outlined"
            label={settings?.environment === "produccion" ? "Ambiente: Producción" : "Ambiente: Pruebas"}
            color={settings?.environment === "produccion" ? "warning" : "default"}
          />
          {docType ? <Chip size="small" variant="outlined" label={`Tipo ${docType}`} /> : null}
          <Button component={RouterLink} to="/sistema/configuracion?tab=sri" size="small">
            Ir a configuración SRI
          </Button>
        </Stack>
      )}

      {settings?.environment === "produccion" ? (
        <Alert severity="warning">
          Estás en <strong>Producción</strong>. Los comprobantes serán reales ante el SRI.
        </Alert>
      ) : (
        <Alert severity="info">
          Ambiente de <strong>Pruebas</strong>. Completa el formulario y pulsa Emitir al SRI.
        </Alert>
      )}

      {showForm ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            {meta.title}
          </Typography>

          {(meta.needsBuyer || meta.needsRetention) && (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  {meta.needsRetention ? "Sujeto retenido" : partyLabel}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Tipo identificación"
                  value={buyer.identType}
                  onChange={onBuyer("identType")}
                >
                  {IDENT_TYPES.filter((t) => (docType === "03" || docType === "07" ? t.value !== "07" : true)).map(
                    (t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required label="Identificación" value={buyer.ident} onChange={onBuyer("ident")} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required label="Nombre / razón social" value={buyer.name} onChange={onBuyer("name")} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Dirección" value={buyer.address} onChange={onBuyer("address")} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="email" label="Email" value={buyer.email} onChange={onBuyer("email")} />
              </Grid>
            </Grid>
          )}

          {meta.needsGuide && (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <Typography fontWeight={700}>Transportista / traslado</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Placa"
                  value={transport.placa}
                  onChange={(e) => setTransport((t) => ({ ...t, placa: e.target.value }))}
                  placeholder="ABC1234"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Dirección partida"
                  value={transport.dirPartida}
                  onChange={(e) => setTransport((t) => ({ ...t, dirPartida: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography fontWeight={700} sx={{ mt: 1 }}>
                  Destinatario
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Tipo id. destinatario"
                  value={destinatario.identType}
                  onChange={(e) => setDestinatario((d) => ({ ...d, identType: e.target.value }))}
                >
                  {IDENT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Identificación"
                  value={destinatario.ident}
                  onChange={(e) => setDestinatario((d) => ({ ...d, ident: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Nombre"
                  value={destinatario.name}
                  onChange={(e) => setDestinatario((d) => ({ ...d, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dirección destino"
                  value={destinatario.address}
                  onChange={(e) => setDestinatario((d) => ({ ...d, address: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Motivo traslado"
                  value={destinatario.motivo}
                  onChange={(e) => setDestinatario((d) => ({ ...d, motivo: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}

          {meta.needsModified && (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <Typography fontWeight={700}>Documento que modifica</Typography>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  required
                  label="Nº factura (001-001-000000001)"
                  value={modifiedDoc.number}
                  onChange={(e) => setModifiedDoc((m) => ({ ...m, number: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha doc. modificado"
                  InputLabelProps={{ shrink: true }}
                  value={modifiedDoc.issueDate}
                  onChange={(e) => setModifiedDoc((m) => ({ ...m, issueDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </Grid>
            </Grid>
          )}

          {meta.needsRetention && (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <Typography fontWeight={700}>Documento sustento + retención</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Nº factura sustento"
                  value={sustento.number}
                  onChange={(e) => setSustento((s) => ({ ...s, number: e.target.value }))}
                  placeholder="001-001-000000001"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha sustento"
                  InputLabelProps={{ shrink: true }}
                  value={sustento.issueDate}
                  onChange={(e) => setSustento((s) => ({ ...s, issueDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Base imponible retención"
                  type="number"
                  value={retention.baseImponible}
                  onChange={(e) => setRetention((r) => ({ ...r, baseImponible: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="% retener"
                  type="number"
                  value={retention.porcentaje}
                  onChange={(e) => setRetention((r) => ({ ...r, porcentaje: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Código retención"
                  value={retention.codigoRetencion}
                  onChange={(e) => setRetention((r) => ({ ...r, codigoRetencion: e.target.value }))}
                  helperText="Catálogo SRI (ej. 9 = IVA 10%)"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Subtotal sustento"
                  type="number"
                  value={sustento.subtotal}
                  onChange={(e) => setSustento((s) => ({ ...s, subtotal: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="IVA sustento %"
                  value={sustento.taxRate}
                  onChange={(e) => setSustento((s) => ({ ...s, taxRate: e.target.value }))}
                >
                  <MenuItem value="0">0%</MenuItem>
                  <MenuItem value="15">15%</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}

          {meta.needsItems && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography fontWeight={700}>Ítems</Typography>
                {docType !== "06" ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pricesIncludeTax}
                        onChange={(e) => setPricesIncludeTax(e.target.checked)}
                      />
                    }
                    label="Precios con IVA incluido"
                  />
                ) : null}
              </Stack>
              <Stack spacing={1.5}>
                {items.map((it, idx) => (
                  <Grid container spacing={1} key={idx} alignItems="center">
                    <Grid item xs={12} sm={docType === "06" ? 8 : 5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Descripción"
                        value={it.description}
                        onChange={onItem(idx, "description")}
                      />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cant."
                        type="number"
                        value={it.qty}
                        onChange={onItem(idx, "qty")}
                      />
                    </Grid>
                    {docType !== "06" ? (
                      <>
                        <Grid item xs={4} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            label={pricesIncludeTax ? "P. c/IVA" : "P. s/IVA"}
                            type="number"
                            value={it.unitPrice}
                            onChange={onItem(idx, "unitPrice")}
                          />
                        </Grid>
                        <Grid item xs={3} sm={2}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="IVA %"
                            value={it.taxRate}
                            onChange={onItem(idx, "taxRate")}
                          >
                            <MenuItem value="0">0%</MenuItem>
                            <MenuItem value="5">5%</MenuItem>
                            <MenuItem value="12">12%</MenuItem>
                            <MenuItem value="15">15%</MenuItem>
                          </TextField>
                        </Grid>
                      </>
                    ) : null}
                    <Grid item xs={1}>
                      <IconButton
                        aria-label="Quitar"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        size="small"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Stack>
              <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small" sx={{ mt: 1.5 }}>
                Agregar ítem
              </Button>
            </>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={emitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={onEmit}
              disabled={!ready || emitting}
            >
              Emitir al SRI
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
          <Typography fontWeight={800}>
            {docType ? `Emitidos · tipo ${docType}` : "Documentos emitidos"}
          </Typography>
          <Tooltip title="Actualizar lista">
            <span>
              <IconButton onClick={loadInvoices} disabled={loadingList} size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {loadingList ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : invoices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
            Aún no hay comprobantes de este tipo.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Clave</TableCell>
                <TableCell>Mensaje</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => {
                const chip = STATUS_CHIP[inv.status] || { color: "default", label: inv.status };
                return (
                  <TableRow key={inv.id} hover>
                    <TableCell>{inv.id}</TableCell>
                    <TableCell>{inv.documentType}</TableCell>
                    <TableCell>
                      <Chip size="small" color={chip.color} label={chip.label} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                        {inv.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">${money(inv.total)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                        {inv.accessKey || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: "block" }}>
                        {inv.sriMessage || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => onRefresh(inv.id)}
                        disabled={refreshingId === inv.id || inv.status === "authorized"}
                      >
                        {refreshingId === inv.id ? "…" : "Consultar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
