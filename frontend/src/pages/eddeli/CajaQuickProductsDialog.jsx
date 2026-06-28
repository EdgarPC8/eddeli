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
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import {
  hasPackageTiers,
  normalizePackageTiers,
  resolveEddeliQuickLineTotal,
  resolvePackageTierTotal,
  getProductCategory,
  getTierGroupLabel,
  getTierGroupPackageTiers,
  getSurtidoProductsForTierGroup,
  productParticipatesInTierGroup,
  formatProductTierPricesOnly,
  getProductTierVisualKind,
  isPanTierGroup,
  findActiveTierGroups,
} from "../../utils/productLookup.js";
import { getRootCategoryFromProduct } from "../../utils/categoryUtils.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));
const QUICK_QTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const QUICK_QTY_KEYS = new Set(QUICK_QTY_OPTIONS.map(String));

const clampQty = (n) => Math.min(9, Math.max(1, Math.floor(Number(n) || 1)));

function formatPrice(product) {
  return `$${to2(product?.price ?? 0).toFixed(2)}`;
}

function tierCardAccent(tierKind, theme, { selected = false } = {}) {
  if (tierKind === "pan-group") {
    return {
      borderColor: selected ? "warning.dark" : "warning.main",
      bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.22),
    };
  }
  if (tierKind === "other-group") {
    return {
      borderColor: selected ? "info.dark" : "info.main",
      bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.14),
    };
  }
  if (tierKind === "product-tier") {
    return {
      borderColor: selected ? "success.dark" : "success.main",
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.1 : 0.12),
    };
  }
  return {};
}

function lineTotalFor(product, qty, tierGroups = []) {
  return resolveEddeliQuickLineTotal(product, qty, tierGroups);
}

function isPanaderiaProduct(product) {
  const cat = getProductCategory(product);
  const root = getRootCategoryFromProduct(product);
  const rootName = String(root?.name || cat?.name || "").toLowerCase();
  const catName = String(cat?.name || "").toLowerCase();
  return (
    rootName.includes("panader") ||
    catName === "panes" ||
    catName.includes("panader")
  );
}

export function filterPanaderiaInStock(products, tierGroups = []) {
  return (products || [])
    .filter((p) => {
      if (!isPanaderiaProduct(p)) return false;
      if (p.type && p.type !== "final") return false;
      if (p.isActive === 0 || p.isActive === false) return false;
      return Number(p.stock || 0) > 0;
    })
    .sort((a, b) => {
      const aTiered =
        hasPackageTiers(a) || tierGroups.some((g) => productParticipatesInTierGroup(a, g)) ? 1 : 0;
      const bTiered =
        hasPackageTiers(b) || tierGroups.some((g) => productParticipatesInTierGroup(b, g)) ? 1 : 0;
      if (bTiered !== aTiered) return bTiered - aTiered;
      return Number(b.stock || 0) - Number(a.stock || 0);
    });
}

function filterSurtidoInStock(products, tierGroup) {
  return getSurtidoProductsForTierGroup(products, tierGroup)
    .filter((p) => Number(p.stock || 0) > 0)
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
}

