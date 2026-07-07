// ProductForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ImageIcon from "@mui/icons-material/Image";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import {
  Grid,
  TextField,
  Box,
  Button,
  MenuItem,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import Cropper from "react-easy-crop";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import SearchableSelect from "../../../../components/SearchableSelect.jsx";
import {
  getAssignableCategories,
  formatCategoryLabel,
  indexCategories,
} from "../../../../utils/categoryUtils.js";
import {
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  getCategories,
  getUnits,
} from "../../../../api/inventoryControlRequest.js";
import { pathImg } from "../../../../api/axios";
import { useBarcodeScanner } from "../../../../hooks/useBarcodeScanner.js";
import { normalizeProductBarcode, normalizePackageTiers } from "../../../../utils/productLookup.js";

import { mediaStoragePath } from "../../../../utils/mediaPaths.js";

const PRODUCT_NUMERIC_FIELDS = [
  "price",
  "supplierPrice",
  "distributorPrice",
  "netWeight",
  "minStock",
  "stock",
  "standardWeightGrams",
  "taxRate",
];

const PRODUCT_FORM_DEFAULTS = {
  name: "",
  desc: "",
  type: "raw",
  unitId: "",
  categoryId: "",
  barcode: "",
  price: "",
  supplierPrice: "",
  distributorPrice: "",
  netWeight: "",
  minStock: "",
  stock: "",
  standardWeightGrams: "",
  taxRate: "",
};

