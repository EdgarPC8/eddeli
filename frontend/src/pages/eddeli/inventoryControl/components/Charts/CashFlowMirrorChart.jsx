import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import { parseISO } from 'date-fns';
import { BarChart } from '@mui/x-charts/BarChart';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import CalendarDayDetailDialog from './CalendarDayDetailDialog';
import { resolvePeriodRangeFromBucket } from './cashFlowLinkUtils';
import {
  getCashFlowMirrorRequest,
  getCalendarDayDetailRequest,
  getCalendarPeriodDetailRequest,
} from '../../../../../api/financeRequest';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const moneyFmtDetail = (v) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const pctFmt = (v) => `${Number(v || 0).toFixed(1)}%`;

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Diaria' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
];

const compactToggleSx = {
  textTransform: 'none',
  px: 0.75,
  py: 0.25,
  fontSize: '0.7rem',
  minWidth: 0,
};

export default function CashFlowMirrorChart({ focus = null, onClearFocus }) {
  const theme = useTheme();
  const [granularity, setGranularity] = useState('day');
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalPeriod, setModalPeriod] = useState(null);

  const activeGranularity = focus?.granularity ?? granularity;

  const cIncome = theme.palette.success.main;
  const cExpense = theme.palette.error.main;

  const chartColors = useMemo(() => {
    const p = theme.palette;
    const s = getChartSeriesColors(theme);
    return {
      orders: s[CHART_SEMANTIC_INDEX.primary],
      orderMoney: s[CHART_SEMANTIC_INDEX.money],
      posSales: theme.palette.info.main,
      collected: s[CHART_SEMANTIC_INDEX.positive],
      incomeTotal: theme.palette.warning.main,
      expense: p.error.main,
    };
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { granularity: activeGranularity };
        if (focus) {
          params.startDate = focus.startDate;
          params.endDate = focus.endDate;
        }
        const { data } = await getCashFlowMirrorRequest(params);
        if (!cancelled) setPayload(data);
      } catch (e) {
        console.error('CashFlowMirrorChart:', e);
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGranularity, focus]);

  const dataset = useMemo(() => {
    const buckets = payload?.buckets ?? [];
    const highlightKey = focus?.highlightKey;
    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      income: b.income,
      expenseMirror: -Math.abs(b.expenseTotal),
      expenseTotal: b.expenseTotal,
      expense: b.expense,
      merma: b.merma,
      netBalance: b.netBalance,
      marginPct: b.marginPct,
      highlighted: highlightKey != null && b.key === highlightKey,
    }));
  }, [payload, focus?.highlightKey]);

  const highlightIndex = useMemo(
    () => dataset.findIndex((row) => row.highlighted),
    [dataset]
  );

  const yMax = useMemo(() => {
    let max = 100;
    for (const row of dataset) {
      max = Math.max(max, row.income, Math.abs(row.expenseMirror));
    }
    return Math.ceil(max * 1.15);
  }, [dataset]);

  const totals = payload?.totals;
  const periodLabel = focus?.periodLabel ?? payload?.periodLabel;

  const handleGranularityChange = (_, v) => {
    if (!v) return;
    onClearFocus?.();
    setGranularity(v);
  };

  const handleBarClick = useCallback(
    async (_event, params) => {
      const idx = params?.dataIndex;
      if (idx == null || idx < 0) return;
      const row = dataset[idx];
      if (!row?.key) return;

      const period = resolvePeriodRangeFromBucket(activeGranularity, row.key);
      if (!period) return;

      setModalPeriod(period);
      setModalDetail(null);
      setModalOpen(true);
      setModalLoading(true);

      try {
        const { data } =
          period.granularity === 'day'
            ? await getCalendarDayDetailRequest(period.startDate)
            : await getCalendarPeriodDetailRequest(period.startDate, period.endDate);
        setModalDetail(data);
      } catch (e) {
        console.error('CashFlowMirrorChart modal:', e);
        setModalDetail({
          orders: [],
          posSales: [],
          incomes: [],
          abonos: [],
          directPayments: [],
          expenses: [],
          totals: {},
        });
      } finally {
        setModalLoading(false);
      }
    },
    [dataset, activeGranularity]
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalDetail(null);
    setModalPeriod(null);
    setModalLoading(false);
  }, []);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={0.75}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 0.75 }}
      >
        <ChartBlockHeader
          title="Flujo de ingresos y gastos"
          subtitle="Ingresos (Income.date) y gastos (Expense.date). Clic en una barra para ver el detalle del período."
          sx={{ mb: 0, flex: 1, minWidth: 0 }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={activeGranularity}
          onChange={handleGranularityChange}
          sx={{ flexShrink: 0 }}
        >
          {GRANULARITY_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={compactToggleSx}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {(periodLabel || totals || focus) && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ mb: 0.75, flexWrap: 'wrap', rowGap: 0.35 }}
        >
          {focus && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Vela: ${focus.candleLabel}`}
              onDelete={onClearFocus}
              deleteIcon={
                <Tooltip title="Quitar enlace con velas">
                  <CloseIcon sx={{ fontSize: 14 }} />
                </Tooltip>
              }
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          {periodLabel && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mr: 0.5 }}>
              {periodLabel}
            </Typography>
          )}
          {totals && (
            <>
              <Chip
                size="small"
                label={`Ing. ${moneyFmt(totals.income)}`}
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(cIncome, 0.2) }}
              />
              <Chip
                size="small"
                label={`Gast. ${moneyFmt(totals.expenseTotal)}`}
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(cExpense, 0.15) }}
              />
              <Chip
                size="small"
                color={totals.netBalance >= 0 ? 'success' : 'error'}
                label={`Bal. ${moneyFmt(totals.netBalance)}`}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${pctFmt(totals.marginPct)}`}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            </>
          )}
        </Stack>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 0.5,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.02),
          minHeight: 160,
        }}
      >
        {loading ? (
          <ChartSkeleton height={160} />
        ) : dataset.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ py: 3, display: 'block', textAlign: 'center' }}>
            Sin movimientos en este período.
          </Typography>
        ) : (
          <BarChart
            dataset={dataset}
            height={200}
            margin={{ left: 44, right: 8, top: 8, bottom: 28 }}
            highlightedItem={
              highlightIndex >= 0
                ? { seriesId: 'income', dataIndex: highlightIndex }
                : null
            }
            onItemClick={handleBarClick}
            sx={{ cursor: 'pointer' }}
            xAxis={[{ scaleType: 'band', dataKey: 'label' }]}
            yAxis={[
              {
                min: -yMax,
                max: yMax,
                valueFormatter: (v) => moneyFmt(v),
              },
            ]}
            series={[
              {
                id: 'income',
                type: 'bar',
                dataKey: 'income',
                label: 'Ingresos',
                color: cIncome,
                valueFormatter: (v, ctx) => {
                  const row = dataset[ctx?.dataIndex ?? 0];
                  if (!row) return moneyFmt(v);
                  return [
                    `Ingresos: ${moneyFmt(row.income)}`,
                    `Gastos: ${moneyFmt(row.expenseTotal)}`,
                    `Balance: ${moneyFmt(row.netBalance)}`,
                    `Margen: ${pctFmt(row.marginPct)}`,
                  ].join(' · ');
                },
              },
              {
                id: 'expense',
                type: 'bar',
                dataKey: 'expenseMirror',
                label: 'Gastos',
                color: cExpense,
                valueFormatter: (v, ctx) => {
                  const row = dataset[ctx?.dataIndex ?? 0];
                  if (!row) return moneyFmt(Math.abs(v));
                  return [
                    `Gastos: ${moneyFmt(row.expense)}`,
                    `Balance: ${moneyFmt(row.netBalance)}`,
                    `Margen: ${pctFmt(row.marginPct)}`,
                  ].join(' · ');
                },
              },
            ]}
            slotProps={{
              legend: { hidden: true },
              tooltip: { trigger: 'axis' },
            }}
            grid={{ horizontal: true }}
          />
        )}
      </Paper>

      <CalendarDayDetailDialog
        open={modalOpen}
        date={modalPeriod?.startDate ? parseISO(modalPeriod.startDate) : null}
        periodLabel={modalPeriod?.label}
        periodGranularity={modalPeriod?.granularity ?? 'day'}
        detail={modalDetail}
        loading={modalLoading}
        onClose={handleCloseModal}
        moneyFmt={moneyFmtDetail}
        colors={chartColors}
      />
    </Box>
  );
}
