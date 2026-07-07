/**
 * Panel de música de campaña — subir/seleccionar pistas y modo de reproducción.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { fetchMediaCatalog, uploadPublicidadAudio } from "../../../../api/publicidadRequest.js";
import { getMediaFolders } from "../../../../api/mediaRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { MUSIC_MODE_LABELS, MUSIC_MODES } from "../constants.js";

function trackFromCatalogItem(item) {
  return {
    id: `track_${item.id}`,
    title: item.title || item.mediaPath,
    mediaPath: item.mediaPath,
    durationSeconds: item.durationHint || null,
    order: 0,
  };
}

export default function CampaignMusicPanel({ musicMode, musicTracks = [], onChange }) {
  const { toast } = useAuth();
  const fileRef = useRef(null);
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAudios = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await fetchMediaCatalog();
      setAudios(catalog.audios || []);
    } catch {
      toast?.({ message: "No se pudo cargar el catálogo de audio", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  const patch = (fields) => onChange?.({ musicMode, musicTracks, ...fields });

  const reorder = (list) => list.map((t, i) => ({ ...t, order: i }));

  const addTrack = (item) => {
    const track = trackFromCatalogItem(item);
    if (musicTracks.some((t) => t.mediaPath === track.mediaPath)) return;
    const next = reorder([...musicTracks, track]);
    const mode = musicMode === MUSIC_MODES.NONE ? MUSIC_MODES.SINGLE_LOOP : musicMode;
    patch({ musicTracks: next, musicMode: mode });
  };

  const removeTrack = (index) => {
    const next = reorder(musicTracks.filter((_, i) => i !== index));
    patch({
      musicTracks: next,
      musicMode: next.length ? musicMode : MUSIC_MODES.NONE,
    });
  };

  const moveTrack = (index, dir) => {
    const next = [...musicTracks];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    patch({ musicTracks: reorder(next) });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await toast({
        promise: uploadPublicidadAudio(file),
        successMessage: "Audio subido correctamente",
        errorMessage: "Error al subir audio",
      });
      await loadAudios();
      if (result?.data) addTrack(result.data);
    } finally {
      setUploading(false);
    }
  };

  const available = audios.filter(
    (a) => !musicTracks.some((t) => t.mediaPath === a.mediaPath),
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <MusicNoteIcon color="action" />
        <Typography variant="subtitle1" fontWeight={700}>
          Música de campaña
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Se reproduce en bucle mientras la campaña está activa (TV y vista previa). Los videos de la
        playlist se muestran sin sonido; la música va por separado.
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Modo</InputLabel>
        <Select
          label="Modo"
          value={musicMode}
          onChange={(e) => {
            const mode = e.target.value;
            patch({
              musicMode: mode,
              musicTracks: mode === MUSIC_MODES.NONE ? [] : musicTracks,
            });
          }}
        >
          {Object.entries(MUSIC_MODE_LABELS).map(([k, label]) => (
            <MenuItem key={k} value={k}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {musicMode !== MUSIC_MODES.NONE ? (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Subir audio
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              hidden
              onChange={handleUpload}
            />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
              MP3, WAV, OGG, M4A… → {getMediaFolders().AUDIO}
            </Typography>
          </Stack>

          {musicTracks.length ? (
            <List dense sx={{ mb: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              {musicTracks.map((track, i) => (
                <ListItem
                  key={track.id || track.mediaPath}
                  secondaryAction={
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => moveTrack(i, -1)} disabled={i === 0}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => moveTrack(i, 1)}
                        disabled={i === musicTracks.length - 1}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeTrack(i)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={track.title}
                    secondary={track.mediaPath}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Añade al menos una pista desde el catálogo o sube un archivo.
            </Typography>
          )}

          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Catálogo de audio
          </Typography>
          {loading ? (
            <Box sx={{ py: 2, display: "grid", placeItems: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
              {available.map((item) => (
                <ListItem
                  key={item.id}
                  secondaryAction={
                    <Button size="small" onClick={() => addTrack(item)}>
                      Añadir
                    </Button>
                  }
                >
                  <ListItemText primary={item.title} secondary={item.mediaPath} />
                </ListItem>
              ))}
              {!available.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 2 }}>
                  No hay audios en el servidor. Sube uno arriba.
                </Typography>
              )}
            </List>
          )}
        </>
      ) : null}
    </Paper>
  );
}
