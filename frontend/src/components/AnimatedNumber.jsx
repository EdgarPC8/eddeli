/**
 * Anima un número desde el valor anterior (o 0) hasta el objetivo.
 */
import { useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * @param {object} props
 * @param {number} props.value
 * @param {(n: number) => string} [props.format]
 * @param {number} [props.duration=900]
 * @param {boolean} [props.enabled=true]
 * @param {string} [props.fallback]
 * @param {string|number} [props.resetKey] - si cambia, reinicia desde 0
 */
export default function AnimatedNumber({
  value,
  format = (n) => String(n),
  duration = 900,
  enabled = true,
  fallback = "—",
  resetKey,
}) {
  const target = Number(value);
  const [display, setDisplay] = useState(() =>
    Number.isFinite(target) ? (enabled ? 0 : target) : NaN,
  );
  const fromRef = useRef(0);
  const rafRef = useRef(0);
  const prevResetRef = useRef(resetKey);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(NaN);
      return undefined;
    }

    if (prevResetRef.current !== resetKey) {
      prevResetRef.current = resetKey;
      fromRef.current = 0;
    }

    if (!enabled || prefersReduced || duration <= 0) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }

    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(t);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled, prefersReduced, resetKey]);

  if (!Number.isFinite(display)) return fallback;
  return format(display);
}
