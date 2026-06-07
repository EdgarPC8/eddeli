// AutoCatalogLab.jsx (compacto + responsive, conectado a backend)
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
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
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  LinearProgress,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { Add, ContentCopy, Star, TrendingUp, Layers, ArrowUpward, ArrowDownward, DragIndicator } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { getAutoCatalogSeed, createCatalogEntry, getCategories, reorderCatalogEntries } from "../../../../api/inventoryControlRequest";
import toast from "react-hot-toast";
// Importa tus requests existentes
// Asegúrate de tener implementado getAutoCatalogSeed como te mostré en el client:

// === Opciones de secciones (mismo mapping que tu modelo/backend)
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

// Utilidad para mostrar precio
const currency = (v) => (v == null ? "—" : `$${Number(v).toFixed(2)}`);

export default function AutoCatalogLab({ onSyncAfterSave }) {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm")); // <600px

  // Estado base
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);      // [{ id, name, price, primaryImageUrl, stats:{sold30, soldAll, views30, rating} }]
  const [catalogRows, setCatalogRows] = useState([]); // [{ id, productId, section, title, subtitle, badge, position, isActive, priceOverride, imageUrl }]

  // Parámetros de sugerencias
  const [metric, setMetric] = useState("sold30"); // sold30 | soldAll | views30 | rating
  const [limit, setLimit] = useState(8);
  const [onlyNotInSection, setOnlyNotInSection] = useState(true);
  const [targetSection, setTargetSection] = useState("recomendados");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [localOrderedIds, setLocalOrderedIds] = useState([]); // ids en orden para vista rápida
  const [dragOverId, setDragOverId] = useState(null);
  const [updatingPositions, setUpdatingPositions] = useState(false);
  const [viewColumns, setViewColumns] = useState(1); // 1, 2, 3 o 4 columnas

  // Edición rápida (sobre la sugerencia antes de agregar)
  const [quickEdits, setQuickEdits] = useState({}); // productId -> { title, subtitle, badge, priceOverride, isActive }

  // Selecciones
  const [selected, setSelected] = useState([]); // productId[]

  // Cargar categorías
  useEffect(() => {
    getCategories().then(({ data }) => setCategories(Array.isArray(data) ? data : []));
  }, []);

  const fetchSeedData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { days: 30, limit: 50, onlyActive: true };
      if (categoryFilter) params.categoryId = categoryFilter;
      const { data } = await getAutoCatalogSeed(params);
      const normProducts = (data?.products || []).map((p) => ({
        ...p,
        stats: {
          sold30: Number(p?.stats?.sold30 || 0),
          soldAll: Number(p?.stats?.soldAll || 0),
          views30: Number(p?.stats?.views30 || 0),
          rating: p?.stats?.rating == null ? 0 : Number(p.stats.rating),
        },
      }));
      setProducts(normProducts);
      setCatalogRows(data?.catalog || []);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar los datos de sugerencias/catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeedData();
  }, [categoryFilter]);

  // Ordenar por métrica y recortar Top N
  const suggestions = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const av = a.stats?.[metric] ?? 0;
      const bv = b.stats?.[metric] ?? 0;
      return bv - av;
    });
    return sorted.slice(0, Number(limit) || 0);
  }, [products, metric, limit]);

  // Evitar sugerir duplicados en la misma sección si está activo el switch
  const filteredSuggestions = useMemo(() => {
    if (!onlyNotInSection) return suggestions;
    const inTarget = new Set(
      catalogRows
        .filter((r) => r.section === targetSection)
        .map((r) => String(r.productId))
    );
    return suggestions.filter((p) => !inTarget.has(String(p.id)));
  }, [suggestions, catalogRows, onlyNotInSection, targetSection]);

  // Ítems de la sección destino ordenados por posición, luego por nombre
  const orderedSectionItems = useMemo(() => {
    const items = catalogRows.filter((r) => r.section === targetSection);
    return [...items].sort((a, b) => {
      const posA = Number(a.position ?? 0);
      const posB = Number(b.position ?? 0);
      if (posA !== posB) return posA - posB;
      const nameA = (a.title || "").toLowerCase();
      const nameB = (b.title || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [catalogRows, targetSection]);

  const orderedIds = useMemo(
    () => orderedSectionItems.map((r) => r.id),
    [orderedSectionItems]
  );

  useEffect(() => {
    setLocalOrderedIds(orderedIds);
  }, [targetSection, orderedIds.join(",")]);

  const sectionItemsById = useMemo(() => {
    const map = new Map();
    orderedSectionItems.forEach((r) => map.set(r.id, r));
    return map;
  }, [orderedSectionItems]);

  const displayOrder = useMemo(() => {
    return localOrderedIds
      .map((id) => sectionItemsById.get(id))
      .filter(Boolean);
  }, [localOrderedIds, sectionItemsById]);

  // Para vista por columnas: orden columna-mayor (1,2,3 abajo en col1; 4,5,6 en col2; etc.)
  const displayOrderForView = useMemo(() => {
    const arr = displayOrder;
    const cols = Math.max(1, viewColumns);
    if (cols <= 1 || arr.length === 0) return arr.map((item, i) => ({ item, logicalIndex: i }));
    const rows = Math.ceil(arr.length / cols);
    return arr.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const srcIndex = col * rows + row;
      return srcIndex < arr.length ? { item: arr[srcIndex], logicalIndex: srcIndex } : null;
    }).filter(Boolean);
  }, [displayOrder, viewColumns]);

  const moveUp = (index) => {
    if (index <= 0) return;
    setLocalOrderedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index) => {
    if (index >= localOrderedIds.length - 1) return;
    setLocalOrderedIds((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === String(targetId)) return;
    setLocalOrderedIds((prev) => {
      const arr = [...prev];
      const si = arr.indexOf(Number(sourceId));
      let ti = arr.indexOf(Number(targetId));
      if (si === -1 || ti === -1) return prev;
      arr.splice(si, 1);
      if (si < ti) ti -= 1;
      arr.splice(ti, 0, Number(sourceId));
      return arr;
    });
  };

  const handleUpdatePositions = async () => {
    const items = displayOrder.map((r, i) => ({ id: r.id, position: i }));
    if (items.length === 0) return;
    try {
      setUpdatingPositions(true);
      await reorderCatalogEntries({ section: targetSection, items });
      await fetchSeedData();
      if (typeof onSyncAfterSave === "function") onSyncAfterSave();
      toast.success("Posiciones actualizadas");
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron actualizar las posiciones.";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingPositions(false);
    }
  };

  const allSelectedComputed =
    selected.length > 0 && selected.length === filteredSuggestions.length;

  // Handlers selección
  const toggleOne = (pid) =>
    setSelected((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  const toggleAll = () =>
    setSelected((prev) =>
      allSelectedComputed ? [] : filteredSuggestions.map((p) => p.id)
    );

  // Quick edit setters
  const setEdit = (pid, k, v) =>
    setQuickEdits((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [k]: v } }));

  // Helpers UI
  const sectionLabel = (v) =>
    SECTION_OPTIONS.find((s) => s.value === v)?.label || v;

  // === Llamadas al backend ===

  // Crear 1 ítem de catálogo en backend
  const createOne = async (payload) => {
    // payload: { productId, section, title, subtitle, badge, position, isActive, priceOverride, imageUrl? ... }
    const { data } = await createCatalogEntry(payload); // { message, catalog }
    return data?.catalog;
  };

  // Agregar una sugerencia al catálogo destino
const addOneToCatalog = async (product, section) => {
  const edit = quickEdits[product.id] || {};
  const payload = {
    productId: product.id,
    section,
    title: edit.title?.trim() || product.name,
    subtitle: edit.subtitle?.trim() || null,
    badge: edit.badge?.trim() || null,
    position: 0,
    isActive: edit.isActive ?? true,
    priceOverride:
      edit.priceOverride === "" || edit.priceOverride == null
        ? null
        : Number(edit.priceOverride),
  };

  try {
    setSaving(true);
    const { data } = await createCatalogEntry(payload); // { message, catalog }
    const created = data?.catalog;

    // Reflejar rápido en el panel lateral local
    if (created?.id) {
      setCatalogRows((prev) => [
        {
          id: created.id,
          productId: created.productId,
          section: created.section,
          title: created.title,
          subtitle: created.subtitle,
          badge: created.badge,
          position: created.position,
          isActive: !!created.isActive,
          priceOverride:
            created.priceOverride == null ? null : Number(created.priceOverride),
          imageUrl: created.imageUrl || "",
        },
        ...prev,
      ]);
    }

    // 👇 Notificar al padre (CatalogManager) para refrescar la tabla principal
    if (typeof onSyncAfterSave === "function") onSyncAfterSave();
  } catch (e) {
    setError(e?.response?.data?.message || "No se pudo crear la entrada de catálogo.");
    console.error(e);
  } finally {
    setSaving(false);
  }
};


const addSelectedToCatalog = async () => {
  const bucket = new Set(selected);
  const batch = filteredSuggestions.filter((p) => bucket.has(p.id));
  if (batch.length === 0) return;

  try {
    setSaving(true);
    for (const p of batch) {
      // creamos uno por uno (puedes paralelizar si gustas)
      await addOneToCatalog(p, targetSection);
    }
    setSelected([]);
    // 👇 Llamar una vez más al final por si hubo alguna creación que no llamó (por seguridad)
    if (typeof onSyncAfterSave === "function") onSyncAfterSave();
  } finally {
    setSaving(false);
  }
};


  // Duplicar una fila existente a otra sección
const duplicateRowToSection = async (row, newSection) => {
  const payload = {
    productId: row.productId,
    section: newSection,
    title: row.title || null,
    subtitle: row.subtitle || null,
    badge: row.badge || null,
    position: 0,
    isActive: !!row.isActive,
    priceOverride: row.priceOverride == null ? null : Number(row.priceOverride),
    imageUrl: row.imageUrl || null,
  };

  try {
    setSaving(true);
    const { data } = await createCatalogEntry(payload);
    const created = data?.catalog;

    if (created?.id) {
      setCatalogRows((prev) => [
        {
          id: created.id,
          productId: created.productId,
          section: created.section,
          title: created.title,
          subtitle: created.subtitle,
          badge: created.badge,
          position: created.position,
          isActive: !!created.isActive,
          priceOverride:
            created.priceOverride == null ? null : Number(created.priceOverride),
          imageUrl: created.imageUrl || "",
        },
        ...prev,
      ]);
    }

    // 👇 Refrescar la tabla principal del manager
    if (typeof onSyncAfterSave === "function") onSyncAfterSave();
  } catch (e) {
    setError(e?.response?.data?.message || "No se pudo duplicar a la sección destino.");
    console.error(e);
  } finally {
    setSaving(false);
  }
};


  // === Tarjeta de sugerencia para móvil (ultra compacta)
  const SuggestionCard = ({ p }) => {
    const mval = p.stats?.[metric] ?? 0;
    const edit = quickEdits[p.id] || {};
    const checked = selected.includes(p.id);

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Checkbox
            size="small"
            checked={checked}
            onChange={() => toggleOne(p.id)}
            sx={{ p: 0.25 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              noWrap
              title={p.name}
              sx={{ lineHeight: 1.1 }}
            >
              {p.name}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip
                size="small"
                icon={<Star fontSize="inherit" />}
                label={`${p.stats.rating?.toFixed?.(1) ?? "—"}★`}
                variant="outlined"
              />
              <Chip size="small" label={`30d:${p.stats.sold30}`} variant="outlined" />
              <Chip size="small" label={`Hist:${p.stats.soldAll}`} variant="outlined" />
              <Chip size="small" label={`$${p.price.toFixed(2)}`} variant="outlined" />
              <Chip size="small" label={`${metric}:${mval}`} />
            </Stack>
          </Box>
        </Stack>

        <Grid container spacing={0.75}>
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              label="Título"
              fullWidth
              value={edit.title ?? p.name}
              onChange={(e) => setEdit(p.id, "title", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              label="Subtítulo"
              fullWidth
              value={edit.subtitle ?? ""}
              onChange={(e) => setEdit(p.id, "subtitle", e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              size="small"
              label="Badge"
              fullWidth
              value={edit.badge ?? ""}
              onChange={(e) => setEdit(p.id, "badge", e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              size="small"
              label="Precio"
              type="number"
              fullWidth
              value={edit.priceOverride ?? ""}
              onChange={(e) => setEdit(p.id, "priceOverride", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ height: 1 }}
            >
              <Typography variant="caption">Activo</Typography>
              <Switch
                size="small"
                checked={edit.isActive ?? true}
                onChange={(e) => setEdit(p.id, "isActive", e.target.checked)}
              />
            </Stack>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          size="small"
          startIcon={<Add fontSize="inherit" />}
          onClick={() => addOneToCatalog(p, targetSection)}
          fullWidth
          disabled={saving}
          sx={{ mt: 0.5 }}
        >
          Agregar a {sectionLabel(targetSection)}
        </Button>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: 1, pt: 0.5, pb: 1 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Laboratorio de Catálogo Automático
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        Sugerencias por ventas/vistas; duplicación rápida a otras secciones.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* Panel de control (compacto) */}
      <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Métrica</InputLabel>
              <Select
                label="Métrica"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                <MenuItem value="sold30">Ventas 30 días</MenuItem>
                <MenuItem value="soldAll">Ventas históricas</MenuItem>
                <MenuItem value="views30">Vistas 30 días</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                label="Categoría"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              label="Top N"
              type="number"
              size="small"
              value={limit}
              onChange={(e) =>
                setLimit(Math.max(0, Number(e.target.value || 0)))
              }
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sección destino</InputLabel>
              <Select
                label="Sección destino"
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
              >
                {SECTION_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ flexWrap: "wrap" }}
            >
              <Switch
                checked={onlyNotInSection}
                onChange={(e) => setOnlyNotInSection(e.target.checked)}
                size="small"
              />
              <Typography variant="body2">
                Ocultar ya presentes en “{sectionLabel(targetSection)}”
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<Add fontSize="small" />}
                onClick={addSelectedToCatalog}
                disabled={selected.length === 0 || saving}
                size="small"
              >
                Agregar seleccionados a {sectionLabel(targetSection)}
              </Button>
              <Chip
                icon={<TrendingUp fontSize="small" />}
                label={`Sugeridos: ${filteredSuggestions.length}`}
                size="small"
                sx={{ height: 22 }}
              />
              <Chip
                color={selected.length ? "primary" : "default"}
                label={`Seleccionados: ${selected.length}`}
                size="small"
                sx={{ height: 22 }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={1}>
        {/* Sugerencias */}
        <Grid item xs={12} md={9}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Sugerencias por popularidad
              </Typography>
              {!isSmDown && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Checkbox
                    checked={allSelectedComputed}
                    onChange={toggleAll}
                    size="small"
                  />
                  <Typography variant="caption">Seleccionar todo</Typography>
                </Stack>
              )}
            </Stack>

            {isSmDown ? (
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{ mb: 0.25 }}
                >
                  <Checkbox
                    checked={allSelectedComputed}
                    onChange={toggleAll}
                    size="small"
                  />
                  <Typography variant="caption">Seleccionar todo</Typography>
                </Stack>

                {filteredSuggestions.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ py: 1 }}
                  >
                    No hay sugerencias con los filtros actuales.
                  </Typography>
                )}
                {filteredSuggestions.map((p) => (
                  <SuggestionCard key={p.id} p={p} />
                ))}
              </Stack>
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table
                  size="small"
                  stickyHeader
                  sx={{
                    "& .MuiTableCell-root": { py: 0.5, px: 0.75 },
                    "& th.MuiTableCell-root": { fontSize: "0.85rem" },
                    "& td.MuiTableCell-root": { fontSize: "0.84rem" },
                    "& .MuiInputBase-root": { fontSize: "0.82rem" },
                    "& .MuiChip-root": {
                      height: 22,
                      "& .MuiChip-label": { px: 0.75 },
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={allSelectedComputed}
                          onChange={toggleAll}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Métrica</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell>Quick Edit</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSuggestions.map((p) => {
                      const mval = p.stats?.[metric] ?? 0;
                      const edit = quickEdits[p.id] || {};
                      const checked = selected.includes(p.id);
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={checked}
                              onChange={() => toggleOne(p.id)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 200 }}>
                            <Stack spacing={0.25}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                title={p.name}
                                sx={{ lineHeight: 1.1 }}
                              >
                                {p.name}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                flexWrap="wrap"
                              >
                                <Chip
                                  size="small"
                                  icon={<Star fontSize="inherit" />}
                                  label={`${
                                    p.stats.rating?.toFixed?.(1) ?? "—"
                                  }★`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`30d:${p.stats.sold30}`}
                                />
                                <Chip
                                  size="small"
                                  label={`Hist:${p.stats.soldAll}`}
                                />
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2">{mval}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {metric}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {currency(p.price)}
                          </TableCell>
                          <TableCell sx={{ minWidth: 320 }}>
                            <Grid container spacing={0.75}>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  size="small"
                                  label="Título"
                                  fullWidth
                                  value={edit.title ?? p.name}
                                  onChange={(e) =>
                                    setEdit(p.id, "title", e.target.value)
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  size="small"
                                  label="Subtítulo"
                                  fullWidth
                                  value={edit.subtitle ?? ""}
                                  onChange={(e) =>
                                    setEdit(p.id, "subtitle", e.target.value)
                                  }
                                />
                              </Grid>
                              <Grid item xs={6} md={4}>
                                <TextField
                                  size="small"
                                  label="Badge"
                                  fullWidth
                                  value={edit.badge ?? ""}
                                  onChange={(e) =>
                                    setEdit(p.id, "badge", e.target.value)
                                  }
                                />
                              </Grid>
                              <Grid item xs={6} md={4}>
                                <TextField
                                  size="small"
                                  label="Precio"
                                  type="number"
                                  fullWidth
                                  value={edit.priceOverride ?? ""}
                                  onChange={(e) =>
                                    setEdit(
                                      p.id,
                                      "priceOverride",
                                      e.target.value
                                    )
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.5}
                                  sx={{ height: 1 }}
                                >
                                  <Typography variant="caption">Activo</Typography>
                                  <Switch
                                    size="small"
                                    checked={edit.isActive ?? true}
                                    onChange={(e) =>
                                      setEdit(
                                        p.id,
                                        "isActive",
                                        e.target.checked
                                      )
                                    }
                                  />
                                </Stack>
                              </Grid>
                            </Grid>
                          </TableCell>
                          <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                            <Tooltip
                              title={`Agregar a ${sectionLabel(targetSection)}`}
                            >
                              <span>
                                <IconButton
                                  color="primary"
                                  onClick={() =>
                                    addOneToCatalog(p, targetSection)
                                  }
                                  size="small"
                                  disabled={saving}
                                >
                                  <Add fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSuggestions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{ py: 1 }}
                          >
                            No hay sugerencias con los filtros actuales.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Catálogo existente (duplicación) */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Stack
              direction={isSmDown ? "column" : "row"}
              justifyContent="space-between"
              alignItems={isSmDown ? "flex-start" : "center"}
              spacing={0.5}
              sx={{ mb: 0.5 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Ítems existentes (duplicar)
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ flexWrap: "wrap" }}
              >
                <Layers fontSize="small" />
                <Typography variant="caption" color="text.secondary">
                  Duplica a otra sección
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 0.5 }} />

            <Stack
              spacing={0.75}
              sx={{ maxHeight: { xs: 320, md: 420 }, overflow: "auto", pr: 0.5 }}
            >
              {catalogRows.map((row) => {
                const prod = products.find((p) => p.id === row.productId);
                return (
                  <Paper
                    key={row.id}
                    variant="outlined"
                    sx={{ p: 0.75, borderRadius: 1.25 }}
                  >
                    <Grid container spacing={0.75} alignItems="center">
                      <Grid item xs={12} sm={7}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                          title={row.title || prod?.name}
                          sx={{ lineHeight: 1.1 }}
                        >
                          {row.title || prod?.name || `#${row.productId}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {sectionLabel(row.section)} ·{" "}
                          {row.isActive ? "Activo" : "Inactivo"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" align={isSmDown ? "left" : "right"}>
                          {currency(row.priceOverride ?? prod?.price)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2} textAlign="right">
                        <Tooltip title="Duplicar a sección destino">
                          <IconButton
                            onClick={() =>
                              duplicateRowToSection(row, targetSection)
                            }
                            size="small"
                            disabled={saving}
                          >
                            <ContentCopy fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
              {catalogRows.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 1 }}
                >
                  Aún no hay ítems. Agrega desde las sugerencias.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Vista previa del “catálogo resultante” por sección destino */}
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2">
            Vista rápida: <b>{sectionLabel(targetSection)}</b>
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Columnas:</Typography>
            {[1, 2, 3, 4].map((n) => (
              <Button
                key={n}
                variant={viewColumns === n ? "contained" : "outlined"}
                size="small"
                onClick={() => setViewColumns(n)}
                sx={{ minWidth: 36, px: 0.75 }}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={handleUpdatePositions}
              disabled={displayOrder.length === 0 || updatingPositions}
            >
              {updatingPositions ? "Guardando…" : "Actualizar posiciones"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={handleUpdatePositions}
              disabled={displayOrder.length === 0 || updatingPositions}
              title="Asigna posiciones 1, 2, 3... según el orden actual y guarda"
            >
              Auto enumerar
            </Button>
          </Stack>
        </Stack>
        <Paper variant="outlined" sx={{ p: 0.75 }}>
          <Grid container spacing={0.5}>
            {displayOrderForView.map(({ item: r, logicalIndex }) => {
              const prod = products.find((p) => p.id === r.productId);
              const label = `${r.title || prod?.name} · ${currency(r.priceOverride ?? prod?.price)}`;
              const isDragOver = dragOverId === r.id;
              const posNum = logicalIndex + 1;
              const colWidth = viewColumns === 1 ? 12 : viewColumns === 2 ? 6 : viewColumns === 3 ? 4 : 3;
              return (
                <Grid item xs={12} sm={colWidth} key={r.id}>
                  <Paper
                    variant="outlined"
                    onDragStart={(e) => handleDragStart(e, r.id)}
                    onDragOver={(e) => handleDragOver(e, r.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, r.id)}
                    draggable
                    sx={{
                      p: 0.75,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "grab",
                      bgcolor: isDragOver ? "action.hover" : undefined,
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <Chip
                      size="small"
                      label={posNum}
                      sx={{ minWidth: 24, height: 22, flexShrink: 0 }}
                    />
                    <DragIndicator fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={label}>
                      {label}
                    </Typography>
                  <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Subir">
                      <span>
                        <IconButton size="small" onClick={() => moveUp(logicalIndex)} disabled={logicalIndex === 0} sx={{ p: 0.25 }}>
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Bajar">
                      <span>
                        <IconButton size="small" onClick={() => moveDown(logicalIndex)} disabled={logicalIndex === displayOrder.length - 1} sx={{ p: 0.25 }}>
                          <ArrowDownward fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              </Grid>
              );
            })}
            {displayOrder.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
                  (Vacío)
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
}
