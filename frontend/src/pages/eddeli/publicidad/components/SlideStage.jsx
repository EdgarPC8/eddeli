/**
 * Escenario de reproducción con crossfade: la saliente y la entrante coexisten.
 */
import { Box } from "@mui/material";
import SlideRenderer from "./SlideRenderer.jsx";

export default function SlideStage({ current, leaving = null, compact = false }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {current ? (
        <SlideRenderer slide={current} phase="in" compact={compact} zIndex={1} />
      ) : null}
      {leaving ? (
        <SlideRenderer slide={leaving} phase="out" compact={compact} zIndex={2} />
      ) : null}
    </Box>
  );
}
