/**
 * editorActions.js
 *
 * Constantes y helpers del editor:
 * - SCALE: factor de escala del canvas (tamaño visual vs lógico).
 * - img(), nowId(), ensureUniqueId(): rutas de imagen e IDs únicos.
 * - makeDefaultLayer({ type, groupId }): crea una capa por defecto (text | image | shape).
 */
import { pathImg } from "../../../api/axios";

/** Escala visual del canvas (píxeles lógicos / SCALE = píxeles mostrados) */
export const SCALE = 3;

export const img = (p = "") =>
  `${String(pathImg).replace(/\/+$/, "")}/${String(p).replace(/^\/+/, "")}`;

/**
 * Convierte una URL absoluta de imagen (base pathImg) a ruta relativa para guardar.
 * Ej: "http://host/eddeliapi/img/EdDeli/products/x.png" -> "EdDeli/products/x.png"
 * Si ya es relativa o data:/blob:, la devuelve tal cual.
 */
export const toRelativeImagePath = (value) => {
  if (value == null || typeof value !== "string") return value;
  const s = value.trim();
  if (!s) return s;
  const base = String(pathImg).replace(/\/+$/, "");
  if (s.startsWith(base)) return s.slice(base.length).replace(/^\/+/, "");
  const match = s.match(/\/img\/(.+)$/i);
  if (match) return match[1].replace(/^\/+/, "");
  return s;
};

export const nowId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const ensureUniqueId = (id, used) => {
  let out = id;
  while (used.has(out)) out = `${id}_${Math.random().toString(36).slice(2, 5)}`;
  return out;
};

export const makeDefaultLayer = ({ type, groupId }) => {
  const id = `${type}_${nowId()}`;

  const base = {
    id,
    name: `${type.toUpperCase()} ${new Date().toLocaleTimeString()}`,
    groupId,
    visible: true,
    locked: false,
  };

// editorActions.js  (solo cambia el bloque type === "text")
if (type === "text") {
  return {
    ...base,
    type: "text",
    x: 0,
    y: 0,
    w: 600,
    h: 80,
    zIndex: 100,
    props: {
      text: "NUEVO TEXTO",

      // tipografías
      fontFamily: "Inter, system-ui, Arial",
      fontSize: 48,
      fontWeight: 800,
      color: "#FFFFFF",
      align: "left",

      // NUEVO (no rompe nada)
      letterSpacing: 0,      // px
      lineHeight: 1.05,      // relativo

      // borde (para “título dorado”)
      stroke: "#D4AF37",
      strokeWidth: 0,        // 0 = sin borde

      // sombra/glow
      shadowColor: "rgba(0,0,0,0.45)",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    bind: null,
  };
}


  if (type === "image") {
    return {
      ...base,
      type: "image",
      x: 0,
      y: 0,
      w: 500,
      h: 500,
      zIndex: 100,
      props: {
        src: img("EdDeli/ads/placeholders/no_image.png"),
        fit: "cover",
        borderRadius: 20,
      },
      bind: null,
    };
  }

  return {
    ...base,
    type: "shape",
    x: 0,
    y: 0,
    w: 500,
    h: 160,
    zIndex: 90,
    props: { fill: "rgba(0,0,0,0.35)", borderRadius: 18 },
    bind: null,
  };
};
