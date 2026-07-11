import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { alpha } from "@mui/material/styles";
import { ColorType, createChart, CandlestickSeries } from "lightweight-charts";
import ChartBlockHeader from "../../../../../components/Charts/ChartBlockHeader";
import { ChartSkeleton } from "../../../../../components/ContentSkeleton.jsx";
import { getCashFlowCandlesRequest } from "../../../../../api/financeRequest";

const CANDLE_LIMIT = 25;

const GRANULARITY_OPTIONS = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const compactToggleSx = {
  textTransform: "none",
  px: 0.75,
  py: 0.25,
  fontSize: "0.7rem",
  minWidth: 0,
};

const paperSx = {
  p: { xs: 1, sm: 1.25 },
  borderRadius: 2,
  height: "100%",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  minWidth: 0,
  boxSizing: "border-box",
};

const moneyFmt = (v) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export default function CashFlowCandlestickChart({ onCandleSelect, onDrillReset, selectedKey = null }) {
  const theme = useTheme();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const onSelectRef = useRef(onCandleSelect);
  const onDrillResetRef = useRef(onDrillReset);
  onSelectRef.current = onCandleSelect;
  onDrillResetRef.current = onDrillReset;

  const [granularity, setGranularity] = useState("day");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  const upColor = theme.palette.success.main;
  const downColor = theme.palette.error.main;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCashFlowCandlesRequest({
        granularity,
        limit: CANDLE_LIMIT,
        offset,
      });
      setPayload(data);
    } catch (e) {
      console.error("CashFlowCandlestickChart:", e);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [granularity, offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setOffset(0);
    onDrillResetRef.current?.();
  }, [granularity]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !payload?.candles?.length) return undefined;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme.palette.text.secondary,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: alpha(theme.palette.divider, 0.4) },
        horzLines: { color: alpha(theme.palette.divider, 0.4) },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: granularity === "day",
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: { mode: 1 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const chartData = payload.candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    series.setData(chartData);

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setHoverInfo(null);
        return;
      }
      const bar = param.seriesData.get(series);
      if (!bar) {
        setHoverInfo(null);
        return;
      }
      const meta = payload.candles.find((c) => c.time === param.time);
      setHoverInfo({
        label: meta?.label,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        overdraft: meta?.overdraft,
      });
    });

    const handleClick = (param) => {
      if (!param.time) return;
      const meta = payload.candles.find((c) => c.time === param.time);
      if (meta) onSelectRef.current?.(meta, granularity);
    };
    chart.subscribeClick(handleClick);

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.unsubscribeClick(handleClick);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [payload, granularity, theme, upColor, downColor]);

  const handleGranularity = (_, value) => {
    if (value) setGranularity(value);
  };

  const canGoOlder = payload?.hasMore;
  const canGoNewer = offset > 0;
  const selectedLabel = payload?.candles?.find((c) => c.key === selectedKey)?.label;

  return (
    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={0.75}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 0.75 }}
      >
        <ChartBlockHeader title="Velas japonesas" sx={{ mb: 0, flex: 1, minWidth: 0 }} />
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={granularity}
            onChange={handleGranularity}
            sx={{ "& .MuiToggleButton-root": compactToggleSx }}
          >
            {GRANULARITY_OPTIONS.map((o) => (
              <ToggleButton key={o.value} value={o.value}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Períodos más antiguos">
            <span>
              <IconButton
                size="small"
                disabled={!canGoOlder || loading}
                onClick={() => setOffset((o) => o + CANDLE_LIMIT)}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Períodos más recientes">
            <span>
              <IconButton
                size="small"
                disabled={!canGoNewer || loading}
                onClick={() => setOffset((o) => Math.max(0, o - CANDLE_LIMIT))}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {payload?.currentBalance != null && (
        <Stack direction="row" spacing={1} sx={{ mb: 0.75, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={`Saldo actual: ${moneyFmt(payload.currentBalance)}`}
            color={payload.currentBalance >= 0 ? "success" : "error"}
            variant="outlined"
            sx={{ height: 22, fontSize: "0.7rem" }}
          />
          {hoverInfo && (
            <Chip
              size="small"
              label={`O:${moneyFmt(hoverInfo.open)} H:${moneyFmt(hoverInfo.high)} L:${moneyFmt(hoverInfo.low)} C:${moneyFmt(hoverInfo.close)}`}
              variant="outlined"
              sx={{ height: 22, fontSize: "0.65rem" }}
            />
          )}
          {hoverInfo?.overdraft && (
            <Chip
              size="small"
              icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              label="Saldo negativo en el período"
              color="error"
              sx={{ height: 22, fontSize: "0.65rem" }}
            />
          )}
        </Stack>
      )}

      <Box sx={{ position: "relative", minHeight: 220 }}>
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.92),
              borderRadius: 1,
              px: 1,
            }}
          >
            <ChartSkeleton height={220} />
          </Box>
        )}
        {!loading && !payload?.candles?.length && (
          <Box
            sx={{
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Sin movimientos para mostrar velas
            </Typography>
          </Box>
        )}
        <Box ref={chartContainerRef} sx={{ width: "100%", minHeight: 220, cursor: "pointer" }} />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        Saldo acumulado (ingresos − gastos según Income/Expense). Clic en una vela para desglosar en el gráfico de flujo.
        {selectedLabel && (
          <> Seleccionada: <strong>{selectedLabel}</strong>.</>
        )}
      </Typography>
    </Paper>
  );
}
