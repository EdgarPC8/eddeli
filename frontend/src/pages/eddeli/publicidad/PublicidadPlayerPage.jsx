/**
 * Reproductor fullscreen — vista previa y futuro modo TV/kiosco.
 * Ruta: /publicidad/reproductor/:campaignId?
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { getCampaignById } from "../../../api/publicidadRequest.js";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine.js";
import { usePublicidadPlaybackSync } from "./hooks/usePublicidadPlaybackSync.js";
import SlideStage from "./components/SlideStage.jsx";
import CampaignMusicPlayer from "./components/CampaignMusicPlayer.jsx";
import SignagePreviewFrame from "./components/SignagePreviewFrame.jsx";
import SignageOfflineScreen from "./components/SignageOfflineScreen.jsx";

export default function PublicidadPlayerPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [backendDown, setBackendDown] = useState(false);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      const res = await getCampaignById(campaignId);
      setCampaign(res.data);
      setBackendDown(false);
    } catch {
      setCampaign(null);
      setBackendDown(true);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const handlePlaylistSocket = useCallback(
    (payload) => {
      if (!payload?.playlist || !Array.isArray(payload.playlist)) {
        fetchCampaign();
        return;
      }
      setCampaign((prev) => ({
        ...prev,
        id: payload.campaignId || payload.id || campaignId,
        name: payload.name ?? prev?.name,
        loop: payload.loop !== false,
        musicMode: payload.musicMode || "none",
        musicTracks: payload.musicTracks || [],
        playlist: payload.playlist,
      }));
      setBackendDown(false);
      setLoading(false);
    },
    [campaignId, fetchCampaign],
  );

  const { socketConnected } = usePublicidadPlaybackSync({
    campaignId,
    enabled: Boolean(campaignId),
    onPoll: fetchCampaign,
    onPlaylist: handlePlaylistSocket,
  });

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      setBackendDown(false);
      setCampaign(null);
      return undefined;
    }

    setLoading(true);
    fetchCampaign();
  }, [campaignId, fetchCampaign]);

  const playlist = backendDown ? [] : campaign?.playlist || [];
  const loop = campaign?.loop !== false;

  const engine = usePlaybackEngine(playlist, { loop, autoPlay: playlist.length > 0 && !backendDown });
  const { current, leaving, index, total, playing, progress, toggle, next, prev, notifyMediaEnded } =
    engine;

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  const showOffline = Boolean(campaignId) && !loading && backendDown;
  const showEmpty = !loading && !backendDown && !playlist.length;

  return (
    <Box
      sx={{
        mx: { xs: -2, md: -3 },
        mb: -3,
        height: "calc(100vh - 104px)",
        bgcolor: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1, borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <IconButton color="inherit" onClick={() => navigate("/publicidad")} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {showOffline ? "Modo sin conexión" : campaign?.name || "Reproductor publicitario"}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {campaignId ? `Campaña ${campaignId}` : "Sin campaña seleccionada"}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            showOffline
              ? "Servidor caído"
              : socketConnected
                ? "Tiempo real"
                : "Solo HTTP"
          }
          color={showOffline ? "error" : socketConnected ? "success" : "warning"}
          variant="outlined"
          sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
        />
        <Tooltip title="Pantalla completa">
          <IconButton color="inherit" onClick={enterFullscreen} size="small">
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 1, md: 2 },
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: "auto",
            maxWidth: "100%",
            aspectRatio: "16 / 9",
            position: "relative",
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          {loading ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center", bgcolor: "#0b0f14" }}>
              <Typography sx={{ opacity: 0.7 }}>Cargando campaña...</Typography>
            </Box>
          ) : showOffline ? (
            <SignagePreviewFrame>
              <SignageOfflineScreen />
            </SignagePreviewFrame>
          ) : showEmpty ? (
            <Box
              sx={{
                height: "100%",
                display: "grid",
                placeItems: "center",
                p: 3,
                textAlign: "center",
                bgcolor: "#0b0f14",
              }}
            >
              <Typography sx={{ opacity: 0.8 }}>
                Esta campaña no tiene contenido en la playlist.
                <br />
                Edita la campaña y añade productos, imágenes o videos.
              </Typography>
            </Box>
          ) : (
            <SignagePreviewFrame>
              <SlideStage
                current={current}
                leaving={leaving}
                playing={playing}
                onMediaEnded={notifyMediaEnded}
              />
              <CampaignMusicPlayer
                musicMode={campaign?.musicMode}
                musicTracks={campaign?.musicTracks}
                playing={playing}
              />
            </SignagePreviewFrame>
          )}
        </Box>
      </Box>

      {!showOffline && (
        <Box sx={{ px: 2, pb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mb: 1.5, borderRadius: 1, bgcolor: "rgba(255,255,255,0.1)" }}
          />
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <IconButton color="inherit" onClick={prev} disabled={!total}>
              <SkipPreviousIcon />
            </IconButton>
            <IconButton
              color="primary"
              onClick={toggle}
              disabled={!total}
              sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
            >
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <IconButton color="inherit" onClick={next} disabled={!total}>
              <SkipNextIcon />
            </IconButton>
          </Stack>
          <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 1, opacity: 0.65 }}>
            {current
              ? `${index + 1}/${total} · ${current.title} · ${current.durationSeconds}s`
              : "—"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
