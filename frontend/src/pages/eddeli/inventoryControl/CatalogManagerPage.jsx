// CatalogManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  Alert,
} from "@mui/material";
import { Edit, Delete, Inventory } from "@mui/icons-material";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";
import { pathImg } from "../../../api/axios";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

import {
  getCatalogEntries,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  getAllProductsAll,
  getCategories,
} from "../../../api/inventoryControlRequest";
import AutoCatalogLab from "./components/AutoCatalogLab";


// === Secciones (alineado con tu modelo) ===
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

const currency = (v) => (v == null ? "—" : `$${Number(v).toFixed(2)}`);

// === Normalizadores ===
function normalizeWholesaleRules(val) {
  if (val == null) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return normalizeWholesaleRules(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.tiers)) return val.tiers;
  return [];
}

function prettyJson(val) {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return "";
  }
}

/* ===============================
   Formulario en el mismo archivo
================================= */
function CatalogForm({ open, onClose, isEditing, datos, onSubmit, products }) {
  const [form, setForm] = useState({
    id: null,
    productId: "",
    section: "home",
    title: "",
    subtitle: "",
    badge: "",
    position: 0,
    isActive: true,
    priceOverride: "",
    wholesaleOverrideRules: [], // ahora manejado visualmente
    storeId: "",
    startsAt: "",
    endsAt: "",
  });

  // Producto seleccionado
  const product = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)),
    [form.productId, products]
  );

  // Reglas del producto base
  const productRules = useMemo(() => {
    const rules = Array.isArray(product?.wholesaleRules)
      ? product.wholesaleRules
      : typeof product?.wholesaleRules === "string"
      ? JSON.parse(product.wholesaleRules || "[]")
      : [];
    return rules;
  }, [product]);

  // Hidratar formulario
  useEffect(() => {
    if (!open) return;

    if (isEditing && datos) {
      setForm({
        id: datos.id,
        productId: datos.productId ?? "",
        section: datos.section ?? "home",
        title: datos.title ?? "",
        subtitle: datos.subtitle ?? "",
        badge: datos.badge ?? "",
        position: Number.isFinite(datos.position) ? datos.position : 0,
        isActive: Boolean(datos.isActive),
        priceOverride:
          typeof datos.priceOverride === "number"
            ? datos.priceOverride
            : datos.priceOverride ?? "",
        wholesaleOverrideRules: Array.isArray(datos.wholesaleOverrideRules)
          ? datos.wholesaleOverrideRules
          : typeof datos.wholesaleOverrideRules === "string"
          ? JSON.parse(datos.wholesaleOverrideRules || "[]")
          : [],
        storeId: datos.storeId ?? "",
        startsAt: datos.startsAt ? datos.startsAt.slice(0, 16) : "",
        endsAt: datos.endsAt ? datos.endsAt.slice(0, 16) : "",
      });
    } else {
      setForm({
        id: null,
        productId: "",
        section: "home",
        title: "",
        subtitle: "",
        badge: "",
        position: 0,
        isActive: true,
        priceOverride: "",
        wholesaleOverrideRules: [],
        storeId: "",
        startsAt: "",
        endsAt: "",
      });
    }
  }, [open, isEditing, datos]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const shownPrice = useMemo(() => {
    if (form.priceOverride !== "" && form.priceOverride != null) return Number(form.priceOverride);
    return product?.price ?? null;
  }, [form.priceOverride, product]);

  const displayImage = useMemo(() => {
    return product?.primaryImageUrl ? `${pathImg}${product.primaryImageUrl}` : "";
  }, [product]);

  // --- Reglas Mayoristas ---
  const addTier = () =>
    setForm((prev) => ({
      ...prev,
      wholesaleOverrideRules: [
        ...(prev.wholesaleOverrideRules || []),
        { minQty: 12, discountPercent: 5 },
      ],
    }));

  const removeTier = (idx) =>
    setForm((prev) => ({
      ...prev,
      wholesaleOverrideRules: prev.wholesaleOverrideRules.filter((_, i) => i !== idx),
    }));

  const updateTier = (idx, key, val) =>
    setForm((prev) => ({
      ...prev,
      wholesaleOverrideRules: prev.wholesaleOverrideRules.map((t, i) =>
        i === idx ? { ...t, [key]: val } : t
      ),
    }));

  const clearTiers = () => set("wholesaleOverrideRules", []);

  const copyFromProduct = () => {
    set("wholesaleOverrideRules", productRules);
  };

  const handleSave = async () => {
    const payload = {
      productId: Number(form.productId),
      section: form.section,
      title: form.title?.trim() || null,
      subtitle: form.subtitle?.trim() || null,
      badge: form.badge?.trim() || null,
      position: Number(form.position || 0),
      isActive: Boolean(form.isActive),
      priceOverride:
        form.priceOverride === "" || form.priceOverride == null
          ? null
          : Number(form.priceOverride),
      wholesaleOverrideRules:
        form.wholesaleOverrideRules && form.wholesaleOverrideRules.length
          ? form.wholesaleOverrideRules
          : null,
      storeId: form.storeId === "" ? null : Number(form.storeId),
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };

    await onSubmit(payload, form.id);
  };

  // Fuente efectiva (catálogo > producto)
  const effectiveRules =
    form.wholesaleOverrideRules?.length > 0
      ? { source: "catálogo", tiers: form.wholesaleOverrideRules }
      : { source: "producto", tiers: productRules || [] };

  return (
    <SimpleDialog
      open={open}
      onClose={onClose}
      tittle={isEditing ? "Editar catálogo" : "Agregar al catálogo"}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ p: 2, minWidth: { xs: 380, sm: 900 } }}>
        <Grid container spacing={2}>
          {/* Producto y sección */}
          <Grid item xs={12} sm={8}>
            <FormControl fullWidth variant="standard">
              <InputLabel>Producto</InputLabel>
              <Select
                value={form.productId}
                onChange={(e) => set("productId", e.target.value)}
              >
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="standard">
              <InputLabel>Sección</InputLabel>
              <Select
                value={form.section}
                onChange={(e) => set("section", e.target.value)}
              >
                {SECTION_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Textos básicos */}
          <Grid item xs={12}>
            <TextField
              label="Título visible"
              fullWidth
              variant="standard"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={product?.name || "Título para vitrina"}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Subtítulo (opcional)"
              fullWidth
              variant="standard"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Ej: recién horneado, 70 g"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Badge (opcional)"
              fullWidth
              variant="standard"
              value={form.badge}
              onChange={(e) => set("badge", e.target.value)}
              placeholder="Ej: -20%, Nuevo"
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              label="Posición"
              type="number"
              fullWidth
              variant="standard"
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.isActive)}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
              }
              label="Activo"
              sx={{ mt: 1 }}
            />
          </Grid>

          {/* Precios */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Precio a mostrar (override)"
              type="number"
              fullWidth
              variant="standard"
              value={form.priceOverride}
              onChange={(e) => set("priceOverride", e.target.value)}
              helperText={
  typeof shownPrice === "number"
    ? `Se mostrará: $${shownPrice.toFixed(2)}`
    : "Se mostrará: —"
}

            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Store ID (opcional)"
              type="number"
              fullWidth
              variant="standard"
              value={form.storeId ?? ""}
              onChange={(e) => set("storeId", e.target.value)}
            />
          </Grid>

          {/* Fechas */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Inicio (opcional)"
              type="datetime-local"
              fullWidth
              variant="standard"
              value={form.startsAt || ""}
              onChange={(e) => set("startsAt", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fin (opcional)"
              type="datetime-local"
              fullWidth
              variant="standard"
              value={form.endsAt || ""}
              onChange={(e) => set("endsAt", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Imagen del producto */}
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Imagen del producto
            </Typography>
            <Box
              sx={{
                mt: 1,
                width: 150,
                height: 150,
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "action.hover",
                border: "1px dashed",
                borderColor: "divider",
                display: "grid",
                placeItems: "center",
              }}
            >
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin imagen
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Reglas Mayoristas Override */}
          <Grid item xs={12} sm={8}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">
                Reglas Mayoristas (override del catálogo)
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Button variant="outlined" size="small" onClick={addTier}>
                  Añadir tramo
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={copyFromProduct}
                  disabled={!productRules.length}
                >
                  Copiar desde producto
                </Button>
                {form.wholesaleOverrideRules.length > 0 && (
                  <Button
                    color="error"
                    size="small"
                    variant="text"
                    onClick={clearTiers}
                  >
                    Limpiar
                  </Button>
                )}
              </Stack>

              {/* Lista editable */}
              {form.wholesaleOverrideRules.length > 0 ? (
                <Grid container spacing={1}>
                  {form.wholesaleOverrideRules.map((tier, idx) => (
                    <Grid key={idx} item xs={12} sm={6} md={4}>
                      <Stack
                        spacing={1}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          p: 1.5,
                          borderRadius: 1,
                        }}
                      >
                        <TextField
                          label="Cantidad mínima"
                          type="number"
                          size="small"
                          value={tier.minQty}
                          onChange={(e) =>
                            updateTier(idx, "minQty", Math.max(1, Number(e.target.value || 1)))
                          }
                        />
                        <TextField
                          label="Descuento %"
                          type="number"
                          size="small"
                          value={tier.discountPercent ?? ""}
                          onChange={(e) =>
                            updateTier(
                              idx,
                              "discountPercent",
                              Math.max(0, Number(e.target.value || 0))
                            )
                          }
                        />
                        <TextField
                          label="Precio unitario"
                          type="number"
                          size="small"
                          value={tier.pricePerUnit ?? ""}
                          onChange={(e) =>
                            updateTier(
                              idx,
                              "pricePerUnit",
                              Math.max(0, Number(e.target.value || 0))
                            )
                          }
                        />
                        <Button
                          color="error"
                          size="small"
                          onClick={() => removeTier(idx)}
                        >
                          Quitar
                        </Button>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay override. Se usarán las reglas del producto{" "}
                  ({productRules.length || 0} niveles).
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditing ? "Guardar cambios" : "Crear"}
        </Button>
      </Box>
    </SimpleDialog>
  );
}


/* ===============================
   Página principal con TablePro
================================= */
export default function CatalogManager() {
  const { toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sectionFilter, setSectionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const [openForm, setOpenForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState(null);
  const [titleDialog, setTitleDialog] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {};
      if (sectionFilter) params.section = sectionFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      const { data } = await getCatalogEntries(params);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchCategories = async () => {
    const { data } = await getCategories();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchRows();
  }, [sectionFilter, categoryFilter]);

  const handleDialogDelete = () => setOpenDelete((p) => !p);
  const handleDialogForm = () => setOpenForm((p) => !p);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setDatos(null);
    setTitleDialog("Agregar al catálogo");
    handleDialogForm();
  };

  const handleOpenEdit = (row) => {
    setIsEditing(true);
    setDatos(row); // 👈 aquí viene row.product.wholesaleRules para el form
    setTitleDialog("Editar catálogo");
    handleDialogForm();
  };

  const handleDelete = async () => {
    if (!rowToDelete) return;
    await runMutationReload(toast, {
      promise: deleteCatalogEntry(rowToDelete.id),
      reload: fetchRows,
      onClose: handleDialogDelete,
    });
  };

  const upsertEntry = async (payload, id) => {
    const promise = isEditing ? updateCatalogEntry(id, payload) : createCatalogEntry(payload);
    await runMutationReload(toast, {
      promise,
      reload: fetchRows,
      onClose: handleDialogForm,
    });
  };

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  const rulesBadge = (row) => {
    const fromCat = normalizeWholesaleRules(row.wholesaleOverrideRules);
    const fromProd = normalizeWholesaleRules(row.product?.wholesaleRules);
    const source = fromCat.length ? "catálogo" : fromProd.length ? "producto" : "ninguno";
    const count = fromCat.length ? fromCat.length : fromProd.length || 0;
    const color = fromCat.length ? "primary" : fromProd.length ? "success" : "default";
    return <Chip size="small" color={color} label={`${source} · ${count}`} />;
  };

  const columns = [
    {
      label: "Imagen",
      id: "image",
      width: 90,
      render: (row) => {
        const p = productById(row.productId);
        const filename = row?.imageUrl || p?.primaryImageUrl || row?.product?.primaryImageUrl;
        const src = filename ? `${pathImg}${filename}` : null;
        return src ? (
          <img
            src={src}
            alt={row?.title || p?.name || row?.product?.name || "img"}
            style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, display: "block" }}
          />
        ) : (
          <Box sx={{ width: 60, height: 60, borderRadius: 1, bgcolor: "action.hover" }} />
        );
      },
    },
    {
      label: "Producto",
      id: "product",
      width: 220,
      render: (row) =>
        productById(row.productId)?.name || row?.product?.name || `#${row.productId}`,
    },
    {
      label: "Categoría",
      id: "category",
      width: 120,
      render: (row) => {
        const p = row?.product || productById(row.productId);
        return p?.ERP_inventory_category?.name ?? "—";
      },
    },
    {
      label: "Sección",
      id: "section",
      width: 140,
      render: (row) => {
        const opt = SECTION_OPTIONS.find((s) => s.value === row.section);
        return <Chip size="small" label={opt?.label || row.section} />;
      },
    },
    {
      label: "Título",
      id: "title",
      width: 240,
      render: (row) => (
        <Typography variant="body2" noWrap title={row?.title || ""}>
          {row?.title || "—"}
        </Typography>
      ),
    },
    {
      label: "Precio mostrado",
      id: "priceShown",
      width: 130,
      render: (row) => {
        const p = productById(row.productId) || row.product;
        const price =
          row.priceOverride != null && row.priceOverride !== "" ? Number(row.priceOverride) : p?.price;
        return currency(price);
      },
    },
    {
      label: "Mayoreo (efectivo)",
      id: "wholesaleEffective",
      width: 160,
      render: (row) => rulesBadge(row),
    },
    {
      label: "Posición",
      id: "position",
      width: 90,
      render: (row) => row.position ?? 0,
    },
    {
      label: "Activo",
      id: "isActive",
      width: 90,
      render: (row) => (row.isActive ? "Sí" : "No"),
    },
    {
      label: "Acciones",
      id: "actions",
      width: 150,
      render: (row) => (
        <>
          <Tooltip title="Editar">
            <IconButton onClick={() => handleOpenEdit(row)}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                setRowToDelete(row);
                handleDialogDelete();
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Container>
      {/* Dialog eliminar */}
      <SimpleDialog
        open={openDelete}
        onClose={handleDialogDelete}
        tittle="Eliminar ítem de catálogo"
        onClickAccept={handleDelete}
      >
        ¿Está seguro de eliminar este registro del catálogo?
      </SimpleDialog>

      {/* Dialog crear/editar */}
      <SimpleDialog open={openForm} onClose={handleDialogForm} tittle={titleDialog}>
        <CatalogForm
          open={openForm}
          onClose={handleDialogForm}
          isEditing={isEditing}
          datos={datos}
          onSubmit={upsertEntry}
          products={products}
        />
      </SimpleDialog>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
        <Button variant="text" endIcon={<Inventory />} onClick={handleOpenCreate}>
          Agregar al catálogo
        </Button>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sección</InputLabel>
          <Select
            value={sectionFilter}
            label="Sección"
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {SECTION_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            value={categoryFilter}
            label="Categoría"
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
      </Stack>

      <TablePro
        rows={rows}
        columns={columns}
        defaultRowsPerPage={10}
        title="CATÁLOGO"
        showIndex={true}
        loading={loading}
      />
      <AutoCatalogLab onSyncAfterSave={fetchRows} />
    </Container>
  );
}
