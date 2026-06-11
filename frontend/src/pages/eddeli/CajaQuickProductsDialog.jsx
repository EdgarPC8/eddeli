import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  hasPackageTiers,
  normalizePackageTiers,
  resolveEddeliLinePricing,
} from "../../utils/productLookup.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));
const QUICK_QTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const QUICK_QTY_KEYS = new Set(QUICK_QTY_OPTIONS.map(String));

const clampQty = (n) => Math.min(9, Math.max(1, Math.floor(Number(n) || 1)));

function formatPrice(product) {
  return `$${to2(product?.price ?? 0).toFixed(2)}`;
}

function formatTierHints(product) {
  const tiers = normalizePackageTiers(product?.packageTiers);
  if (!tiers.length) return null;
  return tiers.map((t) => `${t.qty}=$${t.totalPrice.toFixed(2)}`).join(" · ");
}

function lineTotalFor(product, qty) {
  return resolveEddeliLinePricing(product, qty).total;
}

function isPanaderiaProduct(product) {
  const catName = String(
    product?.ERP_inventory_category?.name || product?.category?.name || "",
  ).toLowerCase();
  return catName.includes("panader") || Number(product?.categoryId) === 3;
}

export function filterPanaderiaInStock(products) {
  return (products || [])
    .filter((p) => {
      if (!isPanaderiaProduct(p)) return false;
      if (p.type && p.type !== "final") return false;
      if (p.isActive === 0 || p.isActive === false) return false;
      return Number(p.stock || 0) > 0;
    })
    .sort((a, b) => {
      const aTiered = hasPackageTiers(a) ? 1 : 0;
      const bTiered = hasPackageTiers(b) ? 1 : 0;
      if (bTiered !== aTiered) return bTiered - aTiered;
      return Number(b.stock || 0) - Number(a.stock || 0);
    });
}

export default function CajaQuickProductsDialog({ open, onClose, products, onAdd }) {
  const theme = useTheme();
  const [selectedQty, setSelectedQty] = useState(1);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const items = filterPanaderiaInStock(products);

  useEffect(() => {
    if (open) {
      setSelectedQty(1);
      setHoveredProduct(null);
    }
  }, [open]);

  const bumpQty = useCallback((delta) => {
    setSelectedQty((prev) => clampQty(prev + delta));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      const qtyKey = e.key.startsWith("Numpad") ? e.key.slice(6) : e.key;
      if (QUICK_QTY_KEYS.has(qtyKey)) {
        e.preventDefault();
        setSelectedQty(Number(qtyKey));
        return;
      }
      if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") {
        e.preventDefault();
        bumpQty(1);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "-") {
        e.preventDefault();
        bumpQty(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, bumpQty]);

  const previewProduct = hoveredProduct;
  const previewTotal = previewProduct ? lineTotalFor(previewProduct, selectedQty) : null;

  const indicatorText = useMemo(() => {
    if (!previewProduct) {
      return `Clic suma ${selectedQty} u. al carrito`;
    }
    const name = previewProduct.name || "Producto";
    return `${name} · +${selectedQty}`;
  }, [previewProduct, selectedQty]);

  const handleAdd = (product) => {
    onAdd(product, selectedQty);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      BackdropProps={{
        sx: {
          backgroundColor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.common.black, 0.72)
              : alpha(theme.palette.common.black, 0.38),
        },
      }}
      PaperProps={{
        sx: {
          width: "min(1180px, 94vw)",
          height: "min(860px, 88vh)",
          maxHeight: "88vh",
          m: 2,
          borderRadius: 2,
          bgcolor: "background.default",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: theme.shadows[16],
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <BakeryDiningIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              Accesos rápidos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Teclado 1-9 o ↑↓ · clic en producto agrega
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar" size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.25,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", lg: "center" }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: "block", lineHeight: 1.2 }}>
              Cantidad
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0.4,
                width: 108,
              }}
            >
              {QUICK_QTY_OPTIONS.map((qty) => {
                const isSelected = selectedQty === qty;
                return (
                  <Button
                    key={qty}
                    size="small"
                    variant={isSelected ? "contained" : "outlined"}
                    color={isSelected ? "success" : "inherit"}
                    onClick={() => setSelectedQty(qty)}
                    aria-pressed={isSelected}
                    sx={{
                      minWidth: 0,
                      width: 32,
                      height: 32,
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      p: 0,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "success.main" : "divider",
                      boxShadow: isSelected ? `0 0 0 1px ${alpha(theme.palette.success.main, 0.4)}` : "none",
                    }}
                  >
                    {qty}
                  </Button>
                );
              })}
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: 1.5,
              border: 1,
              borderColor: previewProduct ? "primary.main" : "divider",
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.main, previewProduct ? 0.1 : 0)
                  : alpha(theme.palette.primary.main, previewProduct ? 0.06 : 0),
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <ShoppingCartIcon color="primary" fontSize="small" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {indicatorText}
                </Typography>
                {previewProduct && previewTotal != null ? (
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {hasPackageTiers(previewProduct)
                      ? formatTierHints(previewProduct)
                      : formatPrice(previewProduct)}
                  </Typography>
                ) : null}
              </Box>
              {previewTotal != null ? (
                <Typography variant="h6" fontWeight={900} color="primary.main">
                  ${previewTotal.toFixed(2)}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 2,
          py: 1.5,
          bgcolor: "background.default",
        }}
      >
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            No hay productos de panadería con stock disponible.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {items.map((product) => {
              const tiered = hasPackageTiers(product);
              const tierHints = formatTierHints(product);
              const cardTotal = lineTotalFor(product, selectedQty);
              return (
                <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                  <Card
                    variant="outlined"
                    onMouseEnter={() => setHoveredProduct(product)}
                    onMouseLeave={() => setHoveredProduct(null)}
                    sx={{
                      height: "100%",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      borderWidth: 1,
                      transition: "border-color 0.15s, transform 0.15s",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-1px)",
                        boxShadow: theme.shadows[4],
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleAdd(product)} sx={{ height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={800}
                          sx={{
                            lineHeight: 1.2,
                            minHeight: 40,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {product.name}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="body1" color="primary.main" fontWeight={800}>
                            {formatPrice(product)}
                          </Typography>
                          {tiered ? <Chip label="Tramo" size="small" color="secondary" /> : null}
                        </Stack>
                        {tierHints ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5, lineHeight: 1.3 }}
                          >
                            {tierHints}
                          </Typography>
                        ) : null}
                        <Box
                          sx={{
                            mt: 1,
                            py: 0.5,
                            px: 0.75,
                            borderRadius: 1,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? alpha(theme.palette.success.main, 0.16)
                                : alpha(theme.palette.success.main, 0.1),
                            border: 1,
                            borderColor: alpha(theme.palette.success.main, 0.35),
                          }}
                        >
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            +{selectedQty} → ${cardTotal.toFixed(2)}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Stock: {Number(product.stock || 0)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Dialog>
  );
}
