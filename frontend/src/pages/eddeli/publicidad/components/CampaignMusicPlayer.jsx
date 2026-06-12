/**
 * Reproductor de audio invisible — música de fondo de campaña en TV / preview.
 */
import { useCampaignMusic } from "../hooks/useCampaignMusic.js";

export default function CampaignMusicPlayer({ musicMode = "none", musicTracks = [], playing = true }) {
  const { audioRef, currentUrl, currentTrack, onEnded, activeMode } = useCampaignMusic({
    musicMode,
    musicTracks,
    playing,
  });

  if (activeMode === "none" || !currentUrl) return null;

  return (
    <audio
      key={currentTrack?.id || currentUrl}
      ref={audioRef}
      src={currentUrl}
      preload="auto"
      onEnded={onEnded}
      style={{ display: "none" }}
    />
  );
}
