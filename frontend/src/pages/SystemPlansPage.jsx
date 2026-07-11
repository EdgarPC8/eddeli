/**
 * Sistema → Planes: comparación comercial (Gratis / Medio / Pro).
 */
import { Navigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { useAuth } from "../context/AuthContext.jsx";
import { SYSTEM_PLANS } from "../config/systemPlansCatalog.js";

const ALLOWED = new Set(["Programador", "Administrador"]);

function PlanCard({ plan }) {
  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: 2.5,
        overflow: "hidden",
        border: "2px solid",
        borderColor: plan.highlighted ? "primary.main" : "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: plan.highlighted ? 4 : 0,
      }}
    >
      {plan.highlighted && (
        <Chip
          size="small"
          color="primary"
          label="Recomendado"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            fontWeight: 700,
            zIndex: 1,
          }}
        />
      )}

      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 2,
          background: plan.highlighted
            ? "linear-gradient(160deg, rgba(25,118,210,0.14) 0%, transparent 70%)"
            : "linear-gradient(160deg, rgba(0,0,0,0.04) 0%, transparent 70%)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <WorkspacePremiumIcon color={plan.highlighted ? "primary" : "action"} />
          <Typography variant="h6" fontWeight={800}>
            {plan.name}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
          {plan.tagline}
        </Typography>
        <Typography variant="h4" fontWeight={900} lineHeight={1.1}>
          {plan.priceLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {plan.priceHint}
        </Typography>
      </Box>

      <List dense sx={{ px: 1.5, flex: 1 }}>
        {plan.features.map((feature) => (
          <ListItem key={feature} sx={{ py: 0.35, alignItems: "flex-start" }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
              <CheckCircleOutlineIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={feature}
              primaryTypographyProps={{ variant: "body2" }}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, pt: 1 }}>
        <Button
          fullWidth
          variant={plan.highlighted ? "contained" : "outlined"}
          disabled={plan.id === "prueba"}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {plan.id === "prueba" ? "Solo prueba" : plan.cta}
        </Button>
      </Box>
    </Box>
  );
}

export default function SystemPlansPage() {
  const { user } = useAuth();

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", pb: 4, px: { xs: 0.5, sm: 0 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Planes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          El Plan Prueba da acceso amplio pero con límites y caduca. Básico → Empresarial
          son planes de pago. Mantenimiento técnico (logs, backups): solo Programador.
        </Typography>
      </Box>

      <Grid container spacing={2} alignItems="stretch">
        {SYSTEM_PLANS.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.id}>
            <PlanCard plan={plan} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
