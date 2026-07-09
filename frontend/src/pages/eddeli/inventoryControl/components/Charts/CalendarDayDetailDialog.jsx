import { useMemo, useState, useEffect } from 'react';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  alpha,
  useTheme,
  Tabs,
  Tab,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentsIcon from '@mui/icons-material/Payments';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

const TABS = {
  orders: 'orders',
  posSales: 'pos',
  collections: 'collections',
  expenses: 'expenses',
};

function groupOrdersByCustomer(orders = []) {
  const map = new Map();
  for (const o of orders) {
    const key = o.customer || 'Sin cliente';
    if (!map.has(key)) {
      map.set(key, { customer: key, orders: [], total: 0, orderCount: 0 });
    }
    const g = map.get(key);
    g.orders.push(o);
    g.total = Number((g.total + o.total).toFixed(2));
    g.orderCount += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.customer.localeCompare(b.customer, 'es'));
}

function groupCollectionsByCustomer(abonos = [], directPayments = []) {
  const map = new Map();

  const ensure = (customer) => {
    const key = customer || 'Sin cliente';
    if (!map.has(key)) {
      map.set(key, {
        customer: key,
        abonos: [],
        directPayments: [],
        total: 0,
        movementCount: 0,
      });
    }
    return map.get(key);
  };

  for (const p of abonos) {
    const g = ensure(p.customer);
    g.abonos.push(p);
    g.total = Number((g.total + p.amount).toFixed(2));
    g.movementCount += 1;
  }

  for (const p of directPayments) {
    const g = ensure(p.customer);
    g.directPayments.push(p);
    g.total = Number((g.total + p.subtotal).toFixed(2));
    g.movementCount += 1;
  }

  return [...map.values()].sort((a, b) => b.total - a.total || a.customer.localeCompare(b.customer, 'es'));
}

function filterByText(list, text, fields) {
  const q = text.trim().toLowerCase();
  if (!q) return list;
  return list.filter((row) =>
    fields.some((f) => String(f(row) ?? '').toLowerCase().includes(q))
  );
}

