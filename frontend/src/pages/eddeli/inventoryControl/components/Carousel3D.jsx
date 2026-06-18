import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";

/** Tarjetas físicas en el anillo 3D (pocas visibles, rotan por todo el catálogo). */
const WHEEL_SLOTS = 5;
const AUTO_MS = 4500;

/**
 * Carousel3D — listo para catálogo.
 * Muestra pocas tarjetas en el anillo pero recorre todos los productos al avanzar.
 */
export default function Carousel3D({
  title = "Productos",
  items = [],
  minHeight = 260,
  sectionFilter = "home",
  imageBase = "",
}) {
  const wheelRef = useRef(null);
  const stageRef = useRef(null);
  const [active, setActive] = useState(0);

  const CARD_W = 140;
  const CARD_H = 180;
  const centerSlot = Math.floor(WHEEL_SLOTS / 2);
  const stepDeg = 360 / WHEEL_SLOTS;

  const cards = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const filtered = sectionFilter
      ? list.filter((r) => (r?.section ? r.section === sectionFilter : true))
      : list;

    return filtered
      .filter((r) => r?.isActive !== false)
      .map((r) => {
        const product = r.product || {};
        const img = r.imageUrl || product.primaryImageUrl || "";
        const fullImg = img && imageBase ? `${imageBase}${img}` : img;
        const name = r.title || product.name || "Producto";
        const description = r.subtitle || "";
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
        };
      });
  }, [items, sectionFilter, imageBase]);

  const total = cards.length;

  const productAt = useCallback(
    (slotIndex) => {
      if (!total) return null;
      const offset = slotIndex - centerSlot;
      const idx = (active + offset + total * 16) % total;
      return cards[idx];
    },
    [active, cards, centerSlot, total],
  );

  const computeRadius = () => {
    const stage = stageRef.current;
    if (!stage) return 320;
    const stageW = stage.clientWidth || window.innerWidth;
    return Math.round(Math.min(Math.max(stageW * 0.33, 260), 360));
  };

  const renderCarousel = useCallback(() => {
    const wheel = wheelRef.current;
    if (!wheel || !total) return;

    const radius = computeRadius();

    for (let i = 0; i < WHEEL_SLOTS; i++) {
      const card = wheel.children[i];
      if (!card) continue;
      const rel = i - centerSlot;
      const ang = rel * stepDeg;
      const abs = Math.abs(rel);
      const scale = 1 - Math.min(abs * 0.08, 0.22);
      const opacity = 1 - Math.min(abs * 0.22, 0.65);

      card.style.transform = `rotateY(${ang}deg) translateZ(${radius}px) rotateY(${-ang}deg) scale(${scale})`;
      card.style.opacity = opacity.toFixed(2);
      card.style.filter = rel === 0 ? "none" : "brightness(.92)";
      card.style.zIndex = String(1000 - abs);
      card.style.pointerEvents = rel === 0 ? "auto" : "none";
    }
  }, [centerSlot, stepDeg, total]);

  const next = useCallback(() => {
    if (!total) return;
    setActive((i) => (i + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (!total) return;
    setActive((i) => (i - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    const id = requestAnimationFrame(renderCarousel);
    const onResize = () => renderCarousel();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [active, renderCarousel, total]);

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = setInterval(next, AUTO_MS);
    return () => clearInterval(timer);
  }, [next, total]);

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
        {total === 0 ? (
          <Box sx={{ textAlign: "center", color: "rgba(255,255,255,.7)" }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              No hay productos activos en esta sección.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              (Agrega ítems al catálogo en “{sectionFilter}”)
            </Typography>
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
            {Array.from({ length: WHEEL_SLOTS }, (_, slotIndex) => {
              const p = productAt(slotIndex);
              if (!p) return null;
              return (
                <Box
                  key={`slot-${slotIndex}`}
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
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.65) 100%)",
                    }}
                  />
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
              );
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "grid", justifyContent: "center", gap: 0.5 }}>
        <Typography align="center" color="rgba(255,255,255,.85)" fontSize={12} sx={{ m: 0 }}>
          {total ? `${active + 1}/${total}` : "0/0"}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Button variant="ctrl" size="small" onClick={prev} sx={{ minWidth: 32, px: 1 }} disabled={total <= 1}>
            ⟵
          </Button>
          <Button variant="ctrl" size="small" onClick={next} sx={{ minWidth: 32, px: 1 }} disabled={total <= 1}>
            ⟶
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
