import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  TablePagination,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { money } from "../collections/helpers.js";
import { patchProductStockRequest } from "../../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";

const STOCK_VIEWS = {
  low: {
    id: "low",
    label: "Por agotarse",
    icon: WarningAmberIcon,
    color: "warning",
    empty: "No hay productos cerca del stock mínimo.",
  },
  out: {
    id: "out",
    label: "Agotados",
    icon: Inventory2Icon,
    color: "error",
    empty: "No hay productos agotados.",
  },
};

function classifyProduct(p) {
  const stock = Number(p.stock ?? 0);
  const min = Number(p.minStock ?? 0);
  if (stock <= 0) return "out";
  if (stock > 0 && stock <= min) return "low";
  return null;
}

function sortProducts(list, view) {
  const arr = [...(list || [])];
  if (view === "out") {
    return arr.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  }
  return arr.sort((a, b) => a.stock - b.stock || a.minStock - b.minStock);
}

function mergeUpdatedProduct(productsStock, updated) {
  const removeFrom = (arr) => (arr || []).filter((p) => p.id !== updated.id);
  let agotados = removeFrom(productsStock.agotados);
  let porAgotarse = removeFrom(productsStock.porAgotarse);
  const bucket = classifyProduct(updated);

  if (bucket === "out") agotados = sortProducts([...agotados, updated], "out");
  if (bucket === "low") porAgotarse = sortProducts([...porAgotarse, updated], "low");

  return { agotados, porAgotarse };
}

export default function DashboardStockPanel({ productsStock, onStockUpdated }) {
  const { user, toast } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [view, setView] = useState("low");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ stock: "", minStock: "" });
  const [saving, setSaving] = useState(false);

  const currentMeta = STOCK_VIEWS[view];
  const rows = useMemo(() => {
    const list = view === "out" ? productsStock?.agotados : productsStock?.porAgotarse;
    return sortProducts(list, view);
  }, [productsStock, view]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({
      stock: String(row.stock ?? 0),
      minStock: String(row.minStock ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ stock: "", minStock: "" });
  };

  const saveEdit = async (row) => {
    try {
      setSaving(true);
      const res = await toast({
        promise: patchProductStockRequest(row.id, {
          stock: Number(draft.stock),
          minStock: Number(draft.minStock),
        }),
        successMessage: "Stock actualizado",
      });
      const updated = res?.data?.product ?? {
        ...row,
        stock: Number(draft.stock),
        minStock: Number(draft.minStock),
      };
      onStockUpdated?.(mergeUpdatedProduct(productsStock, updated));
      cancelEdit();
    } catch {
      // toast ya muestra el error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        mb={2}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Alertas de inventario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Productos agotados o cerca del mínimo (stock ≤ minStock).
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          sx={{ width: { xs: "100%", sm: "auto" }, flexWrap: "wrap" }}
          onChange={(_, v) => {
            if (!v) return;
            setView(v);
            setPage(0);
            cancelEdit();
          }}
        >
          {Object.values(STOCK_VIEWS).map((v) => (
            <ToggleButton key={v.id} value={v.id}>
              <v.icon fontSize="small" sx={{ mr: 0.75 }} />
              {v.label}
              <Chip
                size="small"
                label={
                  v.id === "out"
                    ? productsStock?.agotados?.length ?? 0
                    : productsStock?.porAgotarse?.length ?? 0
                }
                color={v.color}
                sx={{ ml: 1, height: 20 }}
              />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Mín.</TableCell>
              {isProgrammer && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell align="right">{money(row.price)}</TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={draft.stock}
                        onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
                        inputProps={{ min: 0, step: "any" }}
                        sx={{ width: 88 }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        color={view === "out" ? "error" : "warning"}
                        label={row.stock}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={draft.minStock}
                        onChange={(e) => setDraft((d) => ({ ...d, minStock: e.target.value }))}
                        inputProps={{ min: 0, step: "any" }}
                        sx={{ width: 88 }}
                      />
                    ) : (
                      row.minStock
                    )}
                  </TableCell>
                  {isProgrammer && (
                    <TableCell align="right">
                      {isEditing ? (
                        <>
                          <Tooltip title="Guardar">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={saving}
                                onClick={() => saveEdit(row)}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Cancelar">
                            <IconButton size="small" onClick={cancelEdit} disabled={saving}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Editar stock (sin movimiento; queda en logs)">
                          <IconButton size="small" onClick={() => startEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={isProgrammer ? 5 : 4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {currentMeta.empty}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Filas"
        rowsPerPageOptions={[5, 10, 25]}
      />

      {isProgrammer && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Como Programador puedes ajustar stock aquí sin crear movimientos; el cambio queda registrado en Logs.
        </Typography>
      )}
    </Paper>
  );
}