export default function CajaQuickProductsDialog({
  open,
  onClose,
  products,
  onAdd,
  onAddSurtido,
  tierGroups = [],
}) {
  const theme = useTheme();
  const [selectedQty, setSelectedQty] = useState(1);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [selectedTierGroup, setSelectedTierGroup] = useState(null);
  const [basketQtyById, setBasketQtyById] = useState({});

  const items = filterPanaderiaInStock(products, tierGroups);
  const activeGroups = useMemo(() => findActiveTierGroups(tierGroups), [tierGroups]);
  const surtidoMode = Boolean(selectedTierGroup);
  const surtidoLabel = selectedTierGroup ? getTierGroupLabel(selectedTierGroup) : "";
  const surtidoItems = useMemo(
    () => (selectedTierGroup ? filterSurtidoInStock(products, selectedTierGroup) : []),
    [products, selectedTierGroup],
  );
  const surtidoTiers = useMemo(
    () =>
      selectedTierGroup
        ? normalizePackageTiers(getTierGroupPackageTiers(selectedTierGroup))
        : [],
    [selectedTierGroup],
  );

  const resetSurtidoBasket = useCallback(() => {
    setBasketQtyById({});
  }, []);

  const exitSurtidoMode = useCallback(() => {
    setSelectedTierGroup(null);
    resetSurtidoBasket();
  }, [resetSurtidoBasket]);

  useEffect(() => {
    if (open) {
      setSelectedQty(1);
      setHoveredProduct(null);
      setSelectedTierGroup(null);
      resetSurtidoBasket();
    }
  }, [open, resetSurtidoBasket]);

  const bumpQty = useCallback((delta) => {
    setSelectedQty((prev) => clampQty(prev + delta));
  }, []);

  const basketLines = useMemo(
    () =>
      surtidoItems
        .map((p) => ({
          product: p,
          quantity: Math.floor(Number(basketQtyById[Number(p.id)] || 0)),
        }))
        .filter((l) => l.quantity > 0),
    [surtidoItems, basketQtyById],
  );

  const basketTotalUnits = useMemo(
    () => basketLines.reduce((sum, l) => sum + l.quantity, 0),
    [basketLines],
  );

  const basketEstimatedTotal = useMemo(() => {
    if (!selectedTierGroup || basketTotalUnits <= 0) return 0;
    const ref = surtidoItems[0];
    return resolvePackageTierTotal(
      { packageTiers: surtidoTiers, price: ref?.price ?? 0.15 },
      basketTotalUnits,
    );
  }, [selectedTierGroup, basketTotalUnits, surtidoTiers, surtidoItems]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (surtidoMode) {
          exitSurtidoMode();
          return;
        }
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
  }, [open, onClose, bumpQty, surtidoMode, exitSurtidoMode]);

  const previewProduct = hoveredProduct;
  const previewTotal =
    previewProduct && !surtidoMode ? lineTotalFor(previewProduct, selectedQty, tierGroups) : null;

  const indicatorText = useMemo(() => {
    if (surtidoMode) {
      if (basketTotalUnits > 0) {
        return `${surtidoLabel}: ${basketTotalUnits} u. en canasta`;
      }
      return `Clic en pan suma ${selectedQty} a la canasta`;
    }
    if (!previewProduct) {
      return `Clic suma ${selectedQty} u. al carrito`;
    }
    return `${previewProduct.name || "Producto"} · +${selectedQty}`;
  }, [surtidoMode, surtidoLabel, basketTotalUnits, previewProduct, selectedQty]);

  const addToBasket = (product) => {
    const id = Number(product.id);
    const stock = Number(product.stock || 0);
    setBasketQtyById((prev) => {
      const current = Math.floor(Number(prev[id] || 0));
      const next = stock > 0 ? Math.min(current + selectedQty, stock) : current + selectedQty;
      if (next <= current) return prev;
      return { ...prev, [id]: next };
    });
  };

  const handleProductClick = (product) => {
    if (surtidoMode) {
      addToBasket(product);
      return;
    }
    onAdd(product, selectedQty);
    onClose();
  };

  const handleConfirmSurtido = () => {
    if (!selectedTierGroup || !basketLines.length) return;
    onAddSurtido?.({
      lines: basketLines,
      label: surtidoLabel,
      tierGroup: selectedTierGroup,
    });
    onClose();
  };

  const gridProducts = surtidoMode ? surtidoItems : items;

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
          bgcolor: surtidoMode ? alpha(theme.palette.secondary.main, 0.08) : "background.paper",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          {surtidoMode ? (
            <ShoppingBasketIcon color="secondary" />
          ) : (
            <BakeryDiningIcon color="primary" />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              {surtidoMode ? `Canasta — ${surtidoLabel}` : "Accesos rápidos"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {surtidoMode
                ? "Teclado 1-9 · clic suma a la canasta · confirmar abajo para el carrito"
                : "Teclado 1-9 o ↑↓ · clic en producto agrega"}
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
              borderColor: surtidoMode
                ? basketTotalUnits > 0
                  ? "secondary.main"
                  : "divider"
                : previewProduct
                  ? "primary.main"
                  : "divider",
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(
                      surtidoMode ? theme.palette.secondary.main : theme.palette.primary.main,
                      surtidoMode ? (basketTotalUnits > 0 ? 0.12 : 0) : previewProduct ? 0.1 : 0,
                    )
                  : alpha(
                      surtidoMode ? theme.palette.secondary.main : theme.palette.primary.main,
                      surtidoMode ? (basketTotalUnits > 0 ? 0.08 : 0) : previewProduct ? 0.06 : 0,
                    ),
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {surtidoMode ? (
                <ShoppingBasketIcon color="secondary" fontSize="small" />
              ) : (
                <ShoppingCartIcon color="primary" fontSize="small" />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap={!surtidoMode}>
                  {indicatorText}
                </Typography>
                {surtidoMode && basketLines.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {basketLines.map(({ product, quantity }) => (
                      <Chip
                        key={product.id}
                        size="small"
                        label={`${product.name} ×${quantity}`}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : previewProduct && !surtidoMode ? (
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {formatProductTierPricesOnly(previewProduct, tierGroups) || formatPrice(previewProduct)}
                  </Typography>
                ) : null}
              </Box>
              {surtidoMode && basketTotalUnits > 0 ? (
                <Typography variant="h6" fontWeight={900} color="secondary.main">
                  ${to2(basketEstimatedTotal).toFixed(2)}
                </Typography>
              ) : previewTotal != null ? (
                <Typography variant="h6" fontWeight={900} color="primary.main">
                  ${previewTotal.toFixed(2)}
                </Typography>
              ) : null}
            </Stack>
          </Paper>

          {surtidoMode && basketTotalUnits > 0 ? (
            <Button size="small" color="inherit" startIcon={<DeleteSweepIcon />} onClick={resetSurtidoBasket}>
              Vaciar
            </Button>
          ) : null}
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
        {!surtidoMode && activeGroups.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Grid container spacing={1.5}>
              {activeGroups.map((group) => {
                const label = getTierGroupLabel(group);
                const tiers = normalizePackageTiers(getTierGroupPackageTiers(group));
                const tierPrices = tiers.map((t) => `${t.qty}=$${t.totalPrice.toFixed(2)}`).join(" · ");
                const panGroup = isPanTierGroup(group);
                return (
                  <Grid item xs={12} sm={6} md={4} key={group.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        ...tierCardAccent(panGroup ? "pan-group" : "other-group", theme),
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedTierGroup(group)}>
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <ShoppingBasketIcon color={panGroup ? "warning" : "info"} fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={800}>
                              Canasta {label}
                            </Typography>
                          </Stack>
                          {tierPrices ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {tierPrices}
                            </Typography>
                          ) : null}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {gridProducts.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            {surtidoMode
              ? "No hay panes disponibles en esta canasta."
              : "No hay productos de panadería con stock disponible."}
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {gridProducts.map((product) => {
              const tierKind = getProductTierVisualKind(product, tierGroups);
              const tierPrices = formatProductTierPricesOnly(product, tierGroups);
              const inBasket = surtidoMode
                ? Math.floor(Number(basketQtyById[Number(product.id)] || 0))
                : 0;
              const stock = Number(product.stock || 0);
              const atStockLimit = surtidoMode && stock > 0 && inBasket >= stock;
              const cardTotal = surtidoMode
                ? null
                : lineTotalFor(product, selectedQty, tierGroups);

              return (
                <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                  <Card
                    variant="outlined"
                    onMouseEnter={() => setHoveredProduct(product)}
                    onMouseLeave={() => setHoveredProduct(null)}
                    sx={{
                      height: "100%",
                      borderWidth: inBasket > 0 || tierKind ? 2 : 1,
                      opacity: atStockLimit ? 0.55 : 1,
                      transition: "border-color 0.15s, transform 0.15s",
                      ...(tierKind
                        ? tierCardAccent(tierKind, theme, { selected: inBasket > 0 })
                        : {
                            borderColor: inBasket > 0 ? "secondary.main" : "divider",
                            bgcolor: "background.paper",
                          }),
                      "&:hover": {
                        borderColor: surtidoMode
                          ? "secondary.main"
                          : tierKind === "pan-group"
                            ? "warning.dark"
                            : tierKind === "other-group"
                              ? "info.dark"
                              : "primary.main",
                        transform: atStockLimit ? "none" : "translateY(-1px)",
                        boxShadow: atStockLimit ? "none" : theme.shadows[4],
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleProductClick(product)}
                      disabled={atStockLimit}
                      sx={{ height: "100%" }}
                    >
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
                        </Stack>
                        {tierPrices ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5, lineHeight: 1.3 }}
                          >
                            {tierPrices}
                          </Typography>
                        ) : null}
                        <Box
                          sx={{
                            mt: 1,
                            py: 0.5,
                            px: 0.75,
                            borderRadius: 1,
                            bgcolor:
                              surtidoMode && inBasket > 0
                                ? alpha(theme.palette.secondary.main, 0.12)
                                : theme.palette.mode === "dark"
                                  ? alpha(theme.palette.success.main, 0.16)
                                  : alpha(theme.palette.success.main, 0.1),
                            border: 1,
                            borderColor:
                              surtidoMode && inBasket > 0
                                ? alpha(theme.palette.secondary.main, 0.35)
                                : alpha(theme.palette.success.main, 0.35),
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={surtidoMode && inBasket > 0 ? "secondary.main" : "success.main"}
                          >
                            {surtidoMode
                              ? inBasket > 0
                                ? `En canasta: ${inBasket}`
                                : `+${selectedQty} al clic`
                              : `+${selectedQty} → $${cardTotal.toFixed(2)}`}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Stock: {stock}
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

      {surtidoMode ? (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {basketTotalUnits > 0
              ? `${basketTotalUnits} u. listas · estimado $${to2(basketEstimatedTotal).toFixed(2)}`
              : "Arma la canasta con los panes de arriba"}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={exitSurtidoMode}>
              Salir de canasta
            </Button>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              disabled={basketTotalUnits <= 0}
              onClick={handleConfirmSurtido}
            >
              Agregar canasta al carrito
            </Button>
          </Stack>
        </Box>
      ) : null}
    </Dialog>
  );
}
