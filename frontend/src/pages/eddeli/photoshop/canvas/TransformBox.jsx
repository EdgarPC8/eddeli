import React from "react";
import { Box } from "@mui/material";
import { SCALE } from "../editorActions";

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

export default function TransformBox({ layer, selectedBorder, onResizeStart }) {
  return (
    <>
      {handles.map((h) => (
        <Box
          key={h.key}
          onMouseDown={(e) => onResizeStart(layer.id, h.key, e)}
          sx={{
            ...handleStyle(h.cursor),
            ...(h.left !== undefined ? { left: h.left } : {}),
            ...(h.right !== undefined ? { right: h.right } : {}),
            ...(h.top !== undefined ? { top: h.top } : {}),
            ...(h.bottom !== undefined ? { bottom: h.bottom } : {}),
            ...(h.transform ? { transform: h.transform } : {}),
          }}
        />
      ))}
    </>
  );
}
