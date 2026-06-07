// src/theme/eddeliTheme.js (EdDeli / panadería — mantener alineado con getTheme.js)
import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { getChartsPalette } from "./chartPalette";

const brand = {
  crema:    "#FFF3D9",
  dorado:   "#F5C56B",
  caramelo: "#D98B48",
  chocolate:"#6B3E2E",
  harina:   "#FEF9EE",
  pan:      "#E5B67B",
};

const commonColors = {
  red: "#FF6F61",
  green: "#2ECC71",
  orange: "#FF8C42",
  blue: "#3498DB",
  purple: "#9B59B6",
  yellow: "#F1C40F",
  pink: "#FF3D67",
  teal: "#1ABC9C",
  gold: "#FFD700",
  lavender: "#E6E6FA",
  cyan: "#00BCD4",
  gray: "#eeeeee",
  ...brand,
};

/** Util: variantes compartidas que reaccionan a customMode */
function componentVariants() {
  return {
    MuiPaper: {
      variants: [
        // 👉 tu variante "panel" existente (déjala)
        {
          props: { variant: "panel" },
          style: ({ theme }) => {
            const isNeon = theme.palette.customMode === "neon";
            return {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.background.paper, 0.9)
                  : "rgba(255,255,255,0.85)", // ← menos blanco plano
              borderRadius: 12,
              border: isNeon
                ? `1px solid ${alpha(theme.palette.primary.main, 0.35)}`
                : `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              boxShadow: isNeon
                ? `0 0 18px ${alpha(theme.palette.primary.main, 0.18)}`
                : "0 3px 12px rgba(0,0,0,.08)",
              backdropFilter:
                theme.palette.mode === "light" || isNeon ? "blur(6px)" : "none",
            };
          },
        },

        // 🧁 panel-cream: crema translúcido (glass)
        {
          props: { variant: "panel-cream" },
          style: ({ theme }) => ({
            background: "rgba(255, 248, 236, 0.65)",
            backdropFilter: "blur(6px)",
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
            boxShadow: "0 6px 24px rgba(0,0,0,.08)",
          }),
        },

        // 🔥 panel-warm: degradado cálido sutil
        {
          props: { variant: "panel-warm" },
          style: ({ theme }) => ({
            background:
              "linear-gradient(180deg, rgba(255, 245, 224, 0.9) 0%, rgba(255, 238, 204, 0.9) 100%)",
            borderRadius: 16,
            border: `1px solid ${alpha("#E2A05B", 0.25)}`,
            boxShadow: "0 8px 28px rgba(190, 120, 40, 0.12)",
          }),
        },

        // 👻 panel-ghost: casi transparente
        {
          props: { variant: "panel-ghost" },
          style: ({ theme }) => ({
            background: "transparent",
            borderRadius: 16,
            border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
            boxShadow: "none",
          }),
        },

        // 🟡 panel-outline: contorno + leve glow
        {
          props: { variant: "panel-outline" },
          style: ({ theme }) => ({
            background: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(4px)",
            borderRadius: 16,
            border: `1px solid ${alpha("#B87434", 0.25)}`,
            boxShadow: `0 0 0 4px ${alpha("#FFF3D9", 0.4)} inset, 0 10px 24px rgba(0,0,0,.08)`,
          }),
        },
      ],
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },

    // 👉 deja tal cual tu MuiButton con variant "ctrl"
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 12, fontWeight: 600 },
      },
      variants: [
        {
          props: { variant: "ctrl" },
          style: ({ theme }) => {
            const isNeon = theme.palette.customMode === "neon";
            const isLight = theme.palette.mode === "light";
            if (isNeon) {
              return {
                borderRadius: 14,
                fontWeight: 700,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: theme.palette.background.default,
                boxShadow: `0 0 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                "&:hover": {
                  filter: "brightness(1.06)",
                  boxShadow: `0 0 18px ${alpha(theme.palette.primary.main, 0.45)}`,
                },
              };
            }
            if (isLight) {
              return {
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(
                  theme.palette.primary.light, 0.9
                )})`,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  background: `linear-gradient(90deg, ${alpha(
                    theme.palette.primary.dark, 0.95
                  )}, ${theme.palette.primary.main})`,
                },
              };
            }
            return {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              "&:hover": { backgroundColor: theme.palette.primary.dark },
            };
          },
        },
      ],
    },
  };
}


export function getTheme(mode = "light") {
  // ============= PANADERÍA DARK =============
  if (mode === "dark") {
    return createTheme({
      palette: {
        mode: "dark",
        customMode: "dark", // 👈 flag propio para variantes
        background: {
          default: "#0C0A07", // horno oscuro
          paper: "#15110C",
        },
        primary: {
          light: "#C78C52",
          main: "#B87434",   // caramelo
          dark: "#8E5825",
          contrastText: "#fff",
        },
        secondary: {
          light: "#FFE0A6",
          main: "#E5B667",   // dorado pan
          dark: "#C0903F",
          contrastText: "#1A1200",
        },
        text: {
          primary: "#F7EADA",
          secondary: alpha("#F7EADA", 0.78),
        },
        divider: alpha("#F7EADA", 0.12),
        colors: commonColors,
        charts: getChartsPalette("dark"),
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: `'Poppins', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
        h1: { fontWeight: 800, letterSpacing: "-0.02em" },
        h2: { fontWeight: 800, letterSpacing: "-0.02em" },
        button: { letterSpacing: "0.02em" },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              background:
                `radial-gradient(800px 400px at 20% -10%, rgba(245,197,107,.08), transparent 60%),
                 radial-gradient(700px 300px at 110% 10%, rgba(215,139,72,.08), transparent 60%),
                 linear-gradient(180deg, #0F0C08 0%, #0C0A07 100%)`,
            },
          },
        },
        ...componentVariants(),
      },
    });
  }

  // ============= PANADERÍA NEON (Tron cálido) =============
  if (mode === "neon") {
    return createTheme({
      palette: {
        mode: "dark",
        customMode: "neon",
        background: {
          default: "#080A0D",
          paper: "#0C1014",
        },
        primary: {
          light: "#FFE3A8",
          main: "#FFD166",   // dorado brillante
          dark: "#C69B2D",
          contrastText: "#1A1200",
        },
        secondary: {
          light: "#9CF2FF",
          main: "#19D3FF",   // cian acento
          dark: "#0AA6CC",
          contrastText: "#001018",
        },
        text: {
          primary: "#FFF7E6",
          secondary: alpha("#FFF7E6", 0.8),
        },
        divider: alpha("#FFD166", 0.22),
        colors: { ...commonColors, neonGold: "#FFD166", neonCyan: "#19D3FF" },
        charts: getChartsPalette("neon"),
      },
      shape: { borderRadius: 18 },
      shadows: [
        "none",
        "0 0 12px rgba(255,209,102,.25)",
        "0 0 16px rgba(25,211,255,.22)",
        ...Array(22).fill("0 0 18px rgba(255,209,102,.16)"),
      ],
      typography: {
        fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
        h1: { fontWeight: 800, letterSpacing: "-0.02em" },
        h2: { fontWeight: 800, letterSpacing: "-0.02em" },
        button: { letterSpacing: "0.02em" },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              background:
                `radial-gradient(1200px 600px at 20% -10%, rgba(25,211,255,.10), transparent 60%),
                 radial-gradient(900px 400px at 110% 10%, rgba(255,209,102,.10), transparent 60%),
                 #080A0D`,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0))",
              border: "1px solid rgba(255,209,102,.22)",
              boxShadow: "0 0 22px rgba(255,209,102,.15)",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              border: "1px solid rgba(25,211,255,.35)",
              boxShadow: "0 0 12px rgba(25,211,255,.25)",
            },
          },
        },
        ...componentVariants(),
      },
    });
  }

  // ============= PANADERÍA LIGHT (default) =============
  return createTheme({
    
    palette: {
      mode: "light",
      customMode: "light",
      background: {
        default: "#FFF9F2",
        paper: "rgba(255,255,255,0.92)",
      },
      primary: {
        light: "#F6C98B",   // mantequilla
        main: "#E2A05B",    // dorado pan
        dark: "#B87434",    // caramelo
        contrastText: "#fff",
      },
      secondary: {
        light: "#FFE7B3",
        main: "#F1C40F",
        dark: "#D4A017",
        contrastText: "#3E2C00",
      },
      text: {
        primary: "#3E2C00",
        secondary: "#7B5A34",
      },
      divider: alpha("#3E2C00", 0.12),
      colors: commonColors,
      charts: getChartsPalette("light"),
    },
    
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: `'Poppins', 'Roboto', sans-serif`,
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      
  MuiCssBaseline: {
  styleOverrides: {
    body: {
      background: `
        radial-gradient(800px 400px at 20% -10%, rgba(226,160,91,.12), transparent 60%),
        radial-gradient(700px 300px at 110% 10%, rgba(245,197,107,.12), transparent 60%),
        linear-gradient(180deg, #FFF6E5 0%, #FFE3B0 100%)`,
      backgroundAttachment: "fixed",
    },
  },
},

      ...componentVariants(),
    },
    
  }

);
}
