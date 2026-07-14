/**
 * Sistema → Módulos: catálogo de módulos (grupos del menú), no secciones internas.
 */
import { useMemo, useState } from "react";
import { Link as RouterLink, Navigate } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import ExtensionIcon from "@mui/icons-material/Extension";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CodeIcon from "@mui/icons-material/Code";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import SettingsApplicationsIcon from "@mui/icons-material/SettingsApplications";
import CampaignIcon from "@mui/icons-material/Campaign";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PeopleIcon from "@mui/icons-material/People";
import HomeIcon from "@mui/icons-material/Home";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BrushIcon from "@mui/icons-material/Brush";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupsIcon from "@mui/icons-material/Groups";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DescriptionIcon from "@mui/icons-material/Description";
import { useAuth } from "../context/AuthContext.jsx";
import {
  MODULE_STATUS_META,
  listCatalogModuleGroupsWithStatus,
  normalizeModuleStatus,
} from "../config/appModulesCatalog.js";
import { useSubscriptions } from "../hooks/useSubscriptions.js";

const ALLOWED = new Set(["Programador", "Administrador"]);

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "En uso" },
  { id: "maintenance", label: "Mantenimiento" },
  { id: "planned", label: "Próximamente" },
  { id: "developer", label: "Solo desarrollador" },
];

const GROUP_ICON = {
  acceso: HomeIcon,
  operacion: PointOfSaleIcon,
  "comprobantes-sri": FactCheckIcon,
  ventas: PeopleIcon,
  inventario: Inventory2Icon,
  finanzas: AccountBalanceWalletIcon,
  produccion: PrecisionManufacturingIcon,
  canal: StorefrontIcon,
  documentos: DescriptionIcon,
  logistica: LocalShippingIcon,
  comunidad: GroupsIcon,
  publicidad: CampaignIcon,
  diseno: BrushIcon,
  admin: AdminPanelSettingsIcon,
  sistema: SettingsApplicationsIcon,
  desarrollador: CodeIcon,
};

const STATUS_ICON = {
  active: CheckCircleIcon,
  maintenance: BuildCircleIcon,
  development: BuildCircleIcon,
  developer: CodeIcon,
  planned: ScheduleIcon,
};

