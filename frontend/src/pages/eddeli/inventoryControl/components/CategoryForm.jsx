import {
  Grid,
  TextField,
  Box,
  Button,
  FormControlLabel,
  Switch,
  Stack,
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
} from "../../../../api/inventoryControlRequest";
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
  onSaved,
}) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: { isPublic: true },
  });
  const idData = datos?.id;
  const { toast: toastAuth } = useAuth();

  const [categoryKind, setCategoryKind] = useState(() =>
    datos?.parentId || presetParentId ? "child" : "root",
  );
  const [parentId, setParentId] = useState(() =>
    datos?.parentId ? String(datos.parentId) : presetParentId ? String(presetParentId) : "",
  );

  const rootCategories = useMemo(() => getRootCategories(allCategories), [allCategories]);
  const editingHasChildren = isEditing && hasChildCategories(allCategories, datos?.id);
  const lockAsChild = isEditing && Boolean(datos?.parentId);

  const resetForm = () => {
    reset();
    setCategoryKind(presetParentId ? "child" : "root");
    setParentId(presetParentId ? String(presetParentId) : "");
  };

  const submitForm = async (formData) => {
    if (categoryKind === "child" && !parentId) {
      toastAuth({
        message: "Selecciona la categoría padre de la subcategoría.",
        variant: "error",
      });
      return;
    }

    const payload = {
      ...formData,
      isPublic: Boolean(formData.isPublic),
      parentId: categoryKind === "child" && parentId ? Number(parentId) : null,
    };

    const savedParentId =
      categoryKind === "child" && parentId ? Number(parentId) : null;

    const afterSave = async () => {
      resetForm();
      if (reload) await reload();
      if (onSaved) onSaved({ parentId: savedParentId });
      if (onClose) onClose();
    };

    try {
      if (isEditing) {
        await toastAuth({
          promise: updateCategoryRequest(datos.id, payload),
          onSuccess: afterSave,
        });
        return;
      }

      await toastAuth({
        promise: createCategoryRequest(payload),
        successMessage: "Categoría guardada con éxito",
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
      setValue("isPublic", Boolean(datos.isPublic));
      setCategoryKind(datos.parentId ? "child" : "root");
      setParentId(datos.parentId ? String(datos.parentId) : "");
    } else {
      setValue("isPublic", true);
      setCategoryKind(presetParentId ? "child" : "root");
      setParentId(presetParentId ? String(presetParentId) : "");
    }
  };

  useEffect(() => {
    loadData();
  }, [isEditing, datos, presetParentId]);

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl component="fieldset" disabled={lockAsChild}>
            <FormLabel component="legend">Tipo</FormLabel>
            <RadioGroup
              row
              value={categoryKind}
              onChange={(e) => {
                const kind = e.target.value;
                setCategoryKind(kind);
                if (kind === "root") setParentId("");
              }}
            >
              <FormControlLabel
                value="root"
                control={<Radio />}
                label="Categoría principal"
                disabled={lockAsChild || (isEditing && editingHasChildren)}
              />
              <FormControlLabel value="child" control={<Radio />} label="Subcategoría" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {categoryKind === "child" && (
          <Grid item xs={12}>
            <TextField
              select
              label="Categoría padre"
              fullWidth
              required
              variant="standard"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={lockAsChild}
            >
              {rootCategories.map((cat) => (
                <MenuItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField
            label="Nombre"
            fullWidth
            required
            variant="standard"
            {...register("name", { required: true })}
            InputLabelProps={idData ? { shrink: true } : {}}
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
                checked={Boolean(watch("isPublic"))}
                onChange={(e) => setValue("isPublic", e.target.checked)}
              />
            }
            label="Visible al público"
          />
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {onClose && (
              <Button onClick={onClose} color="inherit">
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="contained">
              {isEditing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CategoryForm;
