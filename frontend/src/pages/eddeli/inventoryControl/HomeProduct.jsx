import {
    Container,
    IconButton,
    Button,
    Tooltip,
    TextField,
    DialogContent,
    DialogActions,
    MenuItem,
    FormControlLabel,
    Switch,
    Stack,
    Box,
    Typography,
    Slider,
    Dialog,
    DialogTitle,
  } from "@mui/material";
  import { useEffect, useMemo, useState, useRef } from "react";
  import { Add, Edit, Delete } from "@mui/icons-material";
  import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
  import TablePro from "../../../components/Tables/TablePro";
  import {
    getHomeProductsRequest,
    createHomeProductRequest,
    updateHomeProductRequest,
    deleteHomeProductRequest,
    getAllProductsAll,
  } from "../../../api/inventoryControlRequest";
  import { pathImg } from "../../../api/axios";
  import { useAuth } from "../../../context/AuthContext";
  import Cropper from "react-easy-crop";
  
  /* ===========================
     Helpers de imagen / crop
  =========================== */
  
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

  // Canvas a partir del área de recorte del cropper, luego escala a tamaño final
  async function getCroppedBlob(imageSrc, cropAreaPixels, {
    targetW = 800,
    targetH = 800,
    mime = "image/jpeg",
    quality = 0.9,
  } = {}) {
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
  
    const canvasOut = document.createElement("canvas");
    canvasOut.width = targetW;
    canvasOut.height = targetH;
    const octx = canvasOut.getContext("2d");
    octx.drawImage(canvasCrop, 0, 0, width, height, 0, 0, targetW, targetH);
  
    return new Promise((resolve) => canvasOut.toBlob(resolve, mime, quality));
  }
  
  function blobToFile(blob, originalName = "image", mime = "image/jpeg") {
    const base = String(originalName).replace(/\.[^.]+$/, "") || "image";
    return new File([blob], base + mimeToExt(mime), { type: mime });
  }
  
  /* ===========================
     CropperDialog (modal)
  =========================== */
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
  
    // Controles de salida
    const PRESETS = [
      { k: "original", label: "Original (máx. del recorte)" },
      { k: "1080", label: "Ancho 1080 (auto alto)" },
      { k: "1280x720", label: "1280 × 720" },
      { k: "800", label: "Ancho 800 (auto alto)" },
      { k: "custom", label: "Personalizado" },
    ];
    const [sizeMode, setSizeMode] = useState("original");
    const [customW, setCustomW] = useState("");
    const [customH, setCustomH] = useState("");
    const [quality, setQuality] = useState(0.9);
    const [mime, setMime] = useState(sourceMime);
    const [estimateMB, setEstimateMB] = useState(null);
    const [estimateWH, setEstimateWH] = useState(null);

    useEffect(() => {
      if (open) {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setAreaPixels(null);
        setSizeMode("original");
        setCustomW("");
        setCustomH("");
        setQuality(0.9);
        setMime(sourceMime);
        setEstimateMB(null);
        setEstimateWH(null);
      }
    }, [open, sourceMime]);
  
    const onCropComplete = (_, croppedAreaPixels) => setAreaPixels(croppedAreaPixels);
  
    // Calcula ancho/alto objetivo según sizeMode y el recorte real
    const getTargetSize = () => {
      if (!areaPixels) return { w: null, h: null };
      const { width, height } = areaPixels;
  
      if (sizeMode === "original") return { w: Math.round(width), h: Math.round(height) };
      if (sizeMode === "1080") {
        const scale = 1080 / width;
        return { w: 1080, h: Math.round(height * scale) };
      }
      if (sizeMode === "800") {
        const scale = 800 / width;
        return { w: 800, h: Math.round(height * scale) };
      }
      if (sizeMode === "1280x720") return { w: 1280, h: 720 };
  
      // custom
      const w = Number(customW) || null;
      const h = Number(customH) || null;
      // Si ponen solo uno, calculamos el otro proporcional
      if (w && !h) {
        const scale = w / width;
        return { w, h: Math.round(height * scale) };
      }
      if (!w && h) {
        const scale = h / height;
        return { w: Math.round(width * scale), h };
      }
      return { w: w || Math.round(width), h: h || Math.round(height) };
    };
  
    // Estimar tamaño (MB) generando un blob temporal (no se guarda)
    const handleEstimate = async () => {
      if (!imageSrc || !areaPixels) return;
      const { w, h } = getTargetSize();
      const blob = await getCroppedBlob(imageSrc, areaPixels, {
        targetW: w,
        targetH: h,
        mime,
        quality,
      });
      if (!blob) return;
      setEstimateMB((blob.size / (1024 * 1024)).toFixed(2));
      setEstimateWH({ w, h });
    };
  
    const handleConfirm = async () => {
      if (!imageSrc || !areaPixels) return;
      const { w, h } = getTargetSize();
      const blob = await getCroppedBlob(imageSrc, areaPixels, {
        targetW: w,
        targetH: h,
        mime,
        quality,
      });
      // devolvemos también metadatos para que el padre muestre info
      onConfirm(blob, {
        width: w,
        height: h,
        mime,
        quality,
        sizeBytes: blob?.size ?? null,
        sourceFileName,
      });
    };
  
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Recortar imagen</DialogTitle>
  
        <Box sx={{ px: 3, pt: 1, display: "grid", gridTemplateColumns: "1fr", gap: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Arrastra para mover. En modo libre puedes redimensionar las esquinas.
          </Typography>
        </Box>
  
        <Box
  sx={{
    position: "relative",
    height: "70vh",          // alto relativo a la ventana
    maxHeight: 800,          // tope opcional
    minHeight: 480,          // mínimo cómodo
    backgroundColor: "#111",
  }}
>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}           // undefined => libre
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
              objectFit="contain"       // ayuda a visualizar el total a zoom=1
              minZoom={1}               // react-easy-crop requiere >= 1
            />
          )}
        </Box>
  
        {/* Controles */}
        <Box sx={{ px: 3, pt: 2, display: "grid", gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Zoom</Typography>
            <Slider min={1} max={3} step={0.01} value={zoom} onChange={(_, v) => setZoom(v)} />
          </Box>
  
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle2">Tamaño de salida</Typography>
            <TextField
              label="Modo de tamaño"
              value={sizeMode}
              onChange={(e) => setSizeMode(e.target.value)}
              select
              fullWidth
            >
              {PRESETS.map((p) => (
                <MenuItem key={p.k} value={p.k}>{p.label}</MenuItem>
              ))}
            </TextField>
  
            {sizeMode === "custom" && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Ancho (px)"
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  placeholder="ej: 1600"
                />
                <TextField
                  label="Alto (px)"
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  placeholder="ej: 1200"
                />
              </Box>
            )}
          </Box>
  
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle2">Formato y calidad</Typography>
            <Typography variant="body2" color="text.secondary">
              Formato original: <strong>{formatLabel(mime)}</strong>
            </Typography>

            {(mime === "image/jpeg" || mime === "image/webp") && (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Calidad ({Math.round(quality * 100)}%)
                </Typography>
                <Slider min={0.5} max={1} step={0.01} value={quality} onChange={(_, v) => setQuality(v)} />
              </Box>
            )}
          </Box>
  
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" onClick={handleEstimate}>Estimar tamaño</Button>
            {estimateMB && estimateWH && (
              <Typography variant="body2" color="text.secondary">
                Estimado: {estimateMB} MB — {estimateWH.w}×{estimateWH.h}px
              </Typography>
            )}
          </Stack>
        </Box>
  
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirm}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  
  /* ===========================
     Formulario (usa cropper)
  =========================== */
  const SECTION_OPTIONS = [
    { value: "home", label: "Portada" },
    { value: "offers", label: "Ofertas" },
    { value: "recommended", label: "Recomendados" },
    { value: "new", label: "Nuevos" },
  ];
  function HomeProductForm({ value, onChange, productOptions }) {
    const set = (k, v) => onChange({ ...value, [k]: v });
  
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
  
    const [cropOpen, setCropOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [pendingSourceFile, setPendingSourceFile] = useState(null);
    const [aspectKey, setAspectKey] = useState("1:1"); // default
  
    const ASPECTS = {
      "1:1": 1,
      "4:3": 4 / 3,
      "16:9": 16 / 9,
      "free": undefined, // 👈 libre
    };
  
    const fileRef = useRef(null);
    const handleChooseFile = () => fileRef.current?.click();
  
    const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPendingSourceFile(file);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setCropOpen(true);
      e.target.value = "";
    };
  
    // Guardamos también metadatos del recorte para mostrar tamaño/peso
    const [lastMeta, setLastMeta] = useState(null);
  
    const handleCropConfirm = async (blob, meta) => {
      const mime = meta?.mime || resolveImageMime(pendingSourceFile);
      const name = meta?.sourceFileName || pendingSourceFile?.name || "image";
      const file = blobToFile(blob, name, mime);
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      set("imageFile", file);
      setCropOpen(false);
      setPendingSourceFile(null);
      setLastMeta(meta || null);
  
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    };
  
    const handleCropCancel = () => {
      setCropOpen(false);
      setPendingSourceFile(null);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    };
  
    useEffect(() => {
      return () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (imageSrc) URL.revokeObjectURL(imageSrc);
      };
    }, [previewUrl, imageSrc]);
  
    const previewSrc = previewUrl || (value.imageUrl ? `${pathImg}${value.imageUrl}` : null);
  
    const finalProducts = useMemo(
      () => (Array.isArray(productOptions) ? productOptions.filter((p) => p.type === "final") : []),
      [productOptions]
    );
  
    return (
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* ... (campos existentes sin cambios) ... */}
          <TextField
            label="Nombre (visible)"
            value={value.name || ""}
            onChange={(e) => set("name", e.target.value)}
            required
            fullWidth
          />
  
          <TextField
            label="Descripción"
            value={value.description || ""}
            onChange={(e) => set("description", e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
  
          <TextField
            label="Producto del catálogo (opcional)"
            value={value.productId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set("productId", v === "" ? null : Number(v));
            }}
            select
            fullWidth
          >
            <MenuItem value="">(Sin producto)</MenuItem>
            {finalProducts.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
  
          <TextField
            label="Nombre de archivo (opcional)"
            placeholder="ej: sandwich-jamon"
            value={value.customFileName || ""}
            onChange={(e) => set("customFileName", e.target.value)}
            helperText="Se usará como base; el backend agregará sufijo/ext."
            fullWidth
          />
  
          <TextField
            label="Relación de aspecto"
            value={aspectKey}
            onChange={(e) => setAspectKey(e.target.value)}
            select
            fullWidth
          >
            <MenuItem value="free">Personalizado / libre</MenuItem>
            {Object.keys(ASPECTS).filter(k => k !== "free").map((k) => (
              <MenuItem key={k} value={k}>{k}</MenuItem>
            ))}
          </TextField>
  
          <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleFileChange} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <Button onClick={handleChooseFile} variant="outlined">
              {value.imageUrl ? "Cambiar imagen…" : "Elegir imagen…"}
            </Button>
            {!!selectedFile && (
              <Typography variant="body2" color="text.secondary">
                {selectedFile.name}
              </Typography>
            )}
          </Stack>
  
          {previewSrc ? (
            <Box
              sx={{
                mt: 1,
                border: "1px dashed",
                borderColor: "divider",
                p: 1,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <img
                src={previewSrc}
                alt="preview"
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
              />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {selectedFile ? "Vista previa (recortada)" : "Imagen actual"}
                </Typography>
                {lastMeta && (
                  <Typography variant="caption" color="text.secondary">
                    {lastMeta.width}×{lastMeta.height}px · {(lastMeta.sizeBytes/(1024*1024)).toFixed(2)} MB · {lastMeta.mime} · Calidad {Math.round((lastMeta.quality||0.9)*100)}%
                  </Typography>
                )}
              </Box>
            </Box>
          ) : null}
  
          {/* ... (resto de tus campos) ... */}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Sección"
              value={value.section || "home"}
              onChange={(e) => set("section", e.target.value)}
              select
              fullWidth
            >
              {SECTION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
  
            <TextField
              label="Etiqueta (badge)"
              value={value.badge || ""}
              onChange={(e) => set("badge", e.target.value)}
              placeholder="Ej: Promo, -20%, Nuevo"
              fullWidth
            />
          </Stack>
  
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Posición"
              type="number"
              value={value.position ?? 0}
              onChange={(e) => set("position", Number(e.target.value))}
              fullWidth
            />
            <TextField
              label="Precio (override)"
              type="number"
              value={value.priceOverride ?? ""}
              onChange={(e) =>
                set("priceOverride", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="Opcional"
              fullWidth
            />
          </Stack>
  
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value.isActive)}
                onChange={(e) => set("isActive", e.target.checked)}
              />
            }
            label="Activo (visible en el home)"
          />
        </Stack>
  
        {/* Modal del cropper */}
        <CropperDialog
          open={cropOpen}
          imageSrc={imageSrc}
          aspect={ASPECTS[aspectKey]}
          sourceMime={resolveImageMime(pendingSourceFile)}
          sourceFileName={pendingSourceFile?.name || "image"}
          onClose={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      </DialogContent>
    );
  }
  
  

  /* ===========================
     Página principal
  =========================== */
  function HomeProductPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast: toastAuth } = useAuth();
  
    const [products, setProducts] = useState([]);
  
    const [openDelete, setOpenDelete] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);
  
    const [openForm, setOpenForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formValue, setFormValue] = useState({
      name: "",
      description: "",
      imageUrl: "",
      section: "home",
      badge: "",
      position: 0,
      priceOverride: null,
      productId: null,
      isActive: true,
      imageFile: null,
      customFileName: "",
    });
  
    const titleDialog = useMemo(
      () => (isEditing ? "Editar destacado" : "Agregar destacado"),
      [isEditing]
    );
  
    const fetchRows = async () => {
      try {
        setLoading(true);
        const { data } = await getHomeProductsRequest();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        toastAuth({
          promise: Promise.reject(err),
          onError: (res) => ({
            title: "Vitrina",
            description: res?.response?.data?.message || "No se pudo cargar la vitrina",
          }),
        });
      } finally {
        setLoading(false);
      }
    };
  
    const fetchProducts = async () => {
      try {
        const { data } = await getAllProductsAll();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        toastAuth({
          promise: Promise.reject(err),
          onError: (res) => ({
            title: "Productos",
            description: res?.response?.data?.message || "No se pudieron cargar productos",
          }),
        });
      }
    };
  
    useEffect(() => {
      fetchRows();
      fetchProducts();
    }, []);
  
    const handleOpenCreate = () => {
      setIsEditing(false);
      setFormValue({
        name: "",
        description: "",
        imageUrl: "",
        section: "home",
        badge: "",
        position: 0,
        priceOverride: null,
        productId: null,
        isActive: true,
        imageFile: null,
        customFileName: "",
      });
      setOpenForm(true);
    };
  
    const handleOpenEdit = (row) => {
      setIsEditing(true);
      setFormValue({
        id: row.id,
        name: row.name || "",
        description: row.description || "",
        imageUrl: row.imageUrl || "",
        imageFile: null,
        section: row.section || "home",
        badge: row.badge || "",
        position: Number.isFinite(row.position) ? row.position : 0,
        priceOverride:
          typeof row.priceOverride === "number" ? row.priceOverride : row.priceOverride ?? "",
        productId: row.productId ?? null,
        isActive: Boolean(row.isActive),
        customFileName: "",
      });
      setOpenForm(true);
    };
  
    const handleSubmitForm = async () => {
      if (!formValue.name?.trim()) {
        return toastAuth({
          promise: Promise.reject(new Error("El nombre es obligatorio")),
          onError: () => ({ title: "Formulario", description: "El nombre es obligatorio" }),
        });
      }
  
      const fd = new FormData();
      fd.append("name", formValue.name.trim());
      if (formValue.description) fd.append("description", formValue.description);
      if (formValue.productId !== null && formValue.productId !== "")
        fd.append("productId", String(formValue.productId));
      fd.append("section", formValue.section || "home");
      if (formValue.badge) fd.append("badge", formValue.badge);
      fd.append("position", String(Number.isFinite(formValue.position) ? formValue.position : 0));
      if (formValue.priceOverride !== null && formValue.priceOverride !== "")
        fd.append("priceOverride", String(formValue.priceOverride));
      fd.append("isActive", String(Boolean(formValue.isActive)));
  
      if (formValue.customFileName?.trim())
        fd.append("customFileName", formValue.customFileName.trim());
  
      if (formValue.imageFile) {
        fd.append("image", formValue.imageFile, formValue.imageFile.name);
      } else if (formValue.imageUrl) {
        fd.append("imageUrl", formValue.imageUrl); // mantener la actual
      }
  
      const promise =
        isEditing && formValue.id
          ? updateHomeProductRequest(formValue.id, fd)
          : createHomeProductRequest(fd);
  
      toastAuth({
        promise,
        onSuccess: async () => {
          setOpenForm(false);
          await fetchRows();
          return {
            title: "Vitrina",
            description: isEditing ? "Destacado actualizado" : "Destacado creado",
          };
        },
        onError: (res) => ({
          title: "Vitrina",
          description: res?.response?.data?.message || "No se pudo guardar",
        }),
      });
    };
  
    const handleConfirmDelete = (row) => {
      setRowToDelete(row);
      setOpenDelete(true);
    };
  
    const handleDelete = async () => {
      if (!rowToDelete) return;
  
      toastAuth({
        promise: deleteHomeProductRequest(rowToDelete.id),
        onSuccess: () => {
          setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
          setOpenDelete(false);
          return { title: "Vitrina", description: "Eliminado correctamente" };
        },
        onError: (res) => ({
          title: "Vitrina",
          description: res?.response?.data?.message || "No se pudo eliminar",
        }),
      });
    };
  
    const columns = [
      {
        label: "Imagen",
        id: "image",
        width: 90,
        render: (row) => {
          const filename = row?.imageUrl;
          const src = filename ? `${pathImg}${filename}` : null;
          return src ? (
            <img
              src={src}
              alt={row?.name || "img"}
              style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <Box sx={{ width: 60, height: 60, borderRadius: 1, bgcolor: "action.hover" }} />
          );
        },
      },
      { label: "Nombre", id: "name", width: 240 },
      { label: "Sección", id: "section", width: 120 },
      { label: "Posición", id: "position", width: 90, align: "right" },
      {
        label: "Activo",
        id: "isActive",
        width: 90,
        render: (row) => (row.isActive == 1 || row.isActive === true ? "Sí" : "No"),
      },
      {
        label: "Acciones",
        id: "actions",
        width: 140,
        render: (row) => (
          <>
            <Tooltip title="Editar">
              <IconButton onClick={() => handleOpenEdit(row)}>
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton onClick={() => handleConfirmDelete(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </>
        ),
      },
    ];
  
    return (
      <Container sx={{ py: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Vitrina (Home Products)</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            Agregar destacado
          </Button>
        </Stack>
  
        <TablePro
          rows={rows}
          columns={columns}
          loading={loading}
          defaultRowsPerPage={10}
          title="Listado de destacados"
        />
  
        {/* Diálogo de formulario (crear/editar) */}
        <SimpleDialog open={openForm} onClose={() => setOpenForm(false)} tittle={titleDialog}>
          <HomeProductForm value={formValue} onChange={setFormValue} productOptions={products} />
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmitForm}>
              {isEditing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogActions>
        </SimpleDialog>
  
        {/* Diálogo de confirmación de borrado */}
        <SimpleDialog
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          tittle="Eliminar destacado"
          onClickAccept={handleDelete}
        >
          ¿Seguro que deseas eliminar <b>{rowToDelete?.name}</b>?
        </SimpleDialog>
      </Container>
    );
  }
  
  export default HomeProductPage;
  