import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";
import ProductCompareTable from "../../../components/eddeli/ProductCompareTable";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import {
  getCompareGroups,
  createCompareGroup,
  updateCompareGroup,
  deleteCompareGroup,
  bootstrapPastelesCompareGroup,
  getAllProductsAll,
} from "../../../api/inventoryControlRequest";

const SECTION_OPTIONS = [
  { value: "home", label: "Portada" },
  { value: "ofertas", label: "Ofertas" },
  { value: "recomendados", label: "Recomendados" },
  { value: "bajo_pedido", label: "Bajo pedido" },
  { value: "novedades", label: "Novedades" },
  { value: "descuentos", label: "Descuentos" },
  { value: "populares", label: "Populares" },
  { value: "temporada", label: "Temporada" },
  { value: "especiales", label: "Especiales" },
  { value: "limitados", label: "Limitados" },
];

const emptyItem = () => ({
  productId: "",
  variantKey: "Vainilla",
  variantSort: 1,
  rowKey: "",
  rowSort: 0,
  rowMeta: "",
  columnKey: "Seco",
  columnSort: 1,
});

const emptyForm = () => ({
  id: null,
  name: "",
  subtitle: "",
  description: "",
  section: "home",
  rowLabel: "Tamaño",
  columnLabel: "Tipo",
  variantLabel: "Sabor",
  position: 0,
  isActive: true,
  hideMemberProducts: true,
  fillingsText: "Mora\nPiña\nManjar",
  items: [emptyItem()],
});

function fillingsToText(fillings) {
  if (!Array.isArray(fillings)) return "";
  return fillings.map((f) => (typeof f === "string" ? f : f.name)).filter(Boolean).join("\n");
}

function textToFillings(text) {
  const colors = ["#7B1FA2", "#F9A825", "#6D4C41", "#1976D2", "#388E3C"];
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name, i) => ({ name, color: colors[i % colors.length] }));
}

function matrixToItems(group) {
  const items = [];
  for (const variant of group?.variants || []) {
    for (const [key, cell] of Object.entries(variant.cells || {})) {
      const [rowKey, columnKey] = key.split("||");
      const row = variant.rows?.find((r) => r.key === rowKey);
      const col = variant.columns?.find((c) => c.key === columnKey);
      if (!cell?.product?.id) continue;
      items.push({
        productId: cell.product.id,
        variantKey: variant.key,
        variantSort: variant.sort ?? 0,
        rowKey: rowKey || "",
        rowSort: row?.sort ?? 0,
        rowMeta: row?.meta || "",
        columnKey: columnKey || "",
        columnSort: col?.sort ?? 0,
      });
    }
  }
  return items.length ? items : [emptyItem()];
}

