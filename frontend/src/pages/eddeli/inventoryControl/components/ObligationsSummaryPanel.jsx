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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import { money } from "../collections/helpers.js";

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

export default function ObligationsSummaryPanel({ obligations }) {
  const summary = obligations?.summary ?? {
    totalReceivable: 0,
    totalPayable: 0,
    openCount: 0,
  };
  const topOpen = Array.isArray(obligations?.topOpen) ? obligations.topOpen : [];

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
        <ChartBlockHeader title="Préstamos y deudas" sx={{ mb: 0, flex: 1, minWidth: 0 }} />
        <Button
          component={RouterLink}
          to="/inventory/prestamos-deudas"
          variant="outlined"
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: "0.95rem !important" }} />}
          sx={{ flexShrink: 0, fontSize: "0.7rem", py: 0.25, px: 0.75 }}
        >
          Ver módulo
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: topOpen.length ? 1.5 : 0 }}>
        <MetricCard
          title="Por cobrar"
          value={money(summary.totalReceivable)}
          subtitle="Prestaste"
          icon={TrendingUpIcon}
          color="info"
        />
        <MetricCard
          title="Por pagar"
          value={money(summary.totalPayable)}
          subtitle="Debes"
          icon={TrendingDownIcon}
          color="secondary"
        />
        <MetricCard
          title="Abiertas"
          value={summary.openCount}
          subtitle="Cuentas activas"
          icon={AccountBalanceWalletIcon}
          color="warning"
        />
      </Stack>

      {topOpen.length > 0 && (
        <>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
            Pendientes principales
          </Typography>
          <Stack spacing={0.75}>
            {topOpen.map((row) => (
              <Stack
                key={row.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ minWidth: 0 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap fontWeight={600}>
                    {row.partyName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {row.concept}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={money(row.remaining)}
                  color={row.direction === "receivable" ? "info" : "secondary"}
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
