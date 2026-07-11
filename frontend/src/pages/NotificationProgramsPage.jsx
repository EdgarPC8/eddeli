/**
 * CRUD de notificaciones programadas y envío manual (Admin/Programador).
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Alert,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import {
  getNotificationPrograms,
  createNotificationProgram,
  updateNotificationProgram,
  deleteNotificationProgram,
  sendNotificationProgramNow,
} from "../api/notificationProgramRequest.js";
import { getRolRequest } from "../api/accountRequest.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import { PageSkeleton } from "../components/ContentSkeleton.jsx";
import TablePro from "../components/Tables/TablePro.jsx";

/** Backend activo — CRUD en /notification-programs */
const BACKEND_ENABLED = true;

const ALLOWED = new Set(["Programador", "Administrador"]);

const initialForm = {
  code: "",
  title: "",
  message: "",
  link: "",
  scheduleType: "manual",
  scheduleTime: "08:00",
  scopeType: "user",
  targetType: "all_users",
  targetRoleIds: [],
  active: true,
  notificationType: "info",
  handlerType: "static",
  scheduleIntervalMinutes: 60,
};

function scheduleLabel(item) {
  if (item.scheduleType === "daily") return `Diario ${item.scheduleTime || ""}`.trim();
  if (item.scheduleType === "interval") {
    return `Cada ${item.scheduleIntervalMinutes || 60} min`;
  }
  return "Manual";
}

