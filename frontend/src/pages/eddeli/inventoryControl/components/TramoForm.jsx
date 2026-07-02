import {
  Grid,
  TextField,
  Box,
  Button,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
  Checkbox,
  MenuItem,
  Chip,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  createTierGroup,
  updateTierGroup,
  getAllProductsAll,
  getCategories,
} from "../../../../api/inventoryControlRequest";
import { normalizePackageTiers } from "../../../../utils/productLookup.js";
import TablePro from "../../../../components/Tables/TablePro";

function TramoForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();

  const [packageTiers, setPackageTiers] = useState(() =>
    normalizePackageTiers(datos?.packageTiers),
  );
  const [productIds, setProductIds] = useState(() => {
    const raw = datos?.productIds;
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === "string" && raw.trim()) {
      try {
        return JSON.parse(raw).map(Number);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [categoryId, setCategoryId] = useState(() =>
    datos?.categoryId ? String(datos.categoryId) : "",
  );
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const categoryOptions = useMemo(
    () =>
      [...(categories || [])].sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "es"),
      ),
    [categories],
  );

  const categoryProducts = useMemo(() => {
    if (!categoryId) return [];
    const cid = Number(categoryId);
    const selected = new Set(productIds.map(Number));
    return (allProducts || [])
      .filter((p) => Number(p.categoryId ?? p.ERP_inventory_category?.id) === cid)
      .sort((a, b) => {
        const aSel = selected.has(Number(a.id)) ? 0 : 1;
        const bSel = selected.has(Number(b.id)) ? 0 : 1;
        if (aSel !== bSel) return aSel - bSel;
        return String(a.name).localeCompare(String(b.name), "es");
      });
  }, [allProducts, categoryId, productIds]);

  const toggleProduct = (productId) => {
    const id = Number(productId);
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const productTableColumns = useMemo(
    () => [
      {
        id: "select",
        label: "",
        stopRowClick: true,
        render: (row) => (
          <Checkbox
            size="small"
            checked={productIds.includes(Number(row.id))}
            onChange={() => toggleProduct(row.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        id: "name",
        label: "Producto",
        getSortValue: (row) => String(row.name || "").toLowerCase(),
        render: (row) => row.name || "—",
      },
      {
        id: "barcode",
        label: "Código",
        getSortValue: (row) => String(row.barcode || "").toLowerCase(),
        render: (row) => row.barcode || "—",
      },
      {
        id: "price",
        label: "Precio",
        getSortValue: (row) => Number(row.price || 0),
        render: (row) => `$${Number(row.price || 0).toFixed(2)}`,
      },
    ],
    [productIds],
  );

  const addPackageTier = () =>
    setPackageTiers((prev) => [...prev, { qty: 4, totalPrice: 0.5 }]);
  const removePackageTier = (idx) =>
    setPackageTiers((prev) => prev.filter((_, i) => i !== idx));
  const updatePackageTier = (idx, key, val) =>
    setPackageTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: val } : t)));

  const resetForm = () => {
    reset();
    setPackageTiers([]);
    setProductIds([]);
    setCategoryId("");
  };

  const submitForm = async (formData) => {
    if (!packageTiers.length) {
      toastAuth({ message: "Añade al menos un tramo de precio.", variant: "error" });
      return;
    }
    if (!productIds.length) {
      toastAuth({ message: "Selecciona al menos un producto del grupo.", variant: "error" });
      return;
    }

    const payload = {
      name: String(formData.name || "").trim(),
      description: String(formData.description || "").trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
      packageTiers,
      productIds,
      isActive: Boolean(formData.isActive),
      position: Number(formData.position) || 0,
    };

    const afterSave = async () => {
      resetForm();
      if (reload) await reload();
      if (onClose) onClose();
    };

    try {
      if (isEditing) {
        await toastAuth({
          promise: updateTierGroup(datos.id, payload),
          onSuccess: afterSave,
        });
        return;
      }

      await toastAuth({
        promise: createTierGroup(payload),
        successMessage: "Tramo guardado con éxito",
        onSuccess: afterSave,
      });
    } catch {
      /* toast mostró error */
    }
  };

  const loadData = () => {
    if (isEditing && datos) {
      setValue("name", datos.name || "");
      setValue("description", datos.description || "");
      setValue("isActive", datos.isActive !== false);
      setValue("position", datos.position ?? 0);
      setCategoryId(datos.categoryId ? String(datos.categoryId) : "");
      setPackageTiers(normalizePackageTiers(datos.packageTiers));
      let ids = [];
      if (Array.isArray(datos.productIds)) ids = datos.productIds.map(Number);
      else if (typeof datos.productIds === "string" && datos.productIds.trim()) {
        try {
          ids = JSON.parse(datos.productIds).map(Number);
        } catch {
          ids = [];
        }
      }
      setProductIds(ids);
    } else {
      setValue("isActive", true);
      setValue("position", 0);
      setPackageTiers([{ qty: 2, totalPrice: 0.25 }, { qty: 4, totalPrice: 0.5 }]);
      setProductIds([]);
      setCategoryId("");
    }
  };

  useEffect(() => {
    loadData();
    Promise.all([getAllProductsAll(), getCategories()])
      .then(([prodRes, catRes]) => {
        setAllProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      })
      .catch(() => {
        setAllProducts([]);
        setCategories([]);
      });
  }, [isEditing, datos]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={8}>
          <TextField
            label="Nombre en caja"
            fullWidth
            required
            variant="standard"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
            helperText='Ej. "Pan surtido"'
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Orden"
            type="number"
            fullWidth
            variant="standard"
            {...register("position")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            select
            label="Subcategoría (filtro de productos)"
            fullWidth
            variant="standard"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setProductIds([]);
            }}
            helperText="Elige la subcategoría para listar sus productos"
          >
            <MenuItem value="">
              <em>Sin categoría</em>
            </MenuItem>
            {categoryOptions.map((cat) => (
              <MenuItem key={cat.id} value={String(cat.id)}>
                {cat.parent?.name ? `${cat.parent.name} → ${cat.name}` : cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción"
            fullWidth
            variant="standard"
            multiline
            rows={2}
            {...register("description")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                {...register("isActive")}
                checked={watch("isActive") !== false}
                onChange={(e) => setValue("isActive", e.target.checked)}
              />
            }
            label="Activo en caja"
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle2">Tramos de precio</Typography>
            <Button variant="outlined" size="small" onClick={addPackageTier}>
              Añadir tramo
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Ej. 4 unidades (cualquier producto del grupo) = $0.50
          </Typography>
        </Grid>

        {packageTiers.map((tier, idx) => (
          <Grid key={`tramo-pkg-${idx}`} item xs={12} sm={6} md={4}>
            <Stack
              spacing={1}
              sx={{ border: "1px solid", borderColor: "divider", p: 1.5, borderRadius: 1 }}
            >
              <TextField
                label="Cantidad"
                type="number"
                size="small"
                value={tier.qty}
                onChange={(e) =>
                  updatePackageTier(idx, "qty", Math.max(1, Number(e.target.value || 1)))
                }
              />
              <TextField
                label="Precio total ($)"
                type="number"
                size="small"
                inputProps={{ step: "0.01", min: 0 }}
                value={tier.totalPrice}
                onChange={(e) =>
                  updatePackageTier(idx, "totalPrice", Math.max(0, Number(e.target.value || 0)))
                }
              />
              <Button color="error" size="small" onClick={() => removePackageTier(idx)}>
                Quitar
              </Button>
            </Stack>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Productos del grupo</Typography>
            {productIds.length > 0 && (
              <Chip size="small" label={`${productIds.length} seleccionado(s)`} color="primary" />
            )}
          </Stack>
          {!categoryId ? (
            <Typography variant="body2" color="text.secondary">
              Selecciona una subcategoría para elegir productos.
            </Typography>
          ) : categoryProducts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay productos en esta subcategoría.
            </Typography>
          ) : (
            <TablePro
              columns={productTableColumns}
              rows={categoryProducts}
              showSearch
              showPagination
              defaultRowsPerPage={10}
              rowsPerPageOptions={[5, 10, 25, 50]}
              tableMaxHeight="min(360px, 45vh)"
            />
          )}
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {onClose && (
              <Button onClick={onClose} color="inherit">
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="contained">
              {isEditing ? "Guardar cambios" : "Crear tramo"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default TramoForm;
