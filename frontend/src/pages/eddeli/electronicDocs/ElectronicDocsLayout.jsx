/**
 * Layout del módulo Comprobantes electrónicos: menú lateral + contenido.
 */
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ELECTRONIC_DOC_SECTIONS } from "./electronicDocsCatalog.js";

const navItems = ELECTRONIC_DOC_SECTIONS.filter((s) => s.id !== "hub");

export default function ElectronicDocsLayout() {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", pb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Typography variant="h5" fontWeight={800}>
          Comprobantes electrónicos
        </Typography>
        <Chip size="small" label="SRI Ecuador" color="primary" variant="outlined" />
        <Chip size="small" label="Emisión en desarrollo" color="warning" variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Facturas, notas, retenciones y más. La configuración fiscal (firma y RUC) está en Sistema →
        Configuración. Los comprobantes POS de caja siguen en Operación → Comprobantes POS.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "240px 1fr",
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper
          variant="outlined"
          sx={{ borderRadius: 2, overflow: "hidden", position: { md: "sticky" }, top: { md: 72 } }}
        >
          <List dense disablePadding>
            <ListItemButton
              component={NavLink}
              to="/comprobantes-electronicos"
              end
              selected={location.pathname === "/comprobantes-electronicos"}
              sx={{ py: 1.1 }}
            >
              <ListItemText
                primary="Inicio del módulo"
                primaryTypographyProps={{ fontWeight: 700, fontSize: "0.875rem" }}
              />
            </ListItemButton>
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = !item.external && location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.id}
                  component={NavLink}
                  to={item.path}
                  selected={selected}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.short || item.name}
                    secondary={item.sriCode ? `Código ${item.sriCode}` : undefined}
                    primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: "0.7rem" }}
                  />
                  {item.status === "soon" && (
                    <Chip label="Pronto" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        <Box sx={{ minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
