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
  Switch,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PaymentsIcon from "@mui/icons-material/Payments";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import EditIcon from "@mui/icons-material/Edit";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RefreshIcon from "@mui/icons-material/Refresh";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { money, nowLocalDateTime } from "./collections/helpers.js";
import {
  getRecurringWorkbenchRequest,
  createRecurringTemplateRequest,
  updateRecurringTemplateRequest,
  updateRecurringOccurrenceRequest,
  payRecurringOccurrenceRequest,
  skipRecurringOccurrenceRequest,
  generateRecurringOccurrencesRequest,
} from "../../../api/financeRequest";
import { getStoresRequest } from "../../../api/inventoryControlRequest";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORIES = [
  { value: "arriendo", label: "Arriendo" },
  { value: "servicios", label: "Servicios (luz, agua)" },
  { value: "permisos", label: "Permisos anuales" },
  { value: "otros", label: "Otros" },
];

const FREQUENCIES = [
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
];

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const STATUS_CHIP = {
  pending: { label: "Pendiente", color: "warning" },
  paid: { label: "Pagado", color: "success" },
  skipped: { label: "Omitido", color: "default" },
};

const emptyTemplateForm = () => ({
  storeId: "",
  name: "",
  category: "arriendo",
  amountType: "fixed",
  frequency: "monthly",
  baseAmount: "",
  dueDayOfMonth: 5,
  dueMonth: 1,
  providerName: "",
  reminderDaysBefore: 7,
  note: "",
  isActive: true,
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

function formatDueDate(value) {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    return format(d, "d MMM yyyy", { locale: es });
  } catch {
    return "—";
  }
}

export default function RecurringExpensesPage() {
  const { toast } = useAuth();
  const [tab, setTab] = useState("occurrences");
  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [templates, setTemplates] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [stores, setStores] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [form, setForm] = useState(emptyTemplateForm());
  const [saving, setSaving] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payRow, setPayRow] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", date: "", note: "" });

  const [amountOpen, setAmountOpen] = useState(false);
  const [amountRow, setAmountRow] = useState(null);
  const [amountValue, setAmountValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wbRes, storesRes] = await Promise.all([
        getRecurringWorkbenchRequest({ month: monthKey }),
        getStoresRequest(),
      ]);
      const data = wbRes.data || {};
      setSummary(data.summary || {});
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setOccurrences(Array.isArray(data.occurrences) ? data.occurrences : []);
      setMonthLabel(data.monthLabel || monthKey);
      setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
    } catch (e) {
      console.error(e);
      toast({ message: "Error al cargar gastos recurrentes", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [monthKey, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditTemplate(null);
    setForm(emptyTemplateForm());
    setCreateOpen(true);
  };

  const openEditTemplate = (row) => {
    setEditTemplate(row);
    setForm({
      storeId: row.storeId || "",
      name: row.name || "",
      category: row.category || "otros",
      amountType: row.amountType || "fixed",
      frequency: row.frequency || "monthly",
      baseAmount: String(row.baseAmount ?? ""),
      dueDayOfMonth: row.dueDayOfMonth || 5,
      dueMonth: row.dueMonth || 1,
      providerName: row.providerName || "",
      reminderDaysBefore: row.reminderDaysBefore ?? 7,
      note: row.note || "",
      isActive: row.isActive !== false,
    });
    setCreateOpen(true);
  };

  const openPay = (row) => {
    setPayRow(row);
    setPayForm({
      amount: String(row.actualAmount ?? row.expectedAmount ?? ""),
      date: nowLocalDateTime(),
      note: "",
    });
    setPayOpen(true);
  };

  const openSetAmount = (row) => {
    setAmountRow(row);
    setAmountValue(String(row.actualAmount ?? row.expectedAmount ?? ""));
    setAmountOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        storeId: form.storeId ? Number(form.storeId) : null,
        name: form.name.trim(),
        category: form.category,
        amountType: form.amountType,
        frequency: form.frequency,
        baseAmount: Number(form.baseAmount),
        dueDayOfMonth: Number(form.dueDayOfMonth) || 5,
        dueMonth: form.frequency === "annual" ? Number(form.dueMonth) : null,
        providerName: form.providerName.trim() || null,
        reminderDaysBefore: Number(form.reminderDaysBefore) || 7,
        note: form.note.trim() || null,
        isActive: form.isActive,
      };

      const promise = editTemplate
        ? updateRecurringTemplateRequest(editTemplate.id, payload)
        : createRecurringTemplateRequest(payload);

      await runMutationReload(toast, {
        promise,
        reload: load,
        onClose: () => {
          setCreateOpen(false);
          setEditTemplate(null);
          setForm(emptyTemplateForm());
        },
        successMessage: editTemplate ? "Plantilla actualizada" : "Plantilla creada",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payRow?.id) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: payRecurringOccurrenceRequest(payRow.id, {
          amount: Number(payForm.amount),
          date: payForm.date,
          note: payForm.note || null,
        }),
        reload: load,
        onClose: () => {
          setPayOpen(false);
          setPayRow(null);
        },
        successMessage: "Pago registrado en finanzas",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetAmount = async (e) => {
    e.preventDefault();
    if (!amountRow?.id) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: updateRecurringOccurrenceRequest(amountRow.id, {
          actualAmount: Number(amountValue),
        }),
        reload: load,
        onClose: () => {
          setAmountOpen(false);
          setAmountRow(null);
        },
        successMessage: "Monto actualizado",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async (row) => {
    await runMutationReload(toast, {
      promise: skipRecurringOccurrenceRequest(row.id, {}),
      reload: load,
      successMessage: "Cuota omitida",
    });
  };

  const handleGenerate = async () => {
    await runMutationReload(toast, {
      promise: generateRecurringOccurrencesRequest(),
      reload: load,
      successMessage: "Cuotas generadas",
    });
  };

  const templateColumns = useMemo(
    () => [
      { id: "name", label: "Nombre" },
      {
        id: "storeName",
        label: "Local",
        render: (row) => row.storeName || "General",
      },
      {
        id: "category",
        label: "Categoría",
        render: (row) => row.categoryLabel || row.category,
      },
      {
        id: "amountType",
        label: "Tipo",
        render: (row) => (
          <Chip
            size="small"
            label={row.amountTypeLabel || row.amountType}
            color={row.amountType === "fixed" ? "default" : "info"}
            variant="outlined"
          />
        ),
      },
      {
        id: "frequency",
        label: "Frecuencia",
        render: (row) => row.frequencyLabel || row.frequency,
      },
      { id: "baseAmount", label: "Monto ref.", render: (row) => money(row.baseAmount) },
      {
        id: "due",
        label: "Vence",
        render: (row) =>
          row.frequency === "annual"
            ? `Día ${row.dueDayOfMonth} · ${MONTHS.find((m) => m.value === row.dueMonth)?.label || row.dueMonth}`
            : `Día ${row.dueDayOfMonth}`,
      },
      {
        id: "isActive",
        label: "Estado",
        render: (row) => (
          <Chip
            size="small"
            color={row.isActive ? "success" : "default"}
            label={row.isActive ? "Activa" : "Inactiva"}
          />
        ),
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <Tooltip title="Editar plantilla">
            <IconButton size="small" onClick={() => openEditTemplate(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const occurrenceColumns = useMemo(
    () => [
      {
        id: "dueDate",
        label: "Vence",
        render: (row) => formatDueDate(row.dueDate),
      },
      { id: "displayName", label: "Concepto" },
      { id: "storeName", label: "Local" },
      {
        id: "displayAmount",
        label: "Monto",
        render: (row) => (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography fontWeight={700}>{money(row.displayAmount)}</Typography>
            {row.amountType === "variable" && (
              <Chip size="small" label="est." variant="outlined" sx={{ height: 20 }} />
            )}
          </Stack>
        ),
      },
      {
        id: "status",
        label: "Estado",
        render: (row) => {
          const cfg = STATUS_CHIP[row.status] || STATUS_CHIP.pending;
          const extra =
            row.isOverdue && row.status === "pending"
              ? " · vencido"
              : row.isDueSoon
                ? " · pronto"
                : "";
          return (
            <Chip
              size="small"
              color={row.isOverdue ? "error" : cfg.color}
              label={`${cfg.label}${extra}`}
            />
          );
        },
      },
      {
        id: "actions",
        label: "",
        render: (row) =>
          row.status === "pending" ? (
            <Stack direction="row" spacing={0.5}>
              {row.amountType === "variable" && (
                <Tooltip title="Ajustar monto (factura)">
                  <IconButton size="small" onClick={() => openSetAmount(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Registrar pago">
                <IconButton size="small" color="primary" onClick={() => openPay(row)}>
                  <PaymentsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Omitir este período">
                <IconButton size="small" color="warning" onClick={() => handleSkip(row)}>
                  <SkipNextIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null,
      },
    ],
    []
  );

  const templateFormFields = (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Local / punto de venta</InputLabel>
        <Select
          label="Local / punto de venta"
          value={form.storeId}
          onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
        >
          <MenuItem value="">General (sin local)</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Nombre"
        size="small"
        required
        fullWidth
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Ej: Arriendo Local Centro"
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Categoría</InputLabel>
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Tipo de monto</InputLabel>
          <Select
            label="Tipo de monto"
            value={form.amountType}
            onChange={(e) => setForm((f) => ({ ...f, amountType: e.target.value }))}
          >
            <MenuItem value="fixed">Fijo (arriendo)</MenuItem>
            <MenuItem value="variable">Variable / estimado (luz, agua)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Frecuencia</InputLabel>
          <Select
            label="Frecuencia"
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
          >
            {FREQUENCIES.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={form.amountType === "fixed" ? "Monto" : "Monto estimado"}
          type="number"
          size="small"
          required
          fullWidth
          inputProps={{ min: 0, step: "0.01" }}
          value={form.baseAmount}
          onChange={(e) => setForm((f) => ({ ...f, baseAmount: e.target.value }))}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Día de vencimiento"
          type="number"
          size="small"
          fullWidth
          inputProps={{ min: 1, max: 31 }}
          value={form.dueDayOfMonth}
          onChange={(e) => setForm((f) => ({ ...f, dueDayOfMonth: e.target.value }))}
        />
        {form.frequency === "annual" && (
          <FormControl fullWidth size="small">
            <InputLabel>Mes (anual)</InputLabel>
            <Select
              label="Mes (anual)"
              value={form.dueMonth}
              onChange={(e) => setForm((f) => ({ ...f, dueMonth: e.target.value }))}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <TextField
          label="Avisar días antes"
          type="number"
          size="small"
          fullWidth
          inputProps={{ min: 0, max: 60 }}
          value={form.reminderDaysBefore}
          onChange={(e) => setForm((f) => ({ ...f, reminderDaysBefore: e.target.value }))}
        />
      </Stack>

      <TextField
        label="Proveedor / beneficiario"
        size="small"
        fullWidth
        value={form.providerName}
        onChange={(e) => setForm((f) => ({ ...f, providerName: e.target.value }))}
        placeholder="Arrendador, CNEL, municipio..."
      />

      <TextField
        label="Nota"
        size="small"
        fullWidth
        multiline
        minRows={2}
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
      />

      {editTemplate && (
        <FormControlLabel
          control={
            <Switch
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          }
          label="Plantilla activa"
        />
      )}
    </Stack>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HomeWorkIcon color="secondary" />
            <Typography variant="h5" fontWeight={800}>
              Gastos recurrentes
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Arriendos por local, servicios, permisos anuales y recordatorios de pago.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleGenerate}
            disabled={loading}
          >
            Generar cuotas
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nueva plantilla
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Carga mensual fija"
            amount={summary.monthlyFixed}
            color="secondary.main"
            subtitle="Arriendos y fijos"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Estimado variable"
            amount={summary.monthlyVariableEstimate}
            color="info.main"
            subtitle="Luz, agua, etc."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Pendiente del mes"
            amount={summary.pendingThisMonth}
            color="warning.main"
            subtitle={monthLabel}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Meta venta diaria"
            amount={summary.dailySalesTarget}
            color="primary.main"
            subtitle={
              summary.isProfitable
                ? "Cubierto con ingresos del mes"
                : `${summary.daysLeftInMonth} días restantes`
            }
          />
        </Grid>
      </Grid>

      {!summary.isProfitable && summary.gapToCover > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Para cubrir gastos fijos estimados ({money(summary.monthlyBurden)}) faltan{" "}
          <strong>{money(summary.gapToCover)}</strong> de ventas este mes. Ingresos actuales:{" "}
          {money(summary.monthIncome)}.
        </Alert>
      )}

      {summary.overdueCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tienes {summary.overdueCount} pago(s) vencido(s). Revisa las cuotas del mes.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 2, pt: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab value="occurrences" label="Cuotas del mes" />
            <Tab value="templates" label="Plantillas" />
          </Tabs>
          {tab === "occurrences" && (
            <TextField
              type="month"
              size="small"
              label="Mes"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: { xs: 1, sm: 0 }, minWidth: 160 }}
            />
          )}
        </Stack>

        <Box sx={{ p: 2 }}>
          {tab === "occurrences" ? (
            <TablePro
              columns={occurrenceColumns}
              rows={occurrences}
              loading={loading}
              emptyMessage="No hay cuotas para este mes. Crea plantillas o pulsa «Generar cuotas»."
            />
          ) : (
            <TablePro
              columns={templateColumns}
              rows={templates}
              loading={loading}
              emptyMessage="Sin plantillas. Agrega arriendo por local, luz, agua o permisos."
            />
          )}
        </Box>
      </Paper>

      <SimpleDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditTemplate(null);
        }}
        title={editTemplate ? "Editar plantilla" : "Nueva plantilla de gasto"}
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSaveTemplate} disabled={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <Box component="form" onSubmit={handleSaveTemplate}>
          {templateFormFields}
        </Box>
      </SimpleDialog>

      <SimpleDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={`Pagar: ${payRow?.displayName || ""}`}
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setPayOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handlePay} disabled={saving}>
              Registrar pago
            </Button>
          </>
        }
      >
        <Stack spacing={2} component="form" onSubmit={handlePay} sx={{ pt: 1 }}>
          <TextField
            label="Monto pagado"
            type="number"
            size="small"
            required
            fullWidth
            value={payForm.amount}
            onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <TextField
            label="Fecha y hora"
            type="datetime-local"
            size="small"
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={payForm.date}
            onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
          />
          <TextField
            label="Nota"
            size="small"
            fullWidth
            value={payForm.note}
            onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
          />
          <Typography variant="caption" color="text.secondary">
            Se creará un gasto en Finanzas vinculado a esta cuota.
          </Typography>
        </Stack>
      </SimpleDialog>

      <SimpleDialog
        open={amountOpen}
        onClose={() => setAmountOpen(false)}
        title="Monto real de la factura"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setAmountOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSetAmount} disabled={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <Stack spacing={2} component="form" onSubmit={handleSetAmount} sx={{ pt: 1 }}>
          <TextField
            label="Monto según factura"
            type="number"
            size="small"
            required
            fullWidth
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary">
            Úsalo para luz, agua u otros gastos variables antes de pagar.
          </Typography>
        </Stack>
      </SimpleDialog>
    </Container>
  );
}
