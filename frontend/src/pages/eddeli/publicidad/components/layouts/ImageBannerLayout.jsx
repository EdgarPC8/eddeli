/**
 * Banner imagen — marco con sombra dorada suave.
 */
import { Box } from "@mui/material";
import { SIGNAGE_THEME } from "../../constants.js";
import { resolveMediaUrl } from "../../utils/mediaUrl.js";
import { metallicRedSx } from "../../utils/signageMetallic.js";

const T = SIGNAGE_THEME;

export default function ImageBannerLayout({ slide, compact = false }) {
  const url = resolveMediaUrl(slide);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: T.gray,
        p: compact ? 0.75 : 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ height: compact ? 4 : 6, borderRadius: 1, ...metallicRedSx, mb: compact ? 0.5 : 1 }} />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: compact ? 2 : 3,
          overflow: "hidden",
          bgcolor: T.panelDark,
          boxShadow: `
            0 16px 40px rgba(0,0,0,0.22),
            0 0 0 2px rgba(212,175,55,0.35),
            inset 0 0 40px rgba(0,0,0,0.3)
          `,
        }}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt={slide?.title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
            }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
