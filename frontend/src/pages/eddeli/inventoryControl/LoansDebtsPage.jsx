import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { money, nowLocalDateTime } from "./collections/helpers.js";
import { formatDateTime } from "../../../helpers/functions.js";
import {
  getObligationsWorkbenchRequest,
  createObligationRequest,
  payObligationRequest,
  cancelObligationRequest,
} from "../../../api/financeRequest";
import { getAllCustomersRequest } from "../../../api/inventoryControlRequest";

const PARTY_TYPES = [
  { value: "employee", label: "Empleado" },
  { value: "customer", label: "Cliente" },
  { value: "supplier", label: "Proveedor" },
  { value: "other", label: "Otro" },
];

const STATUS_CHIP = {
  open: { label: "Abierta", color: "warning" },
  closed: { label: "Saldada", color: "success" },
  cancelled: { label: "Anulada", color: "default" },
};

const emptyCreateForm = () => ({
  direction: "receivable",
  partyType: "employee",
  partyName: "",
  customerId: "",
  concept: "",
  amount: "",
  openDate: nowLocalDateTime(),
  dueDate: "",
  note: "",
});

function SummaryCard({ title, amount, color, subtitle }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={800} color={color}>
        {money(amount)}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function LoansDebtsPage() {
  const { toast } = useAuth();
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalReceivable: 0, totalPayable: 0, openCount: 0 });
  const [obligations, setObligations] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: "", method: "efectivo", note: "" });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelRow, setCancelRow] = useState(null);

  const canCancelObligation = (row) =>
    row?.status === "open" && Number(row?.paid || 0) <= 0;

  const openDetail = (row) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const openPay = (row) => {
    setSelected(row);
    setPayForm({
      amount: String(row.remaining ?? ""),
      date: nowLocalDateTime(),
      method: "efectivo",
      note: "",
    });
    setPayOpen(true);
  };

  const openCancelDialog = (row) => {
    setCancelRow(row);
    setCancelOpen(true);
  };

  const closeCancelDialog = () => {
    setCancelOpen(false);
    setCancelRow(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab === "receivable" || tab === "payable") params.direction = tab;
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.q = search.trim();

      const [wbRes, custRes] = await Promise.all([
        getObligationsWorkbenchRequest(params),
        getAllCustomersRequest(),
      ]);
      setSummary(wbRes.data?.summary || { totalReceivable: 0, totalPayable: 0, openCount: 0 });
      setObligations(Array.isArray(wbRes.data?.obligations) ? wbRes.data.obligations : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
    } catch (e) {
      console.error(e);
      toast({ message: "Error al cargar préstamos y deudas", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = async () => {
    if (!cancelRow?.id) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: cancelObligationRequest(cancelRow.id),
        reload: load,
        onClose: () => {
          closeCancelDialog();
          setDetailOpen(false);
          setSelected(null);
        },
        successMessage: "Obligación anulada y movimiento eliminado de finanzas",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "openDate",
        label: "Fecha",
        render: (row) => formatDateTime(row.openDate),
      },
      {
        id: "direction",
        label: "Tipo",
        render: (row) => (
          <Chip
            size="small"
            color={row.direction === "receivable" ? "info" : "secondary"}
            label={row.direction === "receivable" ? "Por cobrar" : "Por pagar"}
          />
        ),
      },
      { id: "partyName", label: "Persona" },
      {
        id: "partyType",
        label: "Rol",
        render: (row) => row.partyTypeLabel || row.partyType,
      },
      { id: "concept", label: "Concepto" },
      { id: "total", label: "Monto", render: (row) => money(row.total) },
      { id: "paid", label: "Abonado", render: (row) => money(row.paid) },
      {
        id: "remaining",
        label: "Saldo",
        render: (row) => <Typography fontWeight={700}>{money(row.remaining)}</Typography>,
      },
      {
        id: "status",
        label: "Estado",
        render: (row) => {
          const cfg = STATUS_CHIP[row.status] || STATUS_CHIP.open;
          return <Chip size="small" color={cfg.color} label={cfg.label} />;
        },
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Ver detalle">
              <IconButton size="small" onClick={() => openDetail(row)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {row.status === "open" && row.remaining > 0 && (
              <Tooltip title={row.direction === "receivable" ? "Registrar cobro" : "Registrar pago"}>
                <IconButton size="small" color="primary" onClick={() => openPay(row)}>
                  <PaymentsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canCancelObligation(row) && (
              <Tooltip title="Anular y quitar de finanzas">
                <IconButton size="small" color="error" onClick={() => openCancelDialog(row)}>
                  <MoneyOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    []
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        direction: createForm.direction,
        partyType: createForm.partyType,
        partyName: createForm.partyType === "customer" ? undefined : createForm.partyName.trim(),
        customerId: createForm.partyType === "customer" ? Number(createForm.customerId) : null,
        concept: createForm.concept.trim(),
        amount: Number(createForm.amount),
        openDate: createForm.openDate,
        dueDate: createForm.dueDate || null,
        note: createForm.note || null,
      };
      await runMutationReload(toast, {
        promise: createObligationRequest(payload),
        reload: load,
        onClose: () => {
          setCreateOpen(false);
          setCreateForm(emptyCreateForm());
        },
        successMessage:
          createForm.direction === "receivable"
            ? "Préstamo registrado (egreso en finanzas)"
            : "Deuda registrada (ingreso en finanzas)",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selected?.id) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: payObligationRequest(selected.id, {
          amount: Number(payForm.amount),
          date: payForm.date,
          method: payForm.method,
          note: payForm.note || null,
        }),
        reload: load,
        onClose: () => {
          setPayOpen(false);
          setDetailOpen(false);
          setSelected(null);
        },
        successMessage:
          selected.direction === "receivable"
            ? "Cobro registrado (ingreso en finanzas)"
            : "Pago registrado (egreso en finanzas)",
      });
    } finally {
      setSaving(false);
    }
  };

  const openCreateWithDirection = (direction) => {
    setCreateForm({ ...emptyCreateForm(), direction });
    setCreateOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AccountBalanceWalletIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Préstamos y deudas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dinero prestado o debido sin pedido. Cada movimiento queda en Ingresos/Gastos.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openCreateWithDirection("receivable")}>
            Nuevo préstamo
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateWithDirection("payable")}>
            Nueva deuda
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Por cobrar:</strong> al prestar se registra un <em>gasto</em>; al cobrar, un <em>ingreso</em>.
        {" "}
        <strong>Por pagar:</strong> al recibir préstamo/deuda entra un <em>ingreso</em>; al pagar, un <em>egreso</em>.
        La deuda por <strong>pedidos</strong> sigue en Cobranzas.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Total por cobrar"
            amount={summary.totalReceivable}
            color="info.main"
            subtitle="Préstamos que otorgaste"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Total por pagar"
            amount={summary.totalPayable}
            color="secondary.main"
            subtitle="Deudas que debes"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <SummaryCard
            title="Cuentas abiertas"
            amount={summary.openCount}
            color="text.primary"
            subtitle="Obligaciones activas"
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, mb: 2, overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab value="all" label="Todas" />
          <Tab value="receivable" label="Por cobrar" />
          <Tab value="payable" label="Por pagar" />
        </Tabs>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Buscar persona o concepto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={statusFilter} label="Estado" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="open">Abiertas</MenuItem>
            <MenuItem value="closed">Saldadas</MenuItem>
            <MenuItem value="cancelled">Anuladas</MenuItem>
            <MenuItem value="all">Todas</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <TablePro
          rows={obligations}
          columns={columns}
          showSearch={false}
          defaultRowsPerPage={10}
          tableMaxHeight="none"
          loading={loading}
        />

      {/* Crear */}
      <SimpleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createForm.direction === "receivable" ? "Nuevo préstamo (por cobrar)" : "Nueva deuda (por pagar)"}
        maxWidth="sm"
        fullWidth
      >
        <Box component="form" onSubmit={handleCreate} sx={{ p: 1 }}>
          <Stack spacing={2}>
            <Alert severity="warning" icon={false}>
              {createForm.direction === "receivable"
                ? "Se registrará un EGRESO en finanzas (salió el dinero)."
                : "Se registrará un INGRESO en finanzas (entró el dinero)."}
            </Alert>

            <FormControl fullWidth size="small">
              <InputLabel>Tipo de persona</InputLabel>
              <Select
                value={createForm.partyType}
                label="Tipo de persona"
                onChange={(e) => setCreateForm((f) => ({ ...f, partyType: e.target.value }))}
              >
                {PARTY_TYPES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {createForm.partyType === "customer" ? (
              <FormControl fullWidth size="small" required>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={createForm.customerId}
                  label="Cliente"
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Nombre"
                size="small"
                required
                fullWidth
                value={createForm.partyName}
                onChange={(e) => setCreateForm((f) => ({ ...f, partyName: e.target.value }))}
              />
            )}

            <TextField
              label="Concepto"
              size="small"
              fullWidth
              value={createForm.concept}
              onChange={(e) => setCreateForm((f) => ({ ...f, concept: e.target.value }))}
              placeholder="Ej. adelanto quincena, préstamo emergencia"
            />

            <TextField
              label="Monto"
              type="number"
              size="small"
              required
              fullWidth
              inputProps={{ min: 0.01, step: 0.01 }}
              value={createForm.amount}
              onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
            />

            <Stack direction="row" spacing={1}>
              <TextField
                label="Fecha y hora"
                type="datetime-local"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={createForm.openDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, openDate: e.target.value }))}
              />
              <TextField
                label="Vence (opcional)"
                type="datetime-local"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </Stack>

            <TextField
              label="Nota"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={createForm.note}
              onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
            />

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                Guardar
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* Abonar */}
      <SimpleDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={
          selected?.direction === "receivable"
            ? `Cobrar préstamo — ${selected?.partyName}`
            : `Pagar deuda — ${selected?.partyName}`
        }
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" onSubmit={handlePay} sx={{ p: 1 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Saldo pendiente: <strong>{money(selected?.remaining)}</strong>
            </Typography>
            <Alert severity="info" icon={false}>
              {selected?.direction === "receivable"
                ? "Se creará un INGRESO en finanzas."
                : "Se creará un EGRESO en finanzas."}
            </Alert>
            <TextField
              label="Monto"
              type="number"
              size="small"
              required
              fullWidth
              inputProps={{ min: 0.01, step: 0.01, max: selected?.remaining }}
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <TextField
              label="Fecha y hora"
              type="datetime-local"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={payForm.date}
              onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Método</InputLabel>
              <Select
                value={payForm.method}
                label="Método"
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Nota"
              size="small"
              fullWidth
              value={payForm.note}
              onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setPayOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                Registrar
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* Detalle */}
      <SimpleDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected ? `${selected.partyName} — ${selected.concept}` : "Detalle"}
        maxWidth="sm"
        fullWidth
      >
        {selected && (
          <Stack spacing={2} sx={{ p: 1 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={selected.direction === "receivable" ? "info" : "secondary"}
                label={selected.direction === "receivable" ? "Por cobrar" : "Por pagar"}
              />
              <Chip size="small" label={selected.partyTypeLabel} />
              <Chip
                size="small"
                color={(STATUS_CHIP[selected.status] || STATUS_CHIP.open).color}
                label={(STATUS_CHIP[selected.status] || STATUS_CHIP.open).label}
              />
            </Stack>

            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Monto
                </Typography>
                <Typography fontWeight={700}>{money(selected.total)}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Abonado
                </Typography>
                <Typography fontWeight={700}>{money(selected.paid)}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Saldo
                </Typography>
                <Typography fontWeight={800} color="primary.main">
                  {money(selected.remaining)}
                </Typography>
              </Grid>
            </Grid>

            {selected.note && (
              <Typography variant="body2" color="text.secondary">
                {selected.note}
              </Typography>
            )}

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              Historial de abonos
            </Typography>
            {(selected.payments || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin abonos todavía.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {selected.payments.map((p) => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(p.date)} — {money(p.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.method}
                          {p.note ? ` · ${p.note}` : ""}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={p.financeType === "income" ? "Ingreso" : "Gasto"}
                        color={p.financeType === "income" ? "success" : "warning"}
                        variant="outlined"
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap">
              {selected.status === "open" && selected.remaining > 0 && (
                <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => openPay(selected)}>
                  {selected.direction === "receivable" ? "Registrar cobro" : "Registrar pago"}
                </Button>
              )}
              <Button variant="outlined" onClick={() => setDetailOpen(false)}>
                Cerrar
              </Button>
            </Stack>
          </Stack>
        )}
      </SimpleDialog>

      <SimpleDialog
        open={cancelOpen}
        onClose={closeCancelDialog}
        title="Anular y quitar de finanzas"
        maxWidth="xs"
        fullWidth
      >
        {cancelRow && (
          <Stack spacing={2} sx={{ p: 1 }}>
            <Typography variant="body2">
              ¿Anular el{" "}
              {cancelRow.direction === "receivable" ? "préstamo" : "deuda"} de{" "}
              <strong>{cancelRow.partyName}</strong>?
            </Typography>
            <Alert severity="warning">
              {cancelRow.direction === "receivable"
                ? "Se eliminará el gasto registrado en finanzas al otorgar este préstamo."
                : "Se eliminará el ingreso registrado en finanzas al crear esta deuda."}
              {" "}
              Solo es posible si no tiene abonos.
            </Alert>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={closeCancelDialog} disabled={saving}>
                No, volver
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<MoneyOffIcon />}
                onClick={confirmCancel}
                disabled={saving}
              >
                Sí, anular
              </Button>
            </Stack>
          </Stack>
        )}
      </SimpleDialog>
    </Container>
  );
}
