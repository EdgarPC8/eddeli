import { Box, Typography } from "@mui/material";
import { SIGNAGE_THEME } from "../constants.js";

const STATUS = {
  loading: {
    color: SIGNAGE_THEME.gold,
    label: "Conectando…",
  },
  online: {
    color: "#4ADE80",
    label: "Conectado",
  },
  offline: {
    color: "#FF6B6B",
    label: "Sin conexión",
  },
};

/**
 * Indicador de enlace con el backend EdDeli (esquina superior derecha).
 */
export default function SignageConnectionBadge({ status = "loading", detail = "" }) {
  const cfg = STATUS[status] || STATUS.loading;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        bgcolor: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(6px)",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: cfg.color,
          boxShadow: `0 0 8px ${cfg.color}`,
          animation: status === "loading" ? "signagePulse 1.2s ease-in-out infinite" : "none",
          "@keyframes signagePulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.35 },
          },
        }}
      />
      <Typography sx={{ color: SIGNAGE_THEME.white, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
        {cfg.label}
        {detail ? (
          <Box component="span" sx={{ display: "block", fontSize: 10, fontWeight: 500, opacity: 0.85 }}>
            {detail}
          </Box>
        ) : null}
      </Typography>
    </Box>
  );
}
