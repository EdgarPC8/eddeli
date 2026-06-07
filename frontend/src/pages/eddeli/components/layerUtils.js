// ./components/layerUtils.js

export const SCALE = 3;

// Handles para resize
export const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/**
 * Posiciona el handle dentro del layer (en %)
 * El componente le añade width/height del puntito.
 */
export const handleStyle = (pos) => {
  const base = { transform: "translate(-50%, -50%)" };

  switch (pos) {
    case "nw":
      return { left: "0%", top: "0%", ...base };
    case "n":
      return { left: "50%", top: "0%", ...base };
    case "ne":
      return { left: "100%", top: "0%", ...base };
    case "e":
      return { left: "100%", top: "50%", ...base };
    case "se":
      return { left: "100%", top: "100%", ...base };
    case "s":
      return { left: "50%", top: "100%", ...base };
    case "sw":
      return { left: "0%", top: "100%", ...base };
    case "w":
      return { left: "0%", top: "50%", ...base };
    default:
      return { left: "50%", top: "50%", ...base };
  }
};

// ids helpers
export const nowId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const ensureUniqueId = (id, usedSet) => {
  let out = id;
  while (usedSet.has(out)) out = `${id}_${Math.random().toString(36).slice(2, 5)}`;
  return out;
};

// defaults por tipo (para botón +Imagen/+Texto/+Forma)
export const makeDefaultLayer = ({ type, groupId }) => {
  const id = `${type}_${nowId()}`;

  if (type === "image") {
    return {
      id,
      name: "Imagen",
      groupId,
      type: "image",
      x: 120,
      y: 120,
      w: 600,
      h: 600,
      zIndex: 10,
      visible: true,
      locked: false,
      props: {
        src: "", // pon tu src luego o por bind
        fit: "cover",
        borderRadius: 24,
      },
    };
  }

  if (type === "text") {
    return {
      id,
      name: "Texto",
      groupId,
      type: "text",
      x: 180,
      y: 180,
      w: 700,
      h: 120,
      zIndex: 20,
      visible: true,
      locked: false,
      props: {
        text: "Nuevo texto",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, Arial",
        fontSize: 80, // recuerda que en render se divide por SCALE
        fontWeight: 800,
        align: "left",
      },
    };
  }

  // shape
  return {
    id,
    name: "Forma",
    groupId,
    type: "shape",
    x: 160,
    y: 160,
    w: 520,
    h: 140,
    zIndex: 15,
    visible: true,
    locked: false,
    props: {
      fill: "rgba(0,0,0,0.35)",
      borderRadius: 24,
    },
  };
};
