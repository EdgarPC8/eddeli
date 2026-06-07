import React from "react";
import { Box } from "@mui/material";
import { SCALE } from "../editorActions";
import { resolveLayer } from "../bind/resolveTemplate";
import TransformBox from "./TransformBox";

function LayerContent({ layer, scale }) {
  if (layer.type === "image") {
    const src = layer.props?.src || "";
    return (
<img
  key={src}
  src={src}
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
    const verticalAlign = layer.props?.verticalAlign || "top";
    const wrap = layer.props?.wrap !== false;
    const clampLines = Number(layer.props?.maxLines || 0);
    
    const lineHeight = Number(layer.props?.lineHeight || 1.1);

    // Mapeo de alineación vertical a alignItems
    const alignItemsMap = {
      top: "flex-start",
      center: "center",
      bottom: "flex-end",
    };

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          color: layer.props?.color || "#fff",
          fontFamily: layer.props?.fontFamily || "Inter, system-ui, Arial",
          fontSize: (layer.props?.fontSize || 32) / scale,
          fontWeight: layer.props?.fontWeight || 700,
          letterSpacing: `${Number(layer.props?.letterSpacing || 0) / scale}px`,
          lineHeight,

          WebkitTextStroke:
            Number(layer.props?.strokeWidth || 0) > 0 && layer.props?.stroke
              ? `${Number(layer.props?.strokeWidth || 0) / scale}px ${layer.props?.stroke}`
              : "0px transparent",

          textShadow:
            Number(layer.props?.shadowBlur || 0) > 0
              ? `${Number(layer.props?.shadowOffsetX || 0) / scale}px ${
                  Number(layer.props?.shadowOffsetY || 0) / scale
                }px ${Number(layer.props?.shadowBlur || 0) / scale}px ${
                  layer.props?.shadowColor || "transparent"
                }`
              : "none",

          display: "flex",
          alignItems: alignItemsMap[verticalAlign] || "flex-start",
          justifyContent:
            align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
          textAlign: align,

          whiteSpace: wrap ? "pre-wrap" : "nowrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          overflow: "hidden",

          ...(clampLines > 0
            ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: clampLines }
            : {}),

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

export default function LayerRenderer({
  doc,
  docData,
  selected,
  selectedBorder,
  onLayerMouseDown,
  onResizeStart,
  onGroupMouseDown,
}) {
  const groups = doc?.groups || [];
  const layers = doc?.layers || [];

  return (
    <>
      {groups.map((group) => (
        <Box
          key={group.id}
          onMouseDown={(e) => onGroupMouseDown(group.id, e)}
          sx={{
            position: "absolute",
            left: (group.x || 0) / SCALE,
            top: (group.y || 0) / SCALE,
          }}
        >
          {layers
            .filter((l) => l.groupId === group.id && l.visible !== false)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((rawLayer) => {
              // ✅ AQUÍ: resolver con doc + docData
              const layer = resolveLayer(doc, docData, rawLayer);

              const isSelected = selected?.kind === "layer" && selected.id === layer.id;

              return (
                <Box
                  key={layer.id}
                  onMouseDown={(e) => onLayerMouseDown(layer.id, e)}
                  sx={{
                    position: "absolute",
                    left: (layer.x || 0) / SCALE,
                    top: (layer.y || 0) / SCALE,
                    width: (layer.w || 0) / SCALE,
                    height: (layer.h || 0) / SCALE,
                    zIndex: layer.zIndex,
                    cursor: layer.locked ? "not-allowed" : "grab",
                    outline: isSelected ? selectedBorder : "none",
                    outlineOffset: 2,
                    opacity: layer.visible === false ? 0.4 : 1,
                  }}
                >
                  <LayerContent layer={layer} scale={SCALE} />

                  {isSelected && !layer.locked && (
                    <TransformBox
                      layer={layer}
                      selectedBorder={selectedBorder}
                      onResizeStart={onResizeStart}
                    />
                  )}
                </Box>
              );
            })}
        </Box>
      ))}
    </>
  );
}
