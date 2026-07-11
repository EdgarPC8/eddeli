import { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Grid,
  CardMedia,
  CardContent,
  Button,
  Box,
  Paper as CardPaper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  IconButton,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import { buildImageUrl } from "../../../../api/axios";
import {
  locationKindChipColor,
  locationKindHint,
  locationKindLabel,
  normalizeLocationKind,
  sortStoresByKind,
} from "../../../../utils/storeLocationKind.js";

/** items: [{ id, name, address, ..., locationKind: 'propia'|'vitrina' }] */
export default function StoresPanel({
  title = "Locales",
  items = [],
  maxVisible = 4,
  onStoreClick, // opcional: callback(store) cuando se abre el diálogo
  /** Si se pasa, al abrir el detalle se cargan productos del local (vista pública). */
  loadStoreProducts,
  /** Etiquetas orientadas al público (punto de venta / vitrina). */
  publicFacing = true,
  /** Vista pública: incluir sucursales propias. */
  showPropia = true,
  /** Vista pública: incluir vitrinas. */
  showVitrina = true,
}) {
  const theme = useTheme();
  const [kindFilter, setKindFilter] = useState("all"); // all | propia | vitrina
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsErr, setProductsErr] = useState("");

  const allowedItems = useMemo(() => {
    return items.filter((s) => {
      const kind = normalizeLocationKind(s.locationKind);
      if (kind === "propia") return showPropia !== false;
      return showVitrina !== false;
    });
  }, [items, showPropia, showVitrina]);

  const sortedItems = useMemo(() => sortStoresByKind(allowedItems), [allowedItems]);

  const counts = useMemo(() => {
    let propia = 0;
    let vitrina = 0;
    for (const s of sortedItems) {
      if (normalizeLocationKind(s.locationKind) === "propia") propia += 1;
      else vitrina += 1;
    }
    return { all: sortedItems.length, propia, vitrina };
  }, [sortedItems]);

  useEffect(() => {
    if (kindFilter === "propia" && counts.propia === 0) setKindFilter("all");
    if (kindFilter === "vitrina" && counts.vitrina === 0) setKindFilter("all");
  }, [kindFilter, counts.propia, counts.vitrina]);

  const filteredItems = useMemo(() => {
    if (kindFilter === "all") return sortedItems;
    return sortedItems.filter(
      (s) => normalizeLocationKind(s.locationKind) === kindFilter,
    );
  }, [sortedItems, kindFilter]);

  const hasOverflow = useMemo(
    () => filteredItems.length > maxVisible,
    [filteredItems.length, maxVisible],
  );
  const visibleItems =
    expanded || !hasOverflow ? filteredItems : filteredItems.slice(0, maxVisible);

  useEffect(() => {
    setExpanded(false);
  }, [kindFilter]);

  const kindChip = (kind, size = "small") => {
    const k = normalizeLocationKind(kind);
    const Icon = k === "propia" ? StorefrontRoundedIcon : LocalMallRoundedIcon;
    return (
      <Chip
        size={size}
        icon={<Icon sx={{ fontSize: "16px !important" }} />}
        color={locationKindChipColor(k)}
        variant={k === "propia" ? "filled" : "outlined"}
        label={locationKindLabel(k, { publicFacing })}
        sx={{ fontWeight: 700, height: size === "small" ? 24 : 28 }}
      />
    );
  };

  // Alturas de la tarjeta
  const CARD_H = 180;
  const IMG_H = 100;

  // Colores
  const titleColor =
    theme.palette.customMode === "neon"
      ? theme.palette.secondary.main
      : theme.palette.text.primary;

  const nameColor =
    theme.palette.mode === "light"
      ? theme.palette.text.primary
      : alpha(theme.palette.common.white, 0.95);

  const addressColor =
    theme.palette.mode === "light"
      ? alpha(theme.palette.text.primary, 0.75)
      : alpha(theme.palette.common.white, 0.85);

  const borderTone = alpha(theme.palette.divider, 0.5);

  const placeholderImg = (mode) =>
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='${
        mode === "dark" ? "#11161d" : "#eee"
      }'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='${
        mode === "dark" ? "#8aa" : "#666"
      }'>Sin imagen</text></svg>`
    );

  const handleOpen = (store) => {
    setActive(store);
    setOpen(true);
    setStoreProducts([]);
    setProductsErr("");
    if (typeof onStoreClick === "function") onStoreClick(store);
  };
  const handleClose = () => {
    setOpen(false);
    setStoreProducts([]);
    setProductsErr("");
    setLoadingProducts(false);
  };

  useEffect(() => {
    if (!open || !active?.id || typeof loadStoreProducts !== "function") {
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setProductsErr("");
    loadStoreProducts(active.id)
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : raw?.data ?? [];
        setStoreProducts(list);
      })
      .catch(() => {
        if (!cancelled) {
          setProductsErr("No se pudieron cargar los productos de este punto.");
          setStoreProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, active?.id, loadStoreProducts]);

  // URL para abrir Google Maps (preferir coords > texto)
  const mapsHref = (store) => {
    if (!store) return "https://www.google.com/maps";
    const hasCoords =
      typeof store.latitude === "number" &&
      typeof store.longitude === "number" &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude);

    if (hasCoords) {
      // precisión máxima
      return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
    }

    const q = encodeURIComponent(
      [store?.address, store?.city, store?.province].filter(Boolean).join(", ")
    );
    return `https://www.google.com/maps/search/?api=1&query=${q || "Ecuador"}`;
  };

  // URL para iframe de previsualización (coords > texto). No requiere API key.
  const mapsEmbedSrc = (store) => {
    if (!store) return null;

    const hasCoords =
      typeof store.latitude === "number" &&
      typeof store.longitude === "number" &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude);

    const zoom = 14;
    if (hasCoords) {
      // Vista centrada en lat/lng
      return `https://maps.google.com/maps?q=${store.latitude},${store.longitude}&z=${zoom}&output=embed`;
    }

    const q = encodeURIComponent(
      [store?.address, store?.city, store?.province].filter(Boolean).join(", ")
    );
    if (!q) return null;
    return `https://maps.google.com/maps?q=${q}&z=${zoom}&output=embed`;
  };

  return (
    <>
      <Paper
        variant="panel"
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Typography variant="h6" align="center" sx={{ mb: 1, color: titleColor }}>
          {title}
        </Typography>

        {(counts.propia > 0 || counts.vitrina > 0) && (
          <Stack
            direction="row"
            spacing={0.75}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 1.5 }}
          >
            <Chip
              size="small"
              clickable
              color={kindFilter === "all" ? "primary" : "default"}
              variant={kindFilter === "all" ? "filled" : "outlined"}
              label={`Todos (${counts.all})`}
              onClick={() => setKindFilter("all")}
              sx={{ fontWeight: 700 }}
            />
            {counts.propia > 0 && (
              <Chip
                size="small"
                clickable
                color={kindFilter === "propia" ? "primary" : "default"}
                variant={kindFilter === "propia" ? "filled" : "outlined"}
                icon={<StorefrontRoundedIcon sx={{ fontSize: "16px !important" }} />}
                label={`${locationKindLabel("propia", { publicFacing })} (${counts.propia})`}
                onClick={() => setKindFilter("propia")}
                sx={{ fontWeight: 700 }}
              />
            )}
            {counts.vitrina > 0 && (
              <Chip
                size="small"
                clickable
                color={kindFilter === "vitrina" ? "primary" : "default"}
                variant={kindFilter === "vitrina" ? "filled" : "outlined"}
                icon={<LocalMallRoundedIcon sx={{ fontSize: "16px !important" }} />}
                label={`${locationKindLabel("vitrina", { publicFacing })} (${counts.vitrina})`}
                onClick={() => setKindFilter("vitrina")}
                sx={{ fontWeight: 700 }}
              />
            )}
          </Stack>
        )}

        {filteredItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            No hay locales en este filtro.
          </Typography>
        ) : null}

        <Grid container spacing={2}>
          {visibleItems.map((s, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${s.id ?? s.name}-${i}`}>
              <CardPaper
                role="button"
                aria-label={`Ver detalles de ${s.name}`}
                onClick={() => handleOpen(s)}
                variant="panel"
                sx={{
                  p: 1,
                  borderRadius: 2,
                  overflow: "hidden",
                  textAlign: "center",
                  height: CARD_H + 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  cursor: "pointer",
                  transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                  border: `1px solid ${borderTone}`,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 10px 22px rgba(0,0,0,.45)"
                        : "0 10px 22px rgba(0,0,0,.12)",
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                  },
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="img"
                    image={s.img || placeholderImg(theme.palette.mode)}
                    alt={s.name}
                    sx={{
                      width: "100%",
                      height: IMG_H,
                      objectFit: "cover",
                      borderRadius: 1.25,
                      mb: 0.75,
                      flexShrink: 0,
                      border: `1px solid ${borderTone}`,
                    }}
                    onError={(e) => {
                      e.currentTarget.src = placeholderImg(theme.palette.mode);
                    }}
                  />
                  <Box sx={{ position: "absolute", top: 6, left: 6 }}>
                    {kindChip(s.locationKind)}
                  </Box>
                </Box>

                <CardContent
                  sx={{
                    p: 0.5,
                    pt: 0.25,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    fontWeight={800}
                    fontSize="0.92rem"
                    lineHeight={1.1}
                    sx={{
                      color: nameColor,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={s.name}
                  >
                    {s.name}
                  </Typography>

                  <Typography
                    fontSize="0.78rem"
                    lineHeight={1.1}
                    sx={{
                      color: addressColor,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      mt: 0.3,
                    }}
                    title={s.address}
                  >
                    {s.address}
                  </Typography>
                </CardContent>
              </CardPaper>
            </Grid>
          ))}
        </Grid>

        {hasOverflow && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button variant="ctrl" onClick={() => setExpanded((v) => !v)}>
              {expanded
                ? "Mostrar menos"
                : `Ver más (${filteredItems.length - maxVisible})`}
            </Button>
          </Box>
        )}
      </Paper>

      {/* ===== Diálogo de detalle ===== */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          },
        }}
      >
        {/* Header con botón cerrar */}
        <DialogTitle
          sx={{
            pr: 6,
            py: 1.25,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {active?.name || "Local"}
          {active ? kindChip(active.locationKind) : null}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Cerrar">
            <IconButton onClick={handleClose} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        {/* Imagen grande */}
        <Box sx={{ px: 2 }}>
          <Box
            component="img"
            src={active?.img || placeholderImg(theme.palette.mode)}
            alt={active?.name || "store"}
            onError={(e) => {
              e.currentTarget.src = placeholderImg(theme.palette.mode);
            }}
            style={{
              width: "100%",
              height: 220,
              objectFit: "cover",
              borderRadius: 12,
              border: `1px solid ${borderTone}`,
            }}
          />
        </Box>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1.25}>
            {active && (
              <Typography variant="body2" color="text.secondary">
                {locationKindHint(active.locationKind, { publicFacing })}
              </Typography>
            )}

            {/* Chips de ubicación */}
            {(active?.city || active?.province) && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {active?.city && <Chip size="small" label={active.city} />}
                {active?.province && <Chip size="small" label={active.province} />}
              </Stack>
            )}

            {/* Dirección */}
            {active?.address && (
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <PlaceRoundedIcon fontSize="small" />
                <Typography variant="body2" sx={{ mt: "1px" }}>
                  {active.address}
                </Typography>
              </Stack>
            )}

            {/* Teléfono */}
            {active?.phone && (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <PhoneIphoneRoundedIcon fontSize="small" />
                <Button
                  variant="text"
                  size="small"
                  href={`tel:${active.phone}`}
                  sx={{ textTransform: "none", px: 0 }}
                >
                  {active.phone}
                </Button>
              </Stack>
            )}

            {/* Email */}
            {active?.email && (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <EmailRoundedIcon fontSize="small" />
                <Button
                  variant="text"
                  size="small"
                  href={`mailto:${active.email}`}
                  sx={{ textTransform: "none", px: 0 }}
                >
                  {active.email}
                </Button>
              </Stack>
            )}

            {/* Mini mapa (si hay datos suficientes) */}
            {(() => {
              const src = mapsEmbedSrc(active || {});
              if (!src) return null;
              return (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      width: "100%",
                      height: 220,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: `1px solid ${borderTone}`,
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
                </>
              );
            })()}

            {/* Descripción */}
            {active?.description && (
              <>
                <Divider />
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {active.description}
                </Typography>
              </>
            )}

            {typeof loadStoreProducts === "function" && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  Productos en este punto
                </Typography>
                {loadingProducts ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : productsErr ? (
                  <Typography variant="body2" color="text.secondary">
                    {productsErr}
                  </Typography>
                ) : storeProducts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay productos publicados para este local.
                  </Typography>
                ) : (
                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    {storeProducts.map((row) => {
                      const p = row?.product || row;
                      const name = p?.name || "Producto";
                      const price = Number(p?.price ?? 0);
                      const priceLabel = new Intl.NumberFormat("es-EC", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                      }).format(price);
                      const imgSrc = buildImageUrl(p?.primaryImageUrl);
                      return (
                        <Grid item xs={12} key={row?.linkId ?? row?.productId ?? p?.id ?? name}>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              border: `1px solid ${borderTone}`,
                              bgcolor: alpha(theme.palette.background.paper, 0.6),
                            }}
                          >
                            <Box
                              component="img"
                              src={imgSrc || placeholderImg(theme.palette.mode)}
                              alt={name}
                              onError={(e) => {
                                e.currentTarget.src = placeholderImg(theme.palette.mode);
                              }}
                              sx={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 1,
                                flexShrink: 0,
                              }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" fontWeight={600} noWrap title={name}>
                                {name}
                              </Typography>
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center">
                                <Typography variant="caption" color="primary">
                                  {priceLabel}
                                </Typography>
                                {p?.category ? (
                                  <Chip size="small" label={p.category} variant="outlined" />
                                ) : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={handleClose}>Cerrar</Button>
          <Button
            variant="contained"
            href={mapsHref(active || {})}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<PlaceRoundedIcon />}
          >
            Ver en Maps
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
