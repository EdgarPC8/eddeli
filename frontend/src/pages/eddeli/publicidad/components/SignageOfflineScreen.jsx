/**
 * Pantalla fija de respaldo cuando el backend no está disponible.
 * Publicidad de panadería: lluvia de pasteles + mensajes rotativos (sin logo ni precios).
 */
import { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { OFFLINE_SIGNAGE, OFFLINE_SLIDE_DURATION_SEC, SIGNAGE_THEME } from "../constants.js";
import { cardSoftSx, metallicRedSx, textOnRedSx } from "../utils/signageMetallic.js";

const T = SIGNAGE_THEME;
const FADE_MS = 600;
const SPINNER_MS = 600;
const WARMUP_MS = 900;

function buildRainItems(figures, count = 28) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: figures[i % figures.length],
    left: `${(i * 17 + 3) % 96}%`,
    // Retraso negativo = animación ya en marcha (no amontonados arriba).
    delay: `${-((i * 0.55 + Math.random() * 2) % 7)}s`,
    duration: `${7 + (i % 5) * 1.2}s`,
    size: 1.6 + (i % 4) * 0.45,
    drift: i % 2 === 0 ? -18 : 18,
  }));
}

function PastryRain({ compact, figures, visible }) {
  const items = useMemo(() => buildRainItems(figures), [figures]);

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        "@keyframes pastryRain": {
          "0%": {
            transform: "translateY(-12vh) translateX(0) rotate(0deg)",
            opacity: 0,
          },
          "8%": { opacity: 0.38 },
          "92%": { opacity: 0.32 },
          "100%": {
            transform: "translateY(112vh) translateX(var(--drift)) rotate(360deg)",
            opacity: 0,
          },
        },
      }}
    >
      {items.map((item) => (
        <Box
          key={item.id}
          component="span"
          sx={{
            position: "absolute",
            top: 0,
            left: item.left,
            fontSize: compact ? `${item.size * 0.55}rem` : `${item.size}rem`,
            lineHeight: 1,
            userSelect: "none",
            filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.2))",
            animation: `pastryRain ${item.duration} linear infinite`,
            animationDelay: item.delay,
            "--drift": `${item.drift}px`,
          }}
        >
          {item.emoji}
        </Box>
      ))}
    </Box>
  );
}

export default function SignageOfflineScreen({ compact = false }) {
  const { slides, rainFigures } = OFFLINE_SIGNAGE;
  const [phase, setPhase] = useState("loading");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const slide = slides[index] || slides[0];

  useEffect(() => {
    setPhase("loading");
    setIndex(0);
    setVisible(true);

    const toWarm = setTimeout(() => setPhase("warming"), SPINNER_MS);
    return () => clearTimeout(toWarm);
  }, []);

  useEffect(() => {
    if (phase !== "warming") return undefined;
    const toReady = setTimeout(() => setPhase("ready"), WARMUP_MS);
    return () => clearTimeout(toReady);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready" || slides.length <= 1) return undefined;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setVisible(true);
      }, FADE_MS);
    }, OFFLINE_SLIDE_DURATION_SEC * 1000);

    return () => clearInterval(interval);
  }, [phase, slides.length]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: compact ? 2 : 4,
        ...metallicRedSx,
      }}
    >
      {phase !== "loading" ? (
        <PastryRain compact={compact} figures={rainFigures} visible={phase === "ready"} />
      ) : null}

      {phase === "loading" ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <CircularProgress size={compact ? 36 : 52} sx={{ color: T.gold }} />
        </Box>
      ) : null}

      {phase === "ready" ? (
        <>
          <Box
            sx={{
              position: "absolute",
              width: compact ? 200 : 480,
              height: compact ? 200 : 480,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,230,163,0.28) 0%, transparent 70%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              maxWidth: compact ? 300 : 820,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(8px)",
              transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: compact ? 2 : 5,
                fontSize: compact ? "1.5rem" : "clamp(2.4rem, 6.5vw, 5rem)",
                lineHeight: 1.08,
                mb: compact ? 1.5 : 2.5,
                ...textOnRedSx,
                textShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}
            >
              {slide.title}
            </Typography>

            <Box
              sx={{
                mx: "auto",
                px: compact ? 2 : 4,
                py: compact ? 1.5 : 2.5,
                maxWidth: compact ? "100%" : 640,
                borderRadius: 3,
                ...cardSoftSx,
                boxShadow: `
                  0 20px 56px rgba(0,0,0,0.28),
                  0 0 0 4px rgba(245,230,163,0.55),
                  inset 0 1px 0 rgba(255,255,255,0.95)
                `,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: compact ? "0.9rem" : "clamp(1.15rem, 2.8vw, 2rem)",
                  color: T.black,
                  lineHeight: 1.35,
                  textTransform: "uppercase",
                  letterSpacing: compact ? 0.5 : 1,
                }}
              >
                {slide.message}
              </Typography>
            </Box>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
