import { SIGNAGE_THEME, TITLE_FONT_STYLES } from "../constants.js";
import { textOnRedSx } from "./signageMetallic.js";
import { subtitleFontSizeCss, titleFontSizeCss } from "./titleFontSize.js";

const T = SIGNAGE_THEME;

const ROUNDED_FAMILY = '"Nunito", "Fredoka", "Varela Round", sans-serif';

const STYLE_SX = {
  [TITLE_FONT_STYLES.DEFAULT]: {
    ...textOnRedSx,
  },
  [TITLE_FONT_STYLES.ROUNDED]: {
    fontFamily: ROUNDED_FAMILY,
    fontWeight: 900,
    color: T.white,
    textShadow: "0 2px 6px rgba(0,0,0,0.28)",
  },
  [TITLE_FONT_STYLES.OUTLINE]: {
    color: T.white,
    fontWeight: 900,
    WebkitTextStroke: "2.5px rgba(100, 0, 24, 0.92)",
    paintOrder: "stroke fill",
    textShadow: "0 3px 0 rgba(0,0,0,0.2)",
  },
  [TITLE_FONT_STYLES.SHADOW_3D]: {
    color: T.white,
    fontWeight: 900,
    textShadow: [
      "1px 1px 0 #9A001C",
      "2px 2px 0 #8B0018",
      "3px 3px 0 #7A0015",
      "4px 4px 0 #690012",
      "5px 5px 0 #580010",
      "6px 6px 14px rgba(0,0,0,0.45)",
    ].join(", "),
  },
  [TITLE_FONT_STYLES.ROUNDED_3D]: {
    fontFamily: ROUNDED_FAMILY,
    fontWeight: 900,
    color: T.white,
    WebkitTextStroke: "2px rgba(120, 0, 30, 0.95)",
    paintOrder: "stroke fill",
    textShadow: [
      "2px 2px 0 #B80022",
      "3px 3px 0 #A8001F",
      "4px 4px 0 #8B0018",
      "5px 5px 0 #6E0012",
      "6px 6px 16px rgba(0,0,0,0.42)",
    ].join(", "),
  },
};

export function resolveTitleFontStyle(slide) {
  const raw = slide?.titleFontStyle || TITLE_FONT_STYLES.DEFAULT;
  return STYLE_SX[raw] ? raw : TITLE_FONT_STYLES.DEFAULT;
}

export function getTitleFontStyleSx(styleKey) {
  const key = STYLE_SX[styleKey] ? styleKey : TITLE_FONT_STYLES.DEFAULT;
  return STYLE_SX[key];
}

/** Tipografía completa del título (estilo + tamaño) para layouts TV. */
export function getTitleTypographySx(slide, { compact = false, kind = "product" } = {}) {
  const style = resolveTitleFontStyle(slide);
  return {
    ...getTitleFontStyleSx(style),
    fontSize: titleFontSizeCss(slide, { compact, kind }),
  };
}

export function getSubtitleTypographySx(slide, { compact = false, kind = "text" } = {}) {
  const style = resolveTitleFontStyle(slide);
  const base = getTitleFontStyleSx(style);
  const stroke =
    style === TITLE_FONT_STYLES.OUTLINE || style === TITLE_FONT_STYLES.ROUNDED_3D
      ? { WebkitTextStroke: "1.5px rgba(100, 0, 24, 0.85)" }
      : {};
  return {
    ...base,
    ...stroke,
    fontSize: subtitleFontSizeCss(slide, { compact, kind }),
  };
}
