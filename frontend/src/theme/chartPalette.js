/**
 * Paletas para barras, líneas y pie/donut: tonos naturales (teal, ámbar, índigo…)
 * con saturación alta en light y variantes más claras/legibles en dark; neon aún más vivos.
 */

/** Light: colores vivos y legibles sobre fondo claro */
export const CHART_SERIES_LIGHT = [
  "#0D9488",
  "#C2410C",
  "#4F46E5",
  "#CA8A04",
  "#7C3AED",
  "#EA580C",
  "#059669",
  "#BE185D",
];

/** Dark: mismos matices, más claros para contraste sobre fondo oscuro */
export const CHART_SERIES_DARK = [
  "#2DD4BF",
  "#FB923C",
  "#A5B4FC",
  "#FACC15",
  "#C084FC",
  "#FDBA74",
  "#34D399",
  "#F472B6",
];

/** Neon: acentos eléctricos (modo Tron / neón) */
export const CHART_SERIES_NEON = [
  "#5EEAD4",
  "#FF9F43",
  "#818CF8",
  "#FFEB3B",
  "#E879F9",
  "#FF7043",
  "#69F0AE",
  "#FF80AB",
];

/**
 * @param {'light' | 'dark' | 'neon'} mode
 * @returns {{ series: string[] }}
 */
export function getChartsPalette(mode = "light") {
  const series =
    mode === "neon"
      ? CHART_SERIES_NEON
      : mode === "dark"
        ? CHART_SERIES_DARK
        : CHART_SERIES_LIGHT;
  return { series: [...series] };
}

/** Resuelve la lista de colores de series desde el theme (con fallback por modo). */
export function getChartSeriesColors(theme) {
  const s = theme.palette?.charts?.series;
  if (Array.isArray(s) && s.length > 0) return s;
  const custom = theme.palette?.customMode;
  const mode =
    custom === "neon" ? "neon" : theme.palette?.mode === "dark" ? "dark" : "light";
  return getChartsPalette(mode).series;
}

/**
 * Índices sugeridos dentro de `series` para semántica repetida en dashboards.
 */
export const CHART_SEMANTIC_INDEX = {
  primary: 0,
  money: 1,
  secondary: 2,
  accent: 3,
  extra: 4,
  warm: 5,
  positive: 6,
  alert: 7,
};
