import { TITLE_FONT_SIZE } from "../constants.js";

export function normalizeTitleFontSize(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(TITLE_FONT_SIZE.MAX, Math.max(TITLE_FONT_SIZE.MIN, Math.round(n)));
}

/** Tamaño en px para TV o vista previa compacta. */
export function resolveTitleFontSize(slide, { compact = false, kind = "product" } = {}) {
  const fallback =
    kind === "text" ? TITLE_FONT_SIZE.TEXT_DEFAULT : TITLE_FONT_SIZE.PRODUCT_DEFAULT;
  const px =
    slide?.titleFontSize != null
      ? normalizeTitleFontSize(slide.titleFontSize, fallback)
      : fallback;
  if (compact) return Math.max(14, Math.round(px * 0.42));
  return px;
}

export function titleFontSizeCss(slide, options) {
  const px = resolveTitleFontSize(slide, options);
  return `${px}px`;
}

export function subtitleFontSizeCss(slide, options) {
  const headline = resolveTitleFontSize(slide, options);
  const sub = Math.max(16, Math.round(headline * 0.48));
  return `${sub}px`;
}
