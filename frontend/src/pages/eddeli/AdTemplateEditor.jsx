import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip,
} from "@mui/material";
import { pathImg } from "../../api/axios";
import { template } from "./components/template";

const SCALE = 3;

// ✅ 1 SOLO helper para evitar el // siempre
const img = (p = "") =>
  `${String(pathImg).replace(/\/+$/, "")}/${String(p).replace(/^\/+/, "")}`;

// ids / layers helpers
const nowId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const ensureUniqueId = (id, used) => {
  let out = id;
  while (used.has(out)) out = `${id}_${Math.random().toString(36).slice(2, 5)}`;
  return out;
};


const HANDLE_SIZE = 12;

const handleStyle = (cursor) => ({
  position: "absolute",
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  borderRadius: 2,
  background: "#00E5FF",
  border: "1px solid rgba(0,0,0,0.4)",
  cursor,
});

const handles = [
  { key: "nw", cursor: "nwse-resize", left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "n", cursor: "ns-resize", left: "50%", top: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "ne", cursor: "nesw-resize", right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
  { key: "e", cursor: "ew-resize", right: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
  { key: "se", cursor: "nwse-resize", right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "s", cursor: "ns-resize", left: "50%", bottom: -HANDLE_SIZE / 2, transform: "translateX(-50%)" },
  { key: "sw", cursor: "nesw-resize", left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
  { key: "w", cursor: "ew-resize", left: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" },
];

const normalizeHex = (c) => (String(c || "").trim() ? String(c).trim() : "#ffffff");

const makeDefaultLayer = ({ type, groupId }) => {
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

function LayerContent({ layer, scale }) {
  if (layer.type === "image") {
    return (
      <img
        src={layer.props?.src}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: layer.props?.fit || "contain",
          borderRadius: layer.props?.borderRadius || 0,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    );
  }

  if (layer.type === "shape") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: layer.props?.fill,
          borderRadius: layer.props?.borderRadius || 0,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (layer.type === "text") {
    const align = layer.props?.align || "left";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          color: layer.props?.color || "#fff",
          fontFamily: layer.props?.fontFamily || "Inter, system-ui, Arial",
          fontSize: (layer.props?.fontSize || 32) / scale,
          fontWeight: layer.props?.fontWeight || 700,
          display: "flex",
          alignItems: "center",
          justifyContent:
            align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
          textAlign: align,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {layer.props?.text}
      </div>
    );
  }

  return null;
}

export default function AdTemplateEditor() {
  const [data, setData] = useState(() => {
    // ✅ si tu template no trae name/visible/locked, se los ponemos sin romper nada
    const fix = (l) => ({
      ...l,
      name: l.name ?? l.id,
      visible: l.visible ?? true,
      locked: l.locked ?? false,
    });

    return { ...template, layers: template.layers.map(fix) };
  });

  const [selected, setSelected] = useState(null); // { kind:"layer"|"group", id }
  const [action, setAction] = useState(null);
  const [ops, setOps] = useState([]);

  // drag reorder (panel)
  const [dragId, setDragId] = useState(null);

  const pushOp = (op) => setOps((prev) => [...prev, { at: new Date().toISOString(), ...op }]);

  const selectedLayer = useMemo(() => {
    if (!selected || selected.kind !== "layer") return null;
    return data.layers.find((l) => l.id === selected.id) || null;
  }, [selected, data.layers]);

  const selectedGroup = useMemo(() => {
    if (!selected || selected.kind !== "group") return null;
    return data.groups.find((g) => g.id === selected.id) || null;
  }, [selected, data.groups]);

  // ---------- bind resolver ----------
  const getByPath = (obj, path) => {
    try {
      return path.split(".").reduce((acc, k) => acc?.[k], obj);
    } catch {
      return undefined;
    }
  };

  const resolveLayer = (layer) => {
    if (!layer?.bind) return layer;

    // ✅ image bind: NO pisa props.src si BD viene vacío
    if (layer.type === "image" && layer.bind?.srcFrom) {
      const raw = getByPath(data, layer.bind.srcFrom);

      if (raw) {
        const src = `${layer.bind.srcPrefix || ""}${String(raw).replace(/^\/+/, "")}`;
        return { ...layer, props: { ...(layer.props || {}), src } };
      }

      const current = layer.props?.src;
      const fallback = layer.bind.fallbackSrc;
      return { ...layer, props: { ...(layer.props || {}), src: current || fallback } };
    }

    // ✅ text bind: NO pisa props.text si computed viene vacío
    if (layer.type === "text" && layer.bind?.textFrom) {
      const raw = getByPath(data, layer.bind.textFrom);
      if (raw === null || raw === undefined || String(raw).trim() === "") return layer;

      let text = String(raw);
      if (layer.bind.maxLen && text.length > layer.bind.maxLen) {
        text = text.slice(0, layer.bind.maxLen - 1) + "…";
      }
      return { ...layer, props: { ...(layer.props || {}), text } };
    }

    return layer;
  };

  // ---------- ordering ----------
  const sortedLayersForPanel = useMemo(() => {
    // panel: arriba = más encima
    return [...data.layers].sort((a, b) => {
      const za = a.zIndex || 0;
      const zb = b.zIndex || 0;
      if (za !== zb) return zb - za; // desc
      return String(a.id).localeCompare(String(b.id));
    });
  }, [data.layers]);

  const setLayerZ = (layerId, newZ) => {
    setData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, zIndex: newZ } : l)),
    }));
    pushOp({ type: "set-z", layerId, newZ });
  };

  const bringToFront = () => {
    if (!selectedLayer) return;
    const maxZ = Math.max(...data.layers.map((l) => l.zIndex || 0), 0);
    setLayerZ(selectedLayer.id, maxZ + 1);
  };

  const sendToBack = () => {
    if (!selectedLayer) return;
    const minZ = Math.min(...data.layers.map((l) => l.zIndex || 0), 0);
    setLayerZ(selectedLayer.id, minZ - 1);
  };

  const bumpZ = (dir) => {
    if (!selectedLayer) return;
    setLayerZ(selectedLayer.id, (selectedLayer.zIndex || 0) + dir);
  };

  const autoNormalizeZ = () => {
    // re-asigna zIndex en saltos de 10 según orden visual (abajo->arriba)
    setData((prev) => {
      const ordered = [...prev.layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      const next = ordered.map((l, i) => ({ ...l, zIndex: (i + 1) * 10 }));
      return { ...prev, layers: next };
    });
    pushOp({ type: "auto-normalize-z" });
  };

  // ---------- mutations ----------
  const updateLayer = (layerId, patch) => {
    setData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    }));
    pushOp({ type: "update-layer", layerId, patch });
  };

  const updateLayerProps = (layerId, propsPatch) => {
    setData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.id === layerId ? { ...l, props: { ...(l.props || {}), ...(propsPatch || {}) } } : l
      ),
    }));
    pushOp({ type: "update-layer-props", layerId, propsPatch });
  };

  const setLayerMeta = (layerId, patch) => {
    setData((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...(patch || {}) } : l)),
    }));
    pushOp({ type: "set-layer-meta", layerId, patch });
  };

  const toggleVisible = (layerId) => {
    const l = data.layers.find((x) => x.id === layerId);
    if (!l) return;
    setLayerMeta(layerId, { visible: !(l.visible !== false) });
  };

  const toggleLocked = (layerId) => {
    const l = data.layers.find((x) => x.id === layerId);
    if (!l) return;
    setLayerMeta(layerId, { locked: !l.locked });
  };

  const addLayer = (type) => {
    const groupId = selectedGroup?.id || selectedLayer?.groupId || data.groups[0]?.id;
    if (!groupId) return;

    setData((prev) => {
      const used = new Set(prev.layers.map((l) => l.id));
      const layer = makeDefaultLayer({ type, groupId });
      layer.id = ensureUniqueId(layer.id, used);

      const maxZ = Math.max(...prev.layers.map((l) => l.zIndex || 0), 0);
      layer.zIndex = maxZ + 1;

      layer.x = Math.round(prev.canvas.width * 0.45);
      layer.y = Math.round(prev.canvas.height * 0.35);

      return { ...prev, layers: [...prev.layers, layer] };
    });

    pushOp({ type: "add-layer", layerType: type, groupId });
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayer) return;
    if (selectedLayer.locked) return; // 🔒
    const id = selectedLayer.id;
    setData((prev) => ({ ...prev, layers: prev.layers.filter((l) => l.id !== id) }));
    setSelected(null);
    pushOp({ type: "delete-layer", layerId: id });
  };

  const duplicateSelectedLayer = () => {
    if (!selectedLayer) return;

    setData((prev) => {
      const used = new Set(prev.layers.map((l) => l.id));
      const copy = JSON.parse(JSON.stringify(selectedLayer));
      copy.id = ensureUniqueId(`${selectedLayer.id}_copy`, used);
      copy.name = `${(selectedLayer.name || selectedLayer.id)} copy`;
      copy.x = selectedLayer.x + 40;
      copy.y = selectedLayer.y + 40;
      copy.zIndex = (selectedLayer.zIndex || 0) + 1;
      copy.locked = false;
      copy.visible = true;
      return { ...prev, layers: [...prev.layers, copy] };
    });

    pushOp({ type: "duplicate-layer", layerId: selectedLayer.id });
  };

  // ---------- drag reorder (panel) ----------
  const reorderByDrop = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;

    setData((prev) => {
      // Orden actual de arriba->abajo en panel (desc)
      const ordered = [...prev.layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
      const fromIdx = ordered.findIndex((x) => x.id === fromId);
      const toIdx = ordered.findIndex((x) => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;

      const item = ordered.splice(fromIdx, 1)[0];
      ordered.splice(toIdx, 0, item);

      // Reasignar zIndex para que el orden del panel sea el real (tipo Photoshop)
      const next = ordered
        .slice()
        .reverse() // abajo->arriba
        .map((l, i) => ({ ...l, zIndex: (i + 1) * 10 }));

      return { ...prev, layers: next };
    });

    pushOp({ type: "reorder-layers", fromId, toId });
  };

  // ---------- drag/resize ----------
  const startMoveGroup = (groupId, e) => {
    // ✅ SOLO mover grupo con SHIFT
    if (!e.shiftKey) return;
    e.stopPropagation();
    setSelected({ kind: "group", id: groupId });
    setAction({ type: "move-group", groupId, startX: e.clientX, startY: e.clientY });
  };

  const startMoveLayer = (layerId, e) => {
    e.stopPropagation();
    const layer = data.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return; // 🔒
    setSelected({ kind: "layer", id: layerId });
    setAction({ type: "move-layer", layerId, startX: e.clientX, startY: e.clientY });
  };

  const startResizeLayer = (layerId, handle, e) => {
    e.stopPropagation();
    const layer = data.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return; // 🔒

    setSelected({ kind: "layer", id: layerId });

    setAction({
      type: "resize-layer",
      layerId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { x: layer.x, y: layer.y, w: layer.w, h: layer.h },
      ratio: layer.w / layer.h || 1,
    });
  };

  const stop = () => setAction(null);

  const onMove = (e) => {
    if (!action) return;

    const dx = (e.clientX - action.startX) * SCALE;
    const dy = (e.clientY - action.startY) * SCALE;

    const clampMin = (v, min) => (v < min ? min : v);

    if (action.type === "move-group") {
      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === action.groupId ? { ...g, x: g.x + dx, y: g.y + dy } : g
        ),
      }));
      setAction({ ...action, startX: e.clientX, startY: e.clientY });
      pushOp({ type: "move-group", groupId: action.groupId, dx, dy });
      return;
    }

    if (action.type === "move-layer") {
      setData((prev) => ({
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === action.layerId ? { ...l, x: l.x + dx, y: l.y + dy } : l
        ),
      }));
      setAction({ ...action, startX: e.clientX, startY: e.clientY });
      pushOp({ type: "move-layer", layerId: action.layerId, dx, dy });
      return;
    }

    if (action.type === "resize-layer") {
      const { x, y, w, h } = action.startRect;
      const handle = action.handle;
      const fromCenter = e.altKey;

      let nx = x;
      let ny = y;
      let nw = w;
      let nh = h;

      const minSize = 20;

      if (handle.includes("e")) {
        nw = w + dx;
        if (fromCenter) {
          nw = w + dx * 2;
          nx = x - dx;
        }
      }
      if (handle.includes("w")) {
        nw = w - dx;
        nx = x + dx;
        if (fromCenter) {
          nw = w - dx * 2;
          nx = x + dx;
        }
      }

      if (handle.includes("s")) {
        nh = h + dy;
        if (fromCenter) {
          nh = h + dy * 2;
          ny = y - dy;
        }
      }
      if (handle.includes("n")) {
        nh = h - dy;
        ny = y + dy;
        if (fromCenter) {
          nh = h - dy * 2;
          ny = y + dy;
        }
      }

      nw = clampMin(nw, minSize);
      nh = clampMin(nh, minSize);

      const layer = data.layers.find((l) => l.id === action.layerId);
      const lockRatio = e.shiftKey && layer?.type === "image";

      if (lockRatio) {
        const ratio = action.ratio || 1;
        const affectsW = handle.includes("e") || handle.includes("w");
        const affectsH = handle.includes("n") || handle.includes("s");

        if (affectsW && !affectsH) nh = nw / ratio;
        else if (affectsH && !affectsW) nw = nh * ratio;
        else {
          if (Math.abs(dx) > Math.abs(dy)) nh = nw / ratio;
          else nw = nh * ratio;
        }

        if (handle.includes("w")) nx = x + (w - nw);
        if (handle.includes("n")) ny = y + (h - nh);

        if (fromCenter) {
          nx = x + (w - nw) / 2;
          ny = y + (h - nh) / 2;
        }
      }

      setData((prev) => ({
        ...prev,
        layers: prev.layers.map((l) =>
          l.id === action.layerId
            ? { ...l, x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) }
            : l
        ),
      }));

      pushOp({
        type: "resize-layer",
        layerId: action.layerId,
        handle,
        nx: Math.round(nx),
        ny: Math.round(ny),
        nw: Math.round(nw),
        nh: Math.round(nh),
      });

      return;
    }
  };

  // ---------- atajos tipo Photoshop ----------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Delete") deleteSelectedLayer();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelectedLayer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer]);

  const selectedBorder = "2px solid #00E5FF";

  const fontOptions = [
    { label: "Inter", value: "Inter, system-ui, Arial" },
    { label: "Poppins", value: "Poppins, system-ui, Arial" },
    { label: "Montserrat", value: "Montserrat, system-ui, Arial" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Impact", value: "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif" },
  ];

  // ---------- EXPORT (template/ops) ----------
  const exportTemplateText = useMemo(
    () => `const template = ${JSON.stringify(data, null, 2)};\n`,
    [data]
  );

  const exportOpsText = useMemo(() => `const ops = ${JSON.stringify(ops, null, 2)};\n`, [ops]);

  const copyText = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  };

  // ---------- EXPORT IMAGE (PNG/JPG) ----------
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous"; // ⚠️ necesitas CORS si no es mismo origen
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });

  const drawImageFit = (ctx, im, x, y, w, h, fit = "cover", radius = 0) => {
    if (radius > 0) {
      ctx.save();
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.clip();
    }

    const iw = im.width;
    const ih = im.height;

    if (fit === "fill") {
      ctx.drawImage(im, x, y, w, h);
    } else {
      const scale = fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const dx = x + (w - sw) / 2;
      const dy = y + (h - sh) / 2;
      ctx.drawImage(im, dx, dy, sw, sh);
    }

    if (radius > 0) ctx.restore();
  };

  const exportAsImage = async (type = "png") => {
    const W = data.canvas.width;
    const H = data.canvas.height;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // fondo
    try {
      const bg = await loadImage(data.backgroundSrc);
      ctx.drawImage(bg, 0, 0, W, H);
    } catch (err) {
      console.warn("BG load failed:", err);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }

    // mapa grupos
    const gmap = new Map(data.groups.map((g) => [g.id, g]));

    // layers: abajo->arriba por zIndex
    const layers = [...data.layers]
      .map((l) => resolveLayer(l))
      .filter((l) => l.visible !== false)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const layer of layers) {
      const g = gmap.get(layer.groupId) || { x: 0, y: 0 };
      const x = (g.x || 0) + (layer.x || 0);
      const y = (g.y || 0) + (layer.y || 0);
      const w = layer.w || 0;
      const h = layer.h || 0;

      if (layer.type === "shape") {
        const fill = layer.props?.fill || "rgba(0,0,0,0.35)";
        const r = layer.props?.borderRadius || 0;

        ctx.save();
        ctx.fillStyle = fill;

        if (r > 0) {
          const rr = Math.min(r, w / 2, h / 2);
          ctx.beginPath();
          ctx.moveTo(x + rr, y);
          ctx.arcTo(x + w, y, x + w, y + h, rr);
          ctx.arcTo(x + w, y + h, x, y + h, rr);
          ctx.arcTo(x, y + h, x, y, rr);
          ctx.arcTo(x, y, x + w, y, rr);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }

        ctx.restore();
      }

      if (layer.type === "image") {
        const src = layer.props?.src;
        if (!src) continue;
        try {
          const im = await loadImage(src);
          drawImageFit(
            ctx,
            im,
            x,
            y,
            w,
            h,
            layer.props?.fit || "cover",
            layer.props?.borderRadius || 0
          );
        } catch (err) {
          console.warn("Image load failed:", src, err);
        }
      }

      if (layer.type === "text") {
        const text = String(layer.props?.text ?? "");
        const fontSize = Number(layer.props?.fontSize || 32);
        const fontWeight = layer.props?.fontWeight || 700;
        const fontFamily = layer.props?.fontFamily || "Inter, system-ui, Arial";
        const color = layer.props?.color || "#fff";
        const align = layer.props?.align || "left";

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "middle";

        let tx = x;
        if (align === "center") tx = x + w / 2;
        if (align === "right") tx = x + w;

        ctx.textAlign = align;
        ctx.fillText(text, tx, y + h / 2);
        ctx.restore();
      }
    }

    const mime = type === "jpg" ? "image/jpeg" : "image/png";
    const ext = type === "jpg" ? "jpg" : "png";
    const url = canvas.toDataURL(mime, type === "jpg" ? 0.92 : 1);

    const a = document.createElement("a");
    a.href = url;
    a.download = `banner_${Date.now()}.${ext}`;
    a.click();
  };
  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      {/* CANVAS */}
      <Box
  onMouseMove={onMove}
  onMouseUp={stop}
  onMouseLeave={stop}
  onMouseDown={() => setSelected(null)}
  sx={{
    width: data.canvas.width / SCALE,
    height: data.canvas.height / SCALE,
    position: "relative",
    backgroundImage: `url(${data.backgroundSrc})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 0",
    backgroundSize: "100% 100%", // ✅ igual que export (ctx.drawImage)
    border: "2px solid #333",
    overflow: "hidden",
    borderRadius: 2,
  }}
>

        {data.groups.map((group) => (
          <Box
            key={group.id}
            onMouseDown={(e) => startMoveGroup(group.id, e)}
            sx={{
              position: "absolute",
              left: group.x / SCALE,
              top: group.y / SCALE,
            }}
          >
            {data.layers
              .filter((l) => l.groupId === group.id && l.visible !== false)
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((rawLayer) => {
                const layer = resolveLayer(rawLayer);
                const isSelected =
                  selected?.kind === "layer" && selected.id === layer.id;

                return (
                  <Box
                    key={layer.id}
                    onMouseDown={(e) => startMoveLayer(layer.id, e)}
                    sx={{
                      position: "absolute",
                      left: layer.x / SCALE,
                      top: layer.y / SCALE,
                      width: layer.w / SCALE,
                      height: layer.h / SCALE,
                      zIndex: layer.zIndex,
                      cursor: layer.locked ? "not-allowed" : "grab",
                      outline: isSelected ? selectedBorder : "none",
                      outlineOffset: 2,
                      opacity: layer.visible === false ? 0.4 : 1,
                    }}
                  >
                    <LayerContent layer={layer} scale={SCALE} />

                    {isSelected &&
                      !layer.locked &&
                      handles.map((h) => (
                        <Box
                          key={h.key}
                          onMouseDown={(e) =>
                            startResizeLayer(layer.id, h.key, e)
                          }
                          sx={{
                            ...handleStyle(h.cursor),
                            ...(h.left !== undefined ? { left: h.left } : {}),
                            ...(h.right !== undefined ? { right: h.right } : {}),
                            ...(h.top !== undefined ? { top: h.top } : {}),
                            ...(h.bottom !== undefined
                              ? { bottom: h.bottom }
                              : {}),
                            ...(h.transform ? { transform: h.transform } : {}),
                          }}
                        />
                      ))}
                  </Box>
                );
              })}
          </Box>
        ))}
      </Box>

      {/* PANEL DERECHO */}
      <Box
        sx={{
          width: 460,
          p: 2,
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.12)",
          maxHeight: data.canvas.height / SCALE,
          overflow: "auto",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
          Capas (tipo Photoshop)
        </Typography>

        <Divider sx={{ mb: 1 }} />

        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button size="small" onClick={() => addLayer("text")} variant="contained">
            + Text
          </Button>
          <Button size="small" onClick={() => addLayer("image")} variant="contained">
            + Image
          </Button>
          <Button size="small" onClick={() => addLayer("shape")} variant="contained">
            + Shape
          </Button>
        </Stack>

        <Stack spacing={0.7}>
          {sortedLayersForPanel.map((l) => (
            <Box
              key={l.id}
              draggable
              onDragStart={() => setDragId(l.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorderByDrop(dragId, l.id)}
              onClick={() => setSelected({ kind: "layer", id: l.id })}
              sx={{
                p: 1,
                borderRadius: 1,
                border:
                  selectedLayer?.id === l.id
                    ? "2px solid #00E5FF"
                    : "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisible(l.id);
                  }}
                >
                  {l.visible ? "👁" : "🙈"}
                </Button>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocked(l.id);
                  }}
                >
                  {l.locked ? "🔒" : "🔓"}
                </Button>
                <Chip size="small" label={l.type} />
              </Stack>

              <TextField
                size="small"
                value={l.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setLayerMeta(l.id, { name: e.target.value })
                }
                sx={{ width: 160 }}
              />
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography fontWeight={900}>Exportar</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button variant="contained" onClick={() => exportAsImage("png")}>
            PNG
          </Button>
          <Button variant="outlined" onClick={() => exportAsImage("jpg")}>
            JPG
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Button
          size="small"
          variant="outlined"
          onClick={() => copyText(exportTemplateText)}
        >
          Copiar template
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => copyText(exportOpsText)}
        >
          Copiar ops
        </Button>
      </Box>
    </Box>
  );
}

