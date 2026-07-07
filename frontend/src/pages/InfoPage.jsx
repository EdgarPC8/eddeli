/**
 * Información del sistema (metadatos de la app EdDeli) y mapa de módulos.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Fab,
  Tooltip,
  Zoom,
  keyframes,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import {
  APP_ROLES_LEGEND,
  APP_MODULE_GROUPS,
  APP_ACCOUNT_SECTIONS,
  APP_PUBLIC_SECTIONS,
} from "../config/appModulesCatalog.js";
import { downloadAppModulesPdf } from "../utils/appModulesPdfExport.js";

const bounceDown = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
`;

function RoleChips({ roles }) {
  if (!roles?.length) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
      {roles.map((role) => (
        <Chip key={role} label={role} size="small" variant="outlined" sx={{ height: 22 }} />
      ))}
    </Stack>
  );
}

function SectionFunctions({ functions }) {
  if (!functions?.length) return null;
  return (
    <Box
      sx={{
        mt: 1.25,
        pl: 1.25,
        borderLeft: 2,
        borderColor: "primary.light",
      }}
    >
      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: "block", mb: 0.75 }}>
        Funciones ({functions.length})
      </Typography>
      <Stack spacing={0.85}>
        {functions.map((fn) => (
          <Box key={fn.name}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
              {fn.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: "block" }}>
              {fn.description}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function SectionRow({ section }) {
  return (
    <Box
      sx={{
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0, pb: 0 },
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        {section.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
        {section.path}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
        {section.description}
      </Typography>
      <RoleChips roles={section.roles} />
      <SectionFunctions functions={section.functions} />
    </Box>
  );
}

function ModuleGroupAccordion({ group, defaultExpanded = false }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={defaultExpanded}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px !important",
        mb: 1,
        "&:before": { display: "none" },
        overflow: "hidden",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {group.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {group.summary} · {group.sections.length} sección(es)
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
        {group.sections.map((section) => (
          <SectionRow key={`${group.id}-${section.path}`} section={section} />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

export default function InfoPage() {
  const { activeApp } = useAppSettings();
  const year = new Date().getFullYear();
  const modulesRef = useRef(null);
  const [fabVisible, setFabVisible] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const updateFabState = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    setFabVisible(scrollY > 100);

    const el = modulesRef.current;
    if (!el) {
      setPdfReady(false);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPdfReady(rect.top < window.innerHeight * 0.55);
  }, []);

  useEffect(() => {
    updateFabState();
    window.addEventListener("scroll", updateFabState, { passive: true });
    window.addEventListener("resize", updateFabState);
    return () => {
      window.removeEventListener("scroll", updateFabState);
      window.removeEventListener("resize", updateFabState);
    };
  }, [updateFabState]);

  const handleFabClick = async () => {
    if (!pdfReady) {
      modulesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    try {
      setDownloading(true);
      downloadAppModulesPdf();
    } finally {
      setDownloading(false);
    }
  };

  const fabLabel = pdfReady
    ? downloading
      ? "Generando PDF…"
      : "Descargar módulos (PDF)"
    : "Ir a módulos y secciones";

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", py: 4, px: { xs: 1, sm: 2 }, pb: 10 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          <Box
            component="img"
            src={activeApp.logoUrl}
            alt={activeApp.name}
            sx={{
              width: 100,
              height: 100,
              mb: 2,
              borderRadius: "50%",
              objectFit: "cover",
              border: 3,
              borderColor: "primary.main",
              boxShadow: 2,
            }}
          />

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {activeApp.name}
          </Typography>

          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Versión {activeApp.version}
          </Typography>

          <Divider sx={{ my: 2, width: "100%" }} />

          <Typography variant="body1" gutterBottom sx={{ lineHeight: 1.7 }}>
            {activeApp.description}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Desarrollado por {activeApp.author}
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={2}>
            © {year} {activeApp.author} — Todos los derechos reservados.
          </Typography>
        </Box>
      </Paper>

      <Paper
        ref={modulesRef}
        id="info-modulos"
        elevation={2}
        sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, scrollMarginTop: 88 }}
      >
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Módulos y secciones
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
          Referencia de las áreas del sistema según el menú lateral. Cada sección incluye sus
          funciones concretas (botones, checks, diálogos y flujos). Los chips indican qué roles
          pueden acceder. Desplázate hacia abajo y usa el botón flotante para descargar esta guía en PDF.
        </Typography>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Roles
        </Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {APP_ROLES_LEGEND.map((role) => (
            <Grid item xs={12} md={4} key={role.name}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  height: "100%",
                }}
              >
                <Chip label={role.name} size="small" color="primary" variant="outlined" sx={{ mb: 0.75 }} />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {role.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Módulos del menú
        </Typography>
        {APP_MODULE_GROUPS.map((group, index) => (
          <ModuleGroupAccordion key={group.id} group={group} defaultExpanded={index === 0} />
        ))}

        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
          Cuenta de usuario
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
          {APP_ACCOUNT_SECTIONS.map((section) => (
            <SectionRow key={section.path} section={section} />
          ))}
        </Paper>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Acceso público (sin login)
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          {APP_PUBLIC_SECTIONS.map((section) => (
            <SectionRow key={section.path} section={section} />
          ))}
        </Paper>
      </Paper>

      <Zoom in={fabVisible}>
        <Tooltip title={fabLabel} placement="left">
          <Fab
            color={pdfReady ? "primary" : "secondary"}
            aria-label={fabLabel}
            onClick={handleFabClick}
            disabled={downloading}
            sx={{
              position: "fixed",
              right: { xs: 16, sm: 24 },
              bottom: { xs: 16, sm: 24 },
              zIndex: (theme) => theme.zIndex.speedDial,
              animation: pdfReady ? "none" : `${bounceDown} 1.6s ease-in-out infinite`,
            }}
          >
            {pdfReady ? <PictureAsPdfIcon /> : <KeyboardArrowDownIcon />}
          </Fab>
        </Tooltip>
      </Zoom>
    </Box>
  );
}
