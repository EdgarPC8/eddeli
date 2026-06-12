/**
 * Escala el lienzo signage (1920×1080) para caber en la vista previa web.
 * Solo usar en admin / reproductor web — no en rutas TV (/tv, APK).
 */
import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

export const SIGNAGE_CANVAS_W = 1920;
export const SIGNAGE_CANVAS_H = 1080;

export default function SignagePreviewFrame({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(width / SIGNAGE_CANVAS_W, height / SIGNAGE_CANVAS_H));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        bgcolor: "#0b0f14",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: SIGNAGE_CANVAS_W,
          height: SIGNAGE_CANVAS_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
