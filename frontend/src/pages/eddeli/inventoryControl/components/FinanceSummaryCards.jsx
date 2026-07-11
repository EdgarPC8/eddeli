import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Skeleton,
  alpha,
  useTheme,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SavingsIcon from "@mui/icons-material/Savings";
import HandshakeIcon from "@mui/icons-material/Handshake";
import CreditCardOffIcon from "@mui/icons-material/CreditCardOff";
import PercentIcon from "@mui/icons-material/Percent";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BalanceIcon from "@mui/icons-material/Balance";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import { money } from "../collections/helpers.js";
import AnimatedNumber from "../../../../components/AnimatedNumber.jsx";

const ROTATE_MS = 3000;
const CARD_MIN_HEIGHT = 132;

const fmtMoney = (n) => money(n);
const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  footer,
  fixedHeight,
  numericValue,
  format = fmtMoney,
  animate = true,
  resetKey,
}) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;
  const showAnimated =
    animate && numericValue != null && Number.isFinite(Number(numericValue));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: "100%",
        minHeight: fixedHeight ? CARD_MIN_HEIGHT : undefined,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(main, 0.25),
        background: `linear-gradient(145deg, ${alpha(main, 0.1)} 0%, ${alpha(main, 0.03)} 100%)`,
        boxSizing: "border-box",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              minHeight: 20,
              lineHeight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mt: 0.5,
              color: main,
              fontSize: { xs: "1.15rem", sm: "1.5rem" },
              wordBreak: "break-word",
              minHeight: { xs: 28, sm: 36 },
              lineHeight: 1.2,
            }}
          >
            {showAnimated ? (
              <AnimatedNumber
                value={Number(numericValue)}
                format={format}
                resetKey={resetKey}
              />
            ) : (
              value
            )}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              mt: 0.5,
              minHeight: 32,
              lineHeight: 1.25,
              overflow: "hidden",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {subtitle || "\u00A0"}
          </Typography>
          {footer}
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(main, 0.15),
            color: main,
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
    </Paper>
  );
}

function SummaryCardsSkeleton() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(5, minmax(0, 1fr))",
        },
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{
            p: 2,
            minHeight: CARD_MIN_HEIGHT,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Skeleton width="55%" height={18} />
              <Skeleton width="70%" height={36} sx={{ mt: 0.5 }} />
              <Skeleton width="90%" height={14} sx={{ mt: 1 }} />
            </Box>
            <Skeleton variant="rounded" width={40} height={40} />
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}

function RotatingMetricCard({ slides }) {
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  // Count-up solo en la primera aparición tras cargar; al rotar ya no.
  const [countUpEnabled, setCountUpEnabled] = useState(true);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const id = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setCountUpEnabled(false);
        setSlide((i) => (i + 1) % slides.length);
        setVisible(true);
      }, 180);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slides.length, paused]);

  const current = slides[slide] || slides[0];
  if (!current) return null;

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ height: "100%", minHeight: CARD_MIN_HEIGHT }}
    >
      <Box
        sx={{
          height: "100%",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      >
        <SummaryCard
          {...current}
          fixedHeight
          animate={countUpEnabled}
          footer={
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, minHeight: 6 }}>
              {slides.map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === slide ? 14 : 6,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: i === slide ? "text.primary" : "action.disabled",
                    opacity: i === slide ? 0.7 : 0.35,
                    transition: "width 0.2s ease",
                  }}
                />
              ))}
            </Stack>
          }
        />
      </Box>
    </Box>
  );
}

