import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TablePro from "../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../components/Dialogs/SimpleDialog.jsx";
import {
  createTaskPlan,
  deleteTaskPlan,
  executeTaskOpenBox,
  getMyTaskItems,
  getTaskAssignees,
  getTaskPlans,
  publishTaskPlan,
  updateTaskItemStatus,
  updateTaskPlan,
} from "../../api/taskRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

const ADMIN_ROLES = new Set(["Administrador", "Programador"]);

const statusLabel = {
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Completada",
  blocked: "Bloqueada",
};

const chipColorByStatus = {
  pending: "error",
  in_progress: "warning",
  done: "success",
  blocked: "default",
};

const emptyItem = () => ({
  title: "",
  description: "",
  assignedUserId: "",
  priority: 0,
  dueDate: "",
  actionType: "none",
  actionPayload: { boxProductId: "", unitProductId: "", unitsPerBox: "", boxesToOpen: "1" },
});

const emptyForm = () => ({
  title: "",
  description: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  items: [emptyItem()],
});

function parseActionPayload(raw) {
  if (!raw) return emptyItem().actionPayload;
  if (typeof raw === "object") {
    return {
      boxProductId: raw.boxProductId ?? "",
      unitProductId: raw.unitProductId ?? "",
      unitsPerBox: raw.unitsPerBox ?? "",
      boxesToOpen: raw.boxesToOpen ?? "1",
    };
  }
  try {
    return parseActionPayload(JSON.parse(raw));
  } catch {
    return emptyItem().actionPayload;
  }
}

function planToForm(plan) {
  return {
    title: plan.title || "",
    description: plan.description || "",
    startDate: plan.startDate || new Date().toISOString().slice(0, 10),
    endDate: plan.endDate || new Date().toISOString().slice(0, 10),
    items:
      (plan.items || []).length > 0
        ? plan.items.map((it) => ({
            title: it.title || "",
            description: it.description || "",
            assignedUserId: it.assignedUserId || "",
            priority: it.priority ?? 0,
            dueDate: it.dueDate || "",
            actionType: it.actionType === "open_box" ? "open_box" : "none",
            actionPayload: parseActionPayload(it.actionPayload),
          }))
        : [emptyItem()],
  };
}