function toNumOrZero(value) {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickDefaultUnitId(units) {
  if (!Array.isArray(units) || !units.length) return "";
  const byAbbr = units.find(
    (u) => String(u.abbreviation || "").toLowerCase() === "un",
  );
  if (byAbbr) return byAbbr.id;
  const byName = units.find((u) =>
    String(u.name || "").toLowerCase().includes("unidad"),
  );
  return (byName || units[0]).id;
}

/* ============ Helpers de imagen ============ */
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function resolveImageMime(file) {
  if (file?.type && ALLOWED_IMAGE_MIMES.includes(file.type)) return file.type;
  const n = String(file?.name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

function mimeToExt(mime) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

function formatLabel(mime) {
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/gif") return "GIF";
  return "JPEG";
}

async function getCroppedBlob(
  imageSrc,
  cropAreaPixels,
  { targetW, targetH, mime = "image/jpeg", quality = 0.9 } = {}
) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const { x, y, width, height } = cropAreaPixels;

  const canvasCrop = document.createElement("canvas");
  canvasCrop.width = width;
  canvasCrop.height = height;
  const cctx = canvasCrop.getContext("2d");
  cctx.drawImage(img, x, y, width, height, 0, 0, width, height);

  const outW = targetW || width;
  const outH = targetH || height;

  const canvasOut = document.createElement("canvas");
  canvasOut.width = outW;
  canvasOut.height = outH;
  const octx = canvasOut.getContext("2d");
  octx.drawImage(canvasCrop, 0, 0, width, height, 0, 0, outW, outH);

  return new Promise((resolve) => canvasOut.toBlob(resolve, mime, quality));
}

function blobToFile(blob, originalName = "image", mime = "image/jpeg") {
  const base = String(originalName).replace(/\.[^.]+$/, "") || "image";
  return new File([blob], base + mimeToExt(mime), { type: mime });
}

/* ================= CropperDialog ================= */
function CropperDialog({
  open,
  imageSrc,
  onClose,
  onConfirm,
  aspect,
  sourceMime = "image/jpeg",
  sourceFileName = "image",
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);
  const [quality, setQuality] = useState(0.9);
  const [mime, setMime] = useState(sourceMime);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaPixels(null);
      setQuality(0.9);
      setMime(sourceMime);
    }
  }, [open, sourceMime]);

  const onCropComplete = (_, a) => setAreaPixels(a);

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return;
    const blob = await getCroppedBlob(imageSrc, areaPixels, { mime, quality });
    onConfirm(blob, {
      width: areaPixels.width,
      height: areaPixels.height,
      mime,
      quality,
      sizeBytes: blob?.size ?? null,
      sourceFileName,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Recortar imagen</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ position: "relative", height: 420, bgcolor: "#111" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              minZoom={1}
            />
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Zoom
          </Typography>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(_, v) => setZoom(v)}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Formato original: <strong>{formatLabel(mime)}</strong>
          </Typography>

          {(mime === "image/jpeg" || mime === "image/webp") && (
            <TextField
              label="Calidad"
              size="small"
              type="number"
              value={quality}
              onChange={(e) =>
                setQuality(
                  Math.min(1, Math.max(0.1, Number(e.target.value || 0.9)))
                )
              }
              inputProps={{ step: 0.05, min: 0.1, max: 1 }}
              sx={{ width: 160, ml: "auto" }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ===================== FORM DE PRODUCTO ===================== */
function ProductForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm({
    defaultValues: PRODUCT_FORM_DEFAULTS,
  });
  const { toast: toastAuth } = useAuth();
  const [usbScanMode, setUsbScanMode] = useState(false);

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // ------- Reglas Mayoristas -------
  const [wholesaleRules, setWholesaleRules] = useState(() => {
    try {
      if (Array.isArray(datos?.wholesaleRules)) return datos.wholesaleRules;
      if (typeof datos?.wholesaleRules === "string") {
        const parsed = JSON.parse(datos.wholesaleRules);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [packageTiers, setPackageTiers] = useState(() =>
    normalizePackageTiers(datos?.packageTiers),
  );

  const addPackageTier = () =>
    setPackageTiers((prev) => [...prev, { qty: 1, totalPrice: 0 }]);
  const removePackageTier = (idx) =>
    setPackageTiers((prev) => prev.filter((_, i) => i !== idx));
  const updatePackageTier = (idx, key, val) =>
    setPackageTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [key]: val } : t))
    );

  const addTier = () =>
    setWholesaleRules((prev) => [...prev, { minQty: 12, discountPercent: 5 }]);
  const removeTier = (idx) =>
    setWholesaleRules((prev) => prev.filter((_, i) => i !== idx));
  const updateTier = (idx, key, val) =>
    setWholesaleRules((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [key]: val } : t))
    );

  // ------- Imagen -------
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingSourceFile, setPendingSourceFile] = useState(null);
  const [lastMeta, setLastMeta] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const currentImage = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (datos?.primaryImageUrl) return `${pathImg}${datos.primaryImageUrl}`;
    return null;
  }, [previewUrl, datos?.primaryImageUrl]);

  const categoryOptions = useMemo(() => {
    const byId = indexCategories(categories);
    return getAssignableCategories(categories)
      .map((cat) => ({
        ...cat,
        optionLabel: formatCategoryLabel(cat, byId),
      }))
      .sort((a, b) => a.optionLabel.localeCompare(b.optionLabel, "es"));
  }, [categories]);

  const ASPECTS = { "1:1": 1, "4:3": 4 / 3, "16:9": 16 / 9, free: undefined };
  const [aspectKey, setAspectKey] = useState("1:1");

  const handlePickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPendingSourceFile(f);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    const url = URL.createObjectURL(f);
    setImageSrc(url);
    setCropOpen(true);
  };

  const onCropConfirm = async (blob, meta) => {
    const mime = meta?.mime || resolveImageMime(pendingSourceFile);
    const name = meta?.sourceFileName || pendingSourceFile?.name || "image";
    const file = blobToFile(blob, name, mime);
    setSelectedFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    setLastMeta(meta || null);
    setCropOpen(false);
    setPendingSourceFile(null);

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const onCropCancel = () => {
    setCropOpen(false);
    setPendingSourceFile(null);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setLastMeta(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [previewUrl, imageSrc]);

  // ------- cargar datos base -------
  const resetForm = () => reset();

  const loadData = async () => {
    if (!isEditing || !datos) return;

    setValue("name", datos.name || "");
    setValue("desc", datos.desc || "");
    setValue("type", datos.type || "raw");
    setValue("unitId", datos.unitId || "");
    setValue("categoryId", datos.categoryId || "");
    setValue("price", datos.price || 0);
    setValue("supplierPrice", datos.supplierPrice || 0);
    setValue("distributorPrice", datos.distributorPrice || 0);
    setValue("minStock", datos.minStock || 0);
    setValue("stock", datos.stock || 0);
    setValue("netWeight", datos.netWeight || 0);
    setValue("standardWeightGrams", datos.standardWeightGrams || 0);
    setValue("taxRate", datos.taxRate || 0);
    setValue("barcode", normalizeProductBarcode(datos.barcode || ""));

    try {
      if (Array.isArray(datos.wholesaleRules)) {
        setWholesaleRules(datos.wholesaleRules);
      } else if (
        typeof datos.wholesaleRules === "string" &&
        datos.wholesaleRules.trim() !== ""
      ) {
        const parsed = JSON.parse(datos.wholesaleRules);
        setWholesaleRules(Array.isArray(parsed) ? parsed : []);
      } else {
        setWholesaleRules([]);
      }
    } catch (err) {
      console.warn("Error parsing wholesaleRules:", err);
      setWholesaleRules([]);
    }

    setPackageTiers(normalizePackageTiers(datos?.packageTiers));
  };

  const fetchOptions = async () => {
    const { data: catData } = await getCategories();
    const { data: unitData } = await getUnits();
    setCategories(catData);
    setUnits(unitData);
    if (!isEditing) {
      const defaultUnitId = pickDefaultUnitId(unitData);
      if (defaultUnitId) setValue("unitId", defaultUnitId);
    }
  };

  useEffect(() => {
    loadData();
    fetchOptions();
    if (!isEditing && datos?.barcode) {
      setValue("barcode", normalizeProductBarcode(datos.barcode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useBarcodeScanner({
    enabled: usbScanMode,
    onScan: (rawCode) => {
      const code = normalizeProductBarcode(rawCode);
      if (!code) return;
      setValue("barcode", code, { shouldDirty: true });
      setUsbScanMode(false);
      toastAuth({ message: "Código de barras capturado.", variant: "success" });
    },
    ignoreWhenTypingInInputs: !usbScanMode,
  });

  // ------- submit -------
  const submitForm = async (data) => {
    const name = data.name?.trim() || "";
    if (!name) {
      toastAuth({ message: "El nombre es obligatorio.", variant: "error" });
      return;
    }

    const unitId = data.unitId || pickDefaultUnitId(units);
    if (!unitId) {
      toastAuth({
        message: "No hay unidades configuradas en el sistema.",
        variant: "error",
      });
      return;
    }

    const fd = new FormData();

    fd.append("subfolder", mediaStoragePath("products"));

    fd.append("name", name);
    const barcode = normalizeProductBarcode(data.barcode);
    if (barcode) fd.append("barcode", barcode);
    else if (isEditing) fd.append("barcode", "");
    if (data.desc?.trim()) fd.append("desc", data.desc.trim());
    fd.append("type", data.type || "raw");
    fd.append("unitId", String(unitId));
    if (data.categoryId) fd.append("categoryId", String(data.categoryId));

    PRODUCT_NUMERIC_FIELDS.forEach((field) => {
      fd.append(field, String(toNumOrZero(data[field])));
    });
  
    fd.append("wholesaleRules", JSON.stringify(wholesaleRules || []));
    fd.append("packageTiers", JSON.stringify(packageTiers || []));
  
    // ✅ nombre base si subes imagen nueva
    fd.append("customFileName", data.name?.trim() || "producto");
  
    // ✅ archivo al final
    if (selectedFile) {
      fd.append("image", selectedFile, selectedFile.name);
    }

    const promise = isEditing
      ? apiUpdateProduct(datos.id, fd)
      : apiCreateProduct(fd);
  
    return toastAuth({
      promise,
      onSuccess: (result) => {
        if (onClose) onClose();
        if (reload) reload(result?.data);
        reset();
        clearPreview();
        return {
          title: "Producto",
          description: isEditing
            ? "Producto actualizado correctamente"
            : "Producto guardado con éxito",
        };
      },
      onError: (res) => ({
        title: "Producto",
        description: res?.response?.data?.message || "No se pudo guardar",
      }),
    });
  };
  
  

  return (
    <Box
      component="form"
      id="eddeli-product-form"
      sx={{ mt: 0 }}
      onSubmit={(e) => {
        // Evita que el submit burbujee al formulario padre (p. ej. el modal
        // de pedido a proveedor) cuando este form se abre dentro de un Dialog.
        e.stopPropagation();
        handleSubmit(submitForm)(e);
      }}
    >
      <Grid container spacing={1} columnSpacing={1.5}>
        {/* Fila 1: nombre, código, imagen */}
        <Grid item xs={12} md={5}>
          <TextField
            label="Nombre"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            {...register("name")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Código de barras"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            value={watch("barcode") || ""}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            placeholder="Opcional"
            onChange={(e) =>
              setValue("barcode", normalizeProductBarcode(e.target.value), { shouldDirty: true })
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={usbScanMode ? "Lector activo — escanea" : "Activar lector USB"}>
                    <IconButton
                      edge="end"
                      size="small"
                      color={usbScanMode ? "primary" : "default"}
                      onClick={() => {
                        setUsbScanMode((active) => {
                          const next = !active;
                          if (next) {
                            toastAuth({
                              message: "Lector USB activo: escanea el código.",
                              variant: "info",
                            });
                          }
                          return next;
                        });
                      }}
                    >
                      <QrCodeScannerIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ height: "100%", pt: 0.5 }}>
            <Tooltip title="Galería">
              <IconButton component="label" size="small" color={selectedFile || currentImage ? "primary" : "default"}>
                <ImageIcon fontSize="small" />
                <input ref={fileRef} hidden type="file" accept="image/*" onChange={handlePickImage} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cámara">
              <IconButton component="label" size="small" color={selectedFile || currentImage ? "primary" : "default"}>
                <PhotoCameraIcon fontSize="small" />
                <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={handlePickImage} />
              </IconButton>
            </Tooltip>
            {(selectedFile || currentImage) && (
              <Tooltip title="Quitar imagen">
                <IconButton size="small" color="error" onClick={clearPreview}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {currentImage ? (
              <Box
                component="img"
                src={currentImage}
                alt=""
                sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider", ml: 0.5 }}
              />
            ) : null}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descripción"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            {...register("desc")}
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <TextField
            label="Tipo"
            select
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            value={watch("type") ?? "raw"}
            {...register("type")}
          >
            <MenuItem value="raw">Materia prima</MenuItem>
            <MenuItem value="intermediate">Intermedio</MenuItem>
            <MenuItem value="final">Final</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="Unidad"
            select
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            value={watch("unitId") || ""}
            {...register("unitId")}
          >
            {Array.isArray(units) &&
              units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </MenuItem>
              ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <SearchableSelect
            label="Categoría"
            items={categoryOptions}
            value={watch("categoryId") || ""}
            getOptionLabel={(item) => item.optionLabel || item.name || ""}
            onChange={(val) =>
              setValue("categoryId", val, { shouldValidate: true, shouldDirty: true })
            }
            emptyOptionLabel="Sin categoría"
            placeholder="Buscar categoría..."
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <TextField
            label="P. proveedor"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "any", min: 0 }}
            placeholder="0"
            {...register("supplierPrice")}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="P. distribuidor"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "any", min: 0 }}
            placeholder="0"
            {...register("distributorPrice")}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="P. venta"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "any", min: 0 }}
            placeholder="0"
            {...register("price")}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="IVA (%)"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "0.01", min: 0 }}
            placeholder="0"
            helperText="0 = sin IVA · 15 = con IVA"
            {...register("taxRate")}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="Peso neto"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "any", min: 0 }}
            placeholder="0"
            {...register("netWeight")}
          />
        </Grid>

        <Grid item xs={4} sm={3}>
          <TextField
            label="Stock mín."
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ min: 0 }}
            placeholder="0"
            {...register("minStock")}
          />
        </Grid>
        <Grid item xs={4} sm={3}>
          <TextField
            label="Stock actual"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ min: 0 }}
            placeholder="0"
            {...register("stock")}
          />
        </Grid>
        <Grid item xs={4} sm={3}>
          <TextField
            label="Peso prom. (g)"
            type="number"
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            inputProps={{ step: "any", min: 0 }}
            placeholder="0"
            {...register("standardWeightGrams")}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="Recorte"
            select
            size="small"
            fullWidth
            variant="standard"
            margin="dense"
            value={aspectKey}
            onChange={(e) => setAspectKey(e.target.value)}
          >
            <MenuItem value="free">Libre</MenuItem>
            <MenuItem value="1:1">1:1</MenuItem>
            <MenuItem value="4:3">4:3</MenuItem>
            <MenuItem value="16:9">16:9</MenuItem>
          </TextField>
        </Grid>

        {/* Tramos paquete — fila compacta */}
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Tramos paquete
            </Typography>
            <Button variant="text" size="small" sx={{ minWidth: 0, py: 0 }} onClick={addPackageTier}>
              + tramo
            </Button>
            {packageTiers.map((tier, idx) => (
              <Stack
                key={`pkg-${idx}`}
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                }}
              >
                <TextField
                  label="Cant."
                  type="number"
                  size="small"
                  variant="standard"
                  value={tier.qty}
                  onChange={(e) =>
                    updatePackageTier(idx, "qty", Math.max(1, Number(e.target.value || 1)))
                  }
                  sx={{ width: 56, "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
                />
                <TextField
                  label="$ total"
                  type="number"
                  size="small"
                  variant="standard"
                  value={tier.totalPrice}
                  onChange={(e) =>
                    updatePackageTier(idx, "totalPrice", Math.max(0, Number(e.target.value || 0)))
                  }
                  inputProps={{ step: "0.01", min: 0 }}
                  sx={{ width: 72, "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
                />
                <IconButton size="small" color="error" onClick={() => removePackageTier(idx)} sx={{ p: 0.25 }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Grid>

        {/* Mayorista — fila compacta */}
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Mayorista
            </Typography>
            <Button variant="text" size="small" sx={{ minWidth: 0, py: 0 }} onClick={addTier}>
              + tramo
            </Button>
            {wholesaleRules.map((tier, idx) => (
              <Stack
                key={`ws-${idx}`}
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                }}
              >
                <TextField
                  label="Mín."
                  type="number"
                  size="small"
                  variant="standard"
                  value={tier.minQty}
                  onChange={(e) =>
                    updateTier(idx, "minQty", Math.max(1, Number(e.target.value || 1)))
                  }
                  sx={{ width: 56, "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
                />
                <TextField
                  label="% desc."
                  type="number"
                  size="small"
                  variant="standard"
                  value={tier.discountPercent}
                  onChange={(e) =>
                    updateTier(idx, "discountPercent", Math.max(0, Number(e.target.value || 0)))
                  }
                  sx={{ width: 64, "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
                />
                <IconButton size="small" color="error" onClick={() => removeTier(idx)} sx={{ p: 0.25 }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <CropperDialog
        open={cropOpen}
        imageSrc={imageSrc}
        aspect={ASPECTS[aspectKey]}
        sourceMime={resolveImageMime(pendingSourceFile)}
        sourceFileName={pendingSourceFile?.name || "image"}
        onClose={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </Box>
  );
}

export default ProductForm;
