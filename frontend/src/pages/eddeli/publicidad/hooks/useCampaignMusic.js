/**
 * Reproduce música de fondo de campaña (una pista en bucle o lista secuencial).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MUSIC_MODES } from "../constants.js";
import { resolveAudioUrl } from "../utils/mediaUrl.js";

export function useCampaignMusic({ musicMode = "none", musicTracks = [], playing = true } = {}) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);

  const sorted = useMemo(
    () =>
      [...(musicTracks || [])]
        .filter((t) => t?.mediaPath)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [musicTracks],
  );

  const activeMode =
    musicMode === MUSIC_MODES.NONE || !sorted.length ? MUSIC_MODES.NONE : musicMode;

  const currentTrack = sorted[trackIndex] || sorted[0] || null;
  const currentUrl = resolveAudioUrl(currentTrack);

  useEffect(() => {
    setTrackIndex(0);
  }, [activeMode, sorted.map((t) => t.id).join("|")]);

  const playCurrent = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !currentUrl || !playing || activeMode === MUSIC_MODES.NONE) return;
    try {
      el.load();
      await el.play();
    } catch {
      /* autoplay bloqueado en algunos navegadores hasta interacción */
    }
  }, [activeMode, currentUrl, playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    if (!playing || activeMode === MUSIC_MODES.NONE || !currentUrl) {
      el.pause();
      return undefined;
    }
    playCurrent();
    return undefined;
  }, [playing, activeMode, currentUrl, trackIndex, playCurrent]);

  const onEnded = useCallback(() => {
    if (activeMode === MUSIC_MODES.SINGLE_LOOP) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }
    if (activeMode === MUSIC_MODES.PLAYLIST_LOOP) {
      setTrackIndex((i) => (i + 1) % sorted.length);
    }
  }, [activeMode, sorted.length]);

  return {
    audioRef,
    activeMode,
    currentTrack,
    currentUrl,
    onEnded,
    trackIndex,
    totalTracks: sorted.length,
  };
}
