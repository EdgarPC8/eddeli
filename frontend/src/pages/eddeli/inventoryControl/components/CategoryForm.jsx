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
  FormGroup,
  MenuItem,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import {
  createCategoryRequest,
  updateCategoryRequest,
  getAllProducts,
} from "../../../../api/inventoryControlRequest";
import { normalizePackageTiers } from "../../../../utils/productLookup.js";
import {
  getRootCategories,
  hasChildCategories,
} from "../../../../utils/categoryUtils.js";

function CategoryForm({
  isEditing = false,
  datos = {},
  onClose,
  reload,
  allCategories = [],
  presetParentId = null,
}) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();

  const [categoryKind, setCategoryKind] = useState(() =>
    datos?.parentId || presetParentId ? "child" : "root",
  );
  const [parentId, setParentId] = useState(() =>
    datos?.parentId ? String(datos.parentId) : presetParentId ? String(presetParentId) : "",
  );

  const [packageTiers, setPackageTiers] = useState(() =>
    normalizePackageTiers(datos?.packageTiers),
  );
  const [mixMatchEnabled, setMixMatchEnabled] = useState(() =>
    Boolean(normalizePackageTiers(datos?.packageTiers).length),
  );
  const [mixMatchLabel, setMixMatchLabel] = useState(() => datos?.mixMatchLabel || "Pan surtido");
  const [mixProductIds, setMixProductIds] = useState(() => {
    const raw = datos?.mixMatchProductIds;
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
  const [allProducts, setAllProducts] = useState([]);

  const rootCategories = useMemo(() => getRootCategories(allCategories), [allCategories]);
  const editingHasChildren = isEditing && hasChildCategories(allCategories, datos?.id);
  const lockAsChild = Boolean(presetParentId) || Boolean(datos?.parentId);

  const categoryProducts = useMemo(() => {
    if (!isEditing || !datos?.id) return [];
    return (allProducts || []).filter(
      (p) => Number(p.categoryId ?? p.ERP_inventory_category?.id) === Number(datos.id),
    );
  }, [allProducts, isEditing, datos?.id]);

  const addPackageTier = () =>
    setPackageTiers((prev) => [...prev, { qty: 4, totalPrice: 0.5 }]);
  const removePackageTier = (idx) =>
    setPackageTiers((prev) => prev.filter((_, i) => i !== idx));
  const updatePackageTier = (idx, key, val) =>
    setPackageTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: val } : t)));

  const toggleMixProduct = (productId) => {
    const id = Number(productId);
    setMixProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetForm = () => {
    reset();
    setPackageTiers([]);
    setMixMatchEnabled(false);
    setMixMatchLabel("Pan surtido");
    setMixProductIds([]);
    setCategoryKind(presetParentId ? "child" : "root");
    setParentId(presetParentId ? String(presetParentId) : "");
  };

  const submitForm = async (formData) => {
    const payload = {
      ...formData,
      isPublic: Boolean(formData.isPublic),
      parentId: categoryKind === "child" && parentId ? Number(parentId) : null,
      packageTiers: packageTiers.length ? packageTiers : null,
      mixMatchLabel:
        mixMatchEnabled && packageTiers.length ? mixMatchLabel.trim() || "Pan surtido" : null,
      mixMatchProductIds:
        mixMatchEnabled && packageTiers.length && mixProductIds.length ? mixProductIds : null,
    };

    try {
      if (isEditing) {
        await toastAuth({
          promise: updateCategoryRequest(datos.id, payload),
          onSuccess: async () => {
            resetForm();
            if (reload) await reload();
            if (onClose) onClose();
          },
        });
        return;
      }

      await toastAuth({
        promise: createCategoryRequest(payload),
        successMessage: "Categoría guardada con éxito",
        onSuccess: async () => {
          resetForm();
          if (reload) await reload();
          if (onClose) onClose();
        },
      });
    } catch {
      /* toast mostró error */
    }
  };

  const loadData = () => {
    if (isEditing && datos) {
      setValue("name", datos.name || "");
      setValue("description", datos.description || "");
      setValue("isPublic", Boolean(datos.isPublic));
      setCategoryKind(datos.parentId ? "child" : "root");
      setParentId(datos.parentId ? String(datos.parentId) : "");
      const tiers = normalizePackageTiers(datos.packageTiers);
      setPackageTiers(tiers);
      setMixMatchEnabled(tiers.length > 0);
      setMixMatchLabel(datos.mixMatchLabel || "Pan surtido");
      let ids = [];
      if (Array.isArray(datos.mixMatchProductIds)) ids = datos.mixMatchProductIds.map(Number);
      else if (typeof datos.mixMatchProductIds === "string" && datos.mixMatchProductIds.trim()) {
        try {
          ids = JSON.parse(datos.mixMatchProductIds).map(Number);
        } catch {
          ids = [];
        }
      }
      setMixProductIds(ids);
    } else {
      setValue("isPublic", true);
      setCategoryKind(presetParentId ? "child" : "root");
      setParentId(presetParentId ? String(presetParentId) : "");
      setPackageTiers([]);
      setMixMatchEnabled(false);
      setMixMatchLabel("Pan surtido");
      setMixProductIds([]);
    }
  };

  useEffect(() => {
    loadData();
    getAllProducts()
      .then((res) => setAllProducts(res.data || []))
      .catch(() => setAllProducts([]));
  }, [isEditing, datos, presetParentId]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl>
            <FormLabel>Tipo</FormLabel>
            <RadioGroup
              row
              value={categoryKind}
              onChange={(e) => {
                const next = e.target.value;
                setCategoryKind(next);
                if (next === "root") setParentId("");
              }}
            >
              <FormControlLabel
                value="root"
                control={<Radio />}
                label="Categoría principal"
                disabled={lockAsChild || editingHasChildren}
              />
              <FormControlLabel
                value="child"
                control={<Radio />}
                label="Subcategoría"
                disabled={editingHasChildren}
              />
            </RadioGroup>
          </FormControl>
          {editingHasChildren ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Esta categoría tiene subcategorías; no puede convertirse en hija de otra.
            </Typography>
          ) : null}
        </Grid>

        {categoryKind === "child" ? (
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Categoría padre"
              fullWidth
              variant="standard"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required
              disabled={Boolean(presetParentId) && !isEditing}
              helperText="Ej. Panadería, Líquidos, Abarrotes"
            >
              {rootCategories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ) : null}

        <Grid item xs={12}>
          <TextField
            label="Nombre"
            fullWidth
            variant="standard"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
            helperText={
              categoryKind === "child"
                ? "Ej. Panes, Gaseosas, Tortas"
                : "Ej. Panadería, Pastelería, Abarrotes"
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción"
            fullWidth
            variant="standard"
            multiline
            rows={3}
            {...register("description")}
            InputLabelProps={idData ? { shrink: true } : {}}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                {...register("isPublic")}
                checked={watch("isPublic") || false}
                onChange={(e) => setValue("isPublic", e.target.checked)}
              />
            }
            label="Visible al público"
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle2">Tramos en caja (canasta surtido)</Typography>
            <Button variant="outlined" size="small" onClick={addPackageTier}>
              Añadir tramo
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Configura tramos en la subcategoría de venta (ej. Panes). Los insumos de Abarrotes no
            necesitan tramos.
          </Typography>
        </Grid>

        {packageTiers.map((tier, idx) => (
          <Grid key={`cat-pkg-${idx}`} item xs={12} sm={6} md={4}>
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
                label="Total a cobrar ($)"
                type="number"
                size="small"
                value={tier.totalPrice}
                onChange={(e) =>
                  updatePackageTier(
                    idx,
                    "totalPrice",
                    Math.max(0, Number(e.target.value || 0)),
                  )
                }
                inputProps={{ step: "0.01", min: 0 }}
              />
              <Button color="error" size="small" onClick={() => removePackageTier(idx)}>
                Quitar
              </Button>
            </Stack>
          </Grid>
        ))}

        {packageTiers.length > 0 && isEditing && (
          <>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mixMatchEnabled}
                    onChange={(e) => setMixMatchEnabled(e.target.checked)}
                  />
                }
                label="Activar canasta surtido en caja"
              />
            </Grid>
            {mixMatchEnabled && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nombre en caja"
                    fullWidth
                    size="small"
                    value={mixMatchLabel}
                    onChange={(e) => setMixMatchLabel(e.target.value)}
                    helperText='Ej. "Pan surtido"'
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Productos en la canasta
                  </Typography>
                  {categoryProducts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay productos en esta subcategoría. Asigna productos primero.
                    </Typography>
                  ) : (
                    <FormGroup>
                      {categoryProducts.map((p) => (
                        <FormControlLabel
                          key={p.id}
                          control={
                            <Checkbox
                              checked={mixProductIds.includes(Number(p.id))}
                              onChange={() => toggleMixProduct(p.id)}
                            />
                          }
                          label={`${p.name} ($${Number(p.price || 0).toFixed(2)})`}
                        />
                      ))}
                    </FormGroup>
                  )}
                </Grid>
              </>
            )}
          </>
        )}

        {packageTiers.length > 0 && !isEditing && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Guarda y edita la subcategoría para elegir productos de la canasta surtido.
            </Typography>
          </Grid>
        )}

        <Grid item xs={4}>
          <Button variant="contained" fullWidth type="submit">
            {!isEditing ? "Guardar" : "Editar"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CategoryForm;
