/**
 * Lista de notificaciones del usuario; toasts de mutación usan message del API.
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  Skeleton,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getNotificationsByUser,
  markNotificationAsSeen,
  deleteNotification,
} from "../api/notificationsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";

function parseNotificationDate(dateString) {
  if (!dateString) return null;
  const direct = new Date(dateString);
  if (!Number.isNaN(direct.getTime())) return direct;
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(dateString)) {
    const normalized = new Date(dateString.trim().replace(" ", "T"));
    if (!Number.isNaN(normalized.getTime())) return normalized;
  }
  return null;
}

/** Tiempo relativo en español; evita valores negativos por desfase de reloj/UTC. */
function getRelativeTime(dateString) {
  const createdAt = parseNotificationDate(dateString);
  if (!createdAt) return "";

  let diffSec = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  if (diffSec < 0) diffSec = 0;

  if (diffSec < 30) return "Ahora mismo";
  if (diffSec < 60) return "Hace un momento";
  if (diffSec < 120) return "Hace 1 minuto";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} minutos`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "Hace 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "Hace 1 semana";
  if (diffWeeks < 5) return `Hace ${diffWeeks} semanas`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "Hace 1 mes";
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "Hace 1 año" : `Hace ${diffYears} años`;
}

export default function NotificationList({ setCount }) {
  const [tab, setTab] = useState("all");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedNotifId, setSelectedNotifId] = useState(null);
  const [menuAllAnchor, setMenuAllAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const { user, toast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await getNotificationsByUser(user.userId);
        setNotifications(res.data || []);
        if (setCount) {
          setCount((res.data || []).filter((n) => !n.seen).length);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.userId, setCount]);

  const handleMarkAsRead = async () => {
    if (!selectedNotifId) return;
    const id = selectedNotifId;
    setMenuAnchor(null);
    setSelectedNotifId(null);
    try {
      await toast({ promise: markNotificationAsSeen(id) });
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, seen: true } : n));
        if (setCount) setCount(updated.filter((n) => !n.seen).length);
        return updated;
      });
    } catch {
      /* toast mostró error */
    }
  };

  const handleDelete = async () => {
    if (!selectedNotifId) return;
    const id = selectedNotifId;
    setMenuAnchor(null);
    setSelectedNotifId(null);
    try {
      await toast({ promise: deleteNotification(id) });
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        if (setCount) setCount(updated.filter((n) => !n.seen).length);
        return updated;
      });
    } catch {
      /* toast mostró error */
    }
  };

  const handleMarkAll = async () => {
    const unseen = notifications.filter((n) => !n.seen);
    if (unseen.length === 0) {
      setMenuAllAnchor(null);
      return;
    }
    setMenuAllAnchor(null);
    try {
      await toast({
        promise: Promise.all(unseen.map((n) => markNotificationAsSeen(n.id))),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
      if (setCount) setCount(0);
    } catch {
      /* toast mostró error */
    }
  };

  const filtered = tab === "unread" ? notifications.filter((n) => !n.seen) : notifications;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pt: 1 }}>
        <Typography variant="h6">Notificaciones</Typography>
        <IconButton onClick={(e) => setMenuAllAnchor(e.currentTarget)}>
          <MoreVertIcon />
        </IconButton>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1 }}>
        <Tab value="all" label="Todas" />
        <Tab value="unread" label="No leídas" />
      </Tabs>
      <Divider />
      {loading ? (
        [...Array(3)].map((_, i) => (
          <Box key={i} sx={{ py: 1.5, px: 1, display: "flex", gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box flex={1}>
              <Skeleton width="70%" />
              <Skeleton width="50%" />
            </Box>
          </Box>
        ))
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No hay notificaciones
        </Typography>
      ) : (
        filtered.map((notif) => (
          <Box
            key={notif.id}
            sx={{
              py: 1.5,
              display: "flex",
              alignItems: "flex-start",
              px: 1,
              borderRadius: 1,
              bgcolor: notif.seen ? "transparent" : "action.selected",
              cursor: notif.link ? "pointer" : "default",
            }}
            onClick={() => notif.link && navigate(notif.link)}
          >
            <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
              <StorefrontIcon />
            </Avatar>
            <Box flex={1}>
              <Typography variant="body1" fontWeight={notif.seen ? 400 : 700}>
                {notif.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {notif.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getRelativeTime(notif.createdAt)}
              </Typography>
            </Box>
            {!notif.seen && <NotificationsNoneIcon color="primary" sx={{ mx: 1 }} />}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNotifId(notif.id);
                setMenuAnchor(e.currentTarget);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        ))
      )}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleMarkAsRead}>Marcar como leída</MenuItem>
        <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
      </Menu>
      <Menu anchorEl={menuAllAnchor} open={Boolean(menuAllAnchor)} onClose={() => setMenuAllAnchor(null)}>
        <MenuItem onClick={handleMarkAll}>Marcar todas como leídas</MenuItem>
        {!location.pathname.includes("/notifications") && (
          <MenuItem onClick={() => navigate("/notifications")}>Ver todas</MenuItem>
        )}
      </Menu>
    </Box>
  );
}
