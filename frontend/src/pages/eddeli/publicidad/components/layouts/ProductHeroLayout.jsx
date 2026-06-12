/**
 * Vista producto individual — categoría rojo oscuro, zona única dorada (nombre + foto), precio rojo.
 */
import { Box, Typography } from "@mui/material";
import { SIGNAGE_THEME } from "../../constants.js";
import { formatHeroPrice, resolveMediaUrl } from "../../utils/mediaUrl.js";
import { getTitleTypographySx } from "../../utils/titleFontStyle.js";
import {
  goldHeroStageSx,
  metallicRedDarkSx,
  metallicRedSx,
  textOnRedSx,
} from "../../utils/signageMetallic.js";

const T = SIGNAGE_THEME;

export default function ProductHeroLayout({ slide, compact = false }) {
  const url = resolveMediaUrl(slide);
  const priceAmount = formatHeroPrice(slide?.price);
  const category = slide?.subtitle?.trim() || "";
  const nameTypography = getTitleTypographySx(slide, { compact, kind: "product" });

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: T.gray,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: compact ? 1.5 : 4,
          py: compact ? 0.65 : 1.35,
          ...metallicRedDarkSx,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            letterSpacing: compact ? 1 : 3,
            fontSize: compact ? "0.7rem" : "clamp(1rem, 2.5vw, 2rem)",
            textTransform: "uppercase",
            ...textOnRedSx,
          }}
        >
          {category || "Promoción"}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          ...goldHeroStageSx,
          display: "grid",
          gridTemplateColumns: compact ? "1fr 1.05fr" : "minmax(38%, 44%) minmax(0, 1fr)",
          alignItems: "stretch",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: compact ? 1.25 : { xs: 2.5, md: 4 },
            py: compact ? 1.25 : { xs: 2, md: 3 },
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              lineHeight: 1.12,
              textTransform: "uppercase",
              letterSpacing: compact ? 0.4 : 1,
              textAlign: "center",
              width: "100%",
              wordBreak: "break-word",
              hyphens: "auto",
              ...nameTypography,
            }}
          >
            {slide?.title || "Producto"}
          </Typography>
        </Box>

        <Box
          sx={{
            position: "relative",
            minHeight: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {url ? (
            <Box
              component="img"
              src={url}
              alt={slide?.title}
              sx={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                objectPosition: "bottom center",
              }}
            />
          ) : (
            <Box
              sx={{
                width: "68%",
                height: "62%",
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.35)",
              }}
            />
          )}
        </Box>
      </Box>

      {priceAmount != null && (
        <Box
          sx={{
            flexShrink: 0,
            px: compact ? 1.5 : 4,
            py: compact ? 0.8 : 1.85,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: compact ? 0.2 : 0.35,
            ...metallicRedSx,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: compact ? "1rem" : "clamp(2rem, 4.5vw, 3.5rem)",
              lineHeight: 1,
              ...textOnRedSx,
            }}
          >
            $
          </Typography>
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: compact ? "1.5rem" : "clamp(3.2rem, 8.5vw, 6.5rem)",
              lineHeight: 1,
              letterSpacing: -2,
              ...textOnRedSx,
            }}
          >
            {priceAmount}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
