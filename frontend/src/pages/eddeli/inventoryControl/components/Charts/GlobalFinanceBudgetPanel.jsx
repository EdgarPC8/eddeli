import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Paper,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import ChartBlockHeader from "../../../../../components/Charts/ChartBlockHeader";
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from "../../../../../theme/chartPalette";
import { money, todayISO, toNum } from "../../collections/helpers.js";
import {
  buildGlobalPeriodFinance,
  getPeriodBounds,
  expenseBudgetRowKey,
  isFinanceRowIncluded,
} from "../../collections/summaryBuilders.js";

const moneyChart = (v) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Number(v || 0)
  );

/**
 * Vista global (todos los clientes): ventas por producto vs gastos en un periodo,
 * con casillas para armar un “presupuesto” como en Cobranzas.
 */
export default function GlobalFinanceBudgetPanel({ orders = [], expenses = [] }) {
  const theme = useTheme();
  const [periodMode, setPeriodMode] = useState("week");
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [salesBudgetInclude, setSalesBudgetInclude] = useState({});
  const [expenseBudgetInclude, setExpenseBudgetInclude] = useState({});

  const period = useMemo(
    () => getPeriodBounds(periodMode, customStart, customEnd),
    [periodMode, customStart, customEnd]
  );

  const periodFinance = useMemo(
    () =>
      buildGlobalPeriodFinance({
        orders,
        allExpenses: expenses,
        periodStart: period.start,
        periodEnd: period.end,
      }),
    [orders, expenses, period.start, period.end]
  );

  useEffect(() => {
    setSalesBudgetInclude({});
    setExpenseBudgetInclude({});
  }, [period.start, period.end]);

  const budgetMetrics = useMemo(() => {
    let salesBudget = 0;
    for (const r of periodFinance.salesRows) {
      if (isFinanceRowIncluded(salesBudgetInclude, r.product)) {
        salesBudget = Number((salesBudget + r.total).toFixed(2));
      }
    }
    let expensesBudget = 0;
    periodFinance.expensesInPeriod.forEach((e, i) => {
      const k = expenseBudgetRowKey(e, i);
      if (isFinanceRowIncluded(expenseBudgetInclude, k)) {
        expensesBudget = Number((expensesBudget + toNum(e.amount)).toFixed(2));
      }
    });
    const profitBudget = Number((salesBudget - expensesBudget).toFixed(2));
    return { salesBudget, expensesBudget, profitBudget };
  }, [periodFinance, salesBudgetInclude, expenseBudgetInclude]);

  const seriesColors = getChartSeriesColors(theme);
  const cSales = seriesColors[CHART_SEMANTIC_INDEX.primary];
  const cExp = theme.palette.error.main;
  const cProfit =
    budgetMetrics.profitBudget >= 0
      ? seriesColors[CHART_SEMANTIC_INDEX.positive]
      : theme.palette.error.main;

  const summaryDataset = useMemo(
    () => [
      { label: "Ventas (presup.)", value: budgetMetrics.salesBudget },
      { label: "Gastos (presup.)", value: budgetMetrics.expensesBudget },
      { label: "Utilidad (presup.)", value: budgetMetrics.profitBudget },
    ],
    [budgetMetrics]
  );

  const productBarDataset = useMemo(() => {
    const rows = periodFinance.salesRows
      .filter((r) => isFinanceRowIncluded(salesBudgetInclude, r.product))
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map((r) => ({
        label: r.product.length > 26 ? `${r.product.slice(0, 24)}…` : r.product,
        value: r.total,
      }));
    return rows;
  }, [periodFinance.salesRows, salesBudgetInclude]);

  const p = theme.palette;
  const chipText = (hex) => p.getContrastText(hex);

  return (
    <Box>
      <ChartBlockHeader
        title="Ventas globales vs gastos (presupuesto)"
        subtitle="Todos los pedidos y gastos del negocio en el periodo. Marca qué productos y qué gastos entran en la suma del presupuesto; los gráficos usan esos totales."
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" sx={{ mt: 1, mb: 1 }}>
        <TextField
          select
          size="small"
          label="Periodo"
          value={periodMode}
          onChange={(e) => setPeriodMode(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="day">Hoy</MenuItem>
          <MenuItem value="week">Esta semana</MenuItem>
          <MenuItem value="custom">Personalizado</MenuItem>
        </TextField>
        {periodMode === "custom" && (
          <>
            <TextField
              size="small"
              type="date"
              label="Desde"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="Hasta"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </>
        )}
      </Stack>

      <Alert severity="info" sx={{ py: 0.5, mb: 1.5 }}>
        {period.label} — Las ventas suman líneas de pedidos en el rango (cantidad cobrable × precio). Los gastos
        vienen del módulo Finanzas.
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Chip
          label={`Ventas (presup.): ${money(budgetMetrics.salesBudget)}`}
          sx={{ bgcolor: alpha(cSales, 0.85), color: chipText(cSales) }}
        />
        <Chip
          label={`Gastos (presup.): ${money(budgetMetrics.expensesBudget)}`}
          variant="outlined"
          color="error"
        />
        <Chip
          label={`Utilidad presup.: ${money(budgetMetrics.profitBudget)}`}
          color={budgetMetrics.profitBudget >= 0 ? "success" : "error"}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Referencia periodo (todo incluido): ventas {money(periodFinance.salesTotal)} · gastos{" "}
        {money(periodFinance.expensesTotal)} · utilidad bruta {money(periodFinance.profitEstimate)}
      </Typography>

      <GridChartsRow
        summaryDataset={summaryDataset}
        productBarDataset={productBarDataset}
        moneyChart={moneyChart}
        theme={theme}
        cSales={cSales}
        chartColors={[cSales, cExp, cProfit]}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Ventas por producto (global)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Incluye en <b>Ventas (presup.)</b> solo lo que quieras comparar con gastos.
      </Typography>
      {periodFinance.salesRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin ventas en el periodo.
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap">
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const m = {};
                for (const r of periodFinance.salesRows) m[r.product] = true;
                setSalesBudgetInclude(m);
              }}
            >
              Incluir todos (ventas)
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const m = {};
                for (const r of periodFinance.salesRows) m[r.product] = false;
                setSalesBudgetInclude(m);
              }}
            >
              Excluir todos (ventas)
            </Button>
          </Stack>
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 320 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" align="center">
                    Incl.
                  </TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Cant.</TableCell>
                  <TableCell align="right">Total venta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodFinance.salesRows.map((r) => (
                  <TableRow key={r.product}>
                    <TableCell padding="checkbox" align="center">
                      <Checkbox
                        size="small"
                        checked={isFinanceRowIncluded(salesBudgetInclude, r.product)}
                        onChange={() => {
                          const cur = isFinanceRowIncluded(salesBudgetInclude, r.product);
                          setSalesBudgetInclude((prev) => ({ ...prev, [r.product]: !cur }));
                        }}
                        inputProps={{ "aria-label": `Incluir ${r.product} en presupuesto` }}
                      />
                    </TableCell>
                    <TableCell>{r.product}</TableCell>
                    <TableCell align="right">{r.qty}</TableCell>
                    <TableCell align="right">{money(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
        Gastos registrados (global)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Excluye del presupuesto gastos que no correspondan a la operación del periodo.
      </Typography>
      {periodFinance.expensesInPeriod.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin gastos en el periodo.
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap">
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const m = {};
                periodFinance.expensesInPeriod.forEach((e, i) => {
                  m[expenseBudgetRowKey(e, i)] = true;
                });
                setExpenseBudgetInclude(m);
              }}
            >
              Incluir todos (gastos)
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const m = {};
                periodFinance.expensesInPeriod.forEach((e, i) => {
                  m[expenseBudgetRowKey(e, i)] = false;
                });
                setExpenseBudgetInclude(m);
              }}
            >
              Excluir todos (gastos)
            </Button>
          </Stack>
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 360 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" align="center">
                    Incl.
                  </TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodFinance.expensesInPeriod.map((e, i) => {
                  const ek = expenseBudgetRowKey(e, i);
                  return (
                    <TableRow key={ek}>
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          size="small"
                          checked={isFinanceRowIncluded(expenseBudgetInclude, ek)}
                          onChange={() => {
                            const cur = isFinanceRowIncluded(expenseBudgetInclude, ek);
                            setExpenseBudgetInclude((prev) => ({ ...prev, [ek]: !cur }));
                          }}
                          inputProps={{ "aria-label": `Incluir gasto ${e.concept || ek}` }}
                        />
                      </TableCell>
                      <TableCell>{typeof e.date === "string" ? e.date.slice(0, 10) : "—"}</TableCell>
                      <TableCell>{e.concept || "—"}</TableCell>
                      <TableCell>{e.category || "—"}</TableCell>
                      <TableCell align="right">{money(e.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  );
}

function GridChartsRow({ summaryDataset, productBarDataset, moneyChart, theme, cSales, chartColors }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.1fr)" },
        gap: 2,
        alignItems: "stretch",
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, px: 0.5 }}>
          Resumen presupuesto
        </Typography>
        <BarChart
          dataset={summaryDataset}
          height={260}
          colors={chartColors}
          xAxis={[{ scaleType: "band", dataKey: "label" }]}
          yAxis={[{ width: 44, valueFormatter: (v) => moneyChart(v) }]}
          series={[
            {
              type: "bar",
              dataKey: "value",
              label: "Monto",
              valueFormatter: (v) => moneyChart(v),
            },
          ]}
          margin={{ left: 4, right: 8, top: 16, bottom: 28 }}
          slotProps={{
            legend: { hidden: true },
          }}
        />
      </Paper>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, px: 0.5 }}>
          Top productos incluidos en presupuesto (hasta 12)
        </Typography>
        {productBarDataset.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Marca productos en la tabla o ajusta el periodo.
            </Typography>
          </Box>
        ) : (
          <BarChart
            layout="horizontal"
            dataset={productBarDataset}
            height={Math.max(220, 36 * productBarDataset.length)}
            yAxis={[{ scaleType: "band", dataKey: "label", width: 120 }]}
            xAxis={[{ valueFormatter: (v) => moneyChart(v) }]}
            series={[
              {
                type: "bar",
                dataKey: "value",
                label: "Venta",
                valueFormatter: (v) => moneyChart(v),
                color: cSales,
              },
            ]}
            margin={{ left: 4, right: 12, top: 8, bottom: 24 }}
            slotProps={{ legend: { hidden: true } }}
          />
        )}
      </Paper>
    </Box>
  );
}
