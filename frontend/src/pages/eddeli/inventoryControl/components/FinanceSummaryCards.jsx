import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  alpha,
  useTheme,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SavingsIcon from "@mui/icons-material/Savings";
import { money } from "../collections/helpers.js";

function SummaryCard({ title, value, subtitle, icon: Icon, color }) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(main, 0.25),
        background: `linear-gradient(145deg, ${alpha(main, 0.1)} 0%, ${alpha(main, 0.03)} 100%)`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: main, fontSize: { xs: "1.15rem", sm: "1.5rem" }, wordBreak: "break-word" }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
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
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
    </Paper>
  );
}

export default function FinanceSummaryCards({ summary, pendingTotal }) {
  const balance = Number(summary?.balance ?? 0);
  const totalIncome = Number(summary?.totalIncome ?? 0);
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const futureIncome =
    pendingTotal != null
      ? Number(pendingTotal)
      : Number(summary?.futureIncome ?? 0);
  const projectedBalance = Number((balance + futureIncome).toFixed(2));

  const cards = [
    {
      title: "Total dinero",
      value: money(balance),
      subtitle: "Ingresos − gastos registrados",
      icon: AccountBalanceWalletIcon,
      color: "primary",
    },
    {
      title: "Ingresos",
      value: money(totalIncome),
      subtitle: "Todo lo cobrado y registrado",
      icon: TrendingUpIcon,
      color: "success",
    },
    {
      title: "Gastos",
      value: money(totalExpense),
      subtitle: "Egresos registrados",
      icon: TrendingDownIcon,
      color: "error",
    },
    {
      title: "Por cobrar",
      value: money(futureIncome),
      subtitle: "Pendiente en Cobranzas",
      icon: HourglassTopIcon,
      color: "warning",
    },
    {
      title: "Dinero esperado",
      value: money(projectedBalance),
      subtitle: "Balance + por cobrar",
      icon: SavingsIcon,
      color: "info",
    },
  ];

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {cards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
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
            label={`Balance: ${money(balance)}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            +
          </Typography>
          <Chip
            label={`Por cobrar: ${money(futureIncome)}`}
            color="warning"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1, flexShrink: 0 }}>
            =
          </Typography>
          <Chip
            label={`Esperado: ${money(projectedBalance)}`}
            color="info"
            size="small"
            sx={{ fontWeight: 800, maxWidth: "100%" }}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center" }}>
          El dinero esperado suma lo que ya tienes registrado más lo que aún falta cobrar en pedidos
          pendientes (misma lógica que el módulo de Cobranzas).
        </Typography>
      </Paper>
    </Box>
  );
}
