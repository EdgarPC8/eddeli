// StoreForm.jsx
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
} from "@mui/material";
import Cropper from "react-easy-crop";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../../context/AuthContext";
import {
  createStoreRequest,
  updateStoreRequest,
} from "../../../../api/inventoryControlRequest.js";
import { pathImg, buildImageUrl } from "../../../../api/axios";
import { useAppSettings } from "../../../../context/AppSettingsContext.jsx";
import { mediaStoragePath } from "../../../../utils/mediaPaths.js";

/* ============ Helpers de imagen ============ */
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
  const base = originalName.replace(/\.[^.]+$/, "");
  const ext =
    mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  return new File([blob], base + ext, { type: mime });
}

const normalize = (p = "") =>
  String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");

/* ================= CropperDialog ================= */
function CropperDialog({ open, imageSrc, onClose, onConfirm, aspect }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);
  const [quality, setQuality] = useState(0.9);
  const [mime, setMime] = useState("image/jpeg");

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaPixels(null);
      setQuality(0.9);
      setMime("image/jpeg");
    }
  }, [open]);

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setAreaPixels(croppedAreaPixels);
  };

  const handleConfirm = async () => {
    if (!imageSrc) {
      console.error("No hay imagen para recortar");
      return;
    }
    
    // Si no hay areaPixels, usar el área completa de la imagen
    if (!areaPixels) {
      console.warn("No se detectó área de recorte, usando imagen completa");
      // Intentar obtener el área completa
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageSrc;
      });
      
      const fullArea = {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      };
      
      const blob = await getCroppedBlob(imageSrc, fullArea, { mime, quality });
      onConfirm(blob, {
        width: fullArea.width,
        height: fullArea.height,
        mime,
        quality,
        sizeBytes: blob?.size ?? null,
      });
      return;
    }
    
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels, { mime, quality });
      onConfirm(blob, {
        width: areaPixels.width,
        height: areaPixels.height,
        mime,
        quality,
        sizeBytes: blob?.size ?? null,
      });
    } catch (error) {
      console.error("Error al recortar imagen:", error);
      alert("Error al procesar la imagen. Por favor, intenta de nuevo.");
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: {
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          m: 2
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <Typography variant="h6" component="div">
          Recortar imagen
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button 
            onClick={onClose} 
            color="inherit"
            size="small"
            sx={{ minWidth: 80 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            disabled={!imageSrc}
            size="small"
            sx={{ minWidth: 80 }}
            color="primary"
          >
            Aplicar
          </Button>
        </Stack>
      </Box>
      <DialogContent 
        dividers 
        sx={{ 
          flex: '1 1 auto',
          overflow: 'auto',
          minHeight: 0,
          py: 1.5,
          px: 2
        }}
      >
        <Box sx={{ position: "relative", height: 280, maxHeight: '40vh', bgcolor: "#111", borderRadius: 1, overflow: "hidden" }}>
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

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Zoom
          </Typography>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(_, v) => setZoom(v)}
            sx={{ py: 0 }}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
          <TextField
            label="Formato"
            size="small"
            select
            value={mime}
            onChange={(e) => setMime(e.target.value)}
            sx={{ width: 120 }}
          >
            <MenuItem value="image/jpeg">JPG</MenuItem>
            <MenuItem value="image/png">PNG</MenuItem>
            <MenuItem value="image/webp">WEBP</MenuItem>
          </TextField>

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
            sx={{ width: 100 }}
          />
        </Stack>
        
        {!areaPixels && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            💡 Mueve o ajusta el zoom para definir el área de recorte
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ===================== FORM DE STORE ===================== */
function StoreForm({ isEditing = false, datos = {}, onClose, reload }) {
  const { handleSubmit, register, reset, setValue, watch } = useForm();
  const { toast: toastAuth } = useAuth();
  const { activeApp } = useAppSettings();
  const defaultStoresFolder = mediaStoragePath("stores");

  // ------- Imagen -------
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [lastMeta, setLastMeta] = useState(null);
  const fileRef = useRef(null);

  const [imageSubfolder, setImageSubfolder] = useState(defaultStoresFolder);

  const currentImage = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (datos?.imageUrl) return buildImageUrl(datos.imageUrl);
    return null;
  }, [previewUrl, datos?.imageUrl]);

  const ASPECTS = { "1:1": 1, "4:3": 4 / 3, "16:9": 16 / 9, free: undefined };
  const [aspectKey, setAspectKey] = useState("16:9");

  const chooseFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImageSrc(url);
    setCropOpen(true);
    e.target.value = "";
  };

  const onCropConfirm = async (blob, meta) => {
    const file = blobToFile(blob, "store", meta?.mime || "image/jpeg");
    setSelectedFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    setLastMeta(meta || null);
    setCropOpen(false);

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const onCropCancel = () => {
    setCropOpen(false);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setLastMeta(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [previewUrl, imageSrc]);

  // ------- cargar datos base -------
  const loadData = async () => {
    if (!isEditing || !datos) return;

    setValue("name", datos.name || "");
    setValue("address", datos.address || "");
    setValue("description", datos.description || "");
    setValue("phone", datos.phone || "");
    setValue("email", datos.email || "");
    setValue("city", datos.city || "");
    setValue("province", datos.province || "");
    setValue("position", datos.position ?? 0);
    setValue("isActive", String(datos.isActive ?? true) ? "true" : "false");

    const prefix = activeApp.mediaFolderPrefix || "sistema";
    if (datos?.imageUrl?.includes("/")) {
      const parts = String(datos.imageUrl).split("/");
      parts.pop();
      const folderFull = parts.join("/") || prefix;
      setImageSubfolder(folderFull);
    } else {
      setImageSubfolder(defaultStoresFolder);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- submit -------
  const submitForm = async (data) => {
    const fd = new FormData();

    // Enviar primero subfolder y customFileName para que el backend los use al guardar la imagen
    const subfolder = normalize(imageSubfolder) || defaultStoresFolder;
    fd.append("subfolder", subfolder);

    // campos
    fd.append("name", data.name?.trim() || "");
    fd.append("address", data.address?.trim() || "");
    if (data.description) fd.append("description", data.description);
    if (data.phone) fd.append("phone", data.phone);
    if (data.email) fd.append("email", data.email);
    if (data.city) fd.append("city", data.city);
    if (data.province) fd.append("province", data.province);
    fd.append("position", String(data.position ?? 0));
    fd.append("isActive", String(data.isActive) === "true" ? "true" : "false");

    // nombre base (si subes imagen nueva)
    fd.append("customFileName", data.name?.trim() || "store");

    // archivo
    if (selectedFile) {
      fd.append("image", selectedFile, selectedFile.name);
    }

    /**
     * ✅ CLAVE (idéntico a Products):
     * Si NO subiste imagen nueva pero cambiaste carpeta,
     * manda imageUrl nuevo para que backend mueva el archivo.
     */
    if (isEditing && !selectedFile) {
      const oldRel = normalize(datos?.imageUrl || "");
      const fileName = oldRel.split("/").pop(); // "logo.jpg"
      const newRel = subfolder ? `${subfolder}/${fileName}` : fileName;

      if (oldRel && newRel && newRel !== oldRel) {
        // moveImage no es obligatorio si tu backend compara imageUrl,
        // pero lo mandamos por compatibilidad
        fd.append("moveImage", "1");
        fd.append("imageUrl", newRel); // ✅ el backend usa esto para mover + guardar
      }
    }

    const promise = isEditing
      ? updateStoreRequest(datos.id, fd)
      : createStoreRequest(fd);

    return toastAuth({
      promise,
      onSuccess: () => {
        if (onClose) onClose();
        if (reload) reload();
        reset();
        clearPreview();
        return {
          title: "Punto de venta",
          description: isEditing
            ? "Actualizado correctamente"
            : "Guardado con éxito",
        };
      },
      onError: (res) => ({
        title: "Punto de venta",
        description: res?.response?.data?.message || "No se pudo guardar",
      }),
    });
  };

  return (
    <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit(submitForm)}>
      <Grid container spacing={2}>
        {/* Campos */}
        <Grid item xs={12}>
          <TextField
            label="Nombre"
            fullWidth
            variant="standard"
            {...register("name", { required: true })}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Dirección"
            fullWidth
            variant="standard"
            {...register("address", { required: true })}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            multiline
            rows={3}
            label="Descripción"
            fullWidth
            variant="standard"
            {...register("description")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono"
            fullWidth
            variant="standard"
            {...register("phone")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Email"
            fullWidth
            variant="standard"
            {...register("email")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Ciudad"
            fullWidth
            variant="standard"
            {...register("city")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Provincia"
            fullWidth
            variant="standard"
            {...register("province")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Posición"
            type="number"
            fullWidth
            variant="standard"
            {...register("position")}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Activo"
            select
            fullWidth
            variant="standard"
            value={watch("isActive") ?? "true"}
            {...register("isActive")}
          >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </Grid>

        {/* Imagen */}
        <Grid item xs={12}>
          <Stack spacing={1}>
            <TextField
              label='Carpeta destino (ej: "sistema/stores")'
              size="small"
              fullWidth
              variant="standard"
              value={imageSubfolder}
              onChange={(e) => setImageSubfolder(e.target.value)}
              placeholder="Ej: sistema/stores"
              helperText='No pongas ".." ni rutas raras.'
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
            >
              <Button variant="outlined" onClick={chooseFile}>
                {currentImage ? "Cambiar imagen…" : "Elegir imagen…"}
              </Button>

              <TextField
                label="Relación de aspecto"
                value={aspectKey}
                onChange={(e) => setAspectKey(e.target.value)}
                select
                size="small"
                sx={{ width: 220 }}
              >
                <MenuItem value="free">Libre</MenuItem>
                <MenuItem value="1:1">1:1</MenuItem>
                <MenuItem value="4:3">4:3</MenuItem>
                <MenuItem value="16:9">16:9</MenuItem>
              </TextField>
            </Stack>

            <input
              type="file"
              accept="image/*"
              hidden
              ref={fileRef}
              onChange={onFileChange}
            />

            {currentImage && (
              <Box
                sx={{
                  mt: 1,
                  border: "1px dashed",
                  borderColor: "divider",
                  p: 1,
                  borderRadius: 1,
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <img
                  src={currentImage}
                  alt="preview"
                  style={{
                    width: 140,
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile ? "Vista previa (recortada)" : "Imagen actual"}
                  </Typography>
                  {lastMeta && (
                    <Typography variant="caption" color="text.secondary">
                      {lastMeta.width}×{lastMeta.height}px ·{" "}
                      {((lastMeta.sizeBytes || 0) / (1024 * 1024)).toFixed(2)}{" "}
                      MB · {lastMeta.mime}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </Grid>

        {/* Botón Guardar */}
        <Grid item xs={12} sm={4}>
          <Button variant="contained" fullWidth type="submit">
            {!isEditing ? "Guardar" : "Editar"}
          </Button>
        </Grid>
      </Grid>

      <CropperDialog
        open={cropOpen}
        imageSrc={imageSrc}
        aspect={ASPECTS[aspectKey]}
        onClose={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </Box>
  );
}

export default StoreForm;
