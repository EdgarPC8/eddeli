/**
 * Reproductor kiosco TV por dispositivo — pantalla completa, sin menú.
 * Ruta pública: /tv/device/:deviceId (APK Panadería TV).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { getDevicePlayback } from "../../../api/publicidadRequest.js";
import { usePlaybackEngine } from "./hooks/usePlaybackEngine.js";
import {
  applyPlaybackCommand,
  usePublicidadPlaybackSync,
} from "./hooks/usePublicidadPlaybackSync.js";
import SlideStage from "./components/SlideStage.jsx";
import SignageOfflineScreen from "./components/SignageOfflineScreen.jsx";

function DevicePendingScreen({ message }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#1A1A1A",
        color: "#fff",
        px: 4,
        textAlign: "center",
      }}
    >
      <Box sx={{ fontSize: 48, mb: 2 }}>📺</Box>
      <Box sx={{ fontSize: 16, maxWidth: 420, lineHeight: 1.5, color: "rgba(255,255,255,0.75)" }}>
        {message || "Esperando aprobación del administrador…"}
      </Box>
    </Box>
  );
}

export default function PublicidadTvDevicePlayerPage() {
  const { deviceId: rawDeviceId } = useParams();
  const deviceId = String(rawDeviceId || "").trim().toLowerCase();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(Boolean(deviceId));
  const [gate, setGate] = useState(null);
  const [gateMessage, setGateMessage] = useState("");

  const fetchPlayback = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await getDevicePlayback(deviceId);
      setCampaign(res.data);
      setGate(null);
      setGateMessage("");
    } catch (err) {
      setCampaign(null);
      const status = err?.response?.status;
      const data = err?.response?.data || {};
      const code =
        data.code ||
        (status === 403 ? "pending" : status === 404 ? "no_campaign" : "offline");

      if (code === "pending") {
        setGate("pending");
        setGateMessage(data.message || "Esperando aprobación…");
      } else if (
        code === "denied" ||
        code === "no_campaign" ||
        code === "campaign_inactive" ||
        code === "campaign_not_found"
      ) {
        setGate("offline");
        setGateMessage("");
      } else {
        setGate("offline");
        setGateMessage("");
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchPlayback();
  }, [deviceId, fetchPlayback]);

  const showOffline = gate === "offline";
  const playlist = showOffline ? [] : campaign?.playlist || [];
  const loop = campaign?.loop !== false;
  const engine = usePlaybackEngine(playlist, {
    loop,
    autoPlay: playlist.length > 0 && !showOffline,
  });
  const { current, leaving } = engine;
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const handlePlaylistSocket = useCallback((payload) => {
    if (!payload?.playlist || !Array.isArray(payload.playlist)) {
      fetchPlayback();
      return;
    }
    setCampaign({
      deviceId: payload.deviceId || deviceId,
      campaignId: payload.campaignId || payload.id,
      name: payload.name,
      loop: payload.loop !== false,
      playlist: payload.playlist,
      source: payload.source || "socket",
    });
    setGate(null);
    setGateMessage("");
    setLoading(false);
  }, [deviceId, fetchPlayback]);

  const { socketConnected } = usePublicidadPlaybackSync({
    deviceId,
    enabled: Boolean(deviceId),
    onPoll: fetchPlayback,
    onPlaylist: handlePlaylistSocket,
    onDeviceUpdated: fetchPlayback,
    onPlaybackCommand: (command) => {
      if (command?.action === "reload") return false;
      return applyPlaybackCommand(command, engineRef.current);
    },
  });

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
      {loading ? (
        <Box sx={{ width: "100%", height: "100%", bgcolor: "#000" }} />
      ) : gate === "pending" ? (
        <DevicePendingScreen message={gateMessage} />
      ) : showOffline ? (
        <SignageOfflineScreen />
      ) : (
        <SlideStage current={current} leaving={leaving} />
      )}

      {import.meta.env.DEV ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: socketConnected ? "#4caf50" : "#f44336",
            opacity: 0.35,
            zIndex: 9999,
          }}
        />
      ) : null}
    </Box>
  );
}
