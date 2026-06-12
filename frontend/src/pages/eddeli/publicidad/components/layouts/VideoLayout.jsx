import { Box } from "@mui/material";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";

export default function VideoLayout({ slide }) {
  const url = resolveMediaUrl(slide);
  if (!url) return null;

  return (
    <Box
      component="video"
      key={slide.id}
      src={url}
      autoPlay
      muted
      loop
      playsInline
      sx={{ width: "100%", height: "100%", objectFit: "cover", bgcolor: "#000" }}
    />
  );
}
