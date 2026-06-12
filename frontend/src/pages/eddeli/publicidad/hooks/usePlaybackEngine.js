/**
 * Motor de reproducción de playlist (timer, índice, crossfade, bucle).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTENT_TYPES, SLIDE_CROSSFADE_MS } from "../constants.js";

export function usePlaybackEngine(playlist = [], { loop = true, autoPlay = false } = {}) {
  const sorted = useMemo(
    () => [...playlist].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [playlist],
  );

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [leaving, setLeaving] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const loopRef = useRef(loop);
  const sortedRef = useRef(sorted);
  const indexRef = useRef(0);

  const slideTimerRef = useRef(null);
  const transitionRef = useRef(null);
  const tickRef = useRef(null);

  const total = sorted.length;
  const safeIndex = total ? Math.min(index, total - 1) : 0;

  loopRef.current = loop;
  sortedRef.current = sorted;
  indexRef.current = safeIndex;

  const current = total ? sorted[safeIndex] : null;
  const duration = Math.max(1, Number(current?.durationSeconds) || 8);

  const clearSlideTimers = useCallback(() => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearSlideTimers();
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
  }, [clearSlideTimers]);

  const startCrossfade = useCallback(
    (nextIndex) => {
      const t = sortedRef.current.length;
      if (!t) return;

      const prevIdx = indexRef.current;
      let idx = nextIndex;

      if (idx >= t) {
        if (!loopRef.current) return;
        idx = 0;
      }
      if (idx < 0) {
        idx = loopRef.current ? t - 1 : 0;
      }
      if (idx === prevIdx) return;

      setLeaving(sortedRef.current[prevIdx]);
      setIndex(idx);
      setElapsed(0);

      if (transitionRef.current) clearTimeout(transitionRef.current);
      transitionRef.current = setTimeout(() => {
        transitionRef.current = null;
        setLeaving(null);
      }, SLIDE_CROSSFADE_MS);
    },
    [],
  );

  const advanceSlide = useCallback(() => {
    clearSlideTimers();
    const t = sortedRef.current.length;
    if (!t) return;

    let nextIdx = indexRef.current + 1;
    if (nextIdx >= t) {
      if (!loopRef.current) {
        setPlaying(false);
        return;
      }
      nextIdx = 0;
    }
    startCrossfade(nextIdx);
  }, [clearSlideTimers, startCrossfade]);

  const notifyMediaEnded = useCallback(() => {
    if (!playing) return;
    const slide = sortedRef.current[indexRef.current];
    if (slide?.contentType !== CONTENT_TYPES.VIDEO) return;
    advanceSlide();
  }, [playing, advanceSlide]);

  const goTo = useCallback(
    (nextIndex) => {
      const t = sortedRef.current.length;
      if (!t) return;
      clearAllTimers();
      startCrossfade(nextIndex);
    },
    [clearAllTimers, startCrossfade],
  );

  const next = useCallback(() => {
    if (!sortedRef.current.length) return;
    goTo(indexRef.current + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    if (!sortedRef.current.length) return;
    goTo(indexRef.current - 1);
  }, [goTo]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const reset = useCallback(() => {
    clearAllTimers();
    setIndex(0);
    setLeaving(null);
    setElapsed(0);
  }, [clearAllTimers]);

  const playlistKey = useMemo(
    () => sorted.map((s) => `${s.id}:${s.durationSeconds}`).join("|"),
    [sorted],
  );

  useEffect(() => {
    reset();
    if (autoPlay && sorted.length) setPlaying(true);
  }, [playlistKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  useEffect(() => {
    clearSlideTimers();
    if (!playing || !current || leaving || !total) return undefined;
    if (current.contentType === CONTENT_TYPES.VIDEO) return undefined;

    slideTimerRef.current = setTimeout(() => {
      advanceSlide();
    }, duration * 1000);

    tickRef.current = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, duration));
    }, 1000);

    return clearSlideTimers;
  }, [playing, current?.id, duration, leaving, total, advanceSlide, clearSlideTimers]);

  return {
    sorted,
    current,
    leaving,
    index: safeIndex,
    total,
    playing,
    /** @deprecated usar `leaving` — se mantiene para compatibilidad con controles */
    phase: leaving ? "out" : "in",
    elapsed,
    duration,
    progress: duration ? Math.min(100, (elapsed / duration) * 100) : 0,
    play,
    pause,
    toggle,
    next,
    prev,
    reset,
    goTo,
    notifyMediaEnded,
  };
}