export default function NotificationProgramsPage() {
  const { user, toast } = useAuth();
  const [list, setList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [sendingId, setSendingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [progsRes, rolesRes] = await Promise.all([
        getNotificationPrograms(),
        getRolRequest().catch(() => ({ data: [] })),
      ]);
      setList(progsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch {
      /* sin toast al cargar listado */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = useCallback((item = null) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        code: item.code || "",
        title: item.title || "",
        message: item.message || "",
        link: item.link || "",
        scheduleType: item.scheduleType || "manual",
        scheduleTime: item.scheduleTime || "08:00",
        scopeType: item.scopeType || "user",
        targetType: item.targetType || "all_users",
        targetRoleIds: item.targetRoleIds || [],
        active: item.active ?? true,
        notificationType: item.notificationType || "info",
        handlerType: item.handlerType || "static",
        scheduleIntervalMinutes: item.scheduleIntervalMinutes ?? 60,
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.code?.trim() || !form.title?.trim() || !form.message?.trim()) {
      toast({
        message: "Código, título y mensaje son requeridos",
        variant: "warning",
      });
      return;
    }
    try {
      if (editingId) {
        await toast({ promise: updateNotificationProgram(editingId, form) });
      } else {
        await toast({ promise: createNotificationProgram(form) });
      }
      handleClose();
      load();
    } catch {
      /* toast ya mostró error */
    }
  };

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("¿Eliminar esta notificación programada?")) return;
      try {
        await toast({ promise: deleteNotificationProgram(id) });
        load();
      } catch {
        /* toast */
      }
    },
    [toast, load],
  );

  const handleSendNow = useCallback(
    async (id) => {
      setSendingId(id);
      try {
        await toast({ promise: sendNotificationProgramNow(id) });
        load();
      } catch {
        /* toast mostró error del backend */
      } finally {
        setSendingId(null);
      }
    },
    [toast, load],
  );

  const columns = useMemo(
    () => [
      {
        label: "Título",
        id: "title",
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {row.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.code}
            </Typography>
          </Box>
        ),
        getSearchValue: (row) => `${row.title || ""} ${row.code || ""}`,
      },
      {
        label: "Mensaje",
        id: "message",
        render: (row) => (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.message || ""}
          >
            {row.message || "—"}
          </Typography>
        ),
      },
      {
        label: "Horario",
        id: "scheduleType",
        render: (row) => (
          <Chip
            size="small"
            label={scheduleLabel(row)}
            color={row.scheduleType === "manual" ? "default" : "primary"}
          />
        ),
        getSearchValue: (row) => scheduleLabel(row),
      },
      {
        label: "Destino",
        id: "targetType",
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {row.handlerType === "stock_min" && (
              <Chip size="small" label="Stock mínimo" color="warning" />
            )}
            <Chip
              size="small"
              label={row.targetType === "all_users" ? "Todos" : "Por rol"}
              variant="outlined"
            />
          </Stack>
        ),
        getSearchValue: (row) =>
          `${row.handlerType || ""} ${
            row.targetType === "all_users" ? "todos" : "rol"
          }`,
      },
      {
        label: "Estado",
        id: "active",
        render: (row) => (
          <Chip
            size="small"
            label={row.active ? "Activa" : "Inactiva"}
            color={row.active ? "success" : "default"}
            variant="outlined"
          />
        ),
        getSearchValue: (row) => (row.active ? "activa" : "inactiva"),
      },
      {
        label: "Acciones",
        id: "actions",
        stopRowClick: true,
        getSearchValue: () => "",
        render: (row) => (
          <Box sx={{ display: "flex", gap: 0.25 }}>
            <Tooltip title="Enviar ahora">
              <IconButton
                color="primary"
                size="small"
                onClick={() => handleSendNow(row.id)}
                disabled={sendingId === row.id}
              >
                {sendingId === row.id ? (
                  <CircularProgress size={18} />
                ) : (
                  <SendIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => handleOpen(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(row.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [sendingId, handleSendNow, handleOpen, handleDelete],
  );

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/notifications" replace />;
  }

  if (!BACKEND_ENABLED) {
    return (
      <Box sx={{ p: 3, maxWidth: 640 }}>
        <Alert severity="info">
          Notificaciones programadas: el backend aún no expone{" "}
          <code>/notification-programs</code>. Activa{" "}
          <code>BACKEND_ENABLED</code> en esta página y descomenta el menú en{" "}
          <code>NavBar.jsx</code> cuando la API esté lista.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 2, px: 1 }}>
        <PageSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={700}>
          Programar notificaciones
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Nueva
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Saludos automáticos (buenos días, buenas tardes), bienvenida, avisos de
        actualización, etc. Activa el horario diario o envía manualmente con el
        botón de enviar.
      </Typography>

      <TablePro
        rows={list}
        columns={columns}
        title="PLANTILLAS"
        showIndex
        defaultRowsPerPage={25}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? "Editar notificación" : "Nueva notificación"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Código (ej: BUENOS_DIAS)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Mensaje"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              fullWidth
              multiline
              rows={3}
              required
            />
            <TextField
              label="Enlace (opcional)"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              fullWidth
              placeholder="/inicio"
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de programación</InputLabel>
              <Select
                value={form.scheduleType}
                label="Tipo de programación"
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduleType: e.target.value }))
                }
              >
                <MenuItem value="manual">
                  Manual (enviar cuando quieras)
                </MenuItem>
                <MenuItem value="daily">Diario (hora fija)</MenuItem>
                <MenuItem value="interval">Intervalo (cada X minutos)</MenuItem>
              </Select>
            </FormControl>
            {form.scheduleType === "daily" && (
              <TextField
                label="Hora"
                type="time"
                value={form.scheduleTime || "08:00"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduleTime: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
            {form.scheduleType === "interval" && (
              <TextField
                label="Intervalo (minutos)"
                type="number"
                inputProps={{ min: 5, step: 5 }}
                value={form.scheduleIntervalMinutes ?? 60}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scheduleIntervalMinutes: Number(e.target.value) || 60,
                  }))
                }
                fullWidth
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Destinatarios</InputLabel>
              <Select
                value={form.targetType}
                label="Destinatarios"
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetType: e.target.value }))
                }
              >
                <MenuItem value="all_users">Todos los usuarios</MenuItem>
                <MenuItem value="by_role">Por rol</MenuItem>
              </Select>
            </FormControl>
            {form.targetType === "by_role" && (
              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={form.targetRoleIds || []}
                  label="Roles"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetRoleIds: e.target.value }))
                  }
                  renderValue={(sel) =>
                    roles
                      .filter((r) => sel.includes(r.id))
                      .map((r) => r.name)
                      .join(", ")
                  }
                >
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
              }
              label="Activa (solo aplica a envío diario automático)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingId ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
