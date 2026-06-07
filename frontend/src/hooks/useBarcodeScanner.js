import { useEffect, useRef } from "react";

/**
 * Escucha un lector de códigos en modo "teclado" (HID): escribe el código muy rápido y termina con Enter.
 * No requiere drivers ni permisos especiales en el navegador.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxGapMs = 80,
  minLength = 2,
  ignoreWhenTypingInInputs = true,
}) {
  const bufferRef = useRef("");
  const lastTsRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;

    const isTypingContext = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === "textarea") return true;
      if (tag === "select") return true;
      if (tag === "input") {
        const type = String(el.getAttribute("type") || "text").toLowerCase();
        return !["button", "submit", "reset", "checkbox", "radio", "file"].includes(type);
      }
      return el.isContentEditable;
    };

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ignoreWhenTypingInInputs && isTypingContext(document.activeElement)) return;

      const now = Date.now();
      if (now - lastTsRef.current > maxGapMs) bufferRef.current = "";
      lastTsRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.repeat) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, maxGapMs, minLength, ignoreWhenTypingInInputs]);
}
