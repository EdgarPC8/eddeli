/**
 * Bandeja de notificaciones estilo Gmail (popover del NavBar y página).
 * Acciones visibles: marcar leída, eliminar, selección múltiple.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Checkbox,
  Tabs,
  Tab,
  Divider,
  Skeleton,
  Tooltip,
  Button,
  Chip,
  Stack,
} from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EventNoteIcon from "@mui/icons-material/EventNote";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useNavigate } from "react-router-dom";
import {
  getNotificationsByUser,
  markNotificationAsSeen,
  deleteNotification,
  markManyNotificationsAsSeen,
  deleteManyNotifications,
  markAllNotificationsAsSeen,
  deleteReadNotifications,
} from "../api/notificationsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotificationSocket } from "../hooks/useNotificationSocket.js";

function notificationAvatar(notif) {
  const title = String(notif?.title || "").toLowerCase();
  const cat = getCategory(notif);
  if (cat === "stock" || notif?.type === "alert") {
    return { icon: <WarningAmberIcon fontSize="small" />, bgcolor: "warning.main" };
  }
  if (notif?.type === "reminder") {
    return { icon: <EventNoteIcon fontSize="small" />, bgcolor: "info.main" };
  }
  if (title.includes("buenas noches")) {
    return { icon: <NightsStayIcon fontSize="small" />, bgcolor: "secondary.main" };
  }
  if (title.includes("buenas tardes") || title.includes("buenos días") || title.includes("buenos dias")) {
    return { icon: <WbSunnyIcon fontSize="small" />, bgcolor: "primary.main" };
  }
  if (cat === "greeting") {
    return { icon: <WbSunnyIcon fontSize="small" />, bgcolor: "primary.main" };
  }
  return { icon: <StorefrontIcon fontSize="small" />, bgcolor: "primary.main" };
}

function getCategory(notif) {
  const title = String(notif?.title || "").toLowerCase();
  const sk = String(notif?.sourceKey || "").toLowerCase();
  if (sk.startsWith("stock_min") || title.includes("stock")) return "stock";
  if (
    sk.startsWith("program:") ||
    title.includes("buenos") ||
    title.includes("buenas") ||
    title.includes("saludo")
  ) {
    return "greeting";
  }
  return "other";
}

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
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "Hace 1 h";
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "Hace 1 sem";
  if (diffWeeks < 5) return `Hace ${diffWeeks} sem`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "Hace 1 mes";
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "Hace 1 año" : `Hace ${diffYears} años`;
}

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "No leídas" },
  { id: "stock", label: "Stock" },
  { id: "greeting", label: "Saludos" },
];

/**
 * @param {{ setCount?: (n: number) => void, compact?: boolean, onClose?: () => void }} props
 */
