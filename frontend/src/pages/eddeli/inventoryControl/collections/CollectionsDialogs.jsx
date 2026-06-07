import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Chip,
  Typography,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Checkbox,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { money } from "./helpers.js";
import ItemsTable from "./ItemsTable.jsx";

/** Diálogos: crear grupo, abonar, mover ítem, editar concepto de grupo */
export default function CollectionsDialogs({
  createOpen,
  setCreateOpen,
  createMode,
  groupConcept,
  setGroupConcept,
  selectedItemIds,
  selectedPaidItemIds,
  selectedItemsTotal,
  selectedPaidItemsTotal,
  createGroup,
  loading,

  payOpen,
  setPayOpen,
  payAmount,
  setPayAmount,
  payDate,
  setPayDate,
  payNote,
  setPayNote,
  payMethod,
  setPayMethod,
  confirmPay,
  selectedGroupId,
  groupRemaining,

  moveOpen,
  setMoveOpen,
  moveItem,
  moveToGroupId,
  setMoveToGroupId,
  confirmMoveToGroup,
  customerGroups,

  groupEditOpen,
  setGroupEditOpen,
  groupEditConcept,
  setGroupEditConcept,
  confirmEditGroupConcept,

  addItemsOpen,
  setAddItemsOpen,
  addItemsSelectedIds,
  toggleAddItemsSelect,
  confirmAddItemsToGroup,
  itemsUngrouped,
  customerOrders,
  itemLineTotal,
  getItemGroupId,

  editPaymentOpen,
  setEditPaymentOpen,
  editPaymentAmount,
  setEditPaymentAmount,
  editPaymentDate,
  setEditPaymentDate,
  editPaymentNote,
  setEditPaymentNote,
  editPaymentMethod,
  setEditPaymentMethod,
  confirmEditPayment,
  editingPayment,
}) {
  return (
    <>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {createMode === "paid"
            ? "Crear grupo HISTÓRICO con ítems pagados seleccionados"
            : "Crear grupo con ítems pendientes seleccionados"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre del grupo (concepto)"
              value={groupConcept}
              onChange={(e) => setGroupConcept(e.target.value)}
              placeholder={
                createMode === "paid"
                  ? "Ej: Pagos antiguos (Dic)"
                  : "Ej: Semana 50 (08–14 Dic)"
              }
            />
            <Alert severity="info">
              {createMode === "paid" ? (
                <>Se crearán grupos solo con <b>ítems pagados</b> y <b>sin grupo</b>.</>
              ) : (
                <>Se crearán grupos solo con <b>ítems pendientes</b> y <b>sin grupo</b>.</>
              )}{" "}
              Un ítem solo puede estar en un grupo.
            </Alert>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
              <Chip
                label={`Ítems seleccionados: ${
                  createMode === "paid" ? selectedPaidItemIds.length : selectedItemIds.length
                }`}
                variant="outlined"
              />
              <Chip
                label={`Total estimado: ${
                  createMode === "paid"
                    ? money(selectedPaidItemsTotal)
                    : money(selectedItemsTotal)
                }`}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button disabled={loading} variant="contained" onClick={createGroup}>Crear</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar abono al grupo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Monto"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              helperText={
                selectedGroupId ? `Saldo actual: ${money(groupRemaining(selectedGroupId))}` : ""
              }
            />
            <TextField
              label="Fecha"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Método"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              placeholder="efectivo / transferencia / etc."
            />
            <TextField
              label="Nota"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Ej: Abono en efectivo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={() => setPayOpen(false)}>Cancelar</Button>
          <Button disabled={loading} variant="contained" onClick={confirmPay}>
            Guardar abono
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Mover ítem a otro grupo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Ítem: <b>{moveItem?.product || "—"}</b>
            </Typography>
            <TextField
              select
              label="Grupo destino"
              value={moveToGroupId}
              onChange={(e) => setMoveToGroupId(e.target.value)}
              fullWidth
            >
              {(customerGroups || [])
                .filter((g) => g.id !== (moveItem?.itemGroupId ?? moveItem?.groupId))
                .map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    #{g.id} · {g.concept}
                  </MenuItem>
                ))}
            </TextField>
            <Alert severity="info">
              Esto moverá el ítem del grupo actual al grupo seleccionado.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmMoveToGroup}>Mover</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={groupEditOpen} onClose={() => setGroupEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar nombre (concepto) del grupo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Concepto"
              value={groupEditConcept}
              onChange={(e) => setGroupEditConcept(e.target.value)}
              fullWidth
            />
            <Alert severity="info">
              Cambia el nombre del grupo (solo texto). No modifica ítems ni pagos.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmEditGroupConcept}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editPaymentOpen} onClose={() => setEditPaymentOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Editar abono #{editingPayment?.id ?? ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Solo Programador. Los cambios sincronizan el ingreso contable y el estado del grupo.
            </Alert>
            <TextField
              label="Monto"
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(e.target.value)}
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              fullWidth
            />
            <TextField
              label="Fecha"
              type="date"
              value={editPaymentDate}
              onChange={(e) => setEditPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Método"
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
              fullWidth
            />
            <TextField
              label="Nota"
              value={editPaymentNote}
              onChange={(e) => setEditPaymentNote(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={() => setEditPaymentOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={loading} variant="contained" onClick={confirmEditPayment}>
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addItemsOpen} onClose={() => setAddItemsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Agregar ítems al grupo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Selecciona los ítems pendientes sin grupo que quieres agregar a este grupo.
              Solo se pueden agregar ítems del mismo cliente.
            </Alert>
            {itemsUngrouped.length === 0 ? (
              <Alert severity="warning">
                No hay ítems pendientes sin grupo para agregar.
              </Alert>
            ) : (
              <>
                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                  <Chip
                    label={`Ítems seleccionados: ${addItemsSelectedIds.length}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Total: ${money(
                      itemsUngrouped
                        .filter((it) => addItemsSelectedIds.includes(it.id))
                        .reduce((sum, it) => sum + (itemLineTotal(it) || 0), 0)
                    )}`}
                    variant="outlined"
                    color="primary"
                  />
                </Stack>
                <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                  <Stack spacing={1}>
                    {customerOrders
                      .slice()
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((o) => {
                        const items = (o.items || [])
                          .filter((it) => !it.paidAt && !getItemGroupId(it));
                        if (items.length === 0) return null;
                        return (
                          <Accordion key={o.id} variant="outlined" disableGutters>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", pr: 1 }}>
                                <Typography sx={{ fontWeight: 600 }}>
                                  Pedido #{o.id} · {o.date}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${items.length} ítem(s)`}
                                  variant="outlined"
                                />
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Paper variant="outlined" sx={{ p: 1 }}>
                                <ItemsTable
                                  items={items}
                                  selectable
                                  selectedItemIds={addItemsSelectedIds}
                                  onToggleItem={toggleAddItemsSelect}
                                  isItemSelectable={() => true}
                                />
                              </Paper>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={() => setAddItemsOpen(false)}>Cancelar</Button>
          <Button
            disabled={loading || addItemsSelectedIds.length === 0}
            variant="contained"
            onClick={confirmAddItemsToGroup}
          >
            Agregar {addItemsSelectedIds.length > 0 ? `(${addItemsSelectedIds.length})` : ""}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
