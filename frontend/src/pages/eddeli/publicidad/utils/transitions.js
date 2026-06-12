/**
 * Animaciones de entrada/salida en el reproductor (crossfade sin flash negro).
 */
import { TRANSITIONS, SLIDE_CROSSFADE_MS } from "../constants.js";

const BASE = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
};

const MS = SLIDE_CROSSFADE_MS;

export function getTransitionSx(transition, phase = "in") {
  const t = transition || TRANSITIONS.FADE;
  const entering = phase === "in";

  if (t === TRANSITIONS.NONE) {
    return { ...BASE, opacity: entering ? 1 : 0 };
  }

  if (t === TRANSITIONS.FADE) {
    return {
      ...BASE,
      opacity: entering ? 1 : 0,
      animation: `${entering ? "signageCrossfadeIn" : "signageCrossfadeOut"} ${MS}ms ease forwards`,
      "@keyframes signageCrossfadeIn": {
        "0%": { opacity: 0 },
        "100%": { opacity: 1 },
      },
      "@keyframes signageCrossfadeOut": {
        "0%": { opacity: 1 },
        "100%": { opacity: 0 },
      },
    };
  }

  if (t === TRANSITIONS.SLIDE_LEFT) {
    return {
      ...BASE,
      opacity: entering ? 1 : 0,
      animation: `${entering ? "signageSlideLeftIn" : "signageSlideLeftOut"} ${MS}ms ease forwards`,
      "@keyframes signageSlideLeftIn": {
        "0%": { opacity: 0, transform: "translateX(6%)" },
        "100%": { opacity: 1, transform: "translateX(0)" },
      },
      "@keyframes signageSlideLeftOut": {
        "0%": { opacity: 1, transform: "translateX(0)" },
        "100%": { opacity: 0, transform: "translateX(-6%)" },
      },
    };
  }

  if (t === TRANSITIONS.SLIDE_RIGHT) {
    return {
      ...BASE,
      opacity: entering ? 1 : 0,
      animation: `${entering ? "signageSlideRightIn" : "signageSlideRightOut"} ${MS}ms ease forwards`,
      "@keyframes signageSlideRightIn": {
        "0%": { opacity: 0, transform: "translateX(-6%)" },
        "100%": { opacity: 1, transform: "translateX(0)" },
      },
      "@keyframes signageSlideRightOut": {
        "0%": { opacity: 1, transform: "translateX(0)" },
        "100%": { opacity: 0, transform: "translateX(6%)" },
      },
    };
  }

  if (t === TRANSITIONS.ZOOM_IN) {
    return {
      ...BASE,
      opacity: entering ? 1 : 0,
      animation: `${entering ? "signageZoomIn" : "signageZoomOut"} ${MS}ms ease forwards`,
      "@keyframes signageZoomIn": {
        "0%": { opacity: 0, transform: "scale(1.06)" },
        "100%": { opacity: 1, transform: "scale(1)" },
      },
      "@keyframes signageZoomOut": {
        "0%": { opacity: 1, transform: "scale(1)" },
        "100%": { opacity: 0, transform: "scale(0.94)" },
      },
    };
  }

  if (t === TRANSITIONS.ZOOM_OUT) {
    return {
      ...BASE,
      opacity: entering ? 1 : 0,
      animation: `${entering ? "signageZoomOutIn" : "signageZoomOutOut"} ${MS}ms ease forwards`,
      "@keyframes signageZoomOutIn": {
        "0%": { opacity: 0, transform: "scale(0.94)" },
        "100%": { opacity: 1, transform: "scale(1)" },
      },
      "@keyframes signageZoomOutOut": {
        "0%": { opacity: 1, transform: "scale(1)" },
        "100%": { opacity: 0, transform: "scale(1.06)" },
      },
    };
  }

  return {
    ...BASE,
    opacity: entering ? 1 : 0,
    animation: `${entering ? "signageCrossfadeIn" : "signageCrossfadeOut"} ${MS}ms ease forwards`,
    "@keyframes signageCrossfadeIn": {
      "0%": { opacity: 0 },
      "100%": { opacity: 1 },
    },
    "@keyframes signageCrossfadeOut": {
      "0%": { opacity: 1 },
      "100%": { opacity: 0 },
    },
  };
}
