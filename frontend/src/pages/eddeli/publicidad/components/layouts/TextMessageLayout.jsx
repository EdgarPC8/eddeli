/**
 * Diapositiva de mensaje — texto grande estilo signage (promos, avisos).
 */
import { Box, Typography } from "@mui/material";
import { SIGNAGE_THEME } from "../../constants.js";
import { getSubtitleTypographySx, getTitleTypographySx } from "../../utils/titleFontStyle.js";
import {
  goldHeroStageSx,
  metallicRedDarkSx,
} from "../../utils/signageMetallic.js";

const T = SIGNAGE_THEME;

export default function TextMessageLayout({ slide, compact = false }) {
  const headline = slide?.title?.trim() || "Mensaje";
  const subline = slide?.subtitle?.trim() || "";
  const headlineSx = getTitleTypographySx(slide, { compact, kind: "text" });
  const sublineSx = getSubtitleTypographySx(slide, { compact, kind: "text" });

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: T.gray,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          ...goldHeroStageSx,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: compact ? 2 : { xs: 4, md: 8 },
          py: compact ? 2 : 4,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: compact ? 0.5 : 2,
            textTransform: "uppercase",
            maxWidth: "95%",
            wordBreak: "break-word",
            ...headlineSx,
          }}
        >
          {headline}
        </Typography>

        {subline ? (
          <Box
            sx={{
              mt: compact ? 1.5 : 3,
              px: compact ? 2 : 4,
              py: compact ? 1 : 1.75,
              borderRadius: 2,
              maxWidth: 720,
              ...metallicRedDarkSx,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                lineHeight: 1.25,
                letterSpacing: compact ? 0.5 : 1.5,
                textTransform: "uppercase",
                ...sublineSx,
              }}
            >
              {subline}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
