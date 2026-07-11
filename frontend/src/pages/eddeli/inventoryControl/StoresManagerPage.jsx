import {
  Container,
  IconButton,
  Button,
  Tooltip,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Box,
  Typography,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  CircularProgress,
  InputAdornment,
  Chip,
  Alert,
} from "@mui/material";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Add,
  Edit,
  Delete,
  Map as MapIcon,
  ContentPaste,
  Inventory2 as InventoryIcon,
  Visibility,
  VisibilityOff,
  RemoveCircleOutline,
  Search,
} from "@mui/icons-material";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";
import { storeSriStatus } from "../../../components/OpenShiftStoreDialog.jsx";
import { fetchSriBillingSettings } from "../../../api/sriBillingRequest.js";

import {
  getStoresRequest,
  createStoreRequest,
  updateStoreRequest,
  deleteStoreRequest,
  // store-products APIs
  getStoreProductsRequest,
  addProductsToStoreRequest,
  removeProductFromStoreRequest,
  toggleStoreProductRequest,
  getFinalProductsRequest,
} from "../../../api/inventoryControlRequest";

import { pathImg, buildImageUrl } from "../../../api/axios";
import { mediaStoragePath } from "../../../utils/mediaPaths.js";
import { useAuth } from "../../../context/AuthContext";
import Cropper from "react-easy-crop";
import {
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
} from "../../../utils/storeLocationKind.js";

/* ===========================
   Helpers de imagen / crop
=========================== */
async function getCroppedBlob(
  imageSrc,
  cropAreaPixels,
  { targetW = 800, targetH = 800, mime = "image/jpeg", quality = 0.9 } = {}
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

/* ===========================
   CropperDialog
=========================== */
function CropperDialog({ open, imageSrc, onClose, onConfirm, aspect }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);

  const PRESETS = [
    { k: "original", label: "Original (máx. del recorte)" },
    { k: "1080", label: "Ancho 1080 (auto alto)" },
    { k: "800", label: "Ancho 800 (auto alto)" },
    { k: "1280x720", label: "1280 × 720" },
    { k: "custom", label: "Personalizado…" },
  ];
  const [sizeMode, setSizeMode] = useState("original");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [quality, setQuality] = useState(0.9);
  const [mime, setMime] = useState("image/jpeg");
  const [estimateMB, setEstimateMB] = useState(null);
  const [estimateWH, setEstimateWH] = useState(null);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaPixels(null);
      setSizeMode("original");
      setCustomW("");
      setCustomH("");
      setQuality(0.9);
      setMime("image/jpeg");
      setEstimateMB(null);
      setEstimateWH(null);
    }
  }, [open]);

  const onCropComplete = (_, croppedAreaPixels) => setAreaPixels(croppedAreaPixels);

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
    onConfirm(blob, {
      width: w,
      height: h,
      mime,
      quality,
      sizeBytes: blob?.size ?? null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Recortar imagen</DialogTitle>

      <Box sx={{ px: 3, pt: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Arrastra para mover. En modo libre puedes redimensionar las esquinas.
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          height: "70vh",
          maxHeight: 800,
          minHeight: 480,
          backgroundColor: "#111",
        }}
      >
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition
            objectFit="contain"
            minZoom={1}
          />
        )}
      </Box>

      <Box sx={{ px: 3, pt: 2, display: "grid", gap: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Zoom
          </Typography>
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
              <MenuItem key={p.k} value={p.k}>
                {p.label}
              </MenuItem>
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
          <TextField label="Formato" value={mime} onChange={(e) => setMime(e.target.value)} select fullWidth>
            <MenuItem value="image/jpeg">JPEG (recomendado)</MenuItem>
            <MenuItem value="image/webp">WEBP</MenuItem>
            <MenuItem value="image/png">PNG (sin pérdidas, peso alto)</MenuItem>
          </TextField>

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
          <Button variant="outlined" onClick={handleEstimate}>
            Estimar tamaño
          </Button>
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
   Util: parsear coords desde URL de Google Maps
=========================== */
function parseCoordsFromGoogleMapsUrl(url) {
  try {
    const u = new URL(url);
    // /@LAT,LNG,ZOOM
    const atMatch = u.href.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)(,|$)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[3]) };
    // ?q=LAT,LNG
    const q = u.searchParams.get("q");
    const qMatch = q && q.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[3]) };
    // ?ll=LAT,LNG
    const ll = u.searchParams.get("ll");
    const llMatch = ll && ll.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[3]) };
  } catch {}
  return null;
}

