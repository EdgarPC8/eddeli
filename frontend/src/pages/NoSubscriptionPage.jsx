import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import HomeIcon from "@mui/icons-material/Home";
import { useSubscriptions } from "../hooks/useSubscriptions.js";

export default function NoSubscriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, subscription } = useSubscriptions();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={64} />
      </Box>
    );
  }

  const modules = subscription?.subscription?.modules || [];

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <LockIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Módulo no contratado
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Esta sección no está incluida en tu plan actual.
        </Typography>
        {location.state?.from && (
          <Chip label={location.state.from} size="small" sx={{ mb: 3 }} variant="outlined" />
        )}

        <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
          Módulos de tu plan
        </Typography>
        <Stack spacing={1} sx={{ mb: 4, textAlign: "left" }}>
          {modules.map((mod) => (
            <Box
              key={mod.key}
              sx={{ p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}
            >
              <Typography variant="body2" fontWeight={600}>
                {mod.name}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate("/")}>
          Ir al panel
        </Button>
      </Paper>
    </Container>
  );
}
