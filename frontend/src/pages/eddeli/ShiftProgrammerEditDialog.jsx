import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import {
  createShiftMovement,
  deleteShiftMovement,
  getShiftById,
  updateShift,
  updateShiftMovement,
} from "../../api/shiftRequest.js";
import { formatDateTime } from "../../helpers/functions.js";
import {
  CASH_BILLS,
  CASH_COINS,
  computeCashTotal,
  countsToFormState,
  datetimeLocalForApi,
  emptyCashCounts,
  formatMoney,
  isoToDatetimeLocal,
  parseQty,
} from "../../utils/turnoCashUtils.js";

const MOVEMENT_CATEGORY_LABELS = {
  gasto_operativo: "Gasto operativo",
  compra_mercancia: "Compra mercancía",
  retiro: "Retiro / depósito",
  entrada: "Entrada de efectivo",
  otro: "Otro",
};

const compactFieldSx = {
  m: 0,
  "& .MuiInputBase-root": { fontSize: "0.8rem", py: 0.25 },
  "& .MuiInputLabel-root": { fontSize: "0.72rem" },
};

function DenominationRow({ label, items, counts, onChange }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ width: 52, flexShrink: 0 }}>
        {label}
      </Typography>
      <Grid container spacing={0.75} wrap="nowrap" sx={{ flex: 1, minWidth: 0 }}>
        {items.map((d) => {
          const qty = parseQty(counts[d.key]);
          const subtotal = Number((qty * d.value).toFixed(2));
          return (
            <Grid item xs={2} key={d.key} sx={{ minWidth: 0, flex: "1 1 0" }}>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                type="number"
                label={d.label}
                value={counts[d.key]}
                onChange={(e) => onChange(d.key, e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                sx={compactFieldSx}
                InputProps={
                  qty > 0
                    ? {
                        endAdornment: (
                          <InputAdornment position="end" sx={{ "& p": { fontSize: "0.65rem" } }}>
                            {formatMoney(subtotal)}
                          </InputAdornment>
                        ),
                      }
                    : undefined
                }
              />
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

const emptyNewMovement = () => ({
  direction: "out",
  category: "gasto_operativo",
  amount: "",
  concept: "",
  createdAt: "",
});

export default function ShiftProgrammerEditDialog({ open, shiftId, onClose, onSaved, toast }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shift, setShift] = useState(null);
  const [openedAt, setOpenedAt] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [openCounts, setOpenCounts] = useState(emptyCashCounts);
  const [closeCounts, setCloseCounts] = useState(emptyCashCounts);
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [openTotalManual, setOpenTotalManual] = useState("");
  const [closeTotalManual, setCloseTotalManual] = useState("");
  const [movements, setMovements] = useState([]);
  const [movementEdits, setMovementEdits] = useState({});
  const [newMovement, setNewMovement] = useState(emptyNewMovement);
  const [addingMovement, setAddingMovement] = useState(false);

  const openTotal = useMemo(() => {
    const fromCounts = computeCashTotal(openCounts);
    return fromCounts > 0 ? fromCounts : Number(openTotalManual || 0);
  }, [openCounts, openTotalManual]);
  const closeTotal = useMemo(() => {
    const fromCounts = computeCashTotal(closeCounts);
    return fromCounts > 0 ? fromCounts : Number(closeTotalManual || 0);
  }, [closeCounts, closeTotalManual]);

  const loadShift = useCallback(async () => {
    if (!shiftId) return;
    setLoading(true);
    try {
      const { data } = await getShiftById(shiftId);
      setShift(data);
      setOpenedAt(isoToDatetimeLocal(data.openedAt));
      setClosedAt(isoToDatetimeLocal(data.closedAt));
      setOpenCounts(countsToFormState(data.openingCashCounts));
      setCloseCounts(countsToFormState(data.closingCashCounts));
      setOpenTotalManual(String(data.openingCashTotal ?? ""));
      setCloseTotalManual(String(data.closingCashTotal ?? ""));
      setOpeningNotes(data.openingNotes || "");
      setClosingNotes(data.closingNotes || "");
      const items = Array.isArray(data.cashMovements?.items) ? data.cashMovements.items : [];
      setMovements(items);
      const edits = {};
      for (const m of items) {
        edits[m.id] = {
          direction: m.direction,
          category: m.category,
          amount: String(m.amount ?? ""),
          concept: m.concept || "",
          createdAt: isoToDatetimeLocal(m.createdAt),
        };
      }
      setMovementEdits(edits);
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo cargar el turno.",
        variant: "error",
      });
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [shiftId, toast, onClose]);

  useEffect(() => {
    if (open && shiftId) void loadShift();
  }, [open, shiftId, loadShift]);

  const handleSaveShift = async () => {
    if (!shiftId) return;
    try {
      setSaving(true);
      await updateShift(shiftId, {
        openedAt: datetimeLocalForApi(openedAt),
        closedAt: shift?.status === "closed" ? datetimeLocalForApi(closedAt) : null,
        openingCashCounts: computeCashTotal(openCounts) > 0 ? openCounts : undefined,
        openingCashTotal: computeCashTotal(openCounts) > 0 ? undefined : Number(openTotalManual || 0),
        closingCashCounts:
          shift?.status === "closed" && computeCashTotal(closeCounts) > 0 ? closeCounts : undefined,
        closingCashTotal:
          shift?.status === "closed" && computeCashTotal(closeCounts) <= 0
            ? Number(closeTotalManual || 0)
            : undefined,
        openingNotes: openingNotes || null,
        closingNotes: closingNotes || null,
      });
      void toast?.({ message: "Turno guardado.", variant: "success" });
      await loadShift();
      onSaved?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo guardar el turno.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMovement = async (movementId) => {
    const edit = movementEdits[movementId];
    if (!edit) return;
    try {
      setSaving(true);
      await updateShiftMovement(shiftId, movementId, {
        direction: edit.direction,
        category: edit.category,
        amount: Number(edit.amount),
        concept: edit.concept.trim(),
        createdAt: datetimeLocalForApi(edit.createdAt),
      });
      void toast?.({ message: "Gasto actualizado.", variant: "success" });
      await loadShift();
      onSaved?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo actualizar el movimiento.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovement = async (movementId) => {
    if (!window.confirm("¿Eliminar este movimiento de caja?")) return;
    try {
      setSaving(true);
      await deleteShiftMovement(shiftId, movementId);
      void toast?.({ message: "Movimiento eliminado.", variant: "success" });
      await loadShift();
      onSaved?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo eliminar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMovement = async () => {
    const amt = Number(newMovement.amount);
    if (!amt || amt <= 0 || !newMovement.concept.trim()) {
      void toast?.({ message: "Monto y concepto son obligatorios.", variant: "warning" });
      return;
    }
    try {
      setAddingMovement(true);
      await createShiftMovement(shiftId, {
        direction: newMovement.direction,
        category: newMovement.category,
        amount: amt,
        concept: newMovement.concept.trim(),
        createdAt: datetimeLocalForApi(newMovement.createdAt) || undefined,
      });
      void toast?.({ message: "Movimiento añadido.", variant: "success" });
      setNewMovement(emptyNewMovement());
      await loadShift();
      onSaved?.();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo añadir el movimiento.",
        variant: "error",
      });
    } finally {
      setAddingMovement(false);
    }
  };

  const patchMovementEdit = (id, patch) => {
    setMovementEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="h6" fontWeight={800}>
            Editar turno #{shiftId}
          </Typography>
          <Chip label="Modo Programador" size="small" color="info" />
          {shift?.status === "open" && <Chip label="Abierto" size="small" color="success" />}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Cargando…
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Apertura"
                type="datetime-local"
                size="small"
                fullWidth
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              {shift?.status === "closed" && (
                <TextField
                  label="Cierre"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={closedAt}
                  onChange={(e) => setClosedAt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Stack>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                Arqueo apertura — total {formatMoney(openTotal)}
              </Typography>
              <DenominationRow
                label="Monedas"
                items={CASH_COINS}
                counts={openCounts}
                onChange={(key, val) => setOpenCounts((p) => ({ ...p, [key]: val }))}
              />
              <DenominationRow
                label="Billetes"
                items={CASH_BILLS}
                counts={openCounts}
                onChange={(key, val) => setOpenCounts((p) => ({ ...p, [key]: val }))}
              />
              {computeCashTotal(openCounts) <= 0 && (
                <TextField
                  size="small"
                  label="Total apertura (sin desglose)"
                  type="number"
                  value={openTotalManual}
                  onChange={(e) => setOpenTotalManual(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              )}
              <TextField
                size="small"
                label="Notas apertura"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                fullWidth
                sx={{ mt: 0.5 }}
              />
            </Box>

            {shift?.status === "closed" && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Arqueo cierre — total {formatMoney(closeTotal)}
                  {shift.expectedCashTotal != null && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (esperado {formatMoney(shift.expectedCashTotal)}, dif.{" "}
                      {formatMoney(shift.cashDifference)})
                    </Typography>
                  )}
                </Typography>
                <DenominationRow
                  label="Monedas"
                  items={CASH_COINS}
                  counts={closeCounts}
                  onChange={(key, val) => setCloseCounts((p) => ({ ...p, [key]: val }))}
                />
                <DenominationRow
                  label="Billetes"
                  items={CASH_BILLS}
                  counts={closeCounts}
                  onChange={(key, val) => setCloseCounts((p) => ({ ...p, [key]: val }))}
                />
                {computeCashTotal(closeCounts) <= 0 && (
                  <TextField
                    size="small"
                    label="Total cierre (sin desglose)"
                    type="number"
                    value={closeTotalManual}
                    onChange={(e) => setCloseTotalManual(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    sx={{ mt: 0.5 }}
                  />
                )}
                <TextField
                  size="small"
                  label="Notas cierre"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                Gastos y movimientos ({movements.length})
              </Typography>
              {movements.length > 0 && (
                <TableContainer sx={{ maxHeight: 220, mb: 1 }}>
                  <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.35, px: 0.5, fontSize: "0.72rem" } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Cat.</TableCell>
                        <TableCell>Concepto</TableCell>
                        <TableCell>Monto</TableCell>
                        <TableCell align="right">Acc.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movements.map((m) => {
                        const edit = movementEdits[m.id] || {};
                        return (
                          <TableRow key={m.id}>
                            <TableCell sx={{ minWidth: 150 }}>
                              <TextField
                                type="datetime-local"
                                size="small"
                                value={edit.createdAt || ""}
                                onChange={(e) => patchMovementEdit(m.id, { createdAt: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={compactFieldSx}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: 80 }}>
                              <Select
                                size="small"
                                value={edit.direction || "out"}
                                onChange={(e) => patchMovementEdit(m.id, { direction: e.target.value })}
                                sx={{ fontSize: "0.72rem" }}
                              >
                                <MenuItem value="out">Salida</MenuItem>
                                <MenuItem value="in">Entrada</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell sx={{ minWidth: 120 }}>
                              <Select
                                size="small"
                                value={edit.category || "gasto_operativo"}
                                onChange={(e) => patchMovementEdit(m.id, { category: e.target.value })}
                                sx={{ fontSize: "0.72rem" }}
                              >
                                {Object.entries(MOVEMENT_CATEGORY_LABELS).map(([k, v]) => (
                                  <MenuItem key={k} value={k}>
                                    {v}
                                  </MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={edit.concept || ""}
                                onChange={(e) => patchMovementEdit(m.id, { concept: e.target.value })}
                                sx={compactFieldSx}
                              />
                            </TableCell>
                            <TableCell sx={{ width: 80 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={edit.amount || ""}
                                onChange={(e) => patchMovementEdit(m.id, { amount: e.target.value })}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={compactFieldSx}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={saving}
                                onClick={() => void handleSaveMovement(m.id)}
                                aria-label="Guardar movimiento"
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={saving}
                                onClick={() => void handleDeleteMovement(m.id)}
                                aria-label="Eliminar movimiento"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Añadir gasto faltante (ej. almuerzo):
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <TextField
                  type="datetime-local"
                  size="small"
                  label="Fecha"
                  value={newMovement.createdAt}
                  onChange={(e) => setNewMovement((p) => ({ ...p, createdAt: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 180 }}
                />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    label="Categoría"
                    value={newMovement.category}
                    onChange={(e) => setNewMovement((p) => ({ ...p, category: e.target.value }))}
                  >
                    {Object.entries(MOVEMENT_CATEGORY_LABELS).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Monto"
                  type="number"
                  value={newMovement.amount}
                  onChange={(e) => setNewMovement((p) => ({ ...p, amount: e.target.value }))}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 90 }}
                />
                <TextField
                  size="small"
                  label="Concepto"
                  value={newMovement.concept}
                  onChange={(e) => setNewMovement((p) => ({ ...p, concept: e.target.value }))}
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={addingMovement}
                  onClick={() => void handleAddMovement()}
                >
                  Añadir
                </Button>
              </Stack>
            </Box>

            {shift?.openedAt && (
              <Typography variant="caption" color="text.secondary">
                Registrado: apertura {formatDateTime(shift.openedAt)}
                {shift.closedAt ? ` · cierre ${formatDateTime(shift.closedAt)}` : ""}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading || saving}
          onClick={() => void handleSaveShift()}
        >
          Guardar turno
        </Button>
      </DialogActions>
    </Dialog>
  );
}