/* ===========================
   Dialogo para elegir coords (pegar URL)
=========================== */
function MapPickDialog({ open, onClose, onPick, addressText }) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text || "");
    } catch {}
  };

  const handleUse = () => {
    const coords = parseCoordsFromGoogleMapsUrl(input);
    if (coords) onPick(coords);
  };

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    addressText || "tienda"
  )}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Elegir ubicación (lat/lng)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">
            1) Haz clic en <b>Abrir Google Maps</b> y busca tu ubicación.<br />
            2) Copia la URL de la barra del navegador y pégala aquí.
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<MapIcon />}
              href={mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Google Maps
            </Button>
            <Button variant="text" startIcon={<ContentPaste />} onClick={handlePasteFromClipboard}>
              Pegar desde portapapeles
            </Button>
          </Stack>

          <TextField
            label="Pega aquí la URL de Google Maps"
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://www.google.com/maps/place/.../@-0.123,-78.456,17z"
          />

          <Divider />

          <Typography variant="caption" color="text.secondary">
            Tip: también funciona con URLs que tengan <code>?q=LAT,LNG</code> o <code>?ll=LAT,LNG</code>.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleUse}>
          Usar coordenadas
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ===========================
   Mapa embebido (preview)
=========================== */
function MapPreview({ latitude, longitude, address, city, province, height = 220 }) {
  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const zoom = 14;
  const src = hasCoords
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`
    : (() => {
        const q = [address, city, province].filter(Boolean).join(", ");
        if (!q) return null;
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`;
      })();

  if (!src) return null;

  return (
    <Box
      sx={{
        width: "100%",
        height,
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <iframe
        title="Ubicación"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </Box>
  );
}

/* ===========================
   StoreProductsDialog
=========================== */
function StoreProductsDialog({ open, onClose, store }) {
  const { toast: toastAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [searchAdd, setSearchAdd] = useState("");
  const [options, setOptions] = useState([]);
  const [sel, setSel] = useState([]);
  const [busyAdd, setBusyAdd] = useState(false);

  const fetchLinks = async () => {
    if (!store) return;
    try {
      setLoading(true);
      const { data } = await getStoreProductsRequest(store.id, { activeOnly: false });
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Productos por tienda",
          description: res?.response?.data?.message || "No se pudo cargar",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const { data } = await getFinalProductsRequest({ q: searchAdd || "" });
      const assignedIds = new Set(links.map((l) => l.productId));
      const opts = (Array.isArray(data) ? data : []).filter((p) => !assignedIds.has(p.id));
      setOptions(opts);
    } catch {
      setOptions([]);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLinks();
      setSel([]);
      setSearchAdd("");
      setOptions([]);
    } else {
      setLinks([]);
      setSel([]);
      setSearchAdd("");
      setOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, store?.id]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(fetchOptions, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchAdd, links, open]);

  const toggleSel = (pid) =>
    setSel((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));

  const addSelected = async () => {
    if (!sel.length || !store) return;
    try {
      setBusyAdd(true);
      await addProductsToStoreRequest(store.id, sel);
      await fetchLinks();
      setSel([]);
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Asignar productos",
          description: res?.response?.data?.message || "No se pudo asignar",
        }),
      });
    } finally {
      setBusyAdd(false);
    }
  };

  const toggleVisibility = async (productId, current) => {
    if (!store) return;
    try {
      await toggleStoreProductRequest(store.id, productId, !current);
      setLinks((prev) =>
        prev.map((r) => (r.productId === productId ? { ...r, isActive: !current } : r))
      );
    } catch {}
  };

  const removeLink = async (productId) => {
    if (!store) return;
    try {
      await removeProductFromStoreRequest(store.id, productId);
      setLinks((prev) => prev.filter((r) => r.productId !== productId));
    } catch {}
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Productos de: {store?.name || "—"}</DialogTitle>
      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Agregar productos
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar productos finales..."
              value={searchAdd}
              onChange={(e) => setSearchAdd(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={addSelected} disabled={!sel.length || busyAdd}>
              Agregar ({sel.length})
            </Button>
          </Stack>

          <Box sx={{ mt: 1, maxHeight: 220, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Precio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {options.map((p) => {
                  const checked = sel.includes(p.id);
                  const img = p.primaryImageUrl ? `${pathImg}${p.primaryImageUrl}` : null;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox checked={checked} onChange={() => toggleSel(p.id)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {img ? (
                            <img
                              src={img}
                              alt={p.name}
                              style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }}
                              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                            />
                          ) : (
                            <Box sx={{ width: 40, height: 40, bgcolor: "action.hover", borderRadius: 1 }} />
                          )}
                          <Typography variant="body2">{p.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {typeof p.price === "number" ? `$${Number(p.price).toFixed(2)}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!options.length && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                      {searchAdd ? "Sin resultados" : "Escribe para buscar productos…"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Asignados ({links.length})
        </Typography>

        <Paper variant="outlined">
          <Box sx={{ maxHeight: 320, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Precio</TableCell>
                  <TableCell align="center">Visible</TableCell>
                  <TableCell align="center">Quitar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress size={22} />
                    </TableCell>
                  </TableRow>
                ) : links.length ? (
                  links.map((r) => {
                    const p = r.product || {};
                    const img = p.primaryImageUrl ? `${pathImg}${p.primaryImageUrl}` : null;
                    return (
                      <TableRow key={r.linkId || r.productId} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {img ? (
                              <img
                                src={img}
                                alt={p.name}
                                style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }}
                                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                              />
                            ) : (
                              <Box sx={{ width: 40, height: 40, bgcolor: "action.hover", borderRadius: 1 }} />
                            )}
                            <Typography variant="body2">{p.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          {typeof p.price === "number" ? `$${Number(p.price).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={r.isActive ? "Ocultar" : "Mostrar"}>
                            <IconButton size="small" onClick={() => toggleVisibility(r.productId, r.isActive)}>
                              {r.isActive ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Quitar de la tienda">
                            <IconButton color="error" size="small" onClick={() => removeLink(r.productId)}>
                              <RemoveCircleOutline />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                      No hay productos asignados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ===========================
   Formulario de Store
=========================== */
function StoreForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [aspectKey, setAspectKey] = useState("4:3");

  const ASPECTS = { "1:1": 1, "4:3": 4 / 3, "16:9": 16 / 9, free: undefined };

  const fileRef = useRef(null);
  const handleChooseFile = () => fileRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob, meta) => {
    const file = blobToFile(blob, "image", meta?.mime || "image/jpeg");
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    set("imageFile", file);
    setCropOpen(false);

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [previewUrl, imageSrc]);

  const previewSrc = previewUrl || buildImageUrl(value?.imageUrl) || null;

  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const handlePickCoords = ({ lat, lng }) => {
    set("latitude", lat);
    set("longitude", lng);
    setMapDialogOpen(false);
  };

  return (
    <DialogContent dividers>
      <Stack spacing={2}>
        <TextField
          label="Nombre del local"
          value={value.name || ""}
          onChange={(e) => set("name", e.target.value)}
          required
          fullWidth
        />

        <TextField
          select
          label="Tipo de local"
          value={value.locationKind || "vitrina"}
          onChange={(e) => set("locationKind", e.target.value)}
          fullWidth
          helperText={
            value.locationKind === "propia"
              ? "Sucursal propia: punto de venta tuyo (caja + códigos SRI 001, 002…)."
              : "Vitrina: local ajeno donde entregas producto para que vendan (sin abrir caja)."
          }
        >
          <MenuItem value="propia">Sucursal propia — punto de venta mío</MenuItem>
          <MenuItem value="vitrina">Vitrina — entrega para que vendan</MenuItem>
        </TextField>

        <TextField
          label="Dirección"
          value={value.address || ""}
          onChange={(e) => set("address", e.target.value)}
          required
          fullWidth
        />

        {value.locationKind === "propia" && (
          <>
            <Typography variant="subtitle2" fontWeight={700}>
              Emisión (SRI / caja)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cada sucursal propia usa su establecimiento. Ej. local A = 001, local B = 002.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Establecimiento"
                value={value.establishmentCode || "001"}
                onChange={(e) => set("establishmentCode", e.target.value)}
                fullWidth
                inputProps={{ maxLength: 3 }}
                helperText="Ej. 001, 002"
              />
              <TextField
                label="Punto de emisión"
                value={value.emissionPointCode || "001"}
                onChange={(e) => set("emissionPointCode", e.target.value)}
                fullWidth
                inputProps={{ maxLength: 3 }}
                helperText="Ej. 001"
              />
            </Stack>
          </>
        )}

        <TextField
          label="Descripción"
          value={value.description || ""}
          onChange={(e) => set("description", e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Teléfono" value={value.phone || ""} onChange={(e) => set("phone", e.target.value)} fullWidth />
          <TextField label="Email" value={value.email || ""} onChange={(e) => set("email", e.target.value)} type="email" fullWidth />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Ciudad" value={value.city || ""} onChange={(e) => set("city", e.target.value)} fullWidth />
          <TextField label="Provincia" value={value.province || ""} onChange={(e) => set("province", e.target.value)} fullWidth />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Latitud"
            type="number"
            value={value.latitude ?? ""}
            onChange={(e) => set("latitude", e.target.value === "" ? "" : Number(e.target.value))}
            fullWidth
            inputProps={{ step: "any" }}
          />
          <TextField
            label="Longitud"
            type="number"
            value={value.longitude ?? ""}
            onChange={(e) => set("longitude", e.target.value === "" ? "" : Number(e.target.value))}
            fullWidth
            inputProps={{ step: "any" }}
          />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<MapIcon />} onClick={() => setMapDialogOpen(true)}>
            Elegir desde Google Maps
          </Button>
          <Typography variant="body2" sx={{ alignSelf: "center" }} color="text.secondary">
            Opcional. Si no pones coords, se usará la dirección para el mapa.
          </Typography>
        </Stack>

        <MapPreview
          latitude={typeof value.latitude === "number" ? value.latitude : null}
          longitude={typeof value.longitude === "number" ? value.longitude : null}
          address={value.address}
          city={value.city}
          province={value.province}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            label="Posición"
            type="number"
            value={value.position ?? 0}
            onChange={(e) => set("position", Number(e.target.value || 0))}
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={Boolean(value.isActive)} onChange={(e) => set("isActive", e.target.checked)} />}
            label="Activo (visible)"
          />
        </Stack>

        <TextField
          label="Relación de aspecto"
          value={aspectKey}
          onChange={(e) => setAspectKey(e.target.value)}
          select
          fullWidth
        >
          <MenuItem value="free">Libre</MenuItem>
          <MenuItem value="1:1">1:1</MenuItem>
          <MenuItem value="4:3">4:3</MenuItem>
          <MenuItem value="16:9">16:9</MenuItem>
        </TextField>
{/* ✅ Carpeta destino */}
<TextField
  label={`Carpeta destino (ej: "${mediaStoragePath("stores")}")`}
  value={value.imageSubfolder || ""}
  onChange={(e) => set("imageSubfolder", e.target.value)}
  fullWidth
  helperText='Se guardará dentro de src/img/<carpeta>. No uses "..".'
/>

{/* ✅ Nombre archivo (sin extensión) */}
<TextField
  label='Nombre de imagen (sin extensión)'
  value={value.customFileName || ""}
  onChange={(e) => set("customFileName", e.target.value)}
  fullWidth
  placeholder='Ej: tienda_quilanga'
  helperText='Si subes archivo, se renombra. Si no subes y activas "Mover", se mueve la imagen actual.'
/>

<FormControlLabel
  control={
    <Switch
      checked={Boolean(value.moveImage)}
      onChange={(e) => set("moveImage", e.target.checked)}
    />
  }
  label="Mover imagen actual (si no subo una nueva)"
/>



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
              key={previewSrc}
              src={previewSrc}
              alt="preview"
              style={{ width: 160, height: 120, objectFit: "cover", borderRadius: 8 }}
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                {selectedFile ? "Vista previa (recortada)" : "Imagen actual"}
              </Typography>
            </Box>
          </Box>
        ) : null}

        <CropperDialog
          open={cropOpen}
          imageSrc={imageSrc}
          aspect={ASPECTS[aspectKey]}
          onClose={handleCropCancel}
          onConfirm={handleCropConfirm}
        />

        <MapPickDialog
          open={mapDialogOpen}
          onClose={() => setMapDialogOpen(false)}
          onPick={handlePickCoords}
          addressText={[value.address, value.city, value.province].filter(Boolean).join(", ")}
        />
      </Stack>
    </DialogContent>
  );
}

/* ===========================
   Página principal (Stores)
=========================== */
function StoresPage() {
  const [rows, setRows] = useState([]);
  const [kindFilter, setKindFilter] = useState("all"); // all | propia | vitrina
  const [loading, setLoading] = useState(false);
  const [sriSettings, setSriSettings] = useState(null);
  const { toast: toastAuth } = useAuth();

  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const [openForm, setOpenForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formValue, setFormValue] = useState({
    name: "",
    address: "",
    description: "",
    phone: "",
    email: "",
    city: "",
    province: "",
    latitude: "",
    longitude: "",
    position: 0,
    isActive: true,
    locationKind: "vitrina",
    establishmentCode: "001",
    emissionPointCode: "001",
    imageUrl: "",
    imageFile: null,
    customFileName: "",
  });

  const [storeForProducts, setStoreForProducts] = useState(null);
  const [openProducts, setOpenProducts] = useState(false);

  const titleDialog = useMemo(
    () => (isEditing ? "Editar sucursal / local" : "Agregar sucursal / local"),
    [isEditing]
  );

  const kindCounts = useMemo(() => {
    let propia = 0;
    let vitrina = 0;
    for (const r of rows) {
      if (normalizeLocationKind(r.locationKind) === "propia") propia += 1;
      else vitrina += 1;
    }
    return { all: rows.length, propia, vitrina };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const sorted = sortStoresByKind(rows);
    if (kindFilter === "all") return sorted;
    return sorted.filter(
      (r) => normalizeLocationKind(r.locationKind) === kindFilter,
    );
  }, [rows, kindFilter]);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const [{ data }, sri] = await Promise.all([
        getStoresRequest(),
        fetchSriBillingSettings().catch(() => null),
      ]);
      const stores = Array.isArray(data) ? data : [];
      setRows(stores);
      setSriSettings(sri);
    } catch (err) {
      toastAuth({
        promise: Promise.reject(err),
        onError: (res) => ({
          title: "Sucursales",
          description: res?.response?.data?.message || "No se pudo cargar la lista",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormValue({
      name: "",
      address: "",
      description: "",
      phone: "",
      email: "",
      city: "",
      province: "",
      latitude: "",
      longitude: "",
      position: 0,
      isActive: true,
      locationKind: "vitrina",
      establishmentCode: "001",
      emissionPointCode: "001",
      imageUrl: "",
      imageFile: null,
      customFileName: "",
      imageSubfolder: mediaStoragePath("stores"),
      moveImage: false,
    });
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEditing(true);
    setFormValue({
      id: row.id,
      name: row.name || "",
      address: row.address || "",
      description: row.description || "",
      phone: row.phone || "",
      email: row.email || "",
      city: row.city || "",
      province: row.province || "",
      latitude: typeof row.latitude === "number" ? row.latitude : row.latitude ?? "",
      longitude: typeof row.longitude === "number" ? row.longitude : row.longitude ?? "",
      position: Number.isFinite(row.position) ? row.position : 0,
      isActive: Boolean(row.isActive),
      locationKind: row.locationKind === "propia" ? "propia" : "vitrina",
      establishmentCode: row.establishmentCode || "001",
      emissionPointCode: row.emissionPointCode || "001",
      imageUrl: row.imageUrl || "",
      imageFile: null,
      imageSubfolder: row.imageUrl?.includes("/")
        ? row.imageUrl.split("/").slice(0, -1).join("/")
        : mediaStoragePath("stores"),
      customFileName: row.imageUrl
        ? row.imageUrl.split("/").pop().replace(/\.[^.]+$/, "")
        : "",
      moveImage: false,
    });
    setOpenForm(true);
  };

  const handleSubmitForm = async () => {
    if (!formValue.name?.trim() || !formValue.address?.trim()) {
      return toastAuth({
        promise: Promise.reject(new Error("Nombre y dirección son obligatorios")),
        onError: () => ({
          title: "Formulario",
          description: "Nombre y dirección son obligatorios",
        }),
      });
    }

    const fd = new FormData();
    fd.append("name", formValue.name.trim());
    fd.append("address", formValue.address.trim());
    if (formValue.description) fd.append("description", formValue.description);
    if (formValue.phone) fd.append("phone", formValue.phone);
    if (formValue.email) fd.append("email", formValue.email);
    if (formValue.city) fd.append("city", formValue.city);
    if (formValue.province) fd.append("province", formValue.province);

    fd.append("position", String(Number.isFinite(formValue.position) ? formValue.position : 0));
    fd.append("isActive", String(Boolean(formValue.isActive)));
    fd.append("locationKind", formValue.locationKind === "propia" ? "propia" : "vitrina");
    fd.append("establishmentCode", String(formValue.establishmentCode || "001").trim());
    fd.append("emissionPointCode", String(formValue.emissionPointCode || "001").trim());

    const lat = formValue.latitude;
    const lng = formValue.longitude;
    if (lat !== "" && lat !== null && !Number.isNaN(Number(lat))) fd.append("latitude", String(Number(lat)));
    if (lng !== "" && lng !== null && !Number.isNaN(Number(lng))) fd.append("longitude", String(Number(lng)));

    if (formValue.customFileName?.trim()) fd.append("customFileName", formValue.customFileName.trim());

    if (formValue.imageFile) {
      fd.append("image", formValue.imageFile, formValue.imageFile.name);
    } else if (typeof formValue.imageUrl !== "undefined") {
      // si no cambias imagen, mantenemos el string (puede ser "" o null si quieres limpiar)
      fd.append("imageUrl", formValue.imageUrl || "");
    }

    const promise =
      isEditing && formValue.id
        ? updateStoreRequest(formValue.id, fd)
        : createStoreRequest(fd);

    return toastAuth({
      promise,
      onSuccess: async () => {
        setOpenForm(false);
        await fetchRows();
        return {
          title: "Puntos de venta",
          description: isEditing ? "Punto de venta actualizado" : "Punto de venta creado",
        };
      },
      onError: (res) => ({
        title: "Puntos de venta",
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
    return toastAuth({
      promise: deleteStoreRequest(rowToDelete.id),
      onSuccess: () => {
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        setOpenDelete(false);
        return { title: "Puntos de venta", description: "Eliminado correctamente" };
      },
      onError: (res) => ({
        title: "Puntos de venta",
        description: res?.response?.data?.message || "No se pudo eliminar",
      }),
    });
  };

  const openProductsDialog = (row) => {
    setStoreForProducts(row);
    setOpenProducts(true);
  };

  const columns = [
    {
      label: "Imagen",
      id: "image",
      width: 100,
      render: (row) => {
        const filename = row?.imageUrl;
        const src = buildImageUrl(filename);
        
        // Debug: verificar valores
        if (filename && !src) {
          console.warn("⚠️ buildImageUrl retornó null para:", filename, "store:", row?.name);
        }
        if (src) {
          console.log("🖼️ Cargando imagen:", src, "para store:", row?.name);
        }
        
        return src ? (
          <img
            src={src}
            alt={row?.name || "img"}
            style={{ width: 70, height: 56, objectFit: "cover", borderRadius: 8 }}
            onError={(e) => {
              console.error("❌ Error cargando imagen:", src, "para store:", row?.name);
              console.error("   imageUrl original:", filename);
              console.error("   pathImg base:", pathImg);
              e.currentTarget.style.visibility = "hidden";
            }}
            onLoad={() => {
              console.log("✅ Imagen cargada exitosamente:", src);
            }}
          />
        ) : (
          <Box sx={{ width: 70, height: 56, borderRadius: 1, bgcolor: "action.hover" }} />
        );
      },
    },
    { label: "Nombre", id: "name", width: 180 },
    {
      label: "Tipo",
      id: "locationKind",
      width: 130,
      render: (row) =>
        row.locationKind === "propia" ? (
          <Chip size="small" color="primary" label="Sucursal propia" />
        ) : (
          <Chip size="small" variant="outlined" label="Vitrina" />
        ),
    },
    {
      label: "Emisión",
      id: "emission",
      width: 100,
      render: (row) =>
        row.locationKind === "propia"
          ? `${row.establishmentCode || "001"}-${row.emissionPointCode || "001"}`
          : "—",
    },
    {
      label: "Estado SRI",
      id: "sriStatus",
      width: 150,
      render: (row) => {
        if (row.locationKind !== "propia") {
          return <Chip size="small" variant="outlined" label="No aplica" />;
        }
        const st = storeSriStatus(row, sriSettings);
        return <Chip size="small" color={st.color} label={st.label} title={st.detail} />;
      },
    },
    { label: "Ciudad", id: "city", width: 120 },
    { label: "Provincia", id: "province", width: 140 },
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
      width: 190,
      render: (row) => (
        <>
          <Tooltip title="Productos">
            <IconButton onClick={() => openProductsDialog(row)}>
              <InventoryIcon />
            </IconButton>
          </Tooltip>
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Sucursales / locales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Sucursal propia</strong>: tu panadería (caja + SRI).{" "}
            <strong>Vitrina</strong>: entregas producto para que otros vendan.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
          Agregar local
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2, py: 0.75 }}>
        Al abrir turno solo aparecen las <strong>sucursales propias</strong>. Las vitrinas siguen
        sirviendo para surtido y mapa público, sin abrir caja ahí.
      </Alert>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          clickable
          size="small"
          color={kindFilter === "all" ? "primary" : "default"}
          variant={kindFilter === "all" ? "filled" : "outlined"}
          label={`Todos (${kindCounts.all})`}
          onClick={() => setKindFilter("all")}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          clickable
          size="small"
          color={kindFilter === "propia" ? "primary" : "default"}
          variant={kindFilter === "propia" ? "filled" : "outlined"}
          label={`${locationKindLabel("propia")} (${kindCounts.propia})`}
          onClick={() => setKindFilter("propia")}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          clickable
          size="small"
          color={kindFilter === "vitrina" ? "primary" : "default"}
          variant={kindFilter === "vitrina" ? "filled" : "outlined"}
          label={`${locationKindLabel("vitrina")} (${kindCounts.vitrina})`}
          onClick={() => setKindFilter("vitrina")}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {sriSettings && (
        <Alert
          severity={sriSettings.readyForInvoicing ? "success" : "info"}
          sx={{ mb: 2, py: 0.5 }}
        >
          {sriSettings.readyForInvoicing
            ? `Emisor SRI listo (${sriSettings.environment}). Firma y datos fiscales configurados.`
            : sriSettings.hasCertificate
              ? "Hay firma cargada, pero faltan datos fiscales o activación en Configuración → Facturación electrónica."
              : "Aún no hay firma SRI. Puedes operar caja igual; la facturación electrónica se completa en Sistema → Configuración."}
        </Alert>
      )}

      <TablePro
        rows={visibleRows}
        columns={columns}
        loading={loading}
        defaultRowsPerPage={10}
        title={
          kindFilter === "propia"
            ? "Sucursales propias"
            : kindFilter === "vitrina"
              ? "Vitrinas"
              : "Sucursales propias y vitrinas"
        }
      />

      {/* Form create/edit */}
      <SimpleDialog open={openForm} onClose={() => setOpenForm(false)} tittle={titleDialog}>
        <StoreForm value={formValue} onChange={setFormValue} />
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitForm}>
            {isEditing ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogActions>
      </SimpleDialog>

      {/* Productos por tienda */}
      <StoreProductsDialog
        open={openProducts}
        onClose={() => setOpenProducts(false)}
        store={storeForProducts}
      />

      {/* Confirmación de borrado */}
      <SimpleDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        tittle="Eliminar punto de venta"
        onClickAccept={handleDelete}
      >
        ¿Seguro que deseas eliminar <b>{rowToDelete?.name}</b>?
      </SimpleDialog>
    </Container>
  );
}

export default StoresPage;
