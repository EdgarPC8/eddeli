/**
 * Sistema → Planes: comparación comercial (Gratis / Medio / Pro).
 */
import { Navigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useAuth } from "../context/AuthContext.jsx";
import { SYSTEM_PLANS } from "../config/systemPlansCatalog.js";
import { usePlans } from "../hooks/usePlans.js";

const ALLOWED = new Set(["Programador", "Administrador"]);

const PERIOD_LABELS = { MONTHLY: "/mes", ANNUALLY: "/año" };

const PRICE_FORMATTER = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

const PLAN_COLORS = [
  { bg: "rgba(99,102,241,0.1)", border: "rgb(99,102,241)", text: "rgb(99,102,241)" },
  { bg: "rgba(236,72,153,0.1)", border: "rgb(236,72,153)", text: "rgb(236,72,153)" },
  { bg: "rgba(34,197,94,0.1)", border: "rgb(34,197,94)", text: "rgb(34,197,94)" },
  { bg: "rgba(249,115,22,0.1)", border: "rgb(249,115,22)", text: "rgb(249,115,22)" },
  { bg: "rgba(168,85,247,0.1)", border: "rgb(168,85,247)", text: "rgb(168,85,247)" },
  { bg: "rgba(6,182,212,0.1)", border: "rgb(6,182,212)", text: "rgb(6,182,212)" },
];

function PlanCard({ plan, color, index }) {
  const isFromApi = Array.isArray(plan.prices);
  const c = color || PLAN_COLORS[index % PLAN_COLORS.length];

  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: 3,
        overflow: "hidden",
        border: "1.5px solid",
        borderColor: plan.highlighted ? "primary.main" : "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "box-shadow 0.25s, transform 0.25s",
        "&:hover": {
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          transform: "translateY(-3px)",
        },
      }}
    >
      {plan.highlighted && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            border: "2px solid",
            borderColor: "primary.main",
            pointerEvents: "none",
          }}
        />
      )}

      {plan.highlighted && (
        <Chip
          size="small"
          icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
          color="primary"
          label="Más popular"
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            fontWeight: 700,
            fontSize: "0.7rem",
            zIndex: 1,
            height: 26,
            "& .MuiChip-icon": { ml: 0.5 },
          }}
        />
      )}

      <Box
        sx={{
          px: 3,
          pt: 3.5,
          pb: 2.5,
          background: `linear-gradient(160deg, ${c.bg} 0%, transparent 80%)`,
        }}
      >
        <Typography variant="overline" sx={{ color: c.text, fontWeight: 700, letterSpacing: 1.5 }}>
          {plan.name}
        </Typography>

        {isFromApi ? (
          <Stack spacing={0.25} sx={{ mt: 1.5 }}>
            {plan.prices.map((p) => (
              <Box key={p.period} sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography variant="h3" fontWeight={900} lineHeight={1.1}>
                  {PRICE_FORMATTER.format(p.price)}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {PERIOD_LABELS[p.period] || `/${p.period.toLowerCase()}`}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 40 }}>
              {plan.tagline}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 1.5 }}>
              <Typography variant="h3" fontWeight={900} lineHeight={1.1}>
                {plan.priceLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {plan.priceHint}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 2, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: "block" }}>
          Incluye
        </Typography>
        <List dense disablePadding>
          {(isFromApi ? plan.modules : plan.features).map((item) => {
            const label = isFromApi ? item.name : item;
            const description = isFromApi ? item.desription : null;
            return (
              <ListItem key={label} sx={{ py: 0.6, px: 0, alignItems: "flex-start" }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.15 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  secondary={description}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          disableElevation
          variant={plan.highlighted ? "contained" : "outlined"}
          disabled={!isFromApi && plan.id === "prueba"}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            py: 1.2,
            borderRadius: 2,
            fontSize: "0.9rem",
          }}
        >
          {!isFromApi && plan.id === "prueba" ? "Solo prueba" : plan.cta || "Contratar"}
        </Button>
      </Box>
    </Box>
  );
}

function normalizePlans(data) {
  if (Array.isArray(data)) return data;
  if (data?.plans && Array.isArray(data.plans)) return data.plans;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return null;
}

export default function SystemPlansPage() {
  const { user } = useAuth();
  const { plans: apiPlans, isLoading } = usePlans();

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const plans = normalizePlans(apiPlans) || SYSTEM_PLANS;

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", pb: 4, px: { xs: 0.5, sm: 0 } }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={900}>
          Encuentra el plan ideal para tu negocio
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 600, mx: "auto" }}>
          Desde prueba hasta empresarial. Todos los planes incluyen acceso al sistema
          con diferentes módulos y capacidades.
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {plans.map((plan, i) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id || plan.name}>
              <PlanCard plan={plan} index={i} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
