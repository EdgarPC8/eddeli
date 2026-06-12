import { buildImageUrl, pathFiles } from "../../../../api/axios.js";
import { CONTENT_TYPES } from "../constants.js";

export function resolveFileMediaUrl(mediaPath) {
  if (!mediaPath) return null;
  return `${pathFiles}${String(mediaPath).replace(/^\/+/, "")}`;
}

export function resolveAudioUrl(track) {
  if (!track?.mediaPath) return null;
  return resolveFileMediaUrl(track.mediaPath);
}

export function resolveMediaUrl(slide) {
  if (!slide?.mediaPath) return null;
  if (slide.contentType === CONTENT_TYPES.VIDEO) {
    return resolveFileMediaUrl(slide.mediaPath);
  }
  return buildImageUrl(slide.mediaPath);
}

/** Precio compacto (listas, chips) */
export function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return `$${n.toFixed(2)}`;
}

/** Precio grande para tablero menú (columnas) */
export function formatSignagePrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Precio cartel producto individual: $ + valor con .00 */
export function formatHeroPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toFixed(2);
}
