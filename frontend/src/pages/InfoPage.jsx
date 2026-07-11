/**
 * Información del sistema: pestaña App (logo, datos, plan) y pestaña Módulos
 * (clic en módulo → secciones con conteo de funciones).
 */
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Chip,
  Grid,
  Tabs,
  Tab,
  ListItemButton,
  ListItemText,
  Collapse,
  Button,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSubscriptions } from "../hooks/useSubscriptions.js";
import {
  APP_ROLES_LEGEND,
  APP_MODULE_GROUPS,
  APP_ACCOUNT_SECTIONS,
  APP_PUBLIC_SECTIONS,
  MODULE_STATUS_META,
  resolveModuleStatus,
} from "../config/appModulesCatalog.js";
import { resolveActiveSystemPlan } from "../config/systemPlansCatalog.js";
import { downloadAppModulesPdf } from "../utils/appModulesPdfExport.js";

function countFunctions(section) {
  return section?.functions?.length || 0;
}

function countGroupFunctions(group) {
  return (group.sections || []).reduce((n, s) => n + countFunctions(s), 0);
}

function countPlannedSections(group) {
  return (group.sections || []).filter((s) => resolveModuleStatus(s) === "planned").length;
}

function countMaintenanceSections(group) {
  return (group.sections || []).filter((s) => resolveModuleStatus(s) === "maintenance").length;
}

function orderSectionsForPreview(sections = []) {
  const planned = sections.filter((s) => resolveModuleStatus(s) === "planned");
  const maintenance = sections.filter((s) => resolveModuleStatus(s) === "maintenance");
  const other = sections.filter((s) => {
    const st = resolveModuleStatus(s);
    return st !== "planned" && st !== "maintenance";
  });
  return [...planned, ...maintenance, ...other];
}

function RoleChips({ roles }) {
  if (!roles?.length) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
      {roles.map((role) => (
        <Chip key={role} label={role} size="small" variant="outlined" sx={{ height: 22 }} />
      ))}
    </Stack>
  );
}

