/**
 * Home público (sin sesión): una sola pantalla sin scroll.
 * Carrusel infinito de módulos con secciones rotando.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip,
  alpha,
} from "@mui/material";
import { keyframes, useTheme } from "@mui/material/styles";
import LoginIcon from "@mui/icons-material/Login";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import StoreMallDirectoryRoundedIcon from "@mui/icons-material/StoreMallDirectoryRounded";
import ExtensionIcon from "@mui/icons-material/Extension";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PeopleIcon from "@mui/icons-material/People";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";

import { useAppSettings } from "../../../context/AppSettingsContext.jsx";
import { listCatalogModuleGroupsWithStatus } from "../../../config/appModulesCatalog.js";

const HOME_MODULE_IDS = ["operacion", "inventario", "ventas", "finanzas", "produccion"];

const GROUP_ICON = {
  operacion: PointOfSaleIcon,
  inventario: Inventory2Icon,
  ventas: PeopleIcon,
  finanzas: AccountBalanceWalletIcon,
  produccion: PrecisionManufacturingIcon,
  catalogo: BakeryDiningIcon,
  locales: StoreMallDirectoryRoundedIcon,
};

const marqueeLeft = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const softFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(3deg); }
`;

const softFloatAlt = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(12px) rotate(-4deg); }
`;

const slowSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const sectionSwap = keyframes`
  0% { opacity: 0; transform: translateY(8px); }
  12% { opacity: 1; transform: translateY(0); }
  88% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-6px); }
`;

const BACKDROP_ICONS = [
  BakeryDiningIcon,
  PointOfSaleIcon,
  Inventory2Icon,
  AccountBalanceWalletIcon,
  PeopleIcon,
  PrecisionManufacturingIcon,
  StoreMallDirectoryRoundedIcon,
];

function HomeBackdrop({ logoUrl }) {
  const theme = useTheme();
  const isNeon = theme.palette.customMode === "neon";
  const colors = theme.palette.colors || {};
  const accents = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    colors.teal || "#1ABC9C",
    colors.blue || "#3498DB",
    colors.orange || "#FF8C42",
    colors.cyan || "#00BCD4",
    colors.green || "#2ECC71",
  ];

  const iconSpots = [
    { top: "12%", left: "6%", size: 52 },
    { top: "22%", right: "8%", size: 64 },
    { top: "58%", left: "4%", size: 46 },
    { top: "48%", right: "5%", size: 58 },
    { top: "78%", left: "18%", size: 42 },
    { top: "70%", right: "16%", size: 50 },
    { top: "34%", left: "22%", size: 40 },
  ];

  const logoSpots = [
    { top: "8%", right: "14%", size: { xs: 120, md: 180 }, opacity: 0.14, delay: "0s" },
    { bottom: "18%", left: "6%", size: { xs: 90, md: 140 }, opacity: 0.1, delay: "1.2s" },
    { top: "42%", left: "42%", size: { xs: 160, md: 260 }, opacity: 0.07, delay: "0.6s" },
  ];

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Anillos decorativos */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: { xs: 420, md: 640 },
          height: { xs: 420, md: 640 },
          ml: { xs: -210, md: -320 },
          mt: { xs: -210, md: -320 },
          borderRadius: "50%",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          animation: `${slowSpin} 48s linear infinite`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: { xs: 300, md: 460 },
          height: { xs: 300, md: 460 },
          ml: { xs: -150, md: -230 },
          mt: { xs: -150, md: -230 },
          borderRadius: "50%",
          border: `1px dashed ${alpha(theme.palette.secondary.main, 0.16)}`,
          animation: `${slowSpin} 64s linear infinite reverse`,
        }}
      />

      {/* Logos redondos */}
      {logoUrl
        ? logoSpots.map((spot, i) => (
            <Box
              key={`logo-${i}`}
              sx={{
                position: "absolute",
                top: spot.top,
                left: spot.left,
                right: spot.right,
                bottom: spot.bottom,
                width: spot.size,
                height: spot.size,
                borderRadius: "50%",
                overflow: "hidden",
                opacity: spot.opacity,
                animation: `${i % 2 ? softFloatAlt : softFloat} ${7 + i}s ease-in-out infinite`,
                animationDelay: spot.delay,
                boxShadow: isNeon
                  ? `0 0 40px ${alpha(theme.palette.primary.main, 0.25)}`
                  : `0 16px 40px ${alpha("#000", 0.12)}`,
                border: `2px solid ${alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.55 : 0.12)}`,
              }}
            >
              <Box
                component="img"
                src={logoUrl}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          ))
        : null}

      {/* Burbujas con iconos */}
      {iconSpots.map((spot, i) => {
        const Icon = BACKDROP_ICONS[i % BACKDROP_ICONS.length];
        const accent = accents[i % accents.length];
        return (
          <Box
            key={`icon-${i}`}
            sx={{
              position: "absolute",
              top: spot.top,
              left: spot.left,
              right: spot.right,
              width: spot.size,
              height: spot.size,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: accent,
              bgcolor: alpha(accent, theme.palette.mode === "light" ? 0.1 : 0.14),
              border: `1px solid ${alpha(accent, 0.28)}`,
              backdropFilter: "blur(2px)",
              animation: `${i % 2 ? softFloat : softFloatAlt} ${6 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.35}s`,
              boxShadow: isNeon ? `0 0 16px ${alpha(accent, 0.22)}` : "none",
            }}
          >
            <Icon sx={{ fontSize: spot.size * 0.48, opacity: 0.75 }} />
          </Box>
        );
      })}
    </Box>
  );
}

