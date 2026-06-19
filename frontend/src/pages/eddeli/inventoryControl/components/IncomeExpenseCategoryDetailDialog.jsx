import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Chip,
  Tabs,
  Tab,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  IconButton,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { money } from "../collections/helpers.js";
import { formatDateTime } from "../../../../helpers/functions.js";

const TABS = { all: 0, income: 1, expense: 2 };

const round2 = (n) => Number(Number(n ?? 0).toFixed(2));

function groupLinesByCategory(lines) {
  const map = new Map();
  for (const row of lines) {
    const cat = row.category || "Sin categoría";
    if (!map.has(cat)) map.set(cat, { category: cat, lines: [], total: 0 });
    const g = map.get(cat);
    g.lines.push(row);
    g.total = round2(g.total + Number(row.amount ?? 0));
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, "es"));
}

function filterGroups(groups, text) {
  const q = text.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((g) => g.category.toLowerCase().includes(q));
}

function CategoryBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color, flexShrink: 0 }}>
          {money(value)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 36, textAlign: "right" }}>
          {pct.toFixed(0)}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 0.35,
          height: 6,
          borderRadius: 1,
          bgcolor: alpha(color, 0.12),
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 1 },
        }}
      />
    </Box>
  );
}

function CategoryAccordion({ group, moneyFmt, color, showProduct }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        mb: 1,
        "&:before": { display: "none" },
        overflow: "hidden",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(color, 0.06) }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", pr: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
            {group.category}
          </Typography>
          <Chip size="small" label={`${group.lines.length} mov.`} variant="outlined" />
          <Chip size="small" label={moneyFmt(group.total)} sx={{ fontWeight: 700, bgcolor: alpha(color, 0.12), color }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0.5 }}>
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Concepto</TableCell>
                {showProduct && <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>Contraparte</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.lines.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.date)}</TableCell>
                  <TableCell>{row.concept || "—"}</TableCell>
                  {showProduct && <TableCell>{row.productName || "—"}</TableCell>}
                  <TableCell>{row.counterpartyName || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color }}>
                    {moneyFmt(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}

function EmptyState({ message }) {
  return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );
}

export default function IncomeExpenseCategoryDetailDialog({ open, onClose, data, loading }) {
  const theme = useTheme();
  const [tab, setTab] = useState(TABS.all);
  const [filter, setFilter] = useState("");

  const incomeColor = theme.palette.success.main;
  const expenseColor = theme.palette.error.main;

  useEffect(() => {
    if (open) {
      setTab(TABS.all);
      setFilter("");
    }
  }, [open]);

  const platforms = data?.platforms ?? [];
  const groups = data?.groups ?? {};
  const meta = data?.meta?.totals ?? {};

  const totalIncome = round2(meta.income ?? platforms.find((p) => p.label === "Ingresos")?.value ?? 0);
  const totalExpense = round2(meta.expense ?? platforms.find((p) => p.label === "Gastos")?.value ?? 0);
  const balance = round2(totalIncome - totalExpense);

  const incomeCats = useMemo(
    () => (groups.Ingresos ?? []).map((r) => ({ label: r.label, value: round2(r.value) })).sort((a, b) => b.value - a.value),
    [groups]
  );
  const expenseCats = useMemo(
    () => (groups.Gastos ?? []).map((r) => ({ label: r.label, value: round2(r.value) })).sort((a, b) => b.value - a.value),
    [groups]
  );

  const incomeGroups = useMemo(() => groupLinesByCategory(data?.incomeLines ?? []), [data?.incomeLines]);
  const expenseGroups = useMemo(() => groupLinesByCategory(data?.expenseLines ?? []), [data?.expenseLines]);

  const filteredIncomeGroups = useMemo(() => filterGroups(incomeGroups, filter), [incomeGroups, filter]);
  const filteredExpenseGroups = useMemo(() => filterGroups(expenseGroups, filter), [expenseGroups, filter]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        Ingresos y gastos por categoría
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Desglose con barras y detalle de cada movimiento por categoría.
        </Typography>
        <IconButton
          aria-label="cerrar"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 320 }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">Cargando categorías…</Typography>
          </Box>
        ) : !data?.platforms ? (
          <EmptyState message="No se pudo cargar el desglose." />
        ) : (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip icon={<TrendingUpIcon />} size="small" label={`Ingresos: ${money(totalIncome)}`} color="success" variant="outlined" />
              <Chip icon={<TrendingDownIcon />} size="small" label={`Gastos: ${money(totalExpense)}`} color="error" variant="outlined" />
              <Chip icon={<AccountBalanceIcon />} size="small" label={`Balance: ${money(balance)}`} color={balance >= 0 ? "primary" : "warning"} />
            </Stack>

            <Tabs
              value={tab}
              onChange={(_, v) => { setTab(v); setFilter(""); }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 40, mb: 2 }}
            >
                <Tab label="Vista general" />
                <Tab label={`Ingresos (${data.incomeLines?.length ?? 0})`} />
                <Tab label={`Gastos (${data.expenseLines?.length ?? 0})`} />
              </Tabs>

            {tab !== TABS.all && (
              <TextField
                fullWidth
                size="small"
                placeholder="Filtrar por categoría…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {tab === TABS.all && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: incomeColor, mb: 1 }}>
                  Ingresos por categoría
                </Typography>
                {incomeCats.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sin datos</Typography>
                ) : (
                  incomeCats.map((r) => (
                    <CategoryBar key={r.label} label={r.label} value={r.value} total={totalIncome} color={incomeColor} />
                  ))
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: expenseColor, mb: 1, mt: 2 }}>
                  Gastos por categoría
                </Typography>
                {expenseCats.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin datos</Typography>
                ) : (
                  expenseCats.map((r) => (
                    <CategoryBar key={r.label} label={r.label} value={r.value} total={totalExpense} color={expenseColor} />
                  ))
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                  Usa las pestañas Ingresos o Gastos para ver el detalle de cada movimiento.
                </Typography>
              </Box>
            )}

            {tab === TABS.income && (
              <>
                {!incomeGroups.length ? (
                  <EmptyState message="No hay ingresos registrados." />
                ) : filteredIncomeGroups.length === 0 ? (
                  <EmptyState message="Ninguna categoría coincide con el filtro." />
                ) : (
                  filteredIncomeGroups.map((g) => (
                    <CategoryAccordion key={g.category} group={g} moneyFmt={money} color={incomeColor} showProduct={false} />
                  ))
                )}
              </>
            )}

            {tab === TABS.expense && (
              <>
                {!expenseGroups.length ? (
                  <EmptyState message="No hay gastos registrados." />
                ) : filteredExpenseGroups.length === 0 ? (
                  <EmptyState message="Ninguna categoría coincide con el filtro." />
                ) : (
                  filteredExpenseGroups.map((g) => (
                    <CategoryAccordion key={g.category} group={g} moneyFmt={money} color={expenseColor} showProduct />
                  ))
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
