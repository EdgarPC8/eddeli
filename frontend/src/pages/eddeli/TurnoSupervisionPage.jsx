import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { addWeeks, format, parseISO, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { getDailyShiftReport, getWeeklyShiftReport } from "../../api/shiftRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDateTime } from "../../helpers/functions.js";
import { formatMoney } from "../../utils/turnoCashUtils.js";
import {
  documentTypeLabel,
  paymentMethodLabel,
} from "../../utils/saleReceiptUtils.js";

const MOVEMENT_CATEGORY_LABELS = {
  gasto_operativo: "Gasto operativo",
  compra_mercancia: "Compra mercancía",
  retiro: "Retiro / depósito",
  entrada: "Entrada de efectivo",
  otro: "Otro",
};

/** Colores fijos: inicial azul, ventas verde, gastos rojo, cierre amarillo. */
const CAJA_COLORS = {
  inicial: "#1565c0",
  ventas: "#2e7d32",
  gastos: "#d32f2f",
  cierre: "#f9a825",
};

const moneySx = (key, bold = true) => ({
  color: CAJA_COLORS[key],
  fontWeight: bold ? 700 : 600,
});

const headerSx = (key) => ({
  color: CAJA_COLORS[key],
  fontWeight: 800,
});

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSelectedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "EEEE d 'de' MMMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

function formatWeekRange(weekStart, weekEnd) {
  try {
    const start = format(parseISO(weekStart), "d MMM", { locale: es });
    const end = format(parseISO(weekEnd), "d MMM yyyy", { locale: es });
    return `${start} – ${end}`;
  } catch {
    return `${weekStart} – ${weekEnd}`;
  }
}

function SummaryChip({ label, value, color }) {
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1, minWidth: 110, flex: "1 1 120px" }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={800} color={color || "text.primary"}>
        {value}
      </Typography>
    </Paper>
  );
}

