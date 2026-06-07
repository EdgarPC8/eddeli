import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Divider,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { money, moneyUnitPrice, todayISO, toNum } from "./helpers.js";
import {
  buildPendingByProduct,
  buildPendingByDate,
  buildPeriodFinance,
  getPeriodBounds,
  expenseBudgetRowKey,
  isFinanceRowIncluded,
} from "./summaryBuilders.js";

const SUB_VIEWS = [
  { id: "product", label: "Por producto" },
  { id: "date", label: "Por fecha" },
  { id: "finance", label: "Ventas y gastos" },
];

export default function PendingSummaryPanel({
  customerId,
  customerItems,
  customerPayments,
  allExpenses,
  displayPending,
}) {
  const [subView, setSubView] = useState(0);
  const [periodMode, setPeriodMode] = useState("week");
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());

  /** producto -> incluir en suma de ventas del presupuesto (true por defecto si falta clave) */
  const [salesBudgetInclude, setSalesBudgetInclude] = useState({});
  /** clave de gasto -> incluir en suma de gastos del presupuesto */
  const [expenseBudgetInclude, setExpenseBudgetInclude] = useState({});

  const byProduct = useMemo(
    () => buildPendingByProduct(customerItems),
    [customerItems]
  );
  const byDate = useMemo(() => buildPendingByDate(customerItems), [customerItems]);

  const period = useMemo(
    () => getPeriodBounds(periodMode, customStart, customEnd),
    [periodMode, customStart, customEnd]
  );

  const periodFinance = useMemo(
    () =>
      buildPeriodFinance({
        customerItems,
        customerPayments,
        allExpenses,
        periodStart: period.start,
        periodEnd: period.end,
      }),
    [customerItems, customerPayments, allExpenses, period.start, period.end]
  );

  useEffect(() => {
    setSalesBudgetInclude({});
    setExpenseBudgetInclude({});
  }, [period.start, period.end, customerId]);

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

  const currentView = SUB_VIEWS[subView]?.id || "product";

  return (
    <Card variant="outlined" sx={{ mb: 2, width: "100%", boxSizing: "border-box" }}>
      <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Resumen pendiente (cobrable)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pendiente real: <b>{money(displayPending)}</b>
              {currentView === "product" && (
                <>
                  {" "}
                  · Cantidad pendiente: <b>{byProduct.grandQty}</b>
                </>
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Vistas: ${SUB_VIEWS.length}`} variant="outlined" />
            <Chip
              size="small"
              label={`Pendiente: ${money(displayPending)}`}
              color="warning"
              variant="outlined"
            />
          </Stack>
        </Stack>

        <Tabs
          value={subView}
          onChange={(_, v) => setSubView(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {SUB_VIEWS.map((v) => (
            <Tab key={v.id} label={v.label} />
          ))}
        </Tabs>

        <Divider sx={{ my: 1.5 }} />

        {currentView === "product" && (
          <>
            {byProduct.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin deuda pendiente por producto.
              </Typography>
            ) : (
              <SummaryTable
                head={["Producto", "Cant. cobrable", "P/U", "Total"]}
                rows={byProduct.rows.map((r) => [
                  r.product,
                  r.qty,
                  moneyUnitPrice(r.unitPrice),
                  money(r.total),
                ])}
              />
            )}
          </>
        )}

        {currentView === "date" && (
          <>
            {byDate.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin ítems pendientes por fecha.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {byDate.rows.map((day) => (
                  <Accordion key={day.date} variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%", pr: 1 }}
                        flexWrap="wrap"
                      >
                        <Typography sx={{ fontWeight: 800 }}>{day.date}</Typography>
                        <Chip size="small" label={`Cant. ${day.qty}`} variant="outlined" />
                        <Chip size="small" label={money(day.total)} color="warning" variant="outlined" />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <SummaryTable
                        head={["Producto", "Cant.", "P/U", "Total"]}
                        rows={day.products.map((p) => [
                          p.product,
                          p.qty,
                          moneyUnitPrice(p.unitPrice),
                          money(p.total),
                        ])}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Total pendiente por fechas: {money(byDate.grandTotal)}
                </Typography>
              </Stack>
            )}
          </>
        )}

        {currentView === "finance" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
              <TextField
                select
                size="small"
                label="Periodo"
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value)}
                sx={{ minWidth: 140 }}
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

            <Alert severity="info" sx={{ py: 0.5 }}>
              {period.label} — Ventas del cliente en el rango. Los gastos son globales (Finanzas). Usa las
              casillas <b>Incl. presup.</b> para armar una suma de ventas y de gastos que refleje solo lo que
              quieres considerar en tu presupuesto (el resto sigue listado pero no entra en los totales
              inferiores).
            </Alert>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Ventas (presup.): ${money(budgetMetrics.salesBudget)}`}
                color="primary"
                variant="outlined"
              />
              <Chip label={`Abonos cobrados: ${money(periodFinance.collectedTotal)}`} />
              <Chip
                label={`Gastos (presup.): ${money(budgetMetrics.expensesBudget)}`}
                color="error"
                variant="outlined"
              />
              <Chip
                label={`Utilidad presup.: ${money(budgetMetrics.profitBudget)}`}
                color={budgetMetrics.profitBudget >= 0 ? "success" : "error"}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              Referencia periodo (todo incluido): ventas {money(periodFinance.salesTotal)} · gastos{" "}
              {money(periodFinance.expensesTotal)} · utilidad bruta {money(periodFinance.profitEstimate)}
            </Typography>

            <Typography variant="subtitle2">Ventas por producto (cliente)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Marca qué productos suman en <b>Ventas (presup.)</b>.
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
                                setSalesBudgetInclude((prev) => ({
                                  ...prev,
                                  [r.product]: !cur,
                                }));
                              }}
                              inputProps={{ "aria-label": `Incluir ${r.product} en presupuesto de ventas` }}
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

            <Typography variant="subtitle2">Abonos del cliente en el periodo</Typography>
            {periodFinance.paymentsInPeriod.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin abonos en el periodo.
              </Typography>
            ) : (
              <SummaryTable
                head={["Fecha", "Nota", "Método", "Monto"]}
                rows={periodFinance.paymentsInPeriod.map((p) => [
                  p.date,
                  p.note || "—",
                  p.method || "—",
                  money(p.amount),
                ])}
              />
            )}

            <Typography variant="subtitle2">Gastos registrados (global)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Marca qué gastos suman en <b>Gastos (presup.)</b> (por ejemplo, excluir gastos no ligados a
              producción).
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
                                  setExpenseBudgetInclude((prev) => ({
                                    ...prev,
                                    [ek]: !cur,
                                  }));
                                }}
                                inputProps={{ "aria-label": `Incluir gasto ${e.concept || ek} en presupuesto` }}
                              />
                            </TableCell>
                            <TableCell>
                              {typeof e.date === "string" ? e.date.slice(0, 10) : "—"}
                            </TableCell>
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
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryTable({ head, rows }) {
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 280 }}>
        <TableHead>
          <TableRow>
            {head.map((h) => (
              <TableCell key={h} align={h === head[0] ? "left" : "right"}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i}>
              {cells.map((cell, j) => (
                <TableCell key={j} align={j === 0 ? "left" : "right"}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
