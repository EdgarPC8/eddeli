import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";

export default function VideoLayout({ slide, playing = true, onEnded }) {
  const ref = useRef(null);
  const url = resolveMediaUrl(slide);

  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return undefined;
    if (playing) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    return undefined;
  }, [playing, url, slide?.id]);

  if (!url) return null;

  return (
    <Box
      component="video"
      ref={ref}
      key={slide.id}
      src={url}
      autoPlay
      muted
      playsInline
      onEnded={() => onEnded?.()}
      sx={{ width: "100%", height: "100%", objectFit: "cover", bgcolor: "#000" }}
    />
  );
}
