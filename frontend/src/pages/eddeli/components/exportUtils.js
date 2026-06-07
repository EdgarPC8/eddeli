// components/layerUtils.js
import { pathImg } from "../../../api/axios";

export const SCALE = 3;

const img = (p = "") =>
  `${String(pathImg).replace(/\/+$/, "")}/${String(p).replace(/^\/+/, "")}`;

const nowId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const ensureUniqueId = (id, used) => {
  let out = id;
  while (used.has(out)) out = `${id}_${Math.random().toString(36).slice(2, 5)}`;
  return out;
};

export const HANDLE_SIZE = 12;

export const handleStyle = (cursor) => ({
  position: "absolute",
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  borderRadius: 2,
  background: "#00E5FF",
  border: "1px solid rgba(0,0,0,0.4)",
  cursor,
});

export const handles = [
  { key: "nw", cursor: "nwse-resize", left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "n", cursor: "ns-resize", left: "50%", top: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "ne", cursor: "nesw-resize", right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "e", cursor: "ew-resize", right: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
  { key: "se", cursor: "nwse-resize", right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "s", cursor: "ns-resize", left: "50%", bottom: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "sw", cursor: "nesw-resize", left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "w", cursor: "ew-resize", left: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
];

export const makeDefaultLayer = ({ type, groupId }) => {
  const id = `${type}_${nowId()}`;

  const base = {
    id,
    name: `${type.toUpperCase()} ${new Date().toLocaleTimeString()}`,
    groupId,
    visible: true,
    locked: false,
  };

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
        fontFamily: "Inter, system-ui, Arial",
        fontSize: 48,
        fontWeight: 800,
        color: "#FFFFFF",
        align: "left",
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
