// ProductForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Cropper from "react-easy-crop";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import {
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  getCategories,
  getUnits,
} from "../../../../api/inventoryControlRequest.js";
import { pathImg } from "../../../../api/axios";

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
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const { toast: toastAuth } = useAuth();

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

  const [packageTiers, setPackageTiers] = useState(() => {
    try {
      if (Array.isArray(datos?.packageTiers)) return datos.packageTiers;
      if (typeof datos?.packageTiers === "string") {
        const parsed = JSON.parse(datos.packageTiers);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

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

  // ✅ Input manual: el usuario puede escribir "EdDeli", "EdDeli/products", "EdDeli/products/donas"
  // El submit lo normaliza para mandar "subfolder" correcto al middleware.
  const [imageSubfolder, setImageSubfolder] = useState("EdDeli/products");

  const currentImage = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (datos?.primaryImageUrl) return `${pathImg}${datos.primaryImageUrl}`;
    return null;
  }, [previewUrl, datos?.primaryImageUrl]);

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
    setValue("distributorPrice", datos.distributorPrice || 0);
    setValue("minStock", datos.minStock || 0);
    setValue("stock", datos.stock || 0);
    setValue("netWeight", datos.netWeight || 0);
    setValue("standardWeightGrams", datos.standardWeightGrams || 0);

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

    try {
      if (Array.isArray(datos.packageTiers)) {
        setPackageTiers(datos.packageTiers);
      } else if (
        typeof datos.packageTiers === "string" &&
        datos.packageTiers.trim() !== ""
      ) {
        const parsed = JSON.parse(datos.packageTiers);
        setPackageTiers(Array.isArray(parsed) ? parsed : []);
      } else {
        setPackageTiers([]);
      }
    } catch (err) {
      console.warn("Error parsing packageTiers:", err);
      setPackageTiers([]);
    }

    // ✅ sugerir la carpeta a partir de la ruta guardada
    // primaryImageUrl: "EdDeli/products/dona.png" => input "EdDeli/products"
    if (datos?.primaryImageUrl?.startsWith("EdDeli/")) {
      const parts = datos.primaryImageUrl.split("/");
      parts.pop(); // quita el archivo
      const folderFull = parts.join("/") || "EdDeli";
      setImageSubfolder(folderFull);
    } else {
      // default si no hay imagen previa
      setImageSubfolder("EdDeli/products");
    }
  };

  const fetchOptions = async () => {
    const { data: catData } = await getCategories();
    const { data: unitData } = await getUnits();
    setCategories(catData);
    setUnits(unitData);
  };

  useEffect(() => {
    loadData();
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- submit -------
  const submitForm = async (data) => {
    const fd = new FormData();
  
    // ✅ normaliza subfolder
    const subfolder = String(imageSubfolder || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/\/{2,}/g, "/");
  
    fd.append("subfolder", subfolder);
  
    // ✅ campos
    fd.append("name", data.name?.trim() || "");
    if (data.desc) fd.append("desc", data.desc);
    fd.append("type", data.type || "raw");
    fd.append("unitId", String(data.unitId || ""));
    if (data.categoryId) fd.append("categoryId", String(data.categoryId));
    if (data.price != null) fd.append("price", String(data.price));
    if (data.distributorPrice != null)
      fd.append("distributorPrice", String(data.distributorPrice));
    if (data.netWeight != null) fd.append("netWeight", String(data.netWeight));
    if (data.minStock != null) fd.append("minStock", String(data.minStock));
    if (data.stock != null) fd.append("stock", String(data.stock));
    if (data.standardWeightGrams != null)
      fd.append("standardWeightGrams", String(data.standardWeightGrams));
  
    fd.append("wholesaleRules", JSON.stringify(wholesaleRules || []));
    fd.append("packageTiers", JSON.stringify(packageTiers || []));
  
    // ✅ nombre base si subes imagen nueva
    fd.append("customFileName", data.name?.trim() || "producto");
  
    // ✅ archivo al final
    if (selectedFile) {
      fd.append("image", selectedFile, selectedFile.name);
    }
  
    /**
     * ✅ CLAVE: si NO subiste imagen nueva pero cambiaste la carpeta,
     * manda primaryImageUrl y moveImage=1 para que backend mueva el archivo.
     */
    if (isEditing && !selectedFile) {
      const oldRel = String(datos?.primaryImageUrl || "").replace(/\\/g, "/").trim();
  
      // saca filename de la imagen actual
      const fileName = oldRel.split("/").pop(); // "old.jpg"
  
      // construye la nueva ruta completa en BD: "<subfolder>/<filename>"
      const newRel = subfolder ? `${subfolder}/${fileName}` : fileName;
  
      // solo si realmente cambió
      if (oldRel && newRel && newRel !== oldRel) {
        fd.append("moveImage", "1");
        fd.append("primaryImageUrl", newRel); // ✅ lo que el backend usará para mover + guardar
      }
    }
  
    const promise = isEditing
      ? apiUpdateProduct(datos.id, fd)
      : apiCreateProduct(fd);
  
    return toastAuth({
      promise,
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
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
      onSubmit={handleSubmit(submitForm)}
    >
      <Grid container spacing={2}>
        {/* Campos principales */}
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              label="Nombre"
              fullWidth
              variant="standard"
              sx={{ flex: 1 }}
              {...register("name", { required: true })}
            />
            <Stack direction="row" spacing={0.25} sx={{ pt: 0.25, flexShrink: 0 }}>
              <Tooltip title="Elegir imagen de la galería y recortar">
                <IconButton
                  component="label"
                  size="small"
                  color={selectedFile || currentImage ? "primary" : "default"}
                  aria-label="Elegir imagen"
                >
                  <ImageIcon />
                  <input
                    ref={fileRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={handlePickImage}
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title="Tomar foto con la cámara del dispositivo">
                <IconButton
                  component="label"
                  size="small"
                  color={selectedFile || currentImage ? "primary" : "default"}
                  aria-label="Tomar foto"
                >
                  <PhotoCameraIcon />
                  <input
                    ref={cameraRef}
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePickImage}
                  />
                </IconButton>
              </Tooltip>
              {(selectedFile || currentImage) && (
                <Tooltip title="Quitar imagen seleccionada">
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Quitar imagen"
                    onClick={clearPreview}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
          {currentImage ? (
            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="img"
                src={currentImage}
                alt="Vista previa"
                sx={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: "divider",
                }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {selectedFile ? "Nueva imagen (se sube al guardar)" : "Imagen actual del producto"}
                </Typography>
                {lastMeta ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {lastMeta.width}×{lastMeta.height}px ·{" "}
                    {((lastMeta.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ) : null}
        </Grid>

        <Grid item xs={12}>
          <TextField
            multiline
            rows={3}
            label="Descripción"
            fullWidth
            variant="standard"
            {...register("desc")}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Tipo"
            select
            fullWidth
            variant="standard"
            value={watch("type") ?? "raw"}
            {...register("type", { required: true })}
          >
            <MenuItem value="raw">Materia Prima</MenuItem>
            <MenuItem value="intermediate">Producto Intermedio</MenuItem>
            <MenuItem value="final">Producto Final</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Unidad"
            select
            fullWidth
            variant="standard"
            value={watch("unitId") || ""}
            {...register("unitId", { required: true })}
          >
            {Array.isArray(units) &&
              units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </MenuItem>
              ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Categoría"
            select
            fullWidth
            variant="standard"
            value={watch("categoryId") || ""}
            {...register("categoryId", { required: true })}
          >
            {Array.isArray(categories) &&
              categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            label="Precio"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any" }}
            {...register("price", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            label="Peso Neto"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any" }}
            {...register("netWeight", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            label="Stock mínimo"
            type="number"
            fullWidth
            variant="standard"
            {...register("minStock", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            label="Stock actual"
            type="number"
            fullWidth
            variant="standard"
            {...register("stock", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Precio Distribuidor"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any" }}
            {...register("distributorPrice", { required: true })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Peso promedio por unidad (g)"
            type="number"
            fullWidth
            variant="standard"
            inputProps={{ step: "any", min: 0 }}
            {...register("standardWeightGrams", { required: true })}
          />
        </Grid>

        {/* Precios por tramo / paquete (opcional) */}
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle2">Precios por tramo (paquetes)</Typography>
            <Button variant="outlined" size="small" onClick={addPackageTier}>
              Añadir tramo
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Opcional. Solo para productos como pan: 1=$0.15, 2=$0.25, 4=$0.50… Caja combina
            tramos automáticamente. Si configuras tramos, tienen prioridad sobre mayoreo.
          </Typography>
        </Grid>

        {packageTiers.map((tier, idx) => (
          <Grid key={`pkg-${idx}`} item xs={12} sm={6} md={4}>
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
                    Math.max(0, Number(e.target.value || 0))
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

        {/* Reglas Mayoristas */}
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2">Reglas Mayoristas</Typography>
            <Button variant="outlined" size="small" onClick={addTier}>
              Añadir tramo
            </Button>
          </Stack>
        </Grid>

        {wholesaleRules.map((tier, idx) => (
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
                  updateTier(
                    idx,
                    "minQty",
                    Math.max(1, Number(e.target.value || 1))
                  )
                }
              />
              <TextField
                label="Descuento %"
                type="number"
                size="small"
                value={tier.discountPercent}
                onChange={(e) =>
                  updateTier(
                    idx,
                    "discountPercent",
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

        {/* Imagen — carpeta destino y proporción de recorte */}
        <Grid item xs={12}>
          <Stack spacing={1}>
            <TextField
              label='Carpeta destino (ej: "EdDeli/products")'
              size="small"
              fullWidth
              variant="standard"
              value={imageSubfolder}
              onChange={(e) => setImageSubfolder(e.target.value)}
              placeholder="EdDeli/products"
              helperText="Ruta donde se guardará la imagen en el servidor."
            />
            <TextField
              label="Relación de aspecto al recortar"
              value={aspectKey}
              onChange={(e) => setAspectKey(e.target.value)}
              select
              size="small"
              sx={{ maxWidth: 220 }}
            >
              <MenuItem value="free">Libre</MenuItem>
              <MenuItem value="1:1">1:1</MenuItem>
              <MenuItem value="4:3">4:3</MenuItem>
              <MenuItem value="16:9">16:9</MenuItem>
            </TextField>
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