function SectionDetail({ section, expanded, onToggle }) {
  const fnCount = countFunctions(section);
  const status = resolveModuleStatus(section);
  const statusMeta = MODULE_STATUS_META[status];
  const isPlanned = status === "planned";
  const isMaintenance = status === "maintenance";
  const highlight = isPlanned || isMaintenance;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: isPlanned
          ? "warning.light"
          : isMaintenance
            ? "error.light"
            : "divider",
        borderRadius: 2,
        mb: 1,
        overflow: "hidden",
        opacity: highlight ? 0.92 : 1,
      }}
    >
      <ListItemButton onClick={onToggle} sx={{ py: 1.25, alignItems: "flex-start" }}>
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle2" fontWeight={700}>
                {section.name}
              </Typography>
              {isPlanned ? (
                <Chip
                  size="small"
                  color="warning"
                  label="Próximamente"
                  sx={{ height: 22, fontWeight: 700 }}
                />
              ) : null}
              {isMaintenance ? (
                <Chip
                  size="small"
                  color="error"
                  label="Mantenimiento"
                  sx={{ height: 22, fontWeight: 700 }}
                />
              ) : null}
              <Chip
                size="small"
                label={`${fnCount} función${fnCount === 1 ? "" : "es"}`}
                color={fnCount ? "primary" : "default"}
                variant="outlined"
                sx={{ height: 22, fontWeight: 700 }}
              />
              {!highlight && status !== "active" && statusMeta ? (
                <Chip
                  size="small"
                  color={statusMeta.color}
                  label={statusMeta.label}
                  sx={{ height: 22, fontWeight: 700 }}
                />
              ) : null}
            </Stack>
          }
          secondary={
            <>
              <Typography variant="caption" color="text.secondary" display="block">
                {section.path}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                {section.description}
              </Typography>
              <RoleChips roles={section.roles} />
            </>
          }
        />
        {fnCount > 0 ? (expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />) : null}
      </ListItemButton>
      <Collapse in={expanded && fnCount > 0} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 1.5, pt: 0 }}>
          <Stack
            spacing={1}
            sx={{
              pl: 1.5,
              borderLeft: 2,
              borderColor: isPlanned
                ? "warning.light"
                : isMaintenance
                  ? "error.light"
                  : "primary.light",
            }}
          >
            {section.functions.map((fn) => (
              <Box key={fn.name}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                  {fn.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {fn.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

function AppInfoTab({ activeApp, plan, canSeePlans }) {
  const year = new Date().getFullYear();

  return (
    <Stack spacing={2.5}>
      <Paper elevation={2} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
          <Box
            component="img"
            src={activeApp.logoUrl}
            alt={activeApp.name}
            sx={{
              width: 104,
              height: 104,
              mb: 2,
              borderRadius: "50%",
              objectFit: "cover",
              border: 3,
              borderColor: "primary.main",
              boxShadow: 2,
            }}
          />
          <Typography variant="h5" fontWeight={800} gutterBottom>
            {activeApp.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Versión {activeApp.version}
          </Typography>
          <Divider sx={{ my: 2, width: "100%" }} />
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            {activeApp.description}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Desarrollado por {activeApp.author}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            © {year} {activeApp.author} — Todos los derechos reservados.
          </Typography>
        </Box>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "primary.light",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <WorkspacePremiumIcon color="primary" sx={{ mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Plan en uso
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              {plan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
              {plan.tagline}
            </Typography>
            <Stack spacing={0.5}>
              {plan.features.slice(0, 4).map((f) => (
                <Stack key={f} direction="row" spacing={0.75} alignItems="center">
                  <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18 }} />
                  <Typography variant="body2">{f}</Typography>
                </Stack>
              ))}
            </Stack>
            {canSeePlans ? (
              <Button
                component={RouterLink}
                to="/sistema/planes"
                size="small"
                sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
              >
                Ver todos los planes
              </Button>
            ) : null}
          </Box>
          <Chip label={plan.priceLabel} color="primary" sx={{ fontWeight: 800 }} />
        </Stack>
      </Paper>

      <Typography variant="subtitle2" fontWeight={700}>
        Roles del sistema
      </Typography>
      <Grid container spacing={1.5}>
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
    </Stack>
  );
}

function ModulesInfoTab({ initialModuleId = null, onClearModule = null, onSelectModule = null }) {
  const catalogBlocks = useMemo(
    () => [
      ...APP_MODULE_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        summary: g.summary,
        sections: g.sections,
        kind: "menu",
      })),
      {
        id: "cuenta",
        label: "Cuenta de usuario",
        summary: "Perfil, información y donaciones.",
        sections: APP_ACCOUNT_SECTIONS,
        kind: "account",
      },
      {
        id: "publico",
        label: "Acceso público",
        summary: "Vistas sin iniciar sesión.",
        sections: APP_PUBLIC_SECTIONS,
        kind: "public",
      },
    ],
    [],
  );

  const [selectedId, setSelectedId] = useState(() => {
    if (!initialModuleId) return null;
    return catalogBlocks.some((b) => b.id === initialModuleId)
      ? initialModuleId
      : null;
  });
  const [openSectionPath, setOpenSectionPath] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!initialModuleId) {
      setSelectedId(null);
      return;
    }
    if (catalogBlocks.some((b) => b.id === initialModuleId)) {
      setSelectedId(initialModuleId);
      setOpenSectionPath(null);
    }
  }, [initialModuleId, catalogBlocks]);

  const selected = catalogBlocks.find((b) => b.id === selectedId) || null;

  const handleSelectModule = (id) => {
    setSelectedId(id);
    setOpenSectionPath(null);
    onSelectModule?.(id);
  };

  const handleBack = () => {
    setSelectedId(null);
    setOpenSectionPath(null);
    onClearModule?.();
  };

  const handlePdf = () => {
    setDownloading(true);
    try {
      downloadAppModulesPdf();
    } finally {
      setDownloading(false);
    }
  };

  if (selected) {
    const sectionCount = selected.sections.length;
    const fnTotal = countGroupFunctions(selected);

    return (
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 2 }}
          flexWrap="wrap"
          useFlexGap
        >
          <IconButton size="small" onClick={handleBack} aria-label="Volver a módulos">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              {selected.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selected.summary} · {sectionCount} sección(es) · {fnTotal} funciones
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={handlePdf}
            disabled={downloading}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            PDF
          </Button>
        </Stack>

        {orderSectionsForPreview(selected.sections).map((section) => {
          const key = `${selected.id}-${section.path}-${section.name}`;
          return (
            <SectionDetail
              key={key}
              section={section}
              expanded={openSectionPath === key}
              onToggle={() =>
                setOpenSectionPath((prev) => (prev === key ? null : key))
              }
            />
          );
        })}
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          Elige un módulo para ver sus secciones y cuántas funciones tiene cada una.
        </Typography>
        <Button
          size="small"
          startIcon={<PictureAsPdfIcon />}
          onClick={handlePdf}
          disabled={downloading}
          sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
        >
          Descargar PDF
        </Button>
      </Stack>

      <Grid container spacing={1.5}>
        {catalogBlocks.map((block) => {
          const sections = block.sections.length;
          const functions = countGroupFunctions(block);
          const planned = countPlannedSections(block);
          const maintenance = countMaintenanceSections(block);
          const ordered = orderSectionsForPreview(block.sections || []);
          const preview = ordered.slice(0, 5);
          const more = Math.max(0, ordered.length - preview.length);
          return (
            <Grid item xs={12} sm={6} md={3} key={block.id}>
              <Paper
                variant="outlined"
                sx={{
                  height: "100%",
                  borderRadius: 2.5,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => handleSelectModule(block.id)}
              >
                <Box sx={{ p: 1.75 }}>
                  <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                    {block.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.25,
                      minHeight: 40,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {block.summary}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: 1.25, minHeight: 48, alignContent: "flex-start" }}
                  >
                    {preview.map((sec) => {
                      const st = resolveModuleStatus(sec);
                      const isPlanned = st === "planned";
                      const isMaintenance = st === "maintenance";
                      const highlight = isPlanned || isMaintenance;
                      return (
                        <Chip
                          key={`${block.id}-${sec.path}-${sec.name}`}
                          size="small"
                          label={
                            isPlanned
                              ? `${sec.name} · Próximamente`
                              : isMaintenance
                                ? `${sec.name} · Mantenimiento`
                                : sec.name
                          }
                          color={isPlanned ? "warning" : isMaintenance ? "error" : "default"}
                          variant={highlight ? "filled" : "outlined"}
                          sx={{
                            height: 22,
                            maxWidth: "100%",
                            fontWeight: highlight ? 700 : 500,
                            fontSize: "0.68rem",
                            "& .MuiChip-label": {
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          }}
                        />
                      );
                    })}
                    {more > 0 ? (
                      <Chip
                        size="small"
                        label={`+${more}`}
                        variant="outlined"
                        sx={{ height: 22, fontWeight: 700, fontSize: "0.68rem" }}
                      />
                    ) : null}
                  </Stack>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`${sections} secciones`} sx={{ fontWeight: 700 }} />
                    {planned > 0 ? (
                      <Chip
                        size="small"
                        color="warning"
                        label={`${planned} próximamente`}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : null}
                    {maintenance > 0 ? (
                      <Chip
                        size="small"
                        color="error"
                        label={`${maintenance} mantenimiento`}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : null}
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${functions} funciones`}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

export default function InfoPage() {
  const { activeApp } = useAppSettings();
  const { user } = useAuth();
  const { subscription } = useSubscriptions();
  const [searchParams, setSearchParams] = useSearchParams();
  const plan = useMemo(() => resolveActiveSystemPlan(subscription), [subscription]);
  const canSeePlans = ["Programador", "Administrador"].includes(user?.loginRol);

  const tabParam = searchParams.get("tab");
  const moduloParam = searchParams.get("modulo");
  const tab = tabParam === "modulos" ? 1 : 0;

  const handleTabChange = (_e, v) => {
    if (v === 1) {
      const next = { tab: "modulos" };
      if (moduloParam) next.modulo = moduloParam;
      setSearchParams(next, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const clearModuleParam = () => {
    setSearchParams({ tab: "modulos" }, { replace: true });
  };

  const selectModuleParam = (id) => {
    setSearchParams({ tab: "modulos", modulo: id }, { replace: true });
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", py: 3, px: { xs: 1, sm: 2 }, pb: 6 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
        Información
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{
          mb: 2.5,
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 42,
          "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 42 },
        }}
      >
        <Tab label="La app" />
        <Tab label="Módulos" />
      </Tabs>

      {tab === 0 ? (
        <AppInfoTab activeApp={activeApp} plan={plan} canSeePlans={canSeePlans} />
      ) : (
        <Paper elevation={0} sx={{ p: { xs: 0, sm: 0.5 } }}>
          <ModulesInfoTab
            initialModuleId={moduloParam}
            onClearModule={clearModuleParam}
            onSelectModule={selectModuleParam}
          />
        </Paper>
      )}
    </Box>
  );
}
