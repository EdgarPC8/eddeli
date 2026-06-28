/**
 * Barra superior EdDeli: navegación, tema, notificaciones y menú de usuario.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  CircularProgress,
  Badge,
  Popover,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import PeopleIcon from "@mui/icons-material/People";
import StraightenIcon from "@mui/icons-material/Straighten";
import LogoutIcon from "@mui/icons-material/Logout";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TerminalIcon from "@mui/icons-material/Terminal";
import BackupIcon from "@mui/icons-material/Backup";
import HistoryIcon from "@mui/icons-material/History";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SettingsApplicationsIcon from "@mui/icons-material/SettingsApplications";
import DnsIcon from "@mui/icons-material/Dns";
import GroupIcon from "@mui/icons-material/Group";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ScienceIcon from "@mui/icons-material/Science";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import FactoryIcon from "@mui/icons-material/Factory";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import StoreMallDirectoryRoundedIcon from "@mui/icons-material/StoreMallDirectoryRounded";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import EditNoteIcon from "@mui/icons-material/EditNote";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TvIcon from "@mui/icons-material/Tv";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

import { useAuth } from "../context/AuthContext.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import NotificationList from "./NotificationList.jsx";
import CambiarRol from "./CambiarRol.jsx";
import SimpleDialog from "./Dialogs/SimpleDialog.jsx";
import { getUnreadCount } from "../api/notificationsRequest.js";
import { useNotificationSocket } from "../hooks/useNotificationSocket.js";
import { LOGO_PATH } from "../config.js";
import { activeApp } from "../config/appInfo.js";

const DRAWER_W = 260;

const MENU_ITEMS = [
  { name: "Dashboard", link: "/", icon: <DashboardIcon />, roles: ["Programador", "Administrador"] },
  { name: "Caja", link: "/caja", icon: <PointOfSaleIcon />, roles: ["Programador", "Administrador", "Empleado"] },
  { name: "Turno", link: "/turno", icon: <ScheduleIcon />, roles: ["Programador", "Administrador", "Empleado"] },
  { name: "Supervisión caja", link: "/turno/supervision", icon: <AssessmentIcon />, roles: ["Programador", "Administrador"] },
  { name: "Tareas", link: "/tareas", icon: <AssignmentTurnedInIcon />, roles: ["Programador", "Administrador", "Empleado"] },
  { name: "Facturación", link: "/facturacion", icon: <ReceiptIcon />, roles: ["Programador", "Administrador"] },
  { name: "Catálogo config", link: "/catalog_manager", icon: <ViewModuleIcon />, roles: ["Programador", "Administrador"] },
  { name: "Grupos comparativos", link: "/compare_groups", icon: <CompareArrowsIcon />, roles: ["Programador", "Administrador"] },
  { name: "Notificaciones", link: "/notifications", icon: <NotificationsIcon />, roles: ["Programador", "Administrador", "Empleado"] },
];

const MENU_GROUPS = [
  {
    id: "ventas",
    label: "Ventas y clientes",
    items: [
      { name: "Pedidos", link: "/inventory/orders", icon: <AssignmentIcon />, roles: ["Programador", "Administrador"] },
      { name: "Clientes", link: "/inventory/customers", icon: <PeopleIcon />, roles: ["Programador", "Administrador"] },
      { name: "Finanzas", link: "/inventory/finance", icon: <MonetizationOnIcon />, roles: ["Programador", "Administrador"] },
      { name: "Cobranzas", link: "/inventory/collections", icon: <RequestQuoteIcon />, roles: ["Programador", "Administrador"] },
      { name: "Préstamos y deudas", link: "/inventory/prestamos-deudas", icon: <AccountBalanceWalletIcon />, roles: ["Programador", "Administrador"] },
      { name: "Gastos recurrentes", link: "/inventory/gastos-recurrentes", icon: <HomeWorkIcon />, roles: ["Programador", "Administrador"] },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    items: [
      { name: "Productos", link: "/inventory/products", icon: <Inventory2Icon />, roles: ["Programador", "Administrador"] },
      { name: "Movimientos", link: "/inventory/movement", icon: <CompareArrowsIcon />, roles: ["Programador", "Administrador"] },
      { name: "Categorías", link: "/inventory/categories", icon: <CategoryIcon />, roles: ["Programador", "Administrador"] },
      { name: "Tramos", link: "/inventory/tramos", icon: <ViewModuleIcon />, roles: ["Programador", "Administrador"] },
      { name: "Unidades", link: "/inventory/units", icon: <StraightenIcon />, roles: ["Programador", "Administrador"] },
      { name: "Insumos y marcas", link: "/inventory/insumos", icon: <ScienceIcon />, roles: ["Programador", "Administrador"] },
      { name: "Recetas", link: "/inventory/recipes", icon: <ReceiptLongIcon />, roles: ["Programador", "Administrador"] },
    ],
  },
  {
    id: "produccion",
    label: "Producción y canal",
    items: [
      { name: "Producción", link: "/inventory/production", icon: <FactoryIcon />, roles: ["Programador", "Administrador"] },
      { name: "Puntos de venta", link: "/inventory/puntos-venta", icon: <StorefrontRoundedIcon />, roles: ["Programador", "Administrador"] },
      { name: "Productos destacados", link: "/inventory/productos-destacados", icon: <StarRoundedIcon />, roles: ["Programador", "Administrador"] },
    ],
  },
  {
    id: "publicidad",
    label: "Publicidad",
    items: [
      { name: "Campañas", link: "/publicidad", icon: <TvIcon />, roles: ["Programador", "Administrador"] },
      {
        name: "Dispositivos TV",
        link: "/publicidad/dispositivos",
        icon: <TvIcon />,
        roles: ["Programador", "Administrador"],
      },
      {
        name: "Reproductor",
        link: "/publicidad/reproductor",
        icon: <PlayCircleOutlineIcon />,
        roles: ["Programador", "Administrador"],
      },
    ],
  },
  {
    id: "diseno-promocional",
    label: "Diseño Promocional",
    items: [
      { name: "Imágenes", link: "/img", icon: <ImageIcon />, roles: ["Programador"] },
      { name: "Archivos", link: "/file", icon: <InsertDriveFileIcon />, roles: ["Programador"] },
      { name: "Editor de diseño", link: "/diseno-promocional/editor", icon: <EditNoteIcon />, roles: ["Programador", "Administrador"] },
      { name: "Vista con productos", link: "/diseno-promocional/vista", icon: <VolumeUpIcon />, roles: ["Programador", "Administrador"] },
      { name: "Plantillas", link: "/diseno-promocional/plantillas", icon: <CollectionsBookmarkIcon />, roles: ["Programador", "Administrador"] },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      { name: "Usuarios", link: "/users", icon: <GroupIcon />, roles: ["Programador", "Administrador"] },
      { name: "Cuentas", link: "/cuentas", icon: <ManageAccountsIcon />, roles: ["Programador", "Administrador"] },
      { name: "Roles", link: "/roles", icon: <SettingsApplicationsIcon />, roles: ["Programador", "Administrador"] },
      { name: "Panel de control", link: "/panel_control", icon: <DnsIcon />, roles: ["Programador", "Administrador"] },
      // Oculto hasta que exista API backend /notification-programs (ver NotificationProgramsPage)
      // { name: "Programar notificaciones", link: "/notification-programs", icon: <NotificationsIcon />, roles: ["Programador", "Administrador"] },
      { name: "Logs", link: "/logs", icon: <HistoryIcon />, roles: ["Programador"] },
      { name: "Backups JSON", link: "/backups", icon: <BackupIcon />, roles: ["Programador"] },
      { name: "Comandos", link: "/comandos", icon: <TerminalIcon />, roles: ["Programador"] },
    ],
  },
];

const PUBLIC_NAV = [
  { label: "Catálogo", to: "/catalogo", icon: <BakeryDiningIcon fontSize="small" /> },
  { label: "Locales", to: "/punto_venta", icon: <StoreMallDirectoryRoundedIcon fontSize="small" /> },
];

function menuItemsForRole(loginRol) {
  if (!loginRol) return [];
  return MENU_ITEMS.filter((item) => item.roles.includes(loginRol));
}

function menuGroupsForRole(loginRol) {
  if (!loginRol) return [];
  return MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(loginRol)),
  })).filter((group) => group.items.length > 0);
}

export default function NavBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, logout, profileImageUser } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [openChangeRol, setOpenChangeRol] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasMultipleRoles = (user?.roles?.length ?? 0) > 1;
  const profileReady = Boolean(user?.loginRol);
  const showDrawer = isAuthenticated && profileReady;
  const showUserActions = isAuthenticated && profileReady;
  const profileLoading = isAuthenticated && !profileReady;

  const displayName =
    [user?.firstName, user?.firstLastName].filter(Boolean).join(" ") ||
    user?.username ||
    "";

  const menuItems = useMemo(() => menuItemsForRole(user?.loginRol), [user?.loginRol]);
  const menuGroups = useMemo(() => menuGroupsForRole(user?.loginRol), [user?.loginRol]);

  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => item.link === location.pathname),
    );
    if (activeGroup) setExpandedGroupId(activeGroup.id);
  }, [location.pathname, menuGroups]);

  const handleGroupAccordionChange = (groupId) => (_event, isExpanded) => {
    setExpandedGroupId(isExpanded ? groupId : null);
  };

  const renderMenuItem = (item, nested = false) => (
    <ListItem key={item.link} disablePadding sx={{ display: "block", pl: nested ? 1 : 0 }}>
      <ListItemButton
        selected={location.pathname === item.link}
        onClick={() => navigate(item.link)}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          justifyContent: drawerOpen ? "initial" : "center",
          minHeight: 40,
        }}
      >
        <Tooltip title={!drawerOpen ? item.name : ""} placement="right">
          <ListItemIcon sx={{ minWidth: drawerOpen ? 40 : "auto", justifyContent: "center" }}>
            {item.icon}
          </ListItemIcon>
        </Tooltip>
        {drawerOpen && <ListItemText primary={item.name} />}
      </ListItemButton>
    </ListItem>
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const res = await getUnreadCount(user.userId);
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useNotificationSocket(user?.userId, user?.accountId, () => {
    fetchUnreadCount();
  });

  const homePath = showUserActions ? "/inicio" : "/home";

  const drawerContent = (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1,
          ...theme.mixins.toolbar,
          justifyContent: "flex-end",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, px: 1 }}>
          <Box
            component="img"
            src={LOGO_PATH}
            alt={activeApp.alias}
            sx={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
          />
          {drawerOpen && (
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {activeApp.alias}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={() => {
            setDrawerOpen(false);
            setExpandedGroupId(null);
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {menuItems.map((item) => renderMenuItem(item))}
        {menuGroups.length > 0 && menuItems.length > 0 && <Divider sx={{ my: 1 }} />}
        {menuGroups.map((group, groupIndex) =>
          drawerOpen ? (
            <Accordion
              key={group.id}
              expanded={expandedGroupId === group.id}
              onChange={handleGroupAccordionChange(group.id)}
              disableGutters
              elevation={0}
              sx={{
                boxShadow: "none",
                bgcolor: "transparent",
                "&:before": { display: "none" },
                mb: groupIndex < menuGroups.length - 1 ? 0.25 : 0,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{ minHeight: 36, px: 0.5, "& .MuiAccordionSummary-content": { my: 0.5 } }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {group.label}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pt: 0 }}>
                <List component="div" disablePadding>
                  {group.items.map((item) => renderMenuItem(item, true))}
                </List>
              </AccordionDetails>
            </Accordion>
          ) : (
            <Box key={group.id} component="li" sx={{ listStyle: "none" }}>
              {groupIndex > 0 && <Divider sx={{ my: 0.75 }} />}
              {group.items.map((item) => renderMenuItem(item))}
            </Box>
          ),
        )}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          ...(showDrawer &&
            drawerOpen && {
              ml: `${DRAWER_W}px`,
              width: `calc(100% - ${DRAWER_W}px)`,
            }),
        }}
      >
        <Toolbar>
          {showDrawer && !drawerOpen && (
            <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" fontWeight={700} noWrap sx={{ mr: 2 }}>
            {showUserActions ? user?.loginRol : activeApp.alias}
          </Typography>

          <Button
            color="inherit"
            startIcon={<HomeIcon />}
            onClick={() => navigate(homePath)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              mr: 1,
              ...(location.pathname === homePath && { bgcolor: "rgba(255,255,255,0.12)" }),
            }}
          >
            Inicio
          </Button>

          {PUBLIC_NAV.map((item) => (
            <Button
              key={item.to}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.to)}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                mr: 1,
                ...(location.pathname === item.to && { bgcolor: "rgba(255,255,255,0.12)" }),
              }}
            >
              {item.label}
            </Button>
          ))}

          <Box sx={{ flexGrow: 1 }} />

          <ThemeSwitcher />

          {profileLoading && <CircularProgress size={22} color="inherit" sx={{ ml: 2 }} />}

          {!showUserActions && !profileLoading && !isAuthenticated && !isLoading && (
            <Button
              variant="outlined"
              color="inherit"
              sx={{
                ml: 2,
                textTransform: "none",
                fontWeight: 700,
                borderColor: "rgba(255,255,255,0.5)",
              }}
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </Button>
          )}

          {showUserActions && (
            <>
              <IconButton
                color="inherit"
                onClick={(e) => setNotifAnchor(e.currentTarget)}
                disabled={location.pathname === "/notifications"}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>

              <Popover
                open={Boolean(notifAnchor)}
                anchorEl={notifAnchor}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <Box sx={{ width: 380, maxHeight: 480 }}>
                  <NotificationList setCount={setUnreadCount} />
                  <Box textAlign="center" p={1}>
                    <Button
                      size="small"
                      onClick={() => {
                        setNotifAnchor(null);
                        navigate("/notifications");
                      }}
                    >
                      Ver todas
                    </Button>
                  </Box>
                </Box>
              </Popover>

              <Typography variant="body2" sx={{ mx: 1.5, display: { xs: "none", sm: "block" } }}>
                {displayName}
              </Typography>
              <IconButton color="inherit" onClick={(e) => setUserAnchor(e.currentTarget)}>
                <Avatar
                  src={profileImageUser || undefined}
                  sx={{ width: 36, height: 36, bgcolor: "secondary.main", color: "secondary.contrastText" }}
                >
                  {(displayName[0] || "U").toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)}>
                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    navigate("/perfil");
                  }}
                >
                  <ListItemIcon>
                    <PersonOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  Perfil
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    navigate("/info");
                  }}
                >
                  <ListItemIcon>
                    <InfoOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Info
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    navigate("/donaciones");
                  }}
                >
                  <ListItemIcon>
                    <CardGiftcardIcon fontSize="small" />
                  </ListItemIcon>
                  Donaciones
                </MenuItem>
                {hasMultipleRoles && (
                  <MenuItem
                    onClick={() => {
                      setUserAnchor(null);
                      setOpenChangeRol(true);
                    }}
                  >
                    <ListItemIcon>
                      <SwapHorizIcon fontSize="small" />
                    </ListItemIcon>
                    Cambiar rol
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setUserAnchor(null);
                    logout();
                    navigate("/home");
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  Cerrar sesión
                </MenuItem>
              </Menu>

              <SimpleDialog
                open={openChangeRol}
                onClose={() => setOpenChangeRol(false)}
                title="Cambiar de rol"
                maxWidth="xs"
                fullWidth
              >
                <CambiarRol onClose={() => setOpenChangeRol(false)} />
              </SimpleDialog>
            </>
          )}
        </Toolbar>
      </AppBar>

      {showDrawer && (
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? DRAWER_W : theme.spacing(7),
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerOpen ? DRAWER_W : theme.spacing(7),
              boxSizing: "border-box",
              overflowX: "hidden",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, pt: 10, px: { xs: 1.5, sm: 2, md: 3 }, pb: 3, width: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
