/**
 * Catálogo de medios simulado (productos, imágenes, videos).
 * Estructura alineada con lo que devolverá el backend al integrar:
 *   - productos → inventory/products
 *   - imágenes  → /img/scan
 *   - videos    → /files/scan (extensiones de video)
 */
import { CONTENT_TYPES } from "../constants.js";

export const MOCK_PRODUCTS = [
  {
    id: 101,
    type: CONTENT_TYPES.PRODUCT,
    title: "Pan de yuca",
    subtitle: "Fresco del día",
    mediaPath: "productos/pan-yuca.jpg",
    price: 0.75,
  },
  {
    id: 102,
    type: CONTENT_TYPES.PRODUCT,
    title: "Empanada de queso",
    subtitle: "Horneada",
    mediaPath: "productos/empanada-queso.jpg",
    price: 1.25,
  },
  {
    id: 103,
    type: CONTENT_TYPES.PRODUCT,
    title: "Torta de chocolate",
    subtitle: "Por porción",
    mediaPath: "productos/torta-chocolate.jpg",
    price: 2.5,
  },
  {
    id: 104,
    type: CONTENT_TYPES.PRODUCT,
    title: "Café americano",
    subtitle: "Grande",
    mediaPath: "productos/cafe.jpg",
    price: 1.8,
  },
];

export const MOCK_IMAGES = [
  {
    id: "img-1",
    type: CONTENT_TYPES.IMAGE,
    title: "Banner promoción mañana",
    subtitle: "1920×1080",
    mediaPath: "banners/promo-manana.jpg",
  },
  {
    id: "img-2",
    type: CONTENT_TYPES.IMAGE,
    title: "Oferta fin de semana",
    subtitle: "1920×1080",
    mediaPath: "banners/oferta-weekend.jpg",
  },
  {
    id: "img-3",
    type: CONTENT_TYPES.IMAGE,
    title: "Nuevo local",
    subtitle: "Apertura",
    mediaPath: "banners/nuevo-local.jpg",
  },
];

export const MOCK_VIDEOS = [
  {
    id: "vid-1",
    type: CONTENT_TYPES.VIDEO,
    title: "Spot panadería 30s",
    subtitle: "MP4 · 30 s",
    mediaPath: "videos/spot-panaderia.mp4",
    durationHint: 30,
  },
  {
    id: "vid-2",
    type: CONTENT_TYPES.VIDEO,
    title: "Proceso de horneado",
    subtitle: "MP4 · 45 s",
    mediaPath: "videos/horneado.mp4",
    durationHint: 45,
  },
];

/** Catálogo unificado para el selector de contenido. */
export function getMockMediaCatalog() {
  return {
    products: [...MOCK_PRODUCTS],
    images: [...MOCK_IMAGES],
    videos: [...MOCK_VIDEOS],
  };
}