export default function TareasPage() {
  const { user, toast } = useAuth();
  const isAdmin = ADMIN_ROLES.has(user?.loginRol || "");
  const [plans, setPlans] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [p, a] = await Promise.all([getTaskPlans(), getTaskAssignees()]);
        setPlans(p.data || []);
        setAssignees(a.data || []);
      } else {
        const r = await getMyTaskItems({ active: 1 });
        setMyItems(r.data || []);
      }
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudieron cargar las tareas.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const myItemsByPlan = useMemo(() => {
    const map = new Map();
    for (const item of myItems) {
      const key = `${item.plan?.id || "sin-plan"}`;
      if (!map.has(key)) {
        map.set(key, { plan: item.plan, items: [] });
      }
      map.get(key).items.push(item);
    }
    return [...map.values()];
  }, [myItems]);

  const openCreate = () => {
    setEditingPlanId(null);
    setForm(emptyForm());
    setOpenDialog(true);
  };

  const openEdit = (plan) => {
    setEditingPlanId(plan.id);
    setForm(planToForm(plan));
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingPlanId(null);
    setForm(emptyForm());
  };

  const onAddItemRow = () => setForm((s) => ({ ...s, items: [...s.items, emptyItem()] }));
  const onRemoveItemRow = (idx) =>
    setForm((s) => ({
      ...s,
      items: s.items.filter((_, i) => i !== idx).length ? s.items.filter((_, i) => i !== idx) : [emptyItem()],
    }));
  const onUpdateItemRow = (idx, patch) =>
    setForm((s) => ({ ...s, items: s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const buildPayload = () => ({
    ...form,
    items: form.items.map((it) => ({
      ...it,
      assignedUserId: Number(it.assignedUserId),
      priority: Number(it.priority || 0),
      actionPayload:
        it.actionType === "open_box"
          ? {
              boxProductId: Number(it.actionPayload.boxProductId),
              unitProductId: Number(it.actionPayload.unitProductId),
              unitsPerBox: Number(it.actionPayload.unitsPerBox),
              boxesToOpen: Number(it.actionPayload.boxesToOpen || 1),
            }
          : null,
    })),
  });

  const onSavePlan = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();
      if (editingPlanId) {
        await updateTaskPlan(editingPlanId, payload);
        void toast?.({ message: "Plan actualizado.", variant: "success" });
      } else {
        await createTaskPlan(payload);
        void toast?.({ message: "Plan guardado en borrador.", variant: "success" });
      }
      closeDialog();
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo guardar el plan.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onPublishPlan = async (planId) => {
    try {
      setSaving(true);
      await publishTaskPlan(planId);
      void toast?.({ message: "Plan publicado y notificaciones enviadas.", variant: "success" });
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo publicar el plan.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onDeletePlan = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      setSaving(true);
      await deleteTaskPlan(plan.id);
      void toast?.({ message: "Plan eliminado.", variant: "success" });
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo eliminar el plan.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onMarkStatus = async (itemId, nextStatus) => {
    try {
      await updateTaskItemStatus(itemId, { status: nextStatus });
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo actualizar la tarea.",
        variant: "error",
      });
    }
  };

  const onRunOpenBox = async (itemId) => {
    try {
      await executeTaskOpenBox(itemId);
      void toast?.({ message: "Acción de abrir caja ejecutada.", variant: "success" });
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo ejecutar la acción.",
        variant: "error",
      });
    }
  };

  if (isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Tareas
        </Typography>
        <Paper sx={{ p: 1, borderRadius: 2, mb: 1, display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            Crea planes, edita borradores y publícalos para empleados.
          </Typography>
          <Button variant="contained" onClick={openCreate}>
            Nuevo plan
          </Button>
        </Paper>

        <TablePro
          title="Planes de tareas"
          rows={plans}
          columns={[
            { id: "id", label: "#" },
            { id: "title", label: "Plan" },
            { id: "range", label: "Rango", render: (r) => `${r.startDate} → ${r.endDate}` },
            { id: "status", label: "Estado", render: (r) => r.status },
            { id: "items", label: "Tareas", render: (r) => (r.items || []).length },
            {
              id: "actions",
              label: "Acciones",
              render: (r) =>
                r.status === "draft" ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Button size="small" disabled={saving} onClick={() => onPublishPlan(r.id)}>
                      Publicar
                    </Button>
                    <IconButton size="small" color="primary" disabled={saving} onClick={() => openEdit(r)} title="Editar">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" disabled={saving} onClick={() => onDeletePlan(r)} title="Eliminar">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ) : (
                  "—"
                ),
            },
          ]}
          showSearch
          showPagination
          showIndex
          defaultRowsPerPage={10}
          loading={loading}
        />

        <SimpleDialog
          open={openDialog}
          onClose={closeDialog}
          title={editingPlanId ? "Editar plan de tareas" : "Nuevo plan de tareas"}
          fullWidth
          maxWidth="lg"
        >
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" label="Título" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="date" label="Inicio" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="date" label="Fin" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Descripción" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tareas del plan
              </Typography>
              <Stack spacing={1}>
                {form.items.map((item, idx) => (
                  <Paper key={`task-row-${idx}`} variant="outlined" sx={{ p: 1.2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={3}>
                        <TextField fullWidth size="small" label="Tarea" value={item.title} onChange={(e) => onUpdateItemRow(idx, { title: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField select fullWidth size="small" label="Asignado a" value={item.assignedUserId} onChange={(e) => onUpdateItemRow(idx, { assignedUserId: e.target.value })}>
                          {assignees.map((a) => (
                            <MenuItem key={`asg-${a.userId}`} value={a.userId}>
                              {a.fullName} ({a.username})
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField select fullWidth size="small" label="Acción" value={item.actionType} onChange={(e) => onUpdateItemRow(idx, { actionType: e.target.value })}>
                          <MenuItem value="none">Solo checklist</MenuItem>
                          <MenuItem value="open_box">Abrir caja</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={6} md={1}>
                        <TextField fullWidth size="small" type="number" label="Prior." value={item.priority} onChange={(e) => onUpdateItemRow(idx, { priority: e.target.value })} />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <TextField fullWidth size="small" type="date" label="Vence" InputLabelProps={{ shrink: true }} value={item.dueDate} onChange={(e) => onUpdateItemRow(idx, { dueDate: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={1} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconButton color="error" onClick={() => onRemoveItemRow(idx)}>
                          <DeleteIcon />
                        </IconButton>
                      </Grid>

                      {item.actionType === "open_box" ? (
                        <>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="ID producto caja"
                              value={item.actionPayload.boxProductId}
                              onChange={(e) =>
                                onUpdateItemRow(idx, {
                                  actionPayload: { ...item.actionPayload, boxProductId: e.target.value },
                                })
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="ID producto unidad"
                              value={item.actionPayload.unitProductId}
                              onChange={(e) =>
                                onUpdateItemRow(idx, {
                                  actionPayload: { ...item.actionPayload, unitProductId: e.target.value },
                                })
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Unidades por caja"
                              value={item.actionPayload.unitsPerBox}
                              onChange={(e) =>
                                onUpdateItemRow(idx, {
                                  actionPayload: { ...item.actionPayload, unitsPerBox: e.target.value },
                                })
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Cajas a abrir"
                              value={item.actionPayload.boxesToOpen}
                              onChange={(e) =>
                                onUpdateItemRow(idx, {
                                  actionPayload: { ...item.actionPayload, boxesToOpen: e.target.value },
                                })
                              }
                            />
                          </Grid>
                        </>
                      ) : null}

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Detalle"
                          value={item.description}
                          onChange={(e) => onUpdateItemRow(idx, { description: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddItemRow}>
                Añadir tarea
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button fullWidth variant="contained" disabled={saving} onClick={onSavePlan}>
                {editingPlanId ? "Guardar cambios" : "Guardar plan"}
              </Button>
            </Grid>
          </Grid>
        </SimpleDialog>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tareas
      </Typography>
      {myItemsByPlan.length === 0 ? (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography color="text.secondary">No tienes tareas activas por ahora.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {myItemsByPlan.map((group) => (
            <Paper key={`plan-${group.plan?.id || "none"}`} sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography fontWeight={700}>
                {group.plan?.title || "Plan"} ({group.plan?.startDate} → {group.plan?.endDate})
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {group.items.map((item) => (
                  <Paper key={`task-item-${item.id}`} variant="outlined" sx={{ p: 1 }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography fontWeight={600}>{item.title}</Typography>
                        {item.description ? (
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={statusLabel[item.status] || item.status} color={chipColorByStatus[item.status] || "default"} />
                        {item.actionType === "open_box" ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => onRunOpenBox(item.id)}
                            disabled={item.status === "done"}
                          >
                            Abrir caja
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AssignmentTurnedInIcon />}
                          onClick={() => onMarkStatus(item.id, item.status === "done" ? "pending" : "done")}
                        >
                          {item.status === "done" ? "Quitar check" : "Check"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