function useRotatingIndex(length, intervalMs, offset = 0) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return undefined;
    let intervalId;
    const startId = window.setTimeout(() => {
      setIndex((i) => (i + 1) % length);
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % length);
      }, intervalMs);
    }, offset);
    return () => {
      window.clearTimeout(startId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [length, intervalMs, offset]);
  return length ? index % length : 0;
}

function ModuleMarqueeCard({ item, accent, rotateOffset }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const Icon = GROUP_ICON[item.id] || ExtensionIcon;
  const sections = item.sections?.length ? item.sections : [item.description || "Módulo"];
  const sectionIdx = useRotatingIndex(sections.length, 2800, rotateOffset);
  const isNeon = theme.palette.customMode === "neon";
  const clickable = Boolean(item.to);

  return (
    <Box
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => navigate(item.to) : undefined}
      sx={{
        flex: "0 0 auto",
        width: { xs: 200, sm: 220, md: 240 },
        height: { xs: 148, sm: 158 },
        textAlign: "left",
        border: `1px solid ${alpha(accent, isNeon ? 0.55 : 0.28)}`,
        cursor: clickable ? "pointer" : "default",
        borderRadius: 2.5,
        p: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        background:
          theme.palette.mode === "light"
            ? `linear-gradient(155deg, ${alpha("#fff", 0.92)} 0%, ${alpha(accent, 0.22)} 100%)`
            : `linear-gradient(155deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(accent, 0.28)} 100%)`,
        boxShadow: isNeon
          ? `0 0 20px ${alpha(accent, 0.28)}, inset 0 0 0 1px ${alpha(accent, 0.2)}`
          : `0 10px 24px ${alpha(accent, 0.18)}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px) scale(1.02)",
          boxShadow: isNeon
            ? `0 0 28px ${alpha(accent, 0.42)}`
            : `0 14px 28px ${alpha(accent, 0.28)}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(accent, theme.palette.mode === "light" ? 0.18 : 0.28),
            color: accent,
          }}
        >
          <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1rem",
            lineHeight: 1.15,
            color: theme.palette.text.primary,
          }}
        >
          {item.name}
        </Typography>
      </Stack>

      <Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden", minHeight: 44 }}>
        <Typography
          key={`${item.id}-${sectionIdx}`}
          sx={{
            fontSize: "0.82rem",
            lineHeight: 1.35,
            color: theme.palette.text.secondary,
            animation: `${sectionSwap} 2.8s ease both`,
          }}
        >
          {sections[sectionIdx]}
        </Typography>
      </Box>

      <Chip
        size="small"
        label={`${sections.length} sección${sections.length === 1 ? "" : "es"}`}
        sx={{
          alignSelf: "flex-start",
          height: 20,
          fontWeight: 700,
          fontSize: "0.68rem",
          bgcolor: alpha(accent, 0.16),
          color: accent,
          border: `1px solid ${alpha(accent, 0.35)}`,
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
    </Box>
  );
}

