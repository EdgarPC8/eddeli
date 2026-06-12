/**
 * Crear o editar un tablero menú eligiendo productos del catálogo.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Avatar,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
  Checkbox,
  Chip,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import { fetchMediaCatalog } from "../../../../api/publicidadRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { DEFAULT_SLIDE_DURATION_SEC } from "../constants.js";
import { buildMenuSlide } from "./layouts/MenuBoardLayout.jsx";

const slideUid = () => `slide_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default function MenuBoardDialog({ open, onClose, onConfirm, initialSlide = null }) {
  const { toast } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState([]);
  const [duration, setDuration] = useState(16);
  const [q, setQ] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMediaCatalog();
      setProducts(data.products || []);
    } catch {
      toast?.({ message: "No se pudo cargar productos", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialSlide?.title || "");
    setDuration(initialSlide?.durationSeconds || DEFAULT_SLIDE_DURATION_SEC);
    const preselected = (initialSlide?.menuItems || [])
      .map((m) => String(m.contentId ?? m.id ?? ""))
      .filter(Boolean);
    setSelected(preselected);
    setQ("");
    loadProducts();
  }, [open, initialSlide, loadProducts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        String(p.title || "").toLowerCase().includes(term) ||
        String(p.subtitle || "").toLowerCase().includes(term),
    );
  }, [products, q]);

  const toggle = (productId) => {
    const id = String(productId);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedProducts = useMemo(
    () =>
      selected
        .map((id) => products.find((p) => String(p.id) === id))
        .filter(Boolean),
    [selected, products],
  );

  const handleConfirm = () => {
    const boardTitle = title.trim() || "Nuestro menú";
    if (selectedProducts.length < 1) {
      toast?.({ message: "Selecciona al menos un producto", variant: "warning" });
      return;
    }
    const slide = buildMenuSlide({
      id: initialSlide?.id || slideUid(),
      title: boardTitle,
      products: selectedProducts,
      durationSeconds: duration,
    });
    onConfirm?.(slide);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialSlide ? "Editar tablero menú" : "Crear tablero menú"}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Elige los productos que aparecerán juntos en pantalla (columnas tipo menú digital).
        </Typography>

        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Título del tablero"
            fullWidth
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Ofertas del día, Nuestro menú, Promociones"
            helperText="Este texto aparece arriba del tablero en la pantalla TV"
          />
          <TextField
            label="Duración en pantalla (segundos)"
            type="number"
            size="small"
            fullWidth
            inputProps={{ min: 8, max: 120 }}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 12)}
          />
        </Stack>

        {selectedProducts.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
            {selectedProducts.map((p) => (
              <Chip
                key={p.id}
                size="small"
                label={p.title}
                onDelete={() => toggle(p.id)}
              />
            ))}
          </Stack>
        ) : null}

        <TextField
          fullWidth
          size="small"
          placeholder="Buscar producto..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ py: 4, display: "grid", placeItems: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
            {filtered.map((item) => {
              const id = String(item.id);
              const checked = selected.includes(id);
              return (
                <ListItemButton key={id} onClick={() => toggle(id)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemAvatar>
                    {item.previewUrl ? (
                      <Avatar variant="rounded" src={item.previewUrl} sx={{ width: 40, height: 40 }} />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
                        <BakeryDiningIcon fontSize="small" />
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.title}
                    secondary={[item.subtitle, item.price != null ? `$${Number(item.price).toFixed(2)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </ListItemButton>
              );
            })}
            {!filtered.length && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                No hay productos con imagen en inventario.
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!selectedProducts.length}>
          {initialSlide ? "Guardar tablero" : "Añadir a la playlist"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