export default function FinanceSummaryCards({
  summary,
  pendingTotal,
  obligationsSummary,
  loading = false,
}) {
  const balance = Number(summary?.balance ?? 0);
  const totalIncome = Number(summary?.totalIncome ?? 0);
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const collectionsPending =
    pendingTotal != null
      ? Number(pendingTotal)
      : Number(summary?.futureIncome ?? 0);
  const loansReceivable = Number(obligationsSummary?.totalReceivable ?? 0);
  const debtsPayable = Number(obligationsSummary?.totalPayable ?? 0);
  const totalReceivable = Number((collectionsPending + loansReceivable).toFixed(2));
  const projectedBalance = Number((balance + totalReceivable - debtsPayable).toFixed(2));

  const monthLabel = summary?.monthLabel || "Mes actual";
  const monthMarginPct = Number(summary?.monthMarginPct ?? 0);
  const vsRecordPct = Number(summary?.vsRecordPct ?? 0);
  const bestMonthLabel = summary?.bestMonthLabel || null;
  const bestMonthBalance = Number(summary?.bestMonthBalance ?? 0);
  const isRecordMonth = Boolean(summary?.isRecordMonth);
  const monthMarginWithPendingPct = Number(summary?.monthMarginWithPendingPct ?? 0);
  const monthBalanceWithPending = Number(summary?.monthBalanceWithPending ?? 0);
  const pending = collectionsPending;

  const vsRecordWithPendingPct =
    bestMonthBalance > 0
      ? Number(((monthBalanceWithPending / bestMonthBalance) * 100).toFixed(1))
      : bestMonthBalance === 0 && monthBalanceWithPending === 0
        ? 100
        : 0;

  const receivableBase = collectionsPending + loansReceivable;
  const debtVsReceivablePct =
    receivableBase > 0
      ? Number(((debtsPayable / receivableBase) * 100).toFixed(1))
      : debtsPayable > 0
        ? null
        : 0;

  const marginSlides = useMemo(
    () => [
      {
        title: "Margen mensual",
        numericValue: monthMarginPct,
        format: fmtPct,
        value: fmtPct(monthMarginPct),
        subtitle: `Ganancia % · ${monthLabel}`,
        icon: PercentIcon,
        color: monthMarginPct >= 0 ? "success" : "error",
      },
      {
        title: "Vs mes récord",
        numericValue:
          bestMonthBalance > 0 || isRecordMonth ? vsRecordPct : null,
        format: fmtPct,
        value:
          bestMonthBalance > 0 || isRecordMonth ? fmtPct(vsRecordPct) : "—",
        subtitle: isRecordMonth
          ? `Eres el récord · ${monthLabel}`
          : bestMonthLabel
            ? `Del mejor mes · ${bestMonthLabel} (${money(bestMonthBalance)})`
            : "Sin historial de ganancias",
        icon: EmojiEventsIcon,
        color: vsRecordPct >= 100 ? "success" : vsRecordPct >= 70 ? "warning" : "error",
      },
    ],
    [
      monthMarginPct,
      monthLabel,
      vsRecordPct,
      bestMonthLabel,
      bestMonthBalance,
      isRecordMonth,
    ],
  );

  const pendingSlides = useMemo(
    () => [
      {
        title: "Con por cobrar",
        numericValue: monthMarginWithPendingPct,
        format: fmtPct,
        value: fmtPct(monthMarginWithPendingPct),
        subtitle: `Caja + pedidos · ${money(pending)} · ${monthLabel}`,
        icon: RequestQuoteIcon,
        color: monthMarginWithPendingPct >= 0 ? "success" : "error",
      },
      {
        title: "Vs récord (c/ cobros)",
        numericValue:
          bestMonthBalance > 0 || monthBalanceWithPending !== 0
            ? vsRecordWithPendingPct
            : null,
        format: fmtPct,
        value:
          bestMonthBalance > 0 || monthBalanceWithPending !== 0
            ? fmtPct(vsRecordWithPendingPct)
            : "—",
        subtitle: bestMonthLabel
          ? `Vs ${bestMonthLabel} (${money(bestMonthBalance)}) · +${money(pending)} pend.`
          : `Incluye ${money(pending)} por cobrar`,
        icon: EmojiEventsIcon,
        color:
          vsRecordWithPendingPct >= 100
            ? "success"
            : vsRecordWithPendingPct >= 70
              ? "warning"
              : "error",
      },
    ],
    [
      monthMarginWithPendingPct,
      pending,
      monthLabel,
      bestMonthBalance,
      bestMonthLabel,
      monthBalanceWithPending,
      vsRecordWithPendingPct,
    ],
  );

  const cards = [
    {
      title: "Total dinero",
      numericValue: balance,
      format: fmtMoney,
      value: money(balance),
      subtitle: "Ingresos − gastos registrados",
      icon: AccountBalanceWalletIcon,
      color: "primary",
    },
    {
      title: "Ingresos",
      numericValue: totalIncome,
      format: fmtMoney,
      value: money(totalIncome),
      subtitle: "Suma histórica en tabla Income",
      icon: TrendingUpIcon,
      color: "success",
    },
    {
      title: "Gastos",
      numericValue: totalExpense,
      format: fmtMoney,
      value: money(totalExpense),
      subtitle: "Suma histórica en tabla Expense",
      icon: TrendingDownIcon,
      color: "error",
    },
    { type: "rotatingMargin" },
    { type: "rotatingPending" },
    {
      title: "Por cobrar (pedidos)",
      numericValue: collectionsPending,
      format: fmtMoney,
      value: money(collectionsPending),
      subtitle: "Pendiente en Cobranzas",
      icon: HourglassTopIcon,
      color: "warning",
    },
    {
      title: "Préstamos por cobrar",
      numericValue: loansReceivable,
      format: fmtMoney,
      value: money(loansReceivable),
      subtitle: "Módulo préstamos y deudas",
      icon: HandshakeIcon,
      color: "info",
    },
    {
      title: "Deudas por pagar",
      numericValue: debtsPayable,
      format: fmtMoney,
      value: money(debtsPayable),
      subtitle: "Obligaciones abiertas",
      icon: CreditCardOffIcon,
      color: "secondary",
    },
    {
      title: "Deudas vs por cobrar",
      numericValue: debtVsReceivablePct,
      format: fmtPct,
      value:
        debtVsReceivablePct == null ? "∞" : fmtPct(debtVsReceivablePct),
      subtitle:
        debtVsReceivablePct == null
          ? "Hay deudas y nada por cobrar"
          : debtVsReceivablePct > 100
            ? "Debes más de lo que te deben"
            : `Deudas ÷ (pedidos + préstamos) · base ${money(receivableBase)}`,
      icon: BalanceIcon,
      color:
        debtVsReceivablePct == null || debtVsReceivablePct > 100
          ? "error"
          : debtVsReceivablePct >= 70
            ? "warning"
            : "success",
    },
    {
      title: "Dinero esperado",
      numericValue: projectedBalance,
      format: fmtMoney,
      value: money(projectedBalance),
      subtitle: "Balance + por cobrar − deudas",
      icon: SavingsIcon,
      color: "info",
    },
  ];

  if (loading) {
    return (
      <Box sx={{ width: "100%", minWidth: 0 }}>
        <SummaryCardsSkeleton />
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ mt: 2, borderRadius: 2 }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
          alignItems: "stretch",
          "& > *": { minHeight: CARD_MIN_HEIGHT },
        }}
      >
        {cards.map((card, idx) => {
          if (card.type === "rotatingMargin") {
            return <RotatingMetricCard key="rotating-margin" slides={marginSlides} />;
          }
          if (card.type === "rotatingPending") {
            return <RotatingMetricCard key="rotating-pending" slides={pendingSlides} />;
          }
          return <SummaryCard key={card.title || idx} {...card} fixedHeight />;
        })}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ width: "100%" }}
        >
          <Chip
            label={
              <>
                Balance:{" "}
                <AnimatedNumber value={balance} format={fmtMoney} />
              </>
            }
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            +
          </Typography>
          <Chip
            label={
              <>
                Por cobrar pedidos:{" "}
                <AnimatedNumber value={collectionsPending} format={fmtMoney} />
              </>
            }
            color="warning"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            +
          </Typography>
          <Chip
            label={
              <>
                Préstamos:{" "}
                <AnimatedNumber value={loansReceivable} format={fmtMoney} />
              </>
            }
            color="info"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            −
          </Typography>
          <Chip
            label={
              <>
                Deudas:{" "}
                <AnimatedNumber value={debtsPayable} format={fmtMoney} />
              </>
            }
            color="secondary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            =
          </Typography>
          <Chip
            label={
              <>
                Esperado:{" "}
                <AnimatedNumber value={projectedBalance} format={fmtMoney} />
              </>
            }
            color="info"
            size="small"
            sx={{ fontWeight: 800, maxWidth: "100%" }}
          />
        </Stack>
      </Paper>
    </Box>
  );
}
