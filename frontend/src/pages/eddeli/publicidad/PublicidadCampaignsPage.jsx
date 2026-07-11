/**
 * Publicidad — listado y administración de campañas para pantallas digitales.
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import TvIcon from "@mui/icons-material/Tv";
import DevicesIcon from "@mui/icons-material/Devices";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { deleteCampaign, getCampaigns, getPublicidadDevices } from "../../../api/publicidadRequest.js";
import { CAMPAIGN_STATUS_LABELS } from "./constants.js";

const statusColor = {
  draft: "default",
  scheduled: "info",
  active: "success",
  paused: "warning",
  ended: "error",
};

export default function PublicidadCampaignsPage() {
  const navigate = useNavigate();
  const { toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [deviceCountByCampaign, setDeviceCountByCampaign] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, devRes] = await Promise.all([getCampaigns(), getPublicidadDevices()]);
      setRows(Array.isArray(campRes.data) ? campRes.data : []);
      const counts = {};
      for (const d of Array.isArray(devRes.data) ? devRes.data : []) {
        if (d.campaignId) {
          const k = String(d.campaignId);
          counts[k] = (counts[k] || 0) + 1;
        }
      }
      setDeviceCountByCampaign(counts);
    } catch {
      toast?.({ message: "No se pudieron cargar las campañas", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toast({
        promise: deleteCampaign(deleteTarget.id),
        successMessage: "Campaña eliminada",
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
      id: "name",
      label: "Campaña",
      render: (row) => (
        <Box>
          <Typography fontWeight={700}>{row.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.description || "—"}
          </Typography>
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
          label={CAMPAIGN_STATUS_LABELS[row.status] || row.status}
        />
      ),
    },
    {
      id: "playlist",
      label: "Playlist",
      width: 100,
      render: (row) => `${row.playlist?.length || 0} piezas`,
    },
    {
      id: "devices",
      label: "Dispositivos",
      width: 110,
      render: (row) => deviceCountByCampaign[String(row.id)] || 0,
    },
    {
      id: "actions",
      label: "Acciones",
      width: 140,
      render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => navigate(`/publicidad/campanas/${row.id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Vista previa / reproductor">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/publicidad/reproductor/${row.id}`)}
            >
              <PlayCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TvIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Publicidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Campañas y listas de reproducción para pantallas digitales
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DevicesIcon />}
            onClick={() => navigate("/publicidad/dispositivos")}
          >
            Dispositivos TV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/publicidad/campanas/nueva")}
          >
            Nueva campaña
          </Button>
        </Stack>
      </Stack>

      <TablePro
        rows={rows}
        columns={columns}
        title="Campañas publicitarias"
        showSearch
        showPagination
        defaultRowsPerPage={10}
        loading={loading}
      />

      <SimpleDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onClickAccept={confirmDelete}
        title="Eliminar campaña"
        message={`¿Eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
      />
    </Box>
  );
}
