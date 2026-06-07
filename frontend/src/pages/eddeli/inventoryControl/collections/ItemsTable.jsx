import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  TextField,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { money, moneyUnitPrice, toNum, getItemGroupId } from "./helpers.js";

export default function ItemsTable({
  items,
  selectable = false,
  selectedItemIds = [],
  onToggleItem,
  isItemSelectable,
  editable = false,
  canEditItem,
  isEditingItem,
  getEditFields,
  onEditToggle,
  onEditFieldChange,
  onEditConfirm,
  showGroupActions = false,
  onRemoveFromGroup,
  onMoveToGroup,
}) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        "-webkitOverflowScrolling": "touch",
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 3 },
        boxSizing: "border-box",
      }}
    >
      <Table size="small" sx={{ minWidth: { xs: 800, sm: 980 }, width: "100%" }}>
        <TableHead>
          <TableRow>
            {selectable && <TableCell sx={{ width: { xs: 35, sm: 40 }, px: { xs: 0.5, sm: 1 } }} />}
            <TableCell sx={{ minWidth: { xs: 120, sm: 150 } }}>Producto</TableCell>
            <TableCell align="right" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Entregado
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Vendido
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Dañado
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Yapa
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Cambiado
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 80, sm: 110 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              P/U
            </TableCell>
            <TableCell align="right" sx={{ width: { xs: 90, sm: 120 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Total vendido
            </TableCell>
            <TableCell align="center" sx={{ width: { xs: 70, sm: 90 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
              Pagado
            </TableCell>
            {(editable || showGroupActions) && (
              <TableCell align="right" sx={{ width: { xs: 120, sm: 170 }, px: { xs: 0.5, sm: 1 }, whiteSpace: "nowrap" }}>
                Acciones
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {(items || []).map((it) => {
            const checked = selectedItemIds.includes(it.id);
            const paid = !!it.paidAt;
            const editing = !!isEditingItem?.(it.id);
            const fields = getEditFields?.(it.id) || {};
            const qtyDelivered = editing ? toNum(fields.qty, it.qty) : toNum(it.qty, 0);
            const price = editing ? toNum(fields.price, it.price) : toNum(it.price, 0);
            const damagedQty = editing ? toNum(fields.damagedQty, it.damagedQty) : toNum(it.damagedQty, 0);
            const giftQty = editing ? toNum(fields.giftQty, it.giftQty) : toNum(it.giftQty, 0);
            const replacedQty = editing ? toNum(fields.replacedQty, it.replacedQty) : toNum(it.replacedQty, 0);
            const billableQty = Math.max(0, qtyDelivered - damagedQty - giftQty);
            const totalSold = Number((billableQty * price).toFixed(2));
            const allowEdit = !!canEditItem?.(it);
            const groupIdReal = it?.itemGroupId ?? it?.groupId;
            const canGroupActions = !!groupIdReal && !!(onRemoveFromGroup || onMoveToGroup);
            const selectableOk =
              typeof isItemSelectable === "function"
                ? isItemSelectable(it)
                : !paid && !getItemGroupId(it);

            return (
              <TableRow key={it.id} hover>
                {selectable && (
                  <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
                    <Checkbox
                      size="small"
                      disabled={!selectableOk}
                      checked={checked}
                      onChange={() => onToggleItem?.(it.id)}
                    />
                  </TableCell>
                )}
                <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: { xs: 120, sm: "none" },
                    }}
                    title={it.product}
                  >
                    {it.product}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  {!editing ? (
                    qtyDelivered
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={fields.qty ?? ""}
                      onChange={(e) => onEditFieldChange?.(it.id, "qty", e.target.value)}
                      sx={{ maxWidth: { xs: 70, sm: 90 } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>{billableQty}</TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  {!editing ? (
                    damagedQty
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={fields.damagedQty ?? ""}
                      onChange={(e) => onEditFieldChange?.(it.id, "damagedQty", e.target.value)}
                      sx={{ maxWidth: { xs: 70, sm: 90 } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  {!editing ? (
                    giftQty
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={fields.giftQty ?? ""}
                      onChange={(e) => onEditFieldChange?.(it.id, "giftQty", e.target.value)}
                      sx={{ maxWidth: { xs: 70, sm: 90 } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  {!editing ? (
                    replacedQty
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={fields.replacedQty ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onEditFieldChange?.(it.id, "replacedQty", v);
                        onEditFieldChange?.(it.id, "damagedQty", v);
                      }}
                      sx={{ maxWidth: { xs: 70, sm: 90 } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  {!editing ? (
                    moneyUnitPrice(price)
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: "0.01" }}
                      value={fields.price ?? ""}
                      onChange={(e) => onEditFieldChange?.(it.id, "price", e.target.value)}
                      sx={{ maxWidth: { xs: 80, sm: 110 } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>{money(totalSold)}</TableCell>
                <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1 } }}>
                  <Chip
                    size="small"
                    label={paid ? "Sí" : "No"}
                    color={paid ? "success" : "warning"}
                    variant="outlined"
                  />
                </TableCell>
                {(editable || showGroupActions) && (
                  <TableCell align="right" sx={{ px: { xs: 0.5, sm: 1 } }}>
                    {editable && (
                      <>
                        {!editing ? (
                          <Tooltip title={allowEdit ? "Editar" : "No permitido"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!allowEdit}
                                onClick={() => onEditToggle?.(it)}
                              >
                                <EditNoteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Guardar">
                              <IconButton size="small" onClick={() => onEditConfirm?.(it)}>
                                <SaveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancelar">
                              <IconButton size="small" onClick={() => onEditToggle?.(it)}>
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </>
                    )}
                    {showGroupActions && !editing && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        sx={{ mt: editable ? 0.5 : 0 }}
                      >
                        <Tooltip title={canGroupActions ? "Sacar del grupo" : "Falta groupId"}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canGroupActions}
                              onClick={() => onRemoveFromGroup?.(it)}
                            >
                              🗑️
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={canGroupActions ? "Mover a otro grupo" : "Falta groupId"}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canGroupActions}
                              onClick={() => onMoveToGroup?.(it)}
                            >
                              🔁
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {(!items || items.length === 0) && (
            <TableRow>
              <TableCell
                colSpan={(selectable ? 10 : 9) + (editable || showGroupActions ? 1 : 0)}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Sin ítems.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