function ModuleCard({ module }) {
  const Icon = GROUP_ICON[module.id] || ExtensionIcon;
  const StatusIcon = STATUS_ICON[module.status] || CheckCircleIcon;
  const meta = module.statusMeta || MODULE_STATUS_META.active;
  const canOpen = true;
  const infoHref = `/info?tab=modulos&modulo=${encodeURIComponent(module.id)}`;

  const {
    isTrial,
    endTrial,
    imageUrl,
  } = module;

  const bannerBg = imageUrl
    ? `linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%), url(${imageUrl}) center/cover`
    : module.status === "active"
      ? "linear-gradient(135deg, rgba(46,125,50,0.35) 0%, rgba(20,20,20,0.9) 70%)"
      : module.status === "maintenance"
        ? "linear-gradient(135deg, rgba(211,47,47,0.4) 0%, rgba(20,20,20,0.92) 72%)"
        : module.status === "planned"
          ? "linear-gradient(135deg, rgba(245,180,0,0.35) 0%, rgba(20,20,20,0.92) 72%)"
          : module.status === "developer"
            ? "linear-gradient(135deg, rgba(2,136,209,0.4) 0%, rgba(20,20,20,0.92) 72%)"
            : "linear-gradient(135deg, rgba(120,120,120,0.25) 0%, rgba(20,20,20,0.92) 72%)";

  const sectionItems = module.sectionItems || [];
  const highlightedFirst = [
    ...sectionItems.filter((s) => s.status === "planned"),
    ...sectionItems.filter((s) => s.status === "maintenance"),
    ...sectionItems.filter(
      (s) => s.status !== "planned" && s.status !== "maintenance",
    ),
  ];
  const preview = highlightedFirst.slice(0, 5);
  const moreCount = Math.max(0, highlightedFirst.length - preview.length);
  const plannedCount = module.plannedSectionCount || 0;
  const maintenanceCount = module.maintenanceSectionCount || 0;

  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: 2.5,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        transition:
          "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
          borderColor: "primary.main",
        },
      }}
    >
      <Box
        sx={{
          height: 120,
          position: "relative",
          background: bannerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.12,
            backgroundImage:
              "radial-gradient(circle at 20% 30%, currentColor 1px, transparent 1px), radial-gradient(circle at 80% 70%, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            color: "common.white",
          }}
        />
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "grid",
            placeItems: "center",
            zIndex: 1,
          }}
        >
          <Icon sx={{ fontSize: 32, color: "primary.main" }} />
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ position: "absolute", top: 10, left: 10 }}
        >
          <Chip
            size="small"
            label={`${module.sectionCount} sec.`}
            sx={{
              height: 22,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "common.white",
              fontWeight: 700,
              fontSize: "0.68rem",
            }}
          />
          {plannedCount > 0 ? (
            <Chip
              size="small"
              label={`${plannedCount} próx.`}
              sx={{
                height: 22,
                bgcolor: "rgba(237,108,2,0.9)",
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
          ) : null}
          {maintenanceCount > 0 ? (
            <Chip
              size="small"
              label={`${maintenanceCount} mant.`}
              sx={{
                height: 22,
                bgcolor: "rgba(211,47,47,0.92)",
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
          ) : null}
          {isTrial ? (
            <Chip
              size="small"
              label={`Prueba${limitDaysTrial ? ` ${limitDaysTrial}d` : ""}`}
              sx={{
                height: 22,
                bgcolor: "rgba(245,180,0,0.92)",
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
          ) : null}
          {isMaintainer ? (
            <Chip
              size="small"
              label="Mant."
              sx={{
                height: 22,
                bgcolor: "rgba(211,47,47,0.92)",
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          p: 1.75,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 0.75,
        }}
      >
        <Typography variant="subtitle1" fontWeight={800} lineHeight={1.25}>
          {module.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 40,
          }}
        >
          {module.description}
        </Typography>

        {isTrial && endTrial ? (
          <Typography variant="caption" color="warning.main" fontWeight={600}>
            Prueba hasta {new Date(endTrial).toLocaleDateString()}
          </Typography>
        ) : null}

        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ flex: 1, alignContent: "flex-start", minHeight: 56 }}
        >
          {preview.map((sec) => {
            const isPlanned = sec.status === "planned";
            const isMaintenance = sec.status === "maintenance";
            const highlight = isPlanned || isMaintenance;
            const subSec = subSectionsByKey?.[sec.path] || null;
            const activeCaps = subSec
              ? subSec.capabilities.filter((c) => c.is_active).length
              : 0;
            const usageLabel =
              subSec && subSec.max_records_limit
                ? `${subSec.usage_count}/${subSec.max_records_limit}`
                : null;
            return (
              <Chip
                key={sec.name}
                size="small"
                label={
                  isPlanned
                    ? `${sec.name} · Próximamente`
                    : isMaintenance
                      ? `${sec.name} · Mantenimiento`
                      : usageLabel
                        ? `${sec.name} (${usageLabel})`
                        : activeCaps > 0
                          ? `${sec.name} · ${activeCaps} caps.`
                          : sec.name
                }
                color={
                  isPlanned ? "warning" : isMaintenance ? "error" : "default"
                }
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
          {moreCount > 0 ? (
            <Chip
              size="small"
              label={`+${moreCount}`}
              variant="outlined"
              sx={{ height: 22, fontWeight: 700, fontSize: "0.68rem" }}
            />
          ) : null}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 0.5 }}
        >
          <Chip
            size="small"
            icon={<StatusIcon sx={{ fontSize: "16px !important" }} />}
            color={meta.color}
            variant={module.status === "planned" ? "outlined" : "filled"}
            label={meta.label}
            sx={{ height: 26, fontWeight: 700 }}
          />
          {isTrial && endTrial && new Date(endTrial) < new Date() ? (
            <Stack spacing={0.25} alignItems="flex-end">
              <Typography variant="caption" color="error" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                Prueba finalizada
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                Pedí habilitación en el gestor SoftEd
              </Typography>
            </Stack>
          ) : canOpen ? (
            <Button
              component={RouterLink}
              to={infoHref}
              variant={module.status === "active" ? "contained" : "outlined"}
              size="small"
              sx={{ textTransform: "none", fontWeight: 700, px: 1.5 }}
            >
              {module.status === "active"
                ? "Abrir"
                : module.status === "planned"
                  ? "Ver plan"
                  : module.status === "developer"
                    ? "Ver detalle"
                    : "Ver avance"}
            </Button>
          ) : (
            <Button size="small" disabled sx={{ textTransform: "none" }}>
              Pronto
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default function SystemModulesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const { subscription } = useSubscriptions();
  const subModules = subscription?.subscription?.modules || [];

  const catalogByName = useMemo(() => {
    const map = {};
    for (const m of listCatalogModuleGroupsWithStatus()) {
      map[m.name] = m;
    }
    return map;
  }, []);

  const allModules = useMemo(() => {
    return subModules.map((subModule) => {
      const catalog = catalogByName[subModule.name] || null;
      const subSectionsByKey = {};
      for (const sec of subModule.sections || []) {
        subSectionsByKey[sec.key] = sec;
      }

      const sectionItems = (subModule.sections || []).map((sec) => {
        const secStatus = normalizeModuleStatus(sec.status || "active");
        return {
          name: sec.name,
          path: sec.key,
          status: secStatus,
        };
      });

      const status = normalizeModuleStatus(
        subModule.status && MODULE_STATUS_META[subModule.status]
          ? subModule.status
          : catalog?.status || "active",
      );

      return {
        id: catalog?.id || subModule.key || subModule.name,
        name: subModule.name,
        description: catalog?.description || "",
        path: catalog?.path || sectionItems[0]?.path || null,
        sectionCount: sectionItems.length,
        plannedSectionCount: sectionItems.filter((s) => s.status === "planned")
          .length,
        maintenanceSectionCount: sectionItems.filter(
          (s) => s.status === "maintenance",
        ).length,
        sectionItems,
        sections: sectionItems.map((sec) =>
          sec.status === "planned"
            ? `${sec.name} (próx.)`
            : sec.status === "maintenance"
              ? `${sec.name} (mant.)`
              : sec.name,
        ),
        status,
        statusMeta: MODULE_STATUS_META[status] || MODULE_STATUS_META.active,
        subscriptionModule: subModule,
        subModuleId: subModule.id,
        subSectionsByKey,
        isTrial: subModule.is_trial || false,
        startTrial: subModule.start_trial || null,
        limitDaysTrial: subModule.limit_days_trial || null,
        endTrial: subModule.end_trial || null,
        imageUrl: subModule.image_url || null,
        isMaintainer: subModule.is_maintainer || false,
      };
    });
  }, [subModules, catalogByName]);

  const counts = useMemo(() => {
    const c = {
      all: allModules.length,
      active: 0,
      maintenance: 0,
      planned: 0,
      developer: 0,
    };
    for (const m of allModules) {
      const key = normalizeModuleStatus(m.status);
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [allModules]);

  const modules = useMemo(() => {
    if (filter === "all") return allModules;
    return allModules.filter((m) => m.status === filter);
  }, [allModules, filter]);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", pb: 4, px: { xs: 0.5, sm: 0 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "flex-end" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Módulos disponibles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cada tarjeta es un módulo del menú (con sus secciones dentro).
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              clickable
              size="small"
              color={filter === f.id ? "primary" : "default"}
              variant={filter === f.id ? "filled" : "outlined"}
              label={`${f.label} (${counts[f.id] ?? 0})`}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </Stack>
      </Stack>

      {modules.length === 0 ? (
        <Typography color="text.secondary">
          No hay módulos en este filtro.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {modules.map((module) => (
            <Grid item xs={12} sm={6} md={3} key={module.id}>
              <ModuleCard module={module} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