function DayDetailPanel({ report, loading, tab, onTabChange }) {
  const summary = report?.summary;
  const outflows = Array.isArray(report?.outflows) ? report.outflows : [];
  const sales = Array.isArray(report?.sales) ? report.sales : [];
  const shifts = Array.isArray(report?.shifts) ? report.shifts : [];

  if (loading && !report) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(255,255,255,0.6)",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <SummaryChip label="Inicial" value={formatMoney(summary?.openingCashTotal)} color={CAJA_COLORS.inicial} />
        <SummaryChip label="Ventas tienda" value={formatMoney(summary?.salesTotal)} color={CAJA_COLORS.ventas} />
        <SummaryChip label="Gastos" value={formatMoney(summary?.cashOutTotal)} color={CAJA_COLORS.gastos} />
        <SummaryChip label="Cierre" value={formatMoney(summary?.closingCashTotal)} color={CAJA_COLORS.cierre} />
        <SummaryChip label="Tickets" value={String(summary?.ordersCount ?? 0)} />
      </Stack>

      <Paper variant="panel" sx={{ borderRadius: 1.5, mb: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          variant="fullWidth"
          sx={{ minHeight: 40, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<TrendingDownIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Gastos (${outflows.length})`}
            sx={{ minHeight: 40, fontSize: "0.8rem", color: CAJA_COLORS.gastos }}
          />
          <Tab
            icon={<PointOfSaleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Ventas (${sales.length})`}
            sx={{ minHeight: 40, fontSize: "0.8rem", color: CAJA_COLORS.ventas }}
          />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 1 }}>
            {outflows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                Sin salidas de efectivo este día.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.5, px: 1, fontSize: "0.78rem" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Hora</TableCell>
                      <TableCell>Operador</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Concepto</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Turno</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outflows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>{row.operatorName || "—"}</TableCell>
                        <TableCell>
                          {MOVEMENT_CATEGORY_LABELS[row.category] || row.category}
                        </TableCell>
                        <TableCell>{row.concept}</TableCell>
                        <TableCell align="right" sx={moneySx("gastos")}>
                          −{formatMoney(row.amount)}
                        </TableCell>
                        <TableCell>#{row.shiftId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 1 }}>
            {sales.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                Sin ventas de caja este día.
              </Typography>
            ) : (
              sales.map((sale) => (
                <Accordion
                  key={sale.id}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "8px !important",
                    mb: 0.75,
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ sm: "center" }}
                      sx={{ width: "100%", pr: 1 }}
                    >
                      <Typography variant="body2" fontWeight={700} sx={{ minWidth: 48 }}>
                        #{sale.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                        {formatDateTime(sale.paidAt)}
                      </Typography>
                      <Chip
                        size="small"
                        label={documentTypeLabel(sale.documentType)}
                        sx={{ height: 22, fontSize: "0.68rem" }}
                      />
                      <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap>
                        {sale.customerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {paymentMethodLabel(sale.paymentMethod)}
                      </Typography>
                      <Typography variant="body2" fontWeight={800} sx={moneySx("ventas")}>
                        {formatMoney(sale.total)}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                    <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.35, fontSize: "0.75rem" } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Cant.</TableCell>
                          <TableCell align="right">P. unit.</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(sale.items || []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatMoney(item.price)}</TableCell>
                            <TableCell align="right" sx={moneySx("ventas")}>
                              {formatMoney(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        )}
      </Paper>

      {shifts.length > 0 && (
        <Paper variant="panel" sx={{ p: 1, borderRadius: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
            Turnos del día
          </Typography>
          <TableContainer>
            <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.4, px: 1, fontSize: "0.75rem" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Operador</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right" sx={headerSx("inicial")}>
                    Inicial
                  </TableCell>
                  <TableCell align="right" sx={headerSx("ventas")}>
                    Ventas
                  </TableCell>
                  <TableCell align="right" sx={headerSx("gastos")}>
                    Gastos
                  </TableCell>
                  <TableCell align="right" sx={headerSx("cierre")}>
                    Cierre
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shifts.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.operatorName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status === "open" ? "Abierto" : "Cerrado"}
                        color={row.status === "open" ? "success" : "default"}
                        sx={{ height: 20, fontSize: "0.65rem" }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={moneySx("inicial", false)}>
                      {row.openingCashOnDay != null ? formatMoney(row.openingCashOnDay) : "—"}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("ventas")}>
                      {formatMoney(row.salesTotalDay)}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("gastos")}>
                      {formatMoney(row.cashOutDay)}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("cierre")}>
                      {formatMoney(row.closingCashOnDay)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

export default function TurnoSupervisionPage() {
  const { toast } = useAuth();
  const [weekAnchor, setWeekAnchor] = useState(todayInputValue);
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [tab, setTab] = useState(0);
  const [weekLoading, setWeekLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [weekReport, setWeekReport] = useState(null);
  const [dayReport, setDayReport] = useState(null);

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    try {
      const { data } = await getWeeklyShiftReport({ date: weekAnchor });
      setWeekReport(data || null);

      const dayKeys = (data?.days || []).map((d) => d.date);
      setSelectedDate((prev) => {
        if (prev && dayKeys.includes(prev)) return prev;
        if (dayKeys.includes(todayInputValue())) return todayInputValue();
        return dayKeys[0] || null;
      });
    } catch (e) {
      setWeekReport(null);
      void toast?.({
        message: e?.response?.data?.message || "No se pudo cargar la semana.",
        variant: "error",
      });
    } finally {
      setWeekLoading(false);
    }
  }, [weekAnchor, toast]);

  const loadDay = useCallback(async () => {
    if (!selectedDate) {
      setDayReport(null);
      return;
    }
    setDetailLoading(true);
    try {
      const { data } = await getDailyShiftReport({ date: selectedDate });
      setDayReport(data || null);
    } catch (e) {
      setDayReport(null);
      void toast?.({
        message: e?.response?.data?.message || "No se pudo cargar el detalle del día.",
        variant: "error",
      });
    } finally {
      setDetailLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  const weekDays = useMemo(
    () => (Array.isArray(weekReport?.days) ? weekReport.days : []),
    [weekReport],
  );
  const weekSummary = weekReport?.summary;

  const goPrevWeek = () => {
    setWeekAnchor(format(subWeeks(parseISO(weekAnchor), 1), "yyyy-MM-dd"));
  };

  const goNextWeek = () => {
    setWeekAnchor(format(addWeeks(parseISO(weekAnchor), 1), "yyyy-MM-dd"));
  };

  const handleSelectDay = (dateKey) => {
    setSelectedDate(dateKey);
    setTab(0);
  };

  if (weekLoading && !weekReport) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, pt: 0, pb: 2, maxWidth: 1280, mx: "auto" }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 0.25 }}>
        Supervisión de caja
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Revisa la semana en la tabla y haz clic en un día para ver salidas, ventas y turnos.
      </Typography>

      <Paper variant="panel" sx={{ p: 1, borderRadius: 1.5, mb: 1.5, position: "relative" }}>
        {weekLoading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(255,255,255,0.55)",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={22} />
          </Box>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <IconButton size="small" onClick={goPrevWeek} aria-label="Semana anterior">
            <ChevronLeftIcon />
          </IconButton>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Ganancias semanales
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatWeekRange(weekReport?.weekStart, weekReport?.weekEnd)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Cierre = inicial + ventas tienda ·{" "}
              <Box component="span" sx={{ color: CAJA_COLORS.inicial, fontWeight: 700 }}>Inicial</Box>
              {" · "}
              <Box component="span" sx={{ color: CAJA_COLORS.ventas, fontWeight: 700 }}>Ventas</Box>
              {" · "}
              <Box component="span" sx={{ color: CAJA_COLORS.gastos, fontWeight: 700 }}>Gastos</Box>
              {" · "}
              <Box component="span" sx={{ color: CAJA_COLORS.cierre, fontWeight: 700 }}>Cierre</Box>
            </Typography>
          </Box>
          <IconButton size="small" onClick={goNextWeek} aria-label="Semana siguiente">
            <ChevronRightIcon />
          </IconButton>
        </Stack>

        <TableContainer>
          <Table
            size="small"
            sx={{
              "& .MuiTableCell-root": { py: 0.65, px: 1, fontSize: "0.8rem" },
              "& .MuiTableRow-root.day-row": { cursor: "pointer" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Día</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right" sx={headerSx("inicial")}>
                  Inicial
                </TableCell>
                <TableCell align="right" sx={headerSx("ventas")}>
                  Ventas tienda
                </TableCell>
                <TableCell align="right" sx={headerSx("gastos")}>
                  Gastos
                </TableCell>
                <TableCell align="right" sx={headerSx("cierre")}>
                  Cierre
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weekDays.map((row) => {
                const isSelected = row.date === selectedDate;
                const isToday = row.date === todayInputValue();
                return (
                  <TableRow
                    key={row.date}
                    hover
                    className="day-row"
                    selected={isSelected}
                    onClick={() => handleSelectDay(row.date)}
                    sx={{
                      bgcolor: isSelected ? "action.selected" : undefined,
                      "& td": { fontWeight: isSelected ? 700 : 400 },
                    }}
                  >
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {row.weekdayShort}
                      {isToday && (
                        <Chip label="Hoy" size="small" color="primary" sx={{ ml: 0.75, height: 18, fontSize: "0.62rem" }} />
                      )}
                    </TableCell>
                    <TableCell>{row.dateLabel}</TableCell>
                    <TableCell align="right" sx={moneySx("inicial", isSelected)}>
                      {formatMoney(row.openingCashTotal)}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("ventas", isSelected)}>
                      {formatMoney(row.salesTotal)}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("gastos", isSelected)}>
                      {formatMoney(row.cashOutTotal)}
                    </TableCell>
                    <TableCell align="right" sx={moneySx("cierre", isSelected)}>
                      {formatMoney(row.closingCashTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                  Total semana
                </TableCell>
                <TableCell align="right" sx={moneySx("inicial")}>
                  {formatMoney(weekSummary?.openingCashTotal)}
                </TableCell>
                <TableCell align="right" sx={moneySx("ventas")}>
                  {formatMoney(weekSummary?.salesTotal)}
                </TableCell>
                <TableCell align="right" sx={moneySx("gastos")}>
                  {formatMoney(weekSummary?.cashOutTotal)}
                </TableCell>
                <TableCell align="right" sx={moneySx("cierre")}>
                  {formatMoney(weekSummary?.closingCashTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selectedDate && (
        <Paper variant="panel" sx={{ p: 1.25, borderRadius: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.25, textTransform: "capitalize" }}>
            Detalle — {formatSelectedDate(selectedDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Salidas, ventas y turnos solo de este día. Cierre = inicial + ventas tienda.
          </Typography>
          <DayDetailPanel
            report={dayReport}
            loading={detailLoading}
            tab={tab}
            onTabChange={setTab}
          />
        </Paper>
      )}
    </Box>
  );
}
