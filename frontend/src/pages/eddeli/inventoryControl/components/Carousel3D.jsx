import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";

/**
 * Carousel3D — listo para catálogo.
 *
 * Espera `items` con la forma que devuelve tu catálogo (por ejemplo, desde getCatalogBySection/getCatalogBySections).
 * Soporta filtrado interno por sección (default: "home") y normaliza a los campos que necesita el carrusel.
 *
 * items (catálogo típico):
 * [
 *   {
 *     id, section, badge, imageUrl, position, isActive,
 *     product: { id, name, primaryImageUrl, price, ... },
 *     title?, subtitle?, priceOverride?
 *   },
 *   ...
 * ]
 *
 * Props:
 * - title: título visible
 * - items: array de entradas del catálogo
 * - minHeight: alto mínimo del escenario
 * - sectionFilter: sección a mostrar (por defecto "home")
 * - imageBase: prefijo de imagen (ej. pathImg) si tus URLs vienen relativas
 *
 * Nota: si `items` ya llega filtrado de tu API por sección, igual funciona: el filtro interno no “rompe”.
 */
export default function Carousel3D({
  title = "Productos",
  items = [],
  minHeight = 260,
  sectionFilter = "home",
  imageBase = "", // ej: pathImg, si tus imágenes del catálogo son rutas relativas
}) {
  const wheelRef = useRef(null);
  const stageRef = useRef(null);
  const indexRef = useRef(0);
  const stepRef = useRef(0);
  const [active, setActive] = useState(0);

  // 🔒 Tamaños fijos de card
  const CARD_W = 140;
  const CARD_H = 180;

  // --- Normalización para catálogo ---
  const cards = useMemo(() => {
    const list = Array.isArray(items) ? items : [];

    // 1) filtra por sección (si existe el campo)
    const filtered = sectionFilter
      ? list.filter((r) => (r?.section ? r.section === sectionFilter : true))
      : list;

    // 2) mapea al shape del carrusel
    return filtered
      .filter((r) => r?.isActive !== false) // activa por defecto
      .map((r) => {
        const product = r.product || {};
        // prioriza imageUrl del catálogo; si no, la del producto
        const img = r.imageUrl || product.primaryImageUrl || "";
        const fullImg = img && imageBase ? `${imageBase}${img}` : img;

        // título y descripción
        const name = r.title || product.name || "Producto";
        const description = r.subtitle || "";

        // precio visible: usa priceOverride si viene (number), si no el del producto
        const priceOverride =
          typeof r.priceOverride === "number"
            ? r.priceOverride
            : typeof product.price === "number"
            ? product.price
            : undefined;

        return {
          id: r.id,
          productId: product.id,
          name,
          description,
          imageUrl: fullImg,
          priceOverride,
          section: r.section,
          badge: r.badge,
          position: r.position,
          isActive: r.isActive,
          createdBy: r.createdBy,
        };
      });
  }, [items, sectionFilter, imageBase]);

  // --- Lógica 3D ---
  const computeRadius = () => {
    const stage = stageRef.current;
    if (!stage) return 320;
    const stageW = stage.clientWidth || window.innerWidth;
    return Math.round(Math.min(Math.max(stageW * 0.33, 260), 360));
  };

  const renderCarousel = () => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const N = wheel.children.length;
    if (N === 0) return;

    const radius = computeRadius();
    const idx = indexRef.current;
    const step = stepRef.current;

    for (let i = 0; i < N; i++) {
      const card = wheel.children[i];
      let rel = i - idx;
      if (rel > N / 2) rel -= N;
      if (rel < -N / 2) rel += N;

      const ang = rel * step;
      const abs = Math.abs(rel);
      const scale = 1 - Math.min(abs * 0.06, 0.18);
      const opacity = 1 - Math.min(abs * 0.15, 0.55);

      card.style.transform = `rotateY(${ang}deg) translateZ(${radius}px) rotateY(${-ang}deg) scale(${scale})`;
      card.style.opacity = opacity.toFixed(2);
      card.style.filter = rel === 0 ? "none" : "brightness(.92)";
      card.style.zIndex = String(1000 - abs);
    }
  };

  const syncAndRender = () => {
    setActive(indexRef.current);
    renderCarousel();
  };

  const next = () => {
    const N = wheelRef.current?.children.length ?? 0;
    if (N === 0) return;
    indexRef.current = (indexRef.current + 1 + N) % N;
    syncAndRender();
  };

  const prev = () => {
    const N = wheelRef.current?.children.length ?? 0;
    if (N === 0) return;
    indexRef.current = (indexRef.current - 1 + N) % N;
    syncAndRender();
  };

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const N = wheel.children.length;
    if (N === 0) return;

    stepRef.current = 360 / N;
    indexRef.current = 0;
    setActive(0);

    const id = requestAnimationFrame(renderCarousel);
    const onResize = () => renderCarousel();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  return (
    <Paper
      variant="panel"
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        p: 1,
        gap: 0.5,
        overflow: "hidden",
      }}
    >
      <Typography variant="h6" align="center" color="secondary" sx={{ m: 0 }}>
        {title}
      </Typography>

      {/* Stage principal */}
      <Box
        ref={stageRef}
        sx={{
          position: "relative",
          minHeight,
          borderRadius: 12,
          perspective: "1000px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cards.length === 0 ? (
          // Placeholder si no hay productos
          <Box sx={{ textAlign: "center", color: "rgba(255,255,255,.7)" }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              No hay productos activos en esta sección.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              (Agrega ítems al catálogo en “{sectionFilter}”)
            </Typography>

            <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "center" }}>
              {["Ejemplo A", "Ejemplo B", "Ejemplo C"].map((name, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 140,
                    height: 180,
                    borderRadius: 1,
                    bgcolor: "rgba(255,255,255,.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "rgba(255,255,255,.6)",
                    boxShadow:
                      "0 4px 10px rgba(0,0,0,.3), inset 0 0 0 1px rgba(255,255,255,.05)",
                  }}
                >
                  {name}
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box
            ref={wheelRef}
            sx={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transition: "transform 500ms cubic-bezier(.22,.61,.36,1)",
            }}
          >
            {cards.map((p, i) => (
              <Box
                key={p.id || i}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: CARD_W,
                  height: CARD_H,
                  translate: "-50% -50%",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transition:
                    "transform 500ms cubic-bezier(.22,.61,.36,1), opacity 500ms linear, filter 500ms linear",
                  borderRadius: 1,
                  overflow: "hidden",
                  boxShadow:
                    "0 6px 16px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.06)",
                }}
              >
                {/* Imagen */}
                <Box
                  component="img"
                  src={p.imageUrl}
                  alt={p.name}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Scrim */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.65) 100%)",
                  }}
                />

                {/* Badge */}
                {p.badge && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 999,
                      background: "rgba(246,196,69,.95)",
                      color: "#2d1c05",
                      fontWeight: 800,
                      fontSize: 10,
                      boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                    }}
                  >
                    {p.badge}
                  </Box>
                )}

                {/* Texto */}
                <Box sx={{ position: "absolute", left: 8, right: 8, bottom: 8 }}>
                  <Typography
                    color="secondary"
                    fontWeight={800}
                    fontSize={13}
                    lineHeight={1.15}
                    sx={{
                      textShadow: "0 2px 6px rgba(0,0,0,.6)",
                      mb: 0.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </Typography>

                  {!!p.description && (
                    <Typography
                      color="rgba(255,255,255,.95)"
                      fontSize={11}
                      lineHeight={1.25}
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textShadow: "0 2px 6px rgba(0,0,0,.5)",
                      }}
                    >
                      {p.description}
                    </Typography>
                  )}

                  {typeof p.priceOverride === "number" && (
                    <Typography
                      color="secondary"
                      fontWeight={700}
                      fontSize={12}
                      sx={{ mt: 0.25, textShadow: "0 2px 6px rgba(0,0,0,.5)" }}
                    >
                      {new Intl.NumberFormat("es-EC", {
                        style: "currency",
                        currency: "USD",
                      }).format(p.priceOverride)}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Indicador + Flechas */}
      <Box sx={{ display: "grid", justifyContent: "center", gap: 0.5 }}>
        <Typography align="center" color="rgba(255,255,255,.85)" fontSize={12} sx={{ m: 0 }}>
          {cards.length ? `${active + 1}/${cards.length}` : "0/0"}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Button variant="ctrl" size="small" onClick={prev} sx={{ minWidth: 32, px: 1 }}>
            ⟵
          </Button>
          <Button variant="ctrl" size="small" onClick={next} sx={{ minWidth: 32, px: 1 }}>
            ⟶
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
