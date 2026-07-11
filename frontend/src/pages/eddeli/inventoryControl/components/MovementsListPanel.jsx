import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
} from "@mui/material";
import { ListSkeleton, PanelSkeleton } from "../../../../components/ContentSkeleton.jsx";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PaginatedMovementTable from "./PaginatedMovementTable.jsx";
import { groupMovements } from "./movementGrouping.js";
import { isoToDateInput, movementDateForApi, todayDateInput } from "./ProgrammerMovementDateField.jsx";
import { formatDateTime } from "../../../../helpers/functions.js";

function formatPrice(price) {
  if (price == null) return "—";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
}

function productName(row) {
  return row.ERP_inventory_product?.name || "—";
}

function useMovementColumns(isProgrammer, onEdit, onDelete) {
  return useMemo(
    () => [
      {
        label: "ID",
        id: "id",
        getSortValue: (r) => Number(r.id),
        getSearchValue: (r) => String(r.id),
      },
      {
        label: "Producto",
        id: "product",
        getSortValue: (r) => productName(r).toLowerCase(),
        getSearchValue: (r) => productName(r),
        render: (row) => productName(row),
      },
      {
        label: "Tipo",
        id: "type",
        getSearchValue: (r) => r.type,
      },
      {
        label: "Motivo",
        id: "reason",
        getSearchValue: (r) => r.reason || "",
      },
      {
        label: "Cant.",
        id: "quantity",
        getSortValue: (r) => Number(r.quantity),
        getSearchValue: (r) => String(r.quantity),
      },
      {
        label: "Precio",
        id: "price",
        getSortValue: (r) => Number(r.price ?? 0),
        getSearchValue: (r) => formatPrice(r.price),
        render: (row) => formatPrice(row.price),
      },
      {
        label: "Descripción",
        id: "description",
        getSearchValue: (r) => row.description || "",
        render: (row) => (
          <Typography variant="body2" noWrap title={row.description || ""} sx={{ maxWidth: 220 }}>
            {row.description || "—"}
          </Typography>
        ),
      },
      {
        label: "Fecha",
        id: "date",
        getSortValue: (r) => new Date(r.date || 0).getTime(),
        getSearchValue: (r) => formatDateTime(r.date),
        render: (row) => formatDateTime(row.date),
      },
      ...(isProgrammer
        ? [
            {
              label: "Acciones",
              id: "actions",
              getSearchValue: () => "",
              render: (row) => (
                <Stack direction="row" spacing={0} justifyContent="flex-end">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]
        : []),
    ],
    [isProgrammer, onEdit, onDelete]
  );
}

export default function MovementsListPanel({
  movements,
  loading = false,
  isProgrammer,
  onEdit,
  onDelete,
  onBatchDateSaved,
  onBatchDate,
}) {
  const [search, setSearch] = useState("");
  const [groupDateOpen, setGroupDateOpen] = useState(false);
  const [groupDateTarget, setGroupDateTarget] = useState(null);
  const [groupDateValue, setGroupDateValue] = useState(todayDateInput());

  /** Paginación de la lista de acordeones (producciones), no de las filas internas. */
  const [groupsPage, setGroupsPage] = useState(0);
  const [groupsPerPage, setGroupsPerPage] = useState(5);

  const columns = useMovementColumns(isProgrammer, onEdit, onDelete);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => {
      const blob = [
        m.id,
        productName(m),
        m.type,
        m.reason,
        m.description,
        formatDateTime(m.date),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [movements, search]);

  const { productionGroups, standalone } = useMemo(
    () => groupMovements(filtered),
    [filtered]
  );

  const groupsSlice = useMemo(() => {
    const start = groupsPage * groupsPerPage;
    return productionGroups.slice(start, start + groupsPerPage);
  }, [productionGroups, groupsPage, groupsPerPage]);

  const handleGroupsPageChange = useCallback((_, p) => setGroupsPage(p), []);
  const handleGroupsPerPageChange = useCallback((e) => {
    setGroupsPerPage(parseInt(e.target.value, 10));
    setGroupsPage(0);
  }, []);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(productionGroups.length / groupsPerPage) - 1);
    if (groupsPage > maxPage) setGroupsPage(maxPage);
  }, [productionGroups.length, groupsPerPage, groupsPage]);

  const openGroupDate = (group) => {
    setGroupDateTarget(group);
    setGroupDateValue(isoToDateInput(group.date) || todayDateInput());
    setGroupDateOpen(true);
  };

  const confirmGroupDate = async () => {
    if (!groupDateTarget || !onBatchDate) return;
    const ok = await onBatchDate({
      operationId: groupDateTarget.opId,
      movementIds: groupDateTarget.movementIds,
      date: movementDateForApi(groupDateValue),
    });
    if (ok) {
      setGroupDateOpen(false);
      setGroupDateTarget(null);
      onBatchDateSaved?.();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="h6" sx={{ flex: 1 }}>
          Movimientos
        </Typography>
        <Chip size="small" label={`Total: ${filtered.length}`} variant="outlined" />
        <Chip size="small" color="primary" label={`Producciones: ${productionGroups.length}`} variant="outlined" />
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar producto, tipo, motivo, descripción…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setGroupsPage(0);
        }}
        disabled={loading}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Stack spacing={2}>
          <PanelSkeleton height={160} />
          <ListSkeleton count={4} itemHeight={56} />
        </Stack>
      ) : (
        <>
          {productionGroups.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Producciones agrupadas
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Pasa de página entre operaciones; dentro de cada una, otra tabla con sus propias páginas.
              </Typography>

              <Stack spacing={1.5}>
                {groupsSlice.map((group) => (
                  <Accordion key={group.opId} variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{ width: "100%", pr: 1 }}
                      >
                        <Typography sx={{ fontWeight: 800 }}>{group.label}</Typography>
                        <Chip size="small" label={group.opId} variant="outlined" />
                        <Chip size="small" label={`${group.items.length} mov.`} />
                        <Chip size="small" label={formatDateTime(group.date)} color="primary" variant="outlined" />
                        {isProgrammer && (
                          <Button
                            size="small"
                            startIcon={<CalendarMonthIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openGroupDate(group);
                            }}
                            sx={{ ml: "auto" }}
                          >
                            Fecha grupal
                          </Button>
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1, pt: 0 }}>
                      <PaginatedMovementTable
                        title={`Movimientos · ${group.opId}`}
                        rows={group.items}
                        columns={columns}
                        defaultRowsPerPage={10}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>

              <TablePagination
                component="div"
                count={productionGroups.length}
                page={groupsPage}
                onPageChange={handleGroupsPageChange}
                rowsPerPage={groupsPerPage}
                onRowsPerPageChange={handleGroupsPerPageChange}
                rowsPerPageOptions={[3, 5, 10, 15]}
                labelRowsPerPage="Producciones por página"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} de ${count !== -1 ? count : `más de ${to}`} operaciones`
                }
              />
            </Box>
          )}

          {standalone.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                {productionGroups.length > 0 ? "Otros movimientos" : "Listado"}
              </Typography>
              <PaginatedMovementTable
                title="Movimientos"
                rows={standalone}
                columns={columns}
                defaultRowsPerPage={10}
              />
            </Box>
          )}

          {filtered.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              No hay movimientos.
            </Typography>
          )}
        </>
      )}

      <Dialog open={groupDateOpen} onClose={() => setGroupDateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Fecha de toda la producción</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {groupDateTarget?.opId} · {groupDateTarget?.items?.length} movimientos (insumos, entradas,
            salidas de la misma operación).
          </Typography>
          <TextField
            label="Nueva fecha"
            type="date"
            fullWidth
            value={groupDateValue}
            onChange={(e) => setGroupDateValue(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmGroupDate}>
            Aplicar a todos
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
