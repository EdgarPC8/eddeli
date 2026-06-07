/**
 * CRUD de notificaciones programadas y envío manual (Admin/Programador).
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
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
};

export default function NotificationProgramsPage() {
  const { user, toast } = useAuth();
  const [list, setList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [sendingId, setSendingId] = useState(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/notifications" replace />;
  }

  const handleOpen = (item = null) => {
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
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setOpen(true);
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta notificación programada?")) return;
    try {
      await toast({ promise: deleteNotificationProgram(id) });
      load();
    } catch {
      /* toast */
    }
  };

  const handleSendNow = async (id) => {
    setSendingId(id);
    try {
      await toast({ promise: sendNotificationProgramNow(id) });
      load();
    } catch {
      /* toast mostró error del backend */
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
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

      {list.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">
              No hay plantillas. Crea una o reinicia el backend para cargar las
              predeterminadas.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {list.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.code}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {item.message}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1 }}
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        label={
                          item.scheduleType === "daily"
                            ? `Diario ${item.scheduleTime || ""}`
                            : "Manual"
                        }
                        color={
                          item.scheduleType === "daily" ? "primary" : "default"
                        }
                      />
                      <Chip
                        size="small"
                        label={
                          item.targetType === "all_users"
                            ? "Todos los usuarios"
                            : "Por rol"
                        }
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={item.active ? "Activa" : "Inactiva"}
                        color={item.active ? "success" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Enviar ahora">
                      <IconButton
                        color="primary"
                        onClick={() => handleSendNow(item.id)}
                        disabled={sendingId === item.id}
                      >
                        {sendingId === item.id ? (
                          <CircularProgress size={24} />
                        ) : (
                          <SendIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

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
