import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import ComputerIcon from "@mui/icons-material/Computer";
import { fetchAppTimeStatus } from "../api/appSettingsRequest.js";
import { formatAppDateTime, getAppTimezone } from "../utils/appDateTime.js";

function ClockRow({ icon: Icon, label, value, sub }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Icon fontSize="small" color="action" sx={{ mt: 0.35 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
          {value || "—"}
        </Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

export default function AppTimeClockPanel({ timezone }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [browserTick, setBrowserTick] = useState(0);

  const tz = timezone || getAppTimezone();

  const load = useCallback(async () => {
    try {
      const data = await fetchAppTimeStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = window.setInterval(load, 30000);
    return () => window.clearInterval(poll);
  }, [load, tz]);

  useEffect(() => {
    const tick = window.setInterval(() => setBrowserTick((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const browserNow = formatAppDateTime(new Date(), { timeZone: tz, showSeconds: true });

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <AccessTimeIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={700}>
          Reloj del sistema
        </Typography>
        <Chip size="small" label={tz} variant="outlined" />
      </Stack>

      {loading && !status ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {status?.driftWarning ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              El servidor y la hora de internet difieren en {Math.abs(status.driftSeconds)} s.
              Revisa la sincronización NTP del equipo donde corre el backend.
            </Alert>
          ) : null}

          <ClockRow
            icon={ComputerIcon}
            label="Servidor (Node)"
            value={status?.server?.formatted}
            sub={status?.server?.iso}
          />
          <ClockRow
            icon={StorageIcon}
            label="Base de datos (NOW)"
            value={status?.database?.formatted}
            sub={status?.database?.iso}
          />
          <ClockRow
            icon={CloudIcon}
            label={`Internet (${status?.network?.source || "sin conexión"})`}
            value={status?.network?.formatted}
            sub={
              status?.network
                ? `Desfase vs servidor: ${status.driftSeconds ?? 0} s`
                : "No se pudo consultar hora externa"
            }
          />
          <ClockRow
            icon={AccessTimeIcon}
            label="Tu navegador (zona de la app)"
            value={browserNow}
            sub="Se actualiza cada segundo"
          />
        </Stack>
      )}
    </Box>
  );
}
