/**
 * Compatibilidad con la UI del reproductor web (badge de conexión).
 */
import { usePublicidadPlaybackSync } from "./usePublicidadPlaybackSync.js";

export function usePlayerSocket({ screenId, campaignId, enabled = false } = {}) {
  const deviceId =
    screenId && screenId !== "preview" && !/^\d+$/.test(String(screenId)) ? screenId : undefined;
  const resolvedCampaignId = campaignId ?? (screenId && /^\d+$/.test(String(screenId)) ? screenId : undefined);

  const { socketConnected, emitControl } = usePublicidadPlaybackSync({
    deviceId,
    campaignId: resolvedCampaignId,
    enabled,
  });

  return {
    connected: socketConnected,
    mode: socketConnected ? "live" : "offline",
    lastEvent: null,
    emitControl,
    isSimulation: false,
  };
}
