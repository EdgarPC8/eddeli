import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  alpha,
  useTheme,
  Divider,
  Alert,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import { money } from "../collections/helpers.js";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        flex: "1 1 0",
        minWidth: 0,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(main, 0.25),
        background: `linear-gradient(145deg, ${alpha(main, 0.1)} 0%, ${alpha(main, 0.03)} 100%)`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: main, lineHeight: 1.2 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(main, 0.15),
            color: main,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

export default function RecurringExpensesSummaryPanel({ recurring }) {
  const summary = recurring?.summary ?? {
    monthlyBurden: 0,
    pendingThisMonth: 0,
    gapToCover: 0,
    dailySalesTarget: 0,
    daysLeftInMonth: 1,
    isProfitable: false,
    overdueCount: 0,
  };
  const upcoming = Array.isArray(recurring?.upcoming) ? recurring.upcoming : [];
  const overdue = Array.isArray(recurring?.overdue) ? recurring.overdue : [];

  const formatDue = (d) => {
    if (!d) return "";
    try {
      return format(typeof d === "string" ? parseISO(d) : new Date(d), "d MMM", { locale: es });
    } catch {
      return "";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={0.75}
        sx={{ mb: 1 }}
      >
        <ChartBlockHeader title="Gastos fijos del local" sx={{ mb: 0, flex: 1, minWidth: 0 }} />
        <Button
          component={RouterLink}
          to="/inventory/gastos-recurrentes"
          variant="outlined"
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: "0.95rem !important" }} />}
          sx={{ flexShrink: 0, fontSize: "0.7rem", py: 0.25, px: 0.75 }}
        >
          Ver módulo
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
        <MetricCard
          title="Carga mensual"
          value={money(summary.monthlyBurden)}
          subtitle="Fijos + estimados"
          icon={HomeWorkIcon}
          color="secondary"
        />
        <MetricCard
          title="Pendiente mes"
          value={money(summary.pendingThisMonth)}
          subtitle="Por pagar"
          icon={EventIcon}
          color="warning"
        />
      </Stack>

      {summary.isProfitable ? (
        <Alert severity="success" sx={{ py: 0.25, mb: upcoming.length || overdue.length ? 1 : 0 }}>
          Ingresos del mes cubren los gastos fijos estimados.
        </Alert>
      ) : summary.gapToCover > 0 ? (
        <Alert severity="info" icon={<TrendingUpIcon fontSize="inherit" />} sx={{ py: 0.25, mb: upcoming.length || overdue.length ? 1 : 0 }}>
          Faltan {money(summary.gapToCover)} para cubrir fijos. Meta diaria:{" "}
          <strong>{money(summary.dailySalesTarget)}</strong> ({summary.daysLeftInMonth} días restantes).
        </Alert>
      ) : null}

      {overdue.length > 0 && (
        <>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="error.main" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
            Vencidos
          </Typography>
          <Stack spacing={0.75} sx={{ mb: 1 }}>
            {overdue.slice(0, 3).map((row) => (
              <Stack
                key={row.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap fontWeight={600}>
                    {row.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {row.storeName} · venció {formatDue(row.dueDate)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
                  label={money(row.displayAmount)}
                  color="error"
                  variant="outlined"
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Stack>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
            Próximos pagos
          </Typography>
          <Stack spacing={0.75}>
            {upcoming.slice(0, 4).map((row) => (
              <Stack
                key={row.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap fontWeight={600}>
                    {row.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {row.storeName} · {formatDue(row.dueDate)}
                    {row.amountType === "variable" ? " · est." : ""}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={money(row.displayAmount)}
                  color={row.isDueSoon ? "warning" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