export default function HomeLogout() {
  const { activeApp } = useAppSettings();
  const theme = useTheme();
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);

  const showCatalog = activeApp?.showPublicCatalog !== false;
  const showPropia = activeApp?.showPublicStoresPropia !== false;
  const showVitrina = activeApp?.showPublicStoresVitrina !== false;
  const showStores = showPropia || showVitrina;
  const isNeon = theme.palette.customMode === "neon";
  const colors = theme.palette.colors || {};

  const accentPalette = [
    colors.teal || "#1ABC9C",
    colors.blue || "#3498DB",
    colors.orange || "#FF8C42",
    colors.green || "#2ECC71",
    colors.cyan || "#00BCD4",
    colors.pink || "#FF3D67",
    theme.palette.primary.main,
    theme.palette.secondary.main,
  ];

  const modules = useMemo(() => {
    const all = listCatalogModuleGroupsWithStatus();
    const core = HOME_MODULE_IDS.map((id) => all.find((m) => m.id === id)).filter(Boolean);
    const extras = [];
    if (showCatalog) {
      extras.push({
        id: "catalogo",
        name: "Catálogo",
        description: "Vitrina pública",
        sections: ["Productos", "Ofertas", "Comparativas", "Categorías"],
        to: "/catalogo",
      });
    }
    if (showStores) {
      extras.push({
        id: "locales",
        name: "Locales",
        description: "Sucursales y vitrinas",
        sections: showPropia && showVitrina
          ? ["Sucursales", "Vitrinas", "Mapa", "Contacto"]
          : showPropia
            ? ["Sucursales", "Mapa", "Contacto"]
            : ["Vitrinas", "Mapa", "Contacto"],
        to: "/punto_venta",
      });
    }
    return [...extras, ...core];
  }, [showCatalog, showStores, showPropia, showVitrina]);

  const loopItems = useMemo(() => [...modules, ...modules], [modules]);

  const socials = [
    activeApp.socials?.whatsapp && {
      key: "wa",
      href: activeApp.socials.whatsapp,
      icon: <WhatsAppIcon fontSize="small" />,
    },
    activeApp.socials?.facebook && {
      key: "fb",
      href: activeApp.socials.facebook,
      icon: <FacebookIcon fontSize="small" />,
    },
    activeApp.socials?.instagram && {
      key: "ig",
      href: activeApp.socials.instagram,
      icon: <InstagramIcon fontSize="small" />,
    },
    activeApp.socials?.tiktok && {
      key: "tt",
      href: activeApp.socials.tiktok,
      icon: (
        <Box
          sx={{
            width: 18,
            height: 18,
            bgcolor: "currentColor",
            WebkitMask: "url(./logo_tiktok.svg) no-repeat center / contain",
            mask: "url(./logo_tiktok.svg) no-repeat center / contain",
          }}
        />
      ),
    },
    activeApp.socials?.email && {
      key: "em",
      href: `mailto:${activeApp.socials.email}`,
      icon: <EmailIcon fontSize="small" />,
    },
  ].filter(Boolean);

  return (
    <Box
      sx={{
        // Llena el viewport: cancela padding del main y reserva espacio del AppBar arriba
        boxSizing: "border-box",
        height: "100dvh",
        minHeight: "100dvh",
        maxHeight: "100dvh",
        mt: -10,
        mb: -3,
        pt: "64px",
        mx: { xs: -1.5, sm: -2, md: -3 },
        width: { xs: "calc(100% + 24px)", sm: "calc(100% + 32px)", md: "calc(100% + 48px)" },
        maxWidth: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        color: theme.palette.text.primary,
        background: isNeon
          ? `
            radial-gradient(900px 420px at 8% 0%, ${alpha(theme.palette.secondary.main, 0.18)}, transparent 55%),
            radial-gradient(700px 380px at 95% 10%, ${alpha(theme.palette.primary.main, 0.16)}, transparent 50%),
            radial-gradient(500px 280px at 50% 100%, ${alpha(colors.teal || "#1ABC9C", 0.12)}, transparent 55%),
            ${theme.palette.background.default}
          `
          : theme.palette.mode === "dark"
            ? `
              radial-gradient(800px 400px at 10% 0%, ${alpha(theme.palette.primary.main, 0.2)}, transparent 55%),
              radial-gradient(640px 360px at 100% 20%, ${alpha(colors.teal || "#1ABC9C", 0.12)}, transparent 50%),
              ${theme.palette.background.default}
            `
            : `
              radial-gradient(900px 420px at 0% 0%, ${alpha(colors.teal || "#1ABC9C", 0.16)}, transparent 55%),
              radial-gradient(700px 360px at 100% 0%, ${alpha(colors.blue || "#3498DB", 0.14)}, transparent 50%),
              radial-gradient(600px 300px at 50% 100%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 55%),
              linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)
            `,
      }}
    >
      <HomeBackdrop logoUrl={activeApp.logoUrl} />

      {/* Hero compacto */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 2, sm: 3, md: 5 },
          pt: { xs: 1.5, md: 2 },
          pb: 1,
          animation: `${fadeIn} 0.5s ease both`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={{ xs: 2, md: 3 }}
        >
          <Stack spacing={1} sx={{ maxWidth: 640, minWidth: 0 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              {activeApp.logoUrl ? (
                <Box
                  component="img"
                  src={activeApp.logoUrl}
                  alt={activeApp.alias || "Logo"}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                    boxShadow: isNeon
                      ? `0 0 18px ${alpha(theme.palette.primary.main, 0.4)}`
                      : `0 6px 16px ${alpha("#000", 0.18)}`,
                  }}
                />
              ) : null}
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    color: colors.teal || theme.palette.secondary.main,
                  }}
                >
                  SoftEd
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: `'Fredoka', 'Nunito', 'Poppins', sans-serif`,
                    fontWeight: 700,
                    fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    background: `linear-gradient(90deg, ${theme.palette.text.primary}, ${theme.palette.primary.main} 55%, ${colors.teal || theme.palette.secondary.main})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {activeApp.alias || "EdDeli"}
                </Typography>
              </Box>
            </Stack>

            <Typography
              sx={{
                fontSize: { xs: "0.9rem", md: "1rem" },
                lineHeight: 1.4,
                color: theme.palette.text.secondary,
                maxWidth: 520,
              }}
            >
              {activeApp.description ||
                "Sistema de gestión para panadería, pastelería y operación diaria."}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                label={`v${activeApp.version || "1.0.0"}`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: alpha(colors.blue || theme.palette.info?.main || "#3498DB", 0.14),
                  color: colors.blue || "#3498DB",
                  border: `1px solid ${alpha(colors.blue || "#3498DB", 0.35)}`,
                }}
              />
              {activeApp.name && activeApp.name !== activeApp.alias ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {activeApp.name}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "row", md: "column" }} spacing={1} flexShrink={0}>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={() => navigate("/login")}
              sx={{
                fontWeight: 800,
                px: 2.5,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${colors.orange || theme.palette.secondary.main})`,
                boxShadow: `0 8px 22px ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              Iniciar sesión
            </Button>
            {showCatalog ? (
              <Button
                variant="outlined"
                startIcon={<BakeryDiningIcon />}
                onClick={() => navigate("/catalogo")}
                sx={{
                  borderColor: alpha(colors.teal || "#1ABC9C", 0.55),
                  color: colors.teal || "#1ABC9C",
                  "&:hover": {
                    borderColor: colors.teal || "#1ABC9C",
                    bgcolor: alpha(colors.teal || "#1ABC9C", 0.08),
                  },
                }}
              >
                Catálogo
              </Button>
            ) : null}
            {showStores ? (
              <Button
                variant="outlined"
                startIcon={<StoreMallDirectoryRoundedIcon />}
                onClick={() => navigate("/punto_venta")}
                sx={{
                  borderColor: alpha(colors.blue || "#3498DB", 0.55),
                  color: colors.blue || "#3498DB",
                  "&:hover": {
                    borderColor: colors.blue || "#3498DB",
                    bgcolor: alpha(colors.blue || "#3498DB", 0.08),
                  },
                }}
              >
                Locales
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      {/* Ascensor horizontal infinito */}
      <Box sx={{ position: "relative", zIndex: 1, flex: "0 0 auto", pb: 1 }}>
        <Typography
          sx={{
            px: { xs: 2, sm: 3, md: 5 },
            mb: 1,
            fontSize: "0.7rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 800,
            color: theme.palette.text.secondary,
          }}
        >
          Módulos · secciones en vivo
        </Typography>

        <Box
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          sx={{
            position: "relative",
            overflow: "hidden",
            maskImage:
              "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              width: "max-content",
              gap: 1.5,
              pl: 2,
              animation: `${marqueeLeft} ${Math.max(28, modules.length * 7)}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
              "&:hover": { animationPlayState: "paused" },
            }}
          >
            {loopItems.map((item, idx) => (
              <ModuleMarqueeCard
                key={`${item.id}-${idx}`}
                item={item}
                accent={accentPalette[idx % accentPalette.length]}
                rotateOffset={(idx % modules.length) * 450}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Footer mínimo */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          position: "relative",
          zIndex: 1,
          mt: "auto",
          flex: "0 0 auto",
          px: { xs: 2, sm: 3, md: 5 },
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.paper, 0.55),
          backdropFilter: "blur(8px)",
        }}
      >
        <Typography variant="caption" color="text.secondary" noWrap>
          © {activeApp.year} {activeApp.author}
          {activeApp.phone ? ` · ${activeApp.phone}` : ""}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {socials.map((s) => (
            <IconButton
              key={s.key}
              component="a"
              href={s.href}
              target={s.key === "em" ? undefined : "_blank"}
              rel="noopener noreferrer"
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "primary.main" },
              }}
            >
              {s.icon}
            </IconButton>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
