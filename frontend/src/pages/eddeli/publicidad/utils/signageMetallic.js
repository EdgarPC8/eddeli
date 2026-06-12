/**
 * Gradientes y sombras metálicas — solo módulo Publicidad.
 */
import { SIGNAGE_THEME as T } from "../constants.js";

/** Rojo metálico oscuro — categoría (más oscuro que precio) */
export const metallicRedDarkSx = {
  background: `linear-gradient(
    160deg,
    ${T.redDark} 0%,
    #8B0018 38%,
    #5C0010 72%,
    #3A0009 100%
  )`,
  boxShadow: `
    inset 0 2px 0 rgba(255, 255, 255, 0.12),
    inset 0 -4px 8px rgba(0, 0, 0, 0.35),
    0 10px 28px rgba(0, 0, 0, 0.28)
  `,
};

/** Rojo metálico medio — barra de precio */
export const metallicRedSx = {
  background: `linear-gradient(
    160deg,
    ${T.redLight} 0%,
    ${T.red} 42%,
    ${T.redDark} 88%
  )`,
  boxShadow: `
    inset 0 2px 0 rgba(255, 255, 255, 0.28),
    inset 0 -3px 6px rgba(0, 0, 0, 0.2),
    0 10px 28px rgba(228, 0, 43, 0.38)
  `,
};

/** Dorado metálico con brillo */
export const metallicGoldSx = {
  background: `linear-gradient(
    160deg,
    #FFF9E6 0%,
    ${T.goldLight} 22%,
    ${T.gold} 55%,
    ${T.goldDark} 88%
  )`,
  boxShadow: `
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 6px rgba(120, 90, 10, 0.25),
    0 8px 22px rgba(212, 175, 55, 0.38)
  `,
};

/** Un solo fondo dorado brillante — zona nombre + foto del producto */
export const goldHeroStageSx = {
  background: `linear-gradient(
    155deg,
    #FFF8DC 0%,
    #FFE566 22%,
    ${T.goldLight} 48%,
    ${T.gold} 72%,
    #C9A227 100%
  )`,
  boxShadow: `
    inset 0 3px 0 rgba(255, 255, 255, 0.45),
    inset 0 -4px 10px rgba(100, 70, 8, 0.18)
  `,
};

export const imageHeroShadow = `
  drop-shadow(0 20px 36px rgba(0, 0, 0, 0.18))
  drop-shadow(0 8px 16px rgba(212, 175, 55, 0.22))
`;

export const textOnRedSx = {
  color: T.white,
  textShadow: "0 2px 4px rgba(0,0,0,0.35), 0 0 20px rgba(255,255,255,0.12)",
};

export const textOnGoldSx = {
  color: T.black,
  textShadow: "0 1px 0 rgba(255,255,255,0.65)",
};

export const cardSoftSx = {
  bgcolor: T.white,
  borderRadius: 2,
  boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
};