function GroupForm({ open, onClose, initial, products, onSubmit, saving }) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (!initial) {
      setForm(emptyForm());
      return;
    }
    setForm({
      id: initial.id,
      name: initial.name || "",
      subtitle: initial.subtitle || "",
      description: initial.description || "",
      section: initial.section || "home",
      rowLabel: initial.rowLabel || "Tamaño",
      columnLabel: initial.columnLabel || "Tipo",
      variantLabel: initial.variantLabel || "Sabor",
      position: initial.position ?? 0,
      isActive: initial.isActive !== false,
      hideMemberProducts: initial.hideMemberProducts !== false,
      fillingsText: fillingsToText(initial.fillings),
      items: matrixToItems(initial),
    });
  }, [open, initial]);

  const setItem = (idx, patch) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], ...patch };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) =>
    setForm((f) => ({
      ...f,
      items: f.items.length <= 1 ? [emptyItem()] : f.items.filter((_, i) => i !== idx),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const items = form.items
      .filter((it) => it.productId)
      .map((it) => ({
        productId: Number(it.productId),
        variantKey: it.variantKey || "default",
        variantSort: Number(it.variantSort) || 0,
        rowKey: it.rowKey || "",
        rowSort: Number(it.rowSort) || 0,
        rowMeta: it.rowMeta || null,
        columnKey: it.columnKey || "",
        columnSort: Number(it.columnSort) || 0,
      }));
    onSubmit({
      name: form.name.trim(),
      subtitle: form.subtitle || null,
      description: form.description || null,
      section: form.section,
      rowLabel: form.rowLabel,
      columnLabel: form.columnLabel,
      variantLabel: form.variantLabel,
      position: Number(form.position) || 0,
      isActive: form.isActive,
      hideMemberProducts: form.hideMemberProducts,
      fillings: textToFillings(form.fillingsText),
      items,
    });
  };

  const previewGroup = useMemo(() => {
    const items = form.items
      .filter((it) => it.productId)
      .map((it) => {
        const product = products.find((p) => String(p.id) === String(it.productId));
        return {
          variantKey: it.variantKey || "default",
          variantSort: Number(it.variantSort) || 0,
          rowKey: it.rowKey || "—",
          rowSort: Number(it.rowSort) || 0,
          rowMeta: it.rowMeta || null,
          columnKey: it.columnKey || "—",
          columnSort: Number(it.columnSort) || 0,
          productId: Number(it.productId),
          product: product
            ? {
                id: product.id,
                name: product.name,
                price: Number(product.price) || 0,
                displayPrice: `$${Number(product.price || 0).toFixed(2)}`,
              }
            : null,
        };
      });
    // Build minimal preview using same shape as API
    const variantMap = new Map();
    for (const item of items) {
      const vKey = item.variantKey;
      if (!variantMap.has(vKey)) {
        variantMap.set(vKey, { key: vKey, sort: item.variantSort, rows: new Map(), columns: new Map(), cells: {} });
      }
      const block = variantMap.get(vKey);
      block.rows.set(item.rowKey, { key: item.rowKey, sort: item.rowSort, meta: item.rowMeta });
      block.columns.set(item.columnKey, { key: item.columnKey, sort: item.columnSort });
      block.cells[`${item.rowKey}||${item.columnKey}`] = { product: item.product };
    }
    const variants = [...variantMap.values()].map((b) => ({
      key: b.key,
      sort: b.sort,
      rows: [...b.rows.values()].sort((a, c) => a.sort - c.sort),
      columns: [...b.columns.values()].sort((a, c) => a.sort - c.sort),
      cells: b.cells,
    }));
    return {
      name: form.name || "Vista previa",
      subtitle: form.subtitle,
      description: form.description,
      rowLabel: form.rowLabel,
      columnLabel: form.columnLabel,
      variantLabel: form.variantLabel,
      fillings: textToFillings(form.fillingsText),
      variants,
    };
  }, [form, products]);

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      title={form.id ? "Editar grupo comparativo" : "Nuevo grupo comparativo"}
      maxWidth="lg"
      fullWidth
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nombre del grupo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Sección del catálogo</InputLabel>
              <Select
                value={form.section}
                label="Sección del catálogo"
                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              >
                {SECTION_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Subtítulo"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Etiqueta filas"
              value={form.rowLabel}
              onChange={(e) => setForm((f) => ({ ...f, rowLabel: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Etiqueta columnas"
              value={form.columnLabel}
              onChange={(e) => setForm((f) => ({ ...f, columnLabel: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Etiqueta variantes"
              value={form.variantLabel}
              onChange={(e) => setForm((f) => ({ ...f, variantLabel: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Posición"
              type="number"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                }
                label="Activo en catálogo"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.hideMemberProducts}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hideMemberProducts: e.target.checked }))
                    }
                  />
                }
                label="Ocultar productos sueltos del catálogo"
              />
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Rellenos (uno por línea)"
              value={form.fillingsText}
              onChange={(e) => setForm((f) => ({ ...f, fillingsText: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
          Celdas de la tabla (producto + posición)
        </Typography>

        <Stack spacing={1.5}>
          {form.items.map((it, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Producto</InputLabel>
                    <Select
                      value={it.productId}
                      label="Producto"
                      onChange={(e) => setItem(idx, { productId: e.target.value })}
                    >
                      <MenuItem value="">
                        <em>Seleccionar…</em>
                      </MenuItem>
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} — ${Number(p.price || 0).toFixed(2)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Variante"
                    size="small"
                    fullWidth
                    value={it.variantKey}
                    onChange={(e) => setItem(idx, { variantKey: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Fila (tamaño)"
                    size="small"
                    fullWidth
                    value={it.rowKey}
                    onChange={(e) => setItem(idx, { rowKey: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Columna"
                    size="small"
                    fullWidth
                    value={it.columnKey}
                    onChange={(e) => setItem(idx, { columnKey: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6} md={1}>
                  <TextField
                    label="Porciones"
                    size="small"
                    fullWidth
                    value={it.rowMeta}
                    onChange={(e) => setItem(idx, { rowMeta: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={1}>
                  <Tooltip title="Quitar celda">
                    <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>

        <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1 }} size="small">
          Agregar celda
        </Button>

        {previewGroup.variants?.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Vista previa
            </Typography>
            <ProductCompareTable group={previewGroup} />
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>
            Guardar
          </Button>
        </Stack>
      </Box>
    </SimpleDialog>
  );
}

export default function ProductCompareGroupsPage() {
  const { toast } = useAuth();
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, productsRes] = await Promise.all([
        getCompareGroups(),
        getAllProductsAll(),
      ]);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (e) {
      console.error(e);
      toast({ message: "Error al cargar grupos comparativos", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedGroup = useMemo(
    () => groups.find((g) => Number(g.id) === Number(selectedId)) || null,
    [groups, selectedId],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (group) => {
    setEditing(group);
    setDialogOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await runMutationReload(
          updateCompareGroup(editing.id, payload),
          { toast, successMessage: "Grupo actualizado", onSuccess: load }
        );
      } else {
        await runMutationReload(
          createCompareGroup(payload),
          { toast, successMessage: "Grupo creado", onSuccess: load }
        );
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (group) => {
    if (!window.confirm(`¿Eliminar el grupo "${group.name}"?`)) return;
    runMutationReload(deleteCompareGroup(group.id), {
      toast,
      successMessage: "Grupo eliminado",
      onSuccess: load,
    });
  };

  const handleBootstrap = () => {
    runMutationReload(bootstrapPastelesCompareGroup(), {
      toast,
      successMessage: "Grupo Pasteles listo",
      onSuccess: load,
    });
  };

  const columns = useMemo(
    () => [
      {
        label: "Nombre",
        id: "name",
        render: (row) => (
          <Box>
            <Typography fontWeight={700}>{row.name}</Typography>
            {row.subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {row.subtitle}
              </Typography>
            ) : null}
          </Box>
        ),
        getSearchValue: (row) => `${row.name || ""} ${row.subtitle || ""}`,
      },
      {
        label: "Sección",
        id: "section",
        render: (row) =>
          SECTION_OPTIONS.find((s) => s.value === row.section)?.label ||
          row.section ||
          "—",
        getSearchValue: (row) =>
          SECTION_OPTIONS.find((s) => s.value === row.section)?.label ||
          row.section ||
          "",
      },
      {
        label: "Estado",
        id: "isActive",
        render: (row) => (
          <Chip
            size="small"
            color={row.isActive ? "success" : "default"}
            label={row.isActive ? "Activo" : "Inactivo"}
          />
        ),
        getSearchValue: (row) => (row.isActive ? "activo" : "inactivo"),
      },
      {
        label: "Productos",
        id: "productIds",
        render: (row) => `${row.productIds?.length || 0}`,
        getSearchValue: (row) => String(row.productIds?.length || 0),
      },
      {
        label: "Acciones",
        id: "actions",
        stopRowClick: true,
        getSearchValue: () => "",
        render: (row) => (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => openEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CompareArrowsIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Grupos comparativos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Agrupa productos similares (pasteles, etc.) para comparar precios en el catálogo.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<BakeryDiningIcon />} onClick={handleBootstrap}>
            Crear grupo Pasteles
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo grupo
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Los grupos activos aparecen en el catálogo público como tablas comparativas. Si activas
        &quot;Ocultar productos sueltos&quot;, esos productos no se repiten como tarjetas individuales.
        Haz clic en una fila para ver la matriz.
      </Alert>

      {loading ? (
        <TablePro
          rows={[]}
          columns={columns}
          title="GRUPOS"
          showIndex
          defaultRowsPerPage={25}
          rowsPerPageOptions={[10, 25, 50]}
          loading
        />
      ) : groups.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography gutterBottom>No hay grupos comparativos todavía.</Typography>
          <Button variant="contained" onClick={handleBootstrap} sx={{ mt: 1 }}>
            Crear grupo Pasteles de ejemplo
          </Button>
        </Paper>
      ) : (
        <>
          <TablePro
            rows={groups}
            columns={columns}
            title="GRUPOS"
            showIndex
            defaultRowsPerPage={25}
            rowsPerPageOptions={[10, 25, 50]}
            selectedRowId={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            loading={false}
          />
          {selectedGroup && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Vista previa — {selectedGroup.name}
              </Typography>
              <ProductCompareTable group={selectedGroup} />
            </Paper>
          )}
        </>
      )}

      <GroupForm
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        products={products}
        onSubmit={handleSave}
        saving={saving}
      />
    </Container>
  );
}
