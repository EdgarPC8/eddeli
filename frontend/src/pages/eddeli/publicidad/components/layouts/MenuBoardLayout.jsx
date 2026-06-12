/**
 * Vista menú en conjunto — columnas de productos en una sola pantalla.
 */
import { Box, Typography } from "@mui/material";
import { SIGNAGE_THEME, CONTENT_TYPES } from "../../constants.js";
import { formatHeroPrice, resolveMediaUrl } from "../../utils/mediaUrl.js";
import {
  goldHeroStageSx,
  metallicRedDarkSx,
  metallicRedSx,
  textOnRedSx,
} from "../../utils/signageMetallic.js";

const T = SIGNAGE_THEME;
const MAX_ITEMS = 6;

/** Distribución de columnas/filas según cantidad de productos */
function getMenuGrid(count) {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  return { cols: 3, rows: 2 };
}

function MenuColumn({ item, compact, showDivider }) {
  const url = resolveMediaUrl(item);
  const priceAmount = formatHeroPrice(item?.price);
  const category = item?.subtitle?.trim() || "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        borderRight: showDivider ? "1px solid rgba(0,0,0,0.12)" : "none",
      }}
    >
      {category ? (
        <Box
          sx={{
            flexShrink: 0,
            px: compact ? 0.5 : 1,
            py: compact ? 0.35 : 0.65,
            ...metallicRedDarkSx,
          }}
        >
          <Typography
            noWrap
            sx={{
              fontWeight: 900,
              fontSize: compact ? "0.5rem" : "clamp(0.65rem, 1.1vw, 0.9rem)",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              textAlign: "center",
              ...textOnRedSx,
            }}
          >
            {category}
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          px: compact ? 0.5 : 1,
          pt: compact ? 0.5 : 1.25,
          pb: 0,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: compact ? "0.55rem" : "clamp(0.85rem, 1.6vw, 1.35rem)",
            letterSpacing: 0.5,
            lineHeight: 1.15,
            textTransform: "uppercase",
            textAlign: "center",
            mb: compact ? 0.35 : 0.75,
            px: 0.5,
            width: "100%",
            wordBreak: "break-word",
            ...textOnRedSx,
          }}
        >
          {item?.title || "Producto"}
        </Typography>

        <Box
          sx={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {url ? (
            <Box
              component="img"
              src={url}
              alt={item?.title}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                objectPosition: "bottom center",
              }}
            />
          ) : (
            <Box
              sx={{
                width: "60%",
                height: compact ? 40 : 80,
                borderRadius: 1,
                bgcolor: "rgba(255,255,255,0.3)",
              }}
            />
          )}
        </Box>
      </Box>

      {priceAmount != null ? (
        <Box
          sx={{
            flexShrink: 0,
            py: compact ? 0.4 : 0.75,
            px: compact ? 0.4 : 0.75,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 0.15,
            ...metallicRedSx,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: compact ? "0.55rem" : "clamp(0.85rem, 1.5vw, 1.2rem)",
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
              fontSize: compact ? "0.75rem" : "clamp(1.1rem, 2.2vw, 2rem)",
              lineHeight: 1,
              letterSpacing: -1,
              ...textOnRedSx,
            }}
          >
            {priceAmount}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export default function MenuBoardLayout({ slide, compact = false }) {
  const items = (slide?.menuItems || []).filter((it) => it && (it.mediaPath || it.title));
  const title = slide?.title || "Nuestro menú";
  const visible = items.slice(0, MAX_ITEMS);
  const { cols, rows } = getMenuGrid(visible.length || 1);

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
          flexShrink: 0,
          px: compact ? 1 : 3,
          py: compact ? 0.55 : 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...metallicRedDarkSx,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: compact ? "0.75rem" : "clamp(1.1rem, 2.5vw, 2rem)",
            letterSpacing: compact ? 1 : 3,
            textTransform: "uppercase",
            ...textOnRedSx,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          ...goldHeroStageSx,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {visible.length ? (
          visible.map((item, i) => (
            <MenuColumn
              key={item.id || `${item.contentId}-${i}`}
              item={item}
              compact={compact}
              showDivider={
                (i + 1) % cols !== 0 && i < visible.length - 1
              }
            />
          ))
        ) : (
          <Box sx={{ gridColumn: "1 / -1", gridRow: "1 / -1", display: "grid", placeItems: "center" }}>
            <Typography sx={{ ...textOnRedSx, opacity: 0.85 }} variant={compact ? "caption" : "body2"}>
              Añade productos al tablero menú
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Construye slide menú desde productos del catálogo o de la playlist */
export function buildMenuSlide({
  title = "Nuestro menú",
  products = [],
  id,
  durationSeconds,
  ...rest
} = {}) {
  const menuItems = products.map((p, i) => ({
    id: p.id || `menu_item_${i}`,
    contentType: CONTENT_TYPES.PRODUCT,
    contentId: p.contentId != null ? String(p.contentId) : String(p.id ?? ""),
    title: p.title || "Producto",
    subtitle: p.subtitle || "",
    mediaPath: p.mediaPath || null,
    price: p.price != null ? Number(p.price) : null,
  }));

  return {
    id: id || `slide_menu_${Date.now().toString(36)}`,
    contentType: CONTENT_TYPES.MENU,
    contentId: "menu-board",
    title,
    subtitle: `${menuItems.length} productos`,
    mediaPath: null,
    menuItems,
    durationSeconds: durationSeconds || Math.max(12, menuItems.length * 4),
    ...rest,
  };
}

/** @deprecated usar buildMenuSlide */
export function buildMenuSlideFromProducts(products, opts = {}) {
  return buildMenuSlide({ products, ...opts });
}
