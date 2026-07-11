/**
 * Administración de dispositivos TV/APK (registro, aprobación y campaña asignada).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { APP_BASE_PATH } from "../../../config/deployEnv.js";
import {
  deletePublicidadDevice,
  getCampaigns,
  getPublicidadDevices,
  updatePublicidadDevice,
} from "../../../api/publicidadRequest.js";
import {
  CAMPAIGN_STATUS_LABELS,
  DEVICE_STATUS,
  DEVICE_STATUS_LABELS,
} from "./constants.js";
import { formatDateTime } from "../../../helpers/functions.js";

const statusColor = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  disabled: "default",
};

export default function PublicidadDevicesPage() {
  const navigate = useNavigate();
  const { toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [devRes, campRes] = await Promise.all([getPublicidadDevices(), getCampaigns()]);
      setRows(Array.isArray(devRes.data) ? devRes.data : []);
      setCampaigns(Array.isArray(campRes.data) ? campRes.data : []);
    } catch {
      toast?.({ message: "No se pudieron cargar los dispositivos", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patchDevice = async (deviceId, payload, successMessage) => {
    try {
      await toast({
        promise: updatePublicidadDevice(deviceId, payload),
        successMessage: successMessage || "Dispositivo actualizado",
        errorMessage: "No se pudo actualizar",
      });
      load();
    } catch {
      /* toast */
    }
  };

  const setStatus = (deviceId, status) =>
    patchDevice(deviceId, { status }, `Dispositivo ${DEVICE_STATUS_LABELS[status] || status}`);

  const setCampaign = (deviceId, campaignId) =>
    patchDevice(
      deviceId,
      { campaignId: campaignId || null },
      campaignId ? "Campaña asignada al dispositivo" : "Campaña desasignada",
    );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toast({
        promise: deletePublicidadDevice(deleteTarget.deviceId),
        successMessage: "Dispositivo eliminado",
        errorMessage: "Error al eliminar",
      });
      setDeleteTarget(null);
      load();
    } catch {
      /* toast */
    }
  };

  const columns = [
    {
      id: "deviceId",
      label: "ID dispositivo",
      render: (row) => (
        <Box>
          <Typography fontWeight={700} fontFamily="monospace">
            {row.deviceId}
          </Typography>
          {row.label ? (
            <Typography variant="caption" color="text.secondary">
              {row.label}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      id: "status",
      label: "Estado",
      width: 120,
      render: (row) => (
        <Chip
          size="small"
          color={statusColor[row.status] || "default"}
          label={DEVICE_STATUS_LABELS[row.status] || row.status}
        />
      ),
    },
    {
      id: "campaign",
      label: "Campaña a mostrar",
      width: 240,
      render: (row) => (
        <FormControl size="small" fullWidth>
          <Select
            value={row.campaignId ? String(row.campaignId) : ""}
            displayEmpty
            onChange={(e) => setCampaign(row.deviceId, e.target.value || null)}
            sx={{ fontSize: 13 }}
          >
            <MenuItem value="">
              <em>Sin asignar</em>
            </MenuItem>
            {campaigns.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
                {c.status !== "active" ? ` (${CAMPAIGN_STATUS_LABELS[c.status] || c.status})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
    },
    {
      id: "campaignStatus",
      label: "Campaña",
      width: 110,
      render: (row) =>
        row.campaignId ? (
          <Chip
            size="small"
            color={row.campaignStatus === "active" ? "success" : "warning"}
            label={CAMPAIGN_STATUS_LABELS[row.campaignStatus] || row.campaignStatus || "—"}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      id: "lastSeenAt",
      label: "Última conexión",
      width: 150,
      render: (row) => formatDateTime(row.lastSeenAt),
    },
    {
      id: "actions",
      label: "Acciones",
      width: 220,
      render: (row) => (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          {row.status === DEVICE_STATUS.PENDING ? (
            <Button
              size="small"
              variant="contained"
              onClick={() => setStatus(row.deviceId, DEVICE_STATUS.APPROVED)}
            >
              Aprobar
            </Button>
          ) : null}
          {row.status === DEVICE_STATUS.APPROVED ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setStatus(row.deviceId, DEVICE_STATUS.DISABLED)}
            >
              Deshabilitar
            </Button>
          ) : null}
          {row.status === DEVICE_STATUS.PENDING || row.status === DEVICE_STATUS.REJECTED ? (
            <Button
              size="small"
              color="error"
              onClick={() => setStatus(row.deviceId, DEVICE_STATUS.REJECTED)}
            >
              Rechazar
            </Button>
          ) : null}
          {row.status === DEVICE_STATUS.DISABLED || row.status === DEVICE_STATUS.REJECTED ? (
            <Button size="small" onClick={() => setStatus(row.deviceId, DEVICE_STATUS.APPROVED)}>
              Rehabilitar
            </Button>
          ) : null}
          <Tooltip title="Abrir reproductor TV">
            <IconButton
              size="small"
              color="primary"
              onClick={() =>
                window.open(`${APP_BASE_PATH}tv/device/${encodeURIComponent(row.deviceId)}`, "_blank")
              }
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar registro">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/publicidad")}>
          Campañas
        </Button>
        <DevicesIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Dispositivos TV
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aprueba cada dispositivo y elige qué campaña debe reproducir. La campaña debe estar en
            estado <strong>Activa</strong>.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      <TablePro
        rows={rows}
        columns={columns}
        title="Dispositivos registrados"
        showSearch
        showPagination
        defaultRowsPerPage={15}
        loading={loading}
      />

      <SimpleDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onClickAccept={confirmDelete}
        title="Eliminar dispositivo"
        message={`¿Eliminar el registro de "${deleteTarget?.deviceId}"? El dispositivo deberá registrarse de nuevo.`}
      />
    </Box>
  );
}
