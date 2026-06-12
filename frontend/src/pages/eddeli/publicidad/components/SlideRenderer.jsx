/**
 * Enrutador de plantillas visuales por tipo de contenido.
 */
import { Box, Typography } from "@mui/material";
import { CONTENT_TYPES } from "../constants.js";
import { getTransitionSx } from "../utils/transitions.js";
import ProductHeroLayout from "./layouts/ProductHeroLayout.jsx";
import MenuBoardLayout from "./layouts/MenuBoardLayout.jsx";
import ImageBannerLayout from "./layouts/ImageBannerLayout.jsx";
import VideoLayout from "./layouts/VideoLayout.jsx";
import TextMessageLayout from "./layouts/TextMessageLayout.jsx";

export default function SlideRenderer({
  slide,
  phase = "in",
  compact = false,
  zIndex = 1,
  playing = true,
  onMediaEnded,
}) {
  if (!slide) {
    return (
      <Box sx={{ ...getTransitionSx("fade", phase), color: "#fff", opacity: 0.7, width: "100%", height: "100%" }}>
        <Typography>Sin contenido en la playlist</Typography>
      </Box>
    );
  }

  let content = null;
  if (slide.contentType === CONTENT_TYPES.MENU) {
    content = <MenuBoardLayout slide={slide} compact={compact} />;
  } else if (slide.contentType === CONTENT_TYPES.VIDEO) {
    content = <VideoLayout slide={slide} playing={playing} onEnded={onMediaEnded} />;
  } else if (slide.contentType === CONTENT_TYPES.PRODUCT) {
    content = <ProductHeroLayout slide={slide} compact={compact} />;
  } else if (slide.contentType === CONTENT_TYPES.IMAGE) {
    content = <ImageBannerLayout slide={slide} compact={compact} />;
  } else if (slide.contentType === CONTENT_TYPES.TEXT) {
    content = <TextMessageLayout slide={slide} compact={compact} />;
  } else {
    content = <ProductHeroLayout slide={slide} compact={compact} />;
  }

  const transitionKey = phase === "out" ? slide.transitionOut || "fade" : slide.transitionIn || "fade";

  return (
    <Box
      sx={{
        ...getTransitionSx(transitionKey, phase),
        overflow: "hidden",
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        zIndex,
      }}
    >
      {content}
    </Box>
  );
}