function ItemsTable({ items, moneyFmt }) {
  if (!items?.length) return null;
  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Cant.</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Precio</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Subtotal</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Entregado</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Pagado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell>{it.qty}</TableCell>
              <TableCell>{moneyFmt(it.price)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{moneyFmt(it.subtotal)}</TableCell>
              <TableCell>{it.deliveredAt ? 'Sí' : '—'}</TableCell>
              <TableCell>{it.paidAt ? 'Sí' : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ClientOrdersAccordion({ group, moneyFmt, color }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        mb: 1,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(color, 0.06) }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ width: '100%', pr: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
            {group.customer}
          </Typography>
          <Chip size="small" label={`${group.orderCount} pedido(s)`} variant="outlined" />
          <Chip size="small" label={moneyFmt(group.total)} sx={{ fontWeight: 700, bgcolor: alpha(color, 0.12), color }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1 }}>
        {group.orders.map((o) => (
          <Box key={o.id} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Pedido #{o.id}
            </Typography>
            <ItemsTable items={o.items} moneyFmt={moneyFmt} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right' }}>
              Subtotal pedido: {moneyFmt(o.total)}
            </Typography>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

function ClientCollectionsAccordion({ group, moneyFmt, color }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        mb: 1,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(color, 0.06) }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ width: '100%', pr: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
            {group.customer}
          </Typography>
          <Chip size="small" label={`${group.movementCount} mov.`} variant="outlined" />
          <Chip size="small" label={moneyFmt(group.total)} sx={{ fontWeight: 700, bgcolor: alpha(color, 0.12), color }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0.5 }}>
        {group.abonos.length > 0 && (
          <Box sx={{ mb: group.directPayments.length ? 2 : 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              Abonos (Cobranzas)
            </Typography>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Grupo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Monto</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Método</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nota</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.abonos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.group}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{moneyFmt(p.amount)}</TableCell>
                      <TableCell>{p.method || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>{p.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        {group.directPayments.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              Pagos directos en ítems
            </Typography>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cant.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Precio</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.directPayments.map((p) => (
                    <TableRow key={`${p.orderId}-${p.itemId}`}>
                      <TableCell>#{p.orderId}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                      <TableCell>{moneyFmt(p.price)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{moneyFmt(p.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function ClientPosSalesAccordion({ group, moneyFmt, color }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        mb: 1,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(color, 0.06) }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ width: '100%', pr: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
            {group.customer}
          </Typography>
          <Chip size="small" label={`${group.orderCount} venta(s)`} variant="outlined" />
          <Chip size="small" label={moneyFmt(group.total)} sx={{ fontWeight: 700, bgcolor: alpha(color, 0.12), color }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1 }}>
        {group.orders.map((o) => (
          <Box key={o.id} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Venta #{o.id}
              </Typography>
              {o.isCredit && (
                <Chip size="small" color="warning" label="Crédito" variant="outlined" />
              )}
              <Chip size="small" label={o.paymentMethod || 'efectivo'} variant="outlined" />
            </Stack>
            <ItemsTable items={o.items} moneyFmt={moneyFmt} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right' }}>
              Total: {moneyFmt(o.total)}
            </Typography>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

function EmptyTab({ message }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

export default function CalendarDayDetailDialog({
  open,
  date,
  detail,
  loading = false,
  onClose,
  moneyFmt,
  colors,
  viewMode = 'all',
  periodGranularity = 'day',
  periodLabel = null,
}) {
  const theme = useTheme();
  const isIncomeView = viewMode === 'income';
  const [tab, setTab] = useState(TABS.orders);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) {
      setTab(isIncomeView ? TABS.posSales : TABS.orders);
      setFilter('');
    }
  }, [open, date, isIncomeView]);

  const dayIncomeTotal = useMemo(() => {
    if (!detail?.totals) return 0;
    return Number(
      (Number(detail.totals.posIncomeAmount ?? 0) + Number(detail.totals.collectedAmount ?? 0)).toFixed(2)
    );
  }, [detail]);

  const cajaIncomes = useMemo(() => {
    if (!detail?.incomes) return [];
    return detail.incomes.filter((i) => i.source === 'caja');
  }, [detail]);

  const cobroIncomes = useMemo(() => {
    if (!detail?.incomes) return [];
    return detail.incomes.filter((i) => i.source !== 'caja');
  }, [detail]);

  const groupedOrders = useMemo(
    () => (detail ? groupOrdersByCustomer(detail.orders) : []),
    [detail]
  );

  const groupedPosSales = useMemo(
    () => (detail ? groupOrdersByCustomer(detail.posSales) : []),
    [detail]
  );

  const usesIncomeRows = Array.isArray(detail?.incomes);

  const filteredIncomes = useMemo(() => {
    if (!detail) return [];
    if (usesIncomeRows) {
      const base = isIncomeView && tab === TABS.posSales
        ? cajaIncomes
        : isIncomeView && tab === TABS.collections
          ? cobroIncomes
          : detail.incomes;
      return filterByText(base, filter, [
        (i) => i.concept,
        (i) => i.category,
        (i) => i.counterparty,
        (i) => i.source,
      ]);
    }
    return filterByText(
      groupCollectionsByCustomer(detail.abonos, detail.directPayments),
      filter,
      [(g) => g.customer],
    );
  }, [detail, filter, usesIncomeRows, isIncomeView, tab, cajaIncomes, cobroIncomes]);

  const filteredOrders = useMemo(
    () => filterByText(groupedOrders, filter, [(g) => g.customer]),
    [groupedOrders, filter]
  );

  const filteredPosSales = useMemo(
    () => filterByText(groupedPosSales, filter, [(g) => g.customer]),
    [groupedPosSales, filter]
  );

  const filteredExpenses = useMemo(() => {
    if (!detail) return [];
    return filterByText(detail.expenses ?? [], filter, [
      (e) => e.concept,
      (e) => e.category,
      (e) => e.productName,
    ]);
  }, [detail, filter]);

  const dailyRows = useMemo(() => {
    if (!detail?.dailyBreakdown || periodGranularity !== 'week') return [];
    return Object.entries(detail.dailyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({
        key,
        label: format(parseISO(key), 'EEE d MMM', { locale: es }),
        ...m,
        incomeTotal: Number(
          (Number(m.posIncomeAmount ?? 0) + Number(m.collectedAmount ?? 0)).toFixed(2)
        ),
      }));
  }, [detail, periodGranularity]);

  const weeklyRows = useMemo(() => {
    if (!detail?.dailyBreakdown || periodGranularity !== 'month') return [];
    const weekMap = new Map();
    for (const [dayKey, m] of Object.entries(detail.dailyBreakdown)) {
      const d = parseISO(dayKey);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const wk = format(ws, 'yyyy-MM-dd');
      if (!weekMap.has(wk)) {
        weekMap.set(wk, {
          key: wk,
          label: `Sem. ${format(ws, 'd MMM', { locale: es })} – ${format(endOfWeek(ws, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`,
          ordersAmount: 0,
          posSalesAmount: 0,
          posIncomeAmount: 0,
          collectedAmount: 0,
          expensesAmount: 0,
        });
      }
      const row = weekMap.get(wk);
      row.ordersAmount = Number((row.ordersAmount + Number(m.ordersAmount ?? 0)).toFixed(2));
      row.posSalesAmount = Number((row.posSalesAmount + Number(m.posSalesAmount ?? 0)).toFixed(2));
      row.posIncomeAmount = Number((row.posIncomeAmount + Number(m.posIncomeAmount ?? 0)).toFixed(2));
      row.collectedAmount = Number((row.collectedAmount + Number(m.collectedAmount ?? 0)).toFixed(2));
      row.expensesAmount = Number((row.expensesAmount + Number(m.expensesAmount ?? 0)).toFixed(2));
    }
    return [...weekMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [detail, periodGranularity]);

  if (!date && !periodLabel) return null;

  const titleByGranularity = {
    day: 'Detalle del día',
    week: 'Detalle de la semana',
    month: 'Detalle del mes',
  };
  const titleDate = periodLabel
    || (date ? format(date, "EEEE d 'de' MMMM yyyy", { locale: es }) : '');
  const loadingMessage =
    periodGranularity === 'day'
      ? 'Cargando movimientos del día…'
      : periodGranularity === 'week'
        ? 'Cargando movimientos de la semana…'
        : 'Cargando movimientos del mes…';

  const filterPlaceholder =
    tab === TABS.expenses
      ? 'Buscar concepto, categoría o producto…'
      : tab === TABS.posSales
        ? 'Filtrar ventas de caja por cliente…'
        : 'Filtrar por cliente…';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        {titleByGranularity[periodGranularity] ?? titleByGranularity.day}
        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize', mt: 0.25 }}>
          {titleDate}
        </Typography>
        <IconButton
          aria-label="cerrar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5, minHeight: 280 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              {loadingMessage}
            </Typography>
          </Box>
        ) : !detail ? (
          <EmptyTab message="No se pudo cargar el detalle." />
        ) : (
          <>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {!isIncomeView && (
            <Chip
              icon={<ShoppingCartIcon />}
              label={`Pedidos: ${moneyFmt(detail.totals?.ordersAmount ?? 0)}`}
              size="small"
              sx={{ bgcolor: alpha(colors.orderMoney, 0.15), color: colors.orderMoney, fontWeight: 700 }}
            />
          )}
          {!isIncomeView && (
            <Chip
              icon={<PointOfSaleIcon />}
              label={`Caja operativa (fecha pedido): ${moneyFmt(detail.totals?.posSalesAmount ?? 0)}`}
              size="small"
              sx={{ bgcolor: alpha(colors.posSales, 0.15), color: colors.posSales, fontWeight: 700 }}
            />
          )}
          <Chip
            icon={<PointOfSaleIcon />}
            label={`Caja (entrada $): ${moneyFmt(detail.totals?.posIncomeAmount ?? 0)}`}
            size="small"
            sx={{ bgcolor: alpha(colors.posSales, 0.15), color: colors.posSales, fontWeight: 700 }}
          />
          <Chip
            icon={<PaymentsIcon />}
            label={`Cobros pedidos: ${moneyFmt(detail.totals?.collectedAmount ?? 0)}`}
            size="small"
            sx={{ bgcolor: alpha(colors.collected, 0.15), color: colors.collected, fontWeight: 700 }}
          />
          {isIncomeView && (
            <Chip
              icon={<PaymentsIcon />}
              label={`Total ingresos: ${moneyFmt(dayIncomeTotal)}`}
              size="small"
              sx={{ bgcolor: alpha(colors.incomeTotal ?? colors.collected, 0.15), color: colors.incomeTotal ?? colors.collected, fontWeight: 700 }}
            />
          )}
          {!isIncomeView && (
            <Chip
              icon={<MoneyOffIcon />}
              label={`Gastos: ${moneyFmt(detail.totals?.expensesAmount ?? 0)}`}
              size="small"
              sx={{ bgcolor: alpha(colors.expense, 0.15), color: colors.expense, fontWeight: 700 }}
            />
          )}
        </Stack>

        {weeklyRows.length > 0 && (
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Semana</TableCell>
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Pedidos</TableCell>}
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Caja op.</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Caja ($)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Cobros</TableCell>
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Gastos</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {weeklyRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.label}</TableCell>
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.ordersAmount)}</TableCell>}
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.posSalesAmount)}</TableCell>}
                    <TableCell align="right">{moneyFmt(row.posIncomeAmount ?? 0)}</TableCell>
                    <TableCell align="right">{moneyFmt(row.collectedAmount)}</TableCell>
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.expensesAmount)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {dailyRows.length > 0 && (
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Día</TableCell>
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Pedidos</TableCell>}
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Caja op.</TableCell>}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Caja ($)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Cobros</TableCell>
                  {!isIncomeView && <TableCell align="right" sx={{ fontWeight: 700 }}>Gastos</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.label}</TableCell>
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.ordersAmount)}</TableCell>}
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.posSalesAmount)}</TableCell>}
                    <TableCell align="right">{moneyFmt(row.posIncomeAmount ?? 0)}</TableCell>
                    <TableCell align="right">{moneyFmt(row.collectedAmount)}</TableCell>
                    {!isIncomeView && <TableCell align="right">{moneyFmt(row.expensesAmount)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setFilter('');
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {!isIncomeView && (
            <Tab
              value={TABS.orders}
              icon={<ShoppingCartIcon fontSize="small" />}
              iconPosition="start"
              label={`Pedidos (${detail.orders?.length ?? 0})`}
            />
          )}
          <Tab
            value={TABS.posSales}
            icon={<PointOfSaleIcon fontSize="small" />}
            iconPosition="start"
            label={
              isIncomeView && usesIncomeRows
                ? `Caja (${cajaIncomes.length})`
                : `Caja (${detail.posSales?.length ?? 0})`
            }
          />
          <Tab
            value={TABS.collections}
            icon={<PaymentsIcon fontSize="small" />}
            iconPosition="start"
            label={
              isIncomeView && usesIncomeRows
                ? `Cobros (${cobroIncomes.length})`
                : `Ingresos (${usesIncomeRows ? (detail.incomes?.length ?? 0) : (detail.abonos?.length ?? 0) + (detail.directPayments?.length ?? 0)})`
            }
          />
          {!isIncomeView && (
            <Tab
              value={TABS.expenses}
              icon={<MoneyOffIcon fontSize="small" />}
              iconPosition="start"
              label={`Gastos (${detail.expenses?.length ?? 0})`}
            />
          )}
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={filterPlaceholder}
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

        {tab === TABS.orders && (
          <>
            {!detail.orders?.length ? (
              <EmptyTab message="No hay pedidos registrados en esta fecha." />
            ) : filteredOrders.length === 0 ? (
              <EmptyTab message="Ningún cliente coincide con el filtro." />
            ) : (
              filteredOrders.map((g) => (
                <ClientOrdersAccordion
                  key={g.customer}
                  group={g}
                  moneyFmt={moneyFmt}
                  color={colors.orderMoney}
                />
              ))
            )}
          </>
        )}

        {tab === TABS.posSales && (
          <>
            {isIncomeView && usesIncomeRows ? (
              !cajaIncomes.length ? (
                <EmptyTab message="No hay ingresos de caja en esta fecha." />
              ) : filteredIncomes.length === 0 ? (
                <EmptyTab message="Ningún ingreso de caja coincide con el filtro." />
              ) : (
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Concepto</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Contraparte</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Fecha entrada</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredIncomes.map((inc) => (
                        <TableRow key={inc.id} hover>
                          <TableCell>{inc.concept || '—'}</TableCell>
                          <TableCell>{inc.category || '—'}</TableCell>
                          <TableCell>{inc.counterparty || '—'}</TableCell>
                          <TableCell>{inc.date || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: colors.posSales }}>
                            {moneyFmt(inc.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            ) : !detail.posSales?.length ? (
              <EmptyTab message="No hay ventas de caja en esta fecha." />
            ) : filteredPosSales.length === 0 ? (
              <EmptyTab message="Ningún cliente coincide con el filtro." />
            ) : (
              filteredPosSales.map((g) => (
                <ClientPosSalesAccordion
                  key={g.customer}
                  group={g}
                  moneyFmt={moneyFmt}
                  color={colors.posSales}
                />
              ))
            )}
          </>
        )}

        {tab === TABS.collections && (
          <>
            {usesIncomeRows ? (
              (isIncomeView ? !cobroIncomes.length : !detail.incomes.length) ? (
                <EmptyTab message={isIncomeView ? 'No hay cobros de pedidos en esta fecha.' : 'No hay ingresos en esta fecha.'} />
              ) : filteredIncomes.length === 0 ? (
                <EmptyTab message="Ningún ingreso coincide con el filtro." />
              ) : (
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Concepto</TableCell>
                        {!isIncomeView && <TableCell sx={{ fontWeight: 700 }}>Origen</TableCell>}
                        <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Contraparte</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Fecha entrada</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredIncomes.map((inc) => (
                        <TableRow key={inc.id} hover>
                          <TableCell>{inc.concept || '—'}</TableCell>
                          {!isIncomeView && (
                            <TableCell>{inc.source === 'caja' ? 'Caja' : 'Cobro'}</TableCell>
                          )}
                          <TableCell>{inc.category || '—'}</TableCell>
                          <TableCell>{inc.counterparty || '—'}</TableCell>
                          <TableCell>{inc.date || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: colors.collected }}>
                            {moneyFmt(inc.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            ) : !detail.abonos?.length && !detail.directPayments?.length ? (
              <EmptyTab message="No hay ingresos en esta fecha." />
            ) : filteredIncomes.length === 0 ? (
              <EmptyTab message="Ningún cliente coincide con el filtro." />
            ) : (
              filteredIncomes.map((g) => (
                <ClientCollectionsAccordion
                  key={g.customer}
                  group={g}
                  moneyFmt={moneyFmt}
                  color={colors.collected}
                />
              ))
            )}
          </>
        )}

        {tab === TABS.expenses && (
          <>
            {!detail.expenses?.length ? (
              <EmptyTab message="No hay gastos en esta fecha." />
            ) : filteredExpenses.length === 0 ? (
              <EmptyTab message="Ningún gasto coincide con el filtro." />
            ) : (
              <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Concepto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Monto
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExpenses.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{e.concept || '—'}</TableCell>
                        <TableCell>{e.category || '—'}</TableCell>
                        <TableCell>{e.productName || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: colors.expense }}>
                          {moneyFmt(e.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontWeight: 800 }}>
                        Total filtrado
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: colors.expense }}>
                        {moneyFmt(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
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
