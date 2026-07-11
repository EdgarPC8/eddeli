/**
 * Editor de campaña: metadatos + playlist + vista previa.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  createCampaign,
  getCampaignById,
  getPublicidadDevices,
  updateCampaign,
} from "../../../api/publicidadRequest.js";
import { CAMPAIGN_STATUS, CAMPAIGN_STATUS_LABELS } from "./constants.js";
import PlaylistBuilder from "./components/PlaylistBuilder.jsx";
import PlaybackPreview from "./components/PlaybackPreview.jsx";
import CampaignMusicPanel from "./components/CampaignMusicPanel.jsx";
import { MUSIC_MODES } from "./constants.js";
import { PageSkeleton } from "../../../components/ContentSkeleton.jsx";

const emptyForm = {
  name: "",
  description: "",
  status: CAMPAIGN_STATUS.DRAFT,
  loop: true,
  playlist: [],
  musicMode: MUSIC_MODES.NONE,
  musicTracks: [],
};

export default function PublicidadCampaignEditorPage() {
  const { id } = useParams();
  const isNew = id === "nueva" || !id;
  const navigate = useNavigate();
  const { toast } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState([]);

  const loadAssignedDevices = async (campaignId) => {
    if (!campaignId || campaignId === "nueva") {
      setAssignedDevices([]);
      return;
    }
    try {
      const res = await getPublicidadDevices();
      const list = Array.isArray(res.data) ? res.data : [];
      setAssignedDevices(list.filter((d) => String(d.campaignId) === String(campaignId)));
    } catch {
      setAssignedDevices([]);
    }
  };

  const applyCampaignToForm = (c) => {
    setForm({
      name: c.name || "",
      description: c.description || "",
      status: c.status || CAMPAIGN_STATUS.DRAFT,
      loop: c.loop !== false,
      playlist: c.playlist || [],
      musicMode: c.musicMode || MUSIC_MODES.NONE,
      musicTracks: c.musicTracks || [],
    });
    loadAssignedDevices(c.id);
  };

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getCampaignById(id);
        const c = res.data || {};
        if (!alive) return;
        applyCampaignToForm(c);
      } catch {
        toast?.({ message: "Campaña no encontrada", variant: "error" });
        navigate("/publicidad", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isNew, navigate, toast]);

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    loop: form.loop,
    screenIds: [],
    playlist: form.playlist,
    musicMode: form.musicMode,
    musicTracks: form.musicTracks,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast?.({ message: "El nombre de la campaña es obligatorio", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        await toast({
          promise: createCampaign(payload),
          successMessage: "Campaña creada correctamente",
          errorMessage: "No se pudo crear la campaña",
          onSuccess: (res) => {
            const campaignId = res?.data?.id;
            if (campaignId) navigate(`/publicidad/campanas/${campaignId}`, { replace: true });
          },
        });
      } else {
        await toast({
          promise: updateCampaign(id, payload),
          successMessage: "Campaña guardada correctamente",
          errorMessage: "No se pudo guardar la campaña",
          onSuccess: (res) => applyCampaignToForm(res?.data || {}),
        });
      }
    } catch {
      /* toast ya mostró el error */
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        <PageSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/publicidad")}>
          Volver
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {isNew ? "Nueva campaña" : "Editar campaña"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PlayCircleOutlineIcon />}
          disabled={!form.playlist.length}
          onClick={() =>
            navigate(isNew ? "/publicidad/reproductor" : `/publicidad/reproductor/${id}`)
          }
        >
          Reproductor
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
          Guardar
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Datos de la campaña
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Nombre"
                required
                fullWidth
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
              <TextField
                label="Descripción"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  label="Estado"
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, label]) => (
                    <MenuItem key={k} value={k}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!isNew ? (
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <DevicesIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Dispositivos TV asignados
                    </Typography>
                  </Stack>
                  {assignedDevices.length ? (
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {assignedDevices.map((d) => (
                        <Chip key={d.deviceId} size="small" label={d.deviceId} variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Ninguno aún. Asigna esta campaña en{" "}
                      <Button
                        size="small"
                        sx={{ p: 0, minWidth: 0, verticalAlign: "baseline", textTransform: "none" }}
                        onClick={() => navigate("/publicidad/dispositivos")}
                      >
                        Dispositivos TV
                      </Button>
                      .
                    </Typography>
                  )}
                </Box>
              ) : null}
              <FormControlLabel
                control={
                  <Switch checked={form.loop} onChange={(e) => patch({ loop: e.target.checked })} />
                }
                label="Repetir playlist en bucle"
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <PlaylistBuilder playlist={form.playlist} onChange={(playlist) => patch({ playlist })} />
          </Paper>

          <CampaignMusicPanel
            musicMode={form.musicMode}
            musicTracks={form.musicTracks}
            onChange={(music) => patch(music)}
          />
        </Grid>

        <Grid item xs={12} lg={5}>
          <PlaybackPreview
            playlist={form.playlist}
            loop={form.loop}
            musicMode={form.musicMode}
            musicTracks={form.musicTracks}
            title="Vista previa"
          />
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              APK Panadería TV
            </Typography>
            <Typography variant="body2" color="text.secondary">
              En Dispositivos TV aprueba cada pantalla y elige qué campaña reproduce. Aquí solo
              necesitas poner la campaña en estado Activa.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