export default function NotificationList({ setCount, compact = false, onClose }) {
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [, setTimeTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const { user, toast } = useAuth();
  const navigate = useNavigate();

  const syncCount = (list) => {
    if (setCount) setCount(list.filter((n) => !n.seen).length);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await getNotificationsByUser(user.userId);
        const list = res.data || [];
        setNotifications(list);
        syncCount(list);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setCount estable vía padre
  }, [user?.userId]);

  useNotificationSocket(user?.userId, user?.accountId, (notif) => {
    if (!notif?.id) return;
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      const next = [notif, ...prev];
      syncCount(next);
      return next;
    });
  });

  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.seen).length;
    const stock = notifications.filter((n) => getCategory(n) === "stock").length;
    const greeting = notifications.filter((n) => getCategory(n) === "greeting").length;
    return { all: notifications.length, unread, stock, greeting };
  }, [notifications]);

  const filtered = useMemo(() => {
    if (tab === "unread") return notifications.filter((n) => !n.seen);
    if (tab === "stock") return notifications.filter((n) => getCategory(n) === "stock");
    if (tab === "greeting") return notifications.filter((n) => getCategory(n) === "greeting");
    return notifications;
  }, [notifications, tab]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((n) => selected.has(n.id));
  const someSelected = selected.size > 0;

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((n) => next.delete(n.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((n) => next.add(n.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const markIds = async (ids, { silent = false } = {}) => {
    if (!ids.length || busy) return;
    setBusy(true);
    try {
      const req =
        ids.length === 1
          ? markNotificationAsSeen(ids[0])
          : markManyNotificationsAsSeen(ids);
      if (silent) await req;
      else await toast({ promise: req });
      setNotifications((prev) => {
        const next = prev.map((n) => (ids.includes(n.id) ? { ...n, seen: true } : n));
        syncCount(next);
        return next;
      });
      clearSelection();
    } catch {
      /* toast / silent */
    } finally {
      setBusy(false);
    }
  };

  const deleteIds = async (ids) => {
    if (!ids.length || busy) return;
    setBusy(true);
    try {
      if (ids.length === 1) {
        await toast({ promise: deleteNotification(ids[0]) });
      } else {
        await toast({ promise: deleteManyNotifications(ids) });
      }
      setNotifications((prev) => {
        const next = prev.filter((n) => !ids.includes(n.id));
        syncCount(next);
        return next;
      });
      clearSelection();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const handleMarkAll = async () => {
    if (!user?.userId || busy) return;
    const unseen = notifications.filter((n) => !n.seen);
    if (!unseen.length) return;
    setBusy(true);
    try {
      await toast({ promise: markAllNotificationsAsSeen(user.userId) });
      setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
      if (setCount) setCount(0);
      clearSelection();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const handleClearRead = async () => {
    if (!user?.userId || busy) return;
    const read = notifications.filter((n) => n.seen);
    if (!read.length) return;
    setBusy(true);
    try {
      await toast({ promise: deleteReadNotifications(user.userId) });
      setNotifications((prev) => {
        const next = prev.filter((n) => !n.seen);
        syncCount(next);
        return next;
      });
      clearSelection();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  const openNotif = async (notif) => {
    if (!notif.seen) await markIds([notif.id], { silent: true });
    if (notif.link) {
      onClose?.();
      navigate(notif.link);
    }
  };

  const listMaxH = compact ? 360 : 520;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
      }}
    >
      {/* Cabecera */}
      <Box
        sx={{
          px: 1.5,
          pt: 1.25,
          pb: 0.75,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {someSelected ? (
          <>
            <Tooltip title="Cerrar selección">
              <IconButton size="small" onClick={clearSelection}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
              {selected.size} seleccionada{selected.size === 1 ? "" : "s"}
            </Typography>
            <Tooltip title="Marcar como leídas">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={busy}
                  onClick={() => markIds([...selected])}
                >
                  <MarkEmailReadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Eliminar">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() => deleteIds([...selected])}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                Notificaciones
              </Typography>
              {counts.unread > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {counts.unread} sin leer
                </Typography>
              )}
            </Box>
            <Tooltip title="Marcar todas como leídas">
              <span>
                <IconButton
                  size="small"
                  disabled={busy || counts.unread === 0}
                  onClick={handleMarkAll}
                  color="primary"
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Eliminar leídas">
              <span>
                <IconButton
                  size="small"
                  disabled={busy || notifications.every((n) => !n.seen)}
                  onClick={handleClearRead}
                >
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Filtros tipo Gmail */}
      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          clearSelection();
        }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          px: 0.5,
          "& .MuiTab-root": {
            minHeight: 36,
            py: 0,
            px: 1.25,
            textTransform: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
          },
        }}
      >
        {FILTERS.map((f) => (
          <Tab
            key={f.id}
            value={f.id}
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <span>{f.label}</span>
                {counts[f.id] > 0 && f.id !== "all" && (
                  <Chip
                    size="small"
                    label={counts[f.id]}
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                )}
              </Stack>
            }
          />
        ))}
      </Tabs>
      <Divider />

      {/* Seleccionar todas de la vista */}
      {!loading && filtered.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 0.5,
            py: 0.25,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Checkbox
            size="small"
            checked={allFilteredSelected}
            indeterminate={someSelected && !allFilteredSelected && filtered.some((n) => selected.has(n.id))}
            onChange={toggleAllFiltered}
            inputProps={{ "aria-label": "Seleccionar todas" }}
          />
          <Typography variant="caption" color="text.secondary">
            Seleccionar visibles
          </Typography>
        </Box>
      )}

      {/* Lista */}
      <Box sx={{ overflowY: "auto", flex: 1, maxHeight: listMaxH }}>
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Box key={i} sx={{ py: 1.25, px: 1.5, display: "flex", gap: 1.5 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box flex={1}>
                <Skeleton width="65%" height={18} />
                <Skeleton width="90%" height={14} />
                <Skeleton width="30%" height={12} />
              </Box>
            </Box>
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 5, px: 2, textAlign: "center" }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {tab === "unread"
                ? "No tienes notificaciones sin leer"
                : tab === "stock"
                  ? "Sin alertas de stock"
                  : tab === "greeting"
                    ? "Sin saludos ni avisos"
                    : "No hay notificaciones"}
            </Typography>
          </Box>
        ) : (
          filtered.map((notif) => {
            const avatar = notificationAvatar(notif);
            const isSel = selected.has(notif.id);
            const cat = getCategory(notif);
            return (
              <Box
                key={notif.id}
                className="notif-row"
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0.25,
                  px: 0.5,
                  py: 0.85,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: isSel
                    ? "action.selected"
                    : notif.seen
                      ? "transparent"
                      : "action.hover",
                  cursor: notif.link ? "pointer" : "default",
                  position: "relative",
                  transition: "background-color 0.15s",
                  "&:hover": {
                    bgcolor: "action.selected",
                    "& .notif-actions": { opacity: 1 },
                    "& .notif-check": { opacity: 1 },
                  },
                }}
                onClick={() => openNotif(notif)}
              >
                <Checkbox
                  className="notif-check"
                  size="small"
                  checked={isSel}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleOne(notif.id)}
                  sx={{
                    opacity: isSel || someSelected ? 1 : 0.35,
                    transition: "opacity 0.15s",
                    mt: 0.25,
                  }}
                />
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    mt: 0.35,
                    bgcolor: avatar.bgcolor,
                    flexShrink: 0,
                  }}
                >
                  {cat === "stock" ? (
                    <Inventory2OutlinedIcon fontSize="small" />
                  ) : (
                    avatar.icon
                  )}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0, pr: 0.5, pt: 0.15 }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={notif.seen ? 500 : 800}
                      noWrap
                      sx={{ flex: 1 }}
                    >
                      {notif.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ flexShrink: 0, fontSize: "0.7rem" }}
                    >
                      {getRelativeTime(notif.createdAt)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.35,
                    }}
                  >
                    {notif.message}
                  </Typography>
                </Box>

                {/* Acciones tipo Gmail */}
                <Stack
                  className="notif-actions"
                  direction="row"
                  spacing={0}
                  sx={{
                    opacity: { xs: 1, sm: 0 },
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                    alignSelf: "center",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!notif.seen && (
                    <Tooltip title="Marcar como leída">
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => markIds([notif.id])}
                      >
                        <MarkEmailReadIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      disabled={busy}
                      onClick={() => deleteIds([notif.id])}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })
        )}
      </Box>

      {compact && (
        <>
          <Divider />
          <Box sx={{ p: 1, textAlign: "center" }}>
            <Button
              size="small"
              onClick={() => {
                onClose?.();
                navigate("/notifications");
              }}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Abrir bandeja completa
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
