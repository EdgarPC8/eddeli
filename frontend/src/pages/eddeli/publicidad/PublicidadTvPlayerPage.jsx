/**
 * Reproductor kiosco TV — pantalla completa, sin menú ni controles.
 * Ruta pública: /tv/:campaignId (para APK Panadería TV / Fully Kiosk).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { getCampaignPlayback } from "../../../api/publicidadRequest.js";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine.js";
import {
  applyPlaybackCommand,
  usePublicidadPlaybackSync,
} from "./hooks/usePublicidadPlaybackSync.js";
import SlideStage from "./components/SlideStage.jsx";
import SignageOfflineScreen from "./components/SignageOfflineScreen.jsx";
import CampaignMusicPlayer from "./components/CampaignMusicPlayer.jsx";
import SignageConnectionBadge from "./components/SignageConnectionBadge.jsx";
import { apiBaseLabel } from "../../../config/deployEnv.js";

export default function PublicidadTvPlayerPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [backendDown, setBackendDown] = useState(false);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      const res = await getCampaignPlayback(campaignId);
      setCampaign(res.data);
      setBackendDown(false);
    } catch {
      setCampaign(null);
      setBackendDown(true);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchCampaign();
  }, [campaignId, fetchCampaign]);

  const handlePlaylistSocket = useCallback((payload) => {
    if (!payload?.playlist || !Array.isArray(payload.playlist)) {
      fetchCampaign();
      return;
    }
    setCampaign({
      id: payload.campaignId || payload.id,
      name: payload.name,
      loop: payload.loop !== false,
      musicMode: payload.musicMode || "none",
      musicTracks: payload.musicTracks || [],
      playlist: payload.playlist,
    });
    setBackendDown(false);
    setLoading(false);
  }, [fetchCampaign]);

  const playlist = backendDown ? [] : campaign?.playlist || [];
  const loop = campaign?.loop !== false;
  const engine = usePlaybackEngine(playlist, { loop, autoPlay: playlist.length > 0 && !backendDown });
  const { current, leaving, playing, notifyMediaEnded } = engine;
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const { socketConnected } = usePublicidadPlaybackSync({
    campaignId,
    enabled: Boolean(campaignId),
    onPoll: fetchCampaign,
    onPlaylist: handlePlaylistSocket,
    onPlaybackCommand: (command) => {
      if (command?.action === "reload") return false;
      return applyPlaybackCommand(command, engineRef.current);
    },
  });

  const showOffline = Boolean(campaignId) && !loading && backendDown;
  const connectionStatus = loading ? "loading" : backendDown ? "offline" : "online";
  const connectionDetail =
    connectionStatus === "online" && campaign?.name
      ? `Campaña: ${campaign.name}${socketConnected ? " · tiempo real" : ""}`
      : connectionStatus === "online"
        ? `Campaña #${campaignId}`
        : connectionStatus === "offline"
          ? apiBaseLabel()
          : "";

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#000",
        position: "fixed",
        inset: 0,
        m: 0,
        p: 0,
      }}
    >
      <SignageConnectionBadge status={connectionStatus} detail={connectionDetail} />

      {loading ? (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            letterSpacing: 1,
          }}
        >
          Conectando con EdDeli…
        </Box>
      ) : showOffline ? (
        <SignageOfflineScreen />
      ) : (
        <>
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
        </>
      )}
    </Box>
  );
}
