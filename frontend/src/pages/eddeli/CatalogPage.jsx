// CatalogoPage.jsx (catálogo general, responsivo con Tabs → Select en móvil)
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Tooltip,
  useMediaQuery,
  Accordion, AccordionSummary, AccordionDetails,
  Divider,
  Button,
  Alert,
  Container,

} from "@mui/material";
import { useTheme,alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StarIcon from "@mui/icons-material/Star";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CalculateIcon from "@mui/icons-material/Calculate";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { getCatalogBySection, getPublicCategories, getPublicCompareGroups } from "../../api/inventoryControlRequest";
import { pathImg } from "../../api/axios";
import { useAppSettings } from "../../context/AppSettingsContext.jsx";
import ProductCompareTable from "../../components/eddeli/ProductCompareTable";
import {
  buildCategoryFilterOptions,
  indexCategories,
  productMatchesCategoryFilter,
} from "../../utils/categoryUtils.js";



import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SimpleDialog from "../../components/Dialogs/SimpleDialog";

// asumo que ya existen en tu proyecto:
/// import SmartProductImage from "./SmartProductImage";
/// import PriceDisplay from "./PriceDisplay";
/// import WholesaleCalculator from "./WholesaleCalculator";
/// import { toImageSrc } from "../utils/toImageSrc";

// -------------------- Utilidades --------------------
const currency = (n) => `$${Number(n || 0).toFixed(2)}`;

const applyWholesale = (basePrice, qty, tiers = []) => {
  if (!qty || qty <= 0) return { unitPrice: basePrice, discountApplied: 0 };
  let discount = 0;
  tiers?.forEach((t) => {
    if (qty >= t.minQty && Number(t.discountPercent || 0) > discount) {
      discount = Number(t.discountPercent || 0);
    }
  });
  const unitPrice = basePrice * (1 - discount / 100);
  return { unitPrice, discountApplied: discount };
};

function StatusBadge({ status }) {
  const s = status || "";
  const icon =
    s === "Listo ahora" ? (
      <CheckCircleIcon fontSize="inherit" />
    ) : s.toLowerCase().includes("hornea") ? (
      <WhatshotIcon fontSize="inherit" />
    ) : (
      <AccessTimeIcon fontSize="inherit" />
    );

  const color =
    s === "Listo ahora" ? "success" : s.toLowerCase().includes("hornea") ? "warning" : "default";

  return (
    <Chip
      icon={icon}
      label={s || "—"}
      color={color}
      size="small"
      variant={color === "default" ? "outlined" : "filled"}
      sx={{ fontWeight: 600 }}
    />
  );
}

function PriceDisplay({ product, qty = 0 }) {
  const base = Number(product.price || 0);
  const { unitPrice, discountApplied } = applyWholesale(
    base,
    qty,
    product.wholesaleTiers
  );
  const hasDiscount = discountApplied > 0;
  const total = unitPrice * (qty || 0);

  return (
    <Stack spacing={0.5}>
      {/* Precio unitario */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6" fontWeight={800}>
          {currency(unitPrice)}
        </Typography>
        {hasDiscount && (
          <Chip size="small" color="success" label={`-${discountApplied}% mayorista`} />
        )}
      </Stack>

      {hasDiscount && (
        <Typography variant="caption" color="text.secondary">
          Precio base: {currency(base)}
        </Typography>
      )}

      {/* 🔹 Total estimado en función de la cantidad */}
      {qty > 0 && (
        <Typography variant="body2" color="text.secondary">
          Total estimado ({qty} {qty === 1 ? "unidad" : "unidades"}):{" "}
          <strong>{currency(total)}</strong>
        </Typography>
      )}
    </Stack>
  );
}


function WholesaleCalculator({ product }) {
  const [qty, setQty] = useState(12);
  const base = Number(product.price || 0);
  const { unitPrice, discountApplied } = applyWholesale(base, qty, product.wholesaleTiers);
  const total = unitPrice * qty;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <CalculateIcon fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>
            Calculadora mayorista
          </Typography>
          <Tooltip title="Ingresa una cantidad y te mostramos el precio por unidad con el descuento aplicado.">
            <InfoOutlinedIcon fontSize="small" />
          </Tooltip>
        </Stack>

        <TextField
          type="number"
          size="small"
          label="Cantidad"
          value={qty}
          onChange={(e) => setQty(Math.max(0, parseInt(e.target.value || 0, 10)))}
          inputProps={{ min: 0, step: 1, inputMode: "numeric", pattern: "[0-9]*" }}
          fullWidth
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2">
            Unidad {discountApplied ? `(desc. ${discountApplied}%)` : ""}:
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {currency(unitPrice)}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2">Total estimado:</Typography>
          <Typography variant="body1" fontWeight={800}>
            {currency(total)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

// Prefijo imagen si viene filename del backend
const toImageSrc = (maybeFilenameOrUrl) => {
  if (!maybeFilenameOrUrl) return "";
  if (
    /^https?:\/\//i.test(maybeFilenameOrUrl) ||
    maybeFilenameOrUrl.startsWith("data:") ||
    maybeFilenameOrUrl.startsWith("/")
  ) {
    return maybeFilenameOrUrl;
  }
  return `${pathImg}${maybeFilenameOrUrl}`;
};


function SmartProductImage({ src, alt, heights = { xs: 160, sm: 180, md: 200 } }) {
  const [imgSrc, setImgSrc] = React.useState(src || "");
  const [mode, setMode] = React.useState("unknown"); // 'cover-16-9' | 'contain-blur' | 'empty'

  const fallbackSvg = (txt) =>
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
         <defs>
           <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
             <stop offset='0%' stop-color='#e0e0e0'/>
             <stop offset='100%' stop-color='#f5f5f5'/>
           </linearGradient>
         </defs>
         <rect width='100%' height='100%' fill='url(#g)'/>
         <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
               font-family='Arial' font-size='42' fill='#9e9e9e' opacity='0.8'>
           ${txt || "Sin imagen"}
         </text>
       </svg>`
    );

  React.useEffect(() => {
    if (!src) {
      setImgSrc("");
      setMode("empty");
    } else {
      setImgSrc(src);
      setMode("unknown");
    }
  }, [src]);

  const handleLoad = (e) => {
    const el = e.currentTarget;
    if (!el || !el.naturalWidth || !el.naturalHeight) return;
    const ar = el.naturalWidth / el.naturalHeight;
    const is16x9 = Math.abs(ar - 16 / 9) <= 0.06;
    setMode(is16x9 ? "cover-16-9" : "contain-blur");
  };

  const showAspect16x9 =
    mode === "cover-16-9" || mode === "unknown" || mode === "empty";

  // Fuente final para el <img>: SIEMPRE renderizamos imagen (tu src o el fallback)
  const finalSrc = imgSrc || fallbackSvg(alt);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderTopLeftRadius: (t) => t.shape.borderRadius * 3,
        borderTopRightRadius: (t) => t.shape.borderRadius * 3,
        // Mantener 16:9 en empty/unknown/16:9; para otros, usamos alturas responsivas
        ...(showAspect16x9
          ? { aspectRatio: "16 / 9" }
          : { height: heights }),
        bgcolor: "background.default",
      }}
    >
      {/* Blur de fondo SOLO cuando no es 16:9 */}
      {mode === "contain-blur" && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${finalSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(22px)",
            transform: "scale(1.15)",
            opacity: 0.6,
          }}
        />
      )}

      {/* Imagen principal — SIEMPRE visible */}
      <Box
        component="img"
        src={finalSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={() => {
          // Si falla tu imagen, caemos al fallback pero mantenemos el <img>
          setImgSrc("");
          setMode("empty");
        }}
        sx={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          // 16:9 → cover; otros → contain (centrado)
          objectFit: showAspect16x9 ? "cover" : "contain",
          objectPosition: "center",
        }}
        loading="lazy"
        decoding="async"
      />
    </Box>
  );
}




function ProductCard({ entry, onPreview }) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const p = entry.product || {};
  const overrideImg = toImageSrc(entry.imageUrl);
  const productImg = toImageSrc(p.primaryImageUrl);
  const img = overrideImg || productImg || "";

  const wholesaleTiers =
    entry.wholesaleOverrideRules && entry.wholesaleOverrideRules.length > 0
      ? entry.wholesaleOverrideRules
      : Array.isArray(p.wholesaleRules)
      ? p.wholesaleRules
      : typeof p.wholesaleRules === "string"
      ? JSON.parse(p.wholesaleRules || "[]")
      : [];

  const weight =
    p.standardWeightGrams > 0 ? `${p.standardWeightGrams} g` : undefined;

  // 🔹 Mínimo por pedido (si viene null/0, usamos 1)
  const minOrderQty =
    typeof entry.minOrderQty === "number" && entry.minOrderQty > 0
      ? entry.minOrderQty
      : 1;

  // 🔹 Iniciamos el cálculo con el mínimo sugerido
  const [qtyCalc, setQtyCalc] = useState(minOrderQty);

  const hasDesc = Boolean(p.desc && String(p.desc).trim().length > 0);
  const [openDesc, setOpenDesc] = useState(false);

  return (
    <Card
      sx={{ borderRadius: 3, height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* Imagen clickeable */}
      <Box onClick={() => onPreview && onPreview(entry)} sx={{ cursor: "pointer" }}>
        <SmartProductImage
          src={img}
          alt={p.name}
          heights={{ xs: 160, sm: 180, md: 200 }}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          mb={1}
          flexWrap="wrap"
          rowGap={0.5}
        >
          {entry.badge && (
            <Chip
              size="small"
              color="primary"
              label={entry.badge}
              sx={{ fontWeight: 700 }}
            />
          )}
          {p.isUniqueToday && (
            <Chip
              size="small"
              color="warning"
              icon={<StarIcon />}
              label="ÚNICO del día"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        <Typography
          variant={isXs ? "subtitle1" : "h6"}
          fontWeight={800}
          gutterBottom
          sx={{ lineHeight: 1.2 }}
        >
          {entry.title || p.name}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          mb={1}
          rowGap={0.5}
        >
          {p.unitAbbr && (
            <Chip size="small" icon={<BakeryDiningIcon />} label={p.unitAbbr} />
          )}
          {weight && (
            <Chip size="small" icon={<Inventory2Icon />} label={weight} />
          )}
          {p.tags?.map((t) => (
            <Chip key={t} size="small" label={t} />
          ))}
        </Stack>

        {/* 🔹 Cantidad para cálculo + Precio, respetando el mínimo */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          mb={1}
        >
          <TextField
            type="number"
            size="small"
            label="Cant. para cálculo"
            value={qtyCalc}
            onChange={(e) => {
              const val = parseInt(e.target.value || 0, 10);
              // Nunca bajar del mínimo
              setQtyCalc(Math.max(minOrderQty, Number.isNaN(val) ? minOrderQty : val));
            }}
            inputProps={{
              min: minOrderQty,
              step: 1,
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            sx={{ width: { xs: "100%", sm: 160 } }}
            helperText={`Pedido mínimo: ${minOrderQty} ${
              minOrderQty === 1 ? "unidad" : "unidades"
            }`}
          />
          <PriceDisplay product={{ ...p, wholesaleTiers }} qty={qtyCalc} />
        </Stack>

        {/* 🔹 Calculadora mayorista (sigue igual, solo usando reglas) */}
        <WholesaleCalculator product={{ ...p, wholesaleTiers }} />

        {hasDesc && (
          <Accordion
            expanded={openDesc}
            onChange={(_, v) => setOpenDesc(v)}
            disableGutters
            elevation={0}
            sx={{
              mt: 1,
              bgcolor: "transparent",
              borderTop: "1px dashed",
              borderColor: alpha(theme.palette.divider, 0.6),
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="product-desc-content"
              id="product-desc-header"
              sx={{
                minHeight: 40,
                "& .MuiAccordionSummary-content": { my: 0.5 },
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {openDesc ? "Ocultar descripción" : "Ver descripción"}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}
              >
                {p.desc}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function getGroupPrices(group) {
  const prices = [];
  for (const variant of group?.variants || []) {
    for (const cell of Object.values(variant.cells || {})) {
      const price = Number(cell?.product?.price);
      if (Number.isFinite(price)) prices.push(price);
    }
  }
  return prices;
}

function getGroupCoverImage(group) {
  if (group?.imageUrl) {
    const url = group.imageUrl;
    if (url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")) return url;
    return `${pathImg}${url}`;
  }
  for (const variant of group?.variants || []) {
    for (const cell of Object.values(variant.cells || {})) {
      const img = cell?.product?.primaryImageUrl;
      if (img) return toImageSrc(img);
    }
  }
  return "";
}

function getGroupCardTitle(group) {
  const name = String(group?.name || "productos").trim();
  if (/^grupo\s+de/i.test(name)) return name;
  return `Grupo de ${name}`;
}

function CompareGroupCard({ group, onPreview }) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const img = getGroupCoverImage(group);
  const prices = getGroupPrices(group);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const variantCount = (group?.variants || []).length;
  const productCount = group?.productIds?.length || prices.length;

  return (
    <Card
      sx={{
        borderRadius: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Box onClick={() => onPreview?.(group)} sx={{ cursor: "pointer" }}>
        <SmartProductImage
          src={img}
          alt={getGroupCardTitle(group)}
          heights={{ xs: 160, sm: 180, md: 200 }}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap" rowGap={0.5}>
          <Chip
            size="small"
            color="primary"
            icon={<CompareArrowsIcon />}
            label="Grupo"
            sx={{ fontWeight: 700 }}
          />
          {variantCount > 1 && (
            <Chip size="small" variant="outlined" label={`${variantCount} sabores`} />
          )}
        </Stack>

        <Typography
          variant={isXs ? "subtitle1" : "h6"}
          fontWeight={800}
          gutterBottom
          sx={{ lineHeight: 1.2 }}
        >
          {getGroupCardTitle(group)}
        </Typography>

        {group?.subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {group.subtitle}
          </Typography>
        )}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1.5} rowGap={0.5}>
          <Chip size="small" icon={<BakeryDiningIcon />} label={`${productCount} opciones`} />
        </Stack>

        <Stack spacing={0.5} mb={1.5}>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {minPrice === maxPrice
              ? currency(minPrice)
              : `Desde ${currency(minPrice)}`}
          </Typography>
          {minPrice !== maxPrice && (
            <Typography variant="caption" color="text.secondary">
              Hasta {currency(maxPrice)} según tamaño y tipo
            </Typography>
          )}
        </Stack>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<CompareArrowsIcon />}
          onClick={() => onPreview?.(group)}
          sx={{ fontWeight: 700 }}
        >
          Ver precios y opciones
        </Button>
      </CardContent>
    </Card>
  );
}


// -------------------- Secciones de catálogo --------------------
const SECTIONS = [
  { value: "home", label: "Inicio" },
  { value: "ofertas", label: "Ofertas" },
  { value: "recomendados", label: "Recomendados" },
  { value: "bajo_pedido", label: "Bajo pedido" },
  { value: "novedades", label: "Novedades" },
  { value: "descuentos", label: "Descuentos" },
  { value: "populares", label: "Populares" },
  { value: "temporada", label: "Temporada" },
  { value: "especiales", label: "Especiales" },
  { value: "limitados", label: "Limitados" },
];

export default function CatalogoPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const { activeApp } = useAppSettings();
  const showCatalog = activeApp?.showPublicCatalog !== false;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [sort, setSort] = useState("default");
  const [section, setSection] = useState("home");

  const [categoryList, setCategoryList] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([
    { value: "todas", label: "Todas" },
  ]);
  const [entries, setEntries] = useState([]);
  const [compareGroups, setCompareGroups] = useState([]);
  const [loading, setLoading] = useState(false);

// ✅ Preview (SimpleDialog)
const [previewOpen, setPreviewOpen] = useState(false);
const [previewEntry, setPreviewEntry] = useState(null);
const [previewGroupParent, setPreviewGroupParent] = useState(null);

const handlePreview = (entry) => {
  setPreviewGroupParent(null);
  setPreviewEntry({ type: "product", ...entry });
  setPreviewOpen(true);
};

const handleCompareGroupPreview = (group) => {
  setPreviewGroupParent(null);
  setPreviewEntry({
    type: "compareGroup",
    compareGroup: group,
    title: getGroupCardTitle(group),
  });
  setPreviewOpen(true);
};

const handleCompareProductSelect = (product, group) => {
  setPreviewGroupParent(group);
  setPreviewEntry({
    type: "product",
    id: `compare-${product.id}`,
    title: product.name,
    product: {
      ...product,
      wholesaleRules: [],
      wholesaleTiers: [],
    },
  });
};

const handleBackToGroup = () => {
  if (!previewGroupParent) return;
  handleCompareGroupPreview(previewGroupParent);
};

const handleClosePreview = () => {
  setPreviewOpen(false);
  setPreviewEntry(null);
  setPreviewGroupParent(null);
};


  // Cargar categorías públicas (árbol padre/subcategoría)
  const fetchCategories = async () => {
    try {
      const { data } = await getPublicCategories();
      const list = Array.isArray(data) ? data : [];
      setCategoryList(list);
      const opts = [
        { value: "todas", label: "Todas" },
        ...buildCategoryFilterOptions(list),
      ];
      setCategoryOptions(opts);
      setCategory((prev) =>
        opts.some((o) => o.value === prev) ? prev : "todas",
      );
    } catch (e) {
      console.error("Error cargando categorías:", e);
      setCategoryList([]);
      setCategoryOptions([{ value: "todas", label: "Todas" }]);
      setCategory("todas");
    }
  };

  // Cargar catálogo por sección
  const fetchSection = async (sec) => {
    setLoading(true);
    try {
      const [catalogRes, groupsRes] = await Promise.all([
        getCatalogBySection(sec, { onlyActive: true }),
        getPublicCompareGroups({ section: sec, onlyActive: true }),
      ]);
      const rows = Array.isArray(catalogRes.data) ? catalogRes.data : [];
      rows.sort((a, b) => (a.position || 0) - (b.position || 0));
      setEntries(rows);
      setCompareGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch (e) {
      console.error("Error cargando sección:", e);
      setEntries([]);
      setCompareGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showCatalog) return;
    fetchCategories();
  }, [showCatalog]);
  useEffect(() => {
    if (!showCatalog) {
      setEntries([]);
      setCompareGroups([]);
      return;
    }
    fetchSection(section);
  }, [section, showCatalog]);

  const hiddenCompareProductIds = useMemo(() => {
    const ids = new Set();
    compareGroups.forEach((g) => {
      if (!g.hideMemberProducts) return;
      (g.productIds || []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [compareGroups]);

  const categoriesById = useMemo(
    () => indexCategories(categoryList),
    [categoryList],
  );

  const entryMatchesCategory = (entry) => {
    if (category === "todas") return true;
    const p = entry?.product;
    if (!p) return false;
    const cat =
      p.ERP_inventory_category ||
      categoriesById.get(Number(p.categoryId)) ||
      (p.categoryId
        ? {
            id: p.categoryId,
            name: p.categoryName,
            parentId: p.categoryParentId,
            parent: p.categoryParentId
              ? {
                  id: p.categoryParentId,
                  name: p.categoryParentName,
                }
              : null,
          }
        : null);
    return productMatchesCategoryFilter(
      {
        categoryId: p.categoryId,
        ERP_inventory_category: cat,
      },
      category,
      categoriesById,
    );
  };

  const groupMatchesCategory = (group) => {
    if (category === "todas") return true;
    for (const variant of group?.variants || []) {
      for (const cell of Object.values(variant.cells || {})) {
        const p = cell?.product;
        if (!p) continue;
        if (
          productMatchesCategoryFilter(
            {
              categoryId: p.categoryId,
              ERP_inventory_category:
                p.ERP_inventory_category ||
                categoriesById.get(Number(p.categoryId)) ||
                null,
            },
            category,
            categoriesById,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const visibleCompareGroups = useMemo(() => {
    if (!query.trim() && category === "todas") return compareGroups;
    const q = query.trim().toLowerCase();
    return compareGroups.filter((g) => {
      if (category !== "todas" && !groupMatchesCategory(g)) return false;
      if (q) {
        const inGroup =
          g.name?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.subtitle?.toLowerCase().includes(q);
        if (!inGroup) return false;
      }
      return true;
    });
  }, [compareGroups, query, category, categoriesById]);

  // Filtro y orden
  const filtered = useMemo(() => {
    let list = [...entries];

    if (hiddenCompareProductIds.size > 0) {
      list = list.filter((e) => !hiddenCompareProductIds.has(e.product?.id));
    }

    if (category !== "todas") {
      list = list.filter((e) => entryMatchesCategory(e));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.product?.name?.toLowerCase().includes(q) ||
          e.title?.toLowerCase().includes(q) ||
          e.product?.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sort === "priceAsc") {
      list.sort((a, b) => Number(a.product?.price) - Number(b.product?.price));
    } else if (sort === "priceDesc") {
      list.sort((a, b) => Number(b.product?.price) - Number(a.product?.price));
    } else if (sort === "uniqueFirst") {
      list.sort((a, b) => Number(b.product?.isUniqueToday) - Number(a.product?.isUniqueToday));
    }

    return list;
  }, [entries, category, query, sort, hiddenCompareProductIds, categoriesById]);

  const uniqueToday = filtered.filter((e) => e.product?.isUniqueToday);
  const regularList = filtered;

  const catalogGridItems = useMemo(() => {
    const groups = visibleCompareGroups.map((g) => ({
      kind: "group",
      id: `group-${g.id}`,
      position: g.position ?? 0,
      data: g,
    }));
    const products = regularList.map((e) => ({
      kind: "product",
      id: `product-${e.id}`,
      position: (e.position ?? 0) + 1000,
      data: e,
    }));
    return [...groups, ...products].sort((a, b) => a.position - b.position);
  }, [visibleCompareGroups, regularList]);

  if (!showCatalog) {
    return (
      <Container sx={{ pb: 6, pt: 4 }}>
        <Alert severity="info">
          El catálogo no está disponible en este momento.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: { xs: 1.5, sm: 2 } }}
      >
        <SimpleDialog
  open={previewOpen}
  onClose={handleClosePreview}
  title={previewEntry?.title || previewEntry?.product?.name || "Producto"}
  maxWidth={previewEntry?.type === "compareGroup" ? "md" : "sm"}
  fullWidth
>
  {previewEntry?.type === "compareGroup" ? (
    <Stack spacing={2} sx={{ p: 1 }}>
      {(() => {
        const group = previewEntry.compareGroup;
        const img = getGroupCoverImage(group);
        return img ? (
          <SmartProductImage
            src={img}
            alt={getGroupCardTitle(group)}
            heights={{ xs: 200, sm: 240, md: 260 }}
          />
        ) : null;
      })()}
      {previewEntry.compareGroup?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {previewEntry.compareGroup.description}
        </Typography>
      )}
      <ProductCompareTable
        group={previewEntry.compareGroup}
        embedded
        onSelectProduct={handleCompareProductSelect}
      />
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="outlined" onClick={handleClosePreview}>
          Cerrar
        </Button>
      </Stack>
    </Stack>
  ) : (
  (() => {
    const p = previewEntry?.product || {};

    const img =
      toImageSrc(previewEntry?.imageUrl) ||
      toImageSrc(p?.primaryImageUrl) ||
      "";

    const wholesaleTiers =
      previewEntry?.wholesaleOverrideRules?.length > 0
        ? previewEntry.wholesaleOverrideRules
        : Array.isArray(p.wholesaleRules)
        ? p.wholesaleRules
        : typeof p.wholesaleRules === "string"
        ? JSON.parse(p.wholesaleRules || "[]")
        : [];

    const weight =
      p.standardWeightGrams > 0 ? `${p.standardWeightGrams} g` : null;

    const minOrderQty =
      typeof previewEntry?.minOrderQty === "number" && previewEntry.minOrderQty > 0
        ? previewEntry.minOrderQty
        : 1;

    return (
      <Stack spacing={2} sx={{ p: 1 }}>
        {previewGroupParent && (
          <Button size="small" onClick={handleBackToGroup} sx={{ alignSelf: "flex-start" }}>
            ← Volver al grupo
          </Button>
        )}
        <SmartProductImage
          src={img}
          alt={p.name}
          heights={{ xs: 220, sm: 260, md: 280 }}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={0.5}>
          {previewEntry?.badge && (
            <Chip
              size="small"
              color="primary"
              label={previewEntry.badge}
              sx={{ fontWeight: 700 }}
            />
          )}

          {p.isUniqueToday && (
            <Chip
              size="small"
              color="warning"
              icon={<StarIcon />}
              label="ÚNICO del día"
              sx={{ fontWeight: 700 }}
            />
          )}

          {p.unitAbbr && (
            <Chip size="small" icon={<BakeryDiningIcon />} label={p.unitAbbr} />
          )}

          {weight && (
            <Chip size="small" icon={<Inventory2Icon />} label={weight} />
          )}

          {minOrderQty > 1 && (
            <Chip
              size="small"
              color="info"
              label={`Pedido mínimo: ${minOrderQty}`}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {p.desc && String(p.desc).trim().length > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
          >
            {p.desc}
          </Typography>
        )}

        <Divider />

        {/* Precio unitario */}
        <PriceDisplay product={{ ...p, wholesaleTiers }} qty={0} />

        {/* Calculadora mayorista */}
        <WholesaleCalculator product={{ ...p, wholesaleTiers }} />

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="outlined" onClick={handleClosePreview}>
            Cerrar
          </Button>
        </Stack>
      </Stack>
    );
  })()
  )}
</SimpleDialog>

        <Stack direction="row" spacing={1} alignItems="center">
          <BakeryDiningIcon />
          <Typography variant={isXs ? "h6" : "h5"} fontWeight={800}>
            Catálogo
          </Typography>
        </Stack>
      </Stack>

      {/* Secciones: en móvil (xs) => Select; en sm+ => Tabs compactas */}
      {isXs ? (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Sección</InputLabel>
          <Select
            value={section}
            label="Sección"
            onChange={(e) => setSection(e.target.value)}
            MenuProps={{ PaperProps: { style: { maxHeight: 360 } } }}
          >
            {SECTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, mb: 2, overflow: "hidden" }}>
          <Tabs
            value={section}
            onChange={(_, val) => setSection(val)}
            variant="scrollable"
            allowScrollButtonsMobile
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              px: 1,
              minHeight: 36,
              "& .MuiTabs-indicator": { height: 3 },
              "& .MuiTab-root": {
                minHeight: 36,
                minWidth: 112,
                px: 1.5,
                textTransform: "none",
                fontWeight: 600,
                fontSize: { sm: 13, md: 14 },
              },
            }}
            TabIndicatorProps={{ style: { borderRadius: 2 } }}
          >
            {SECTIONS.map((s) => (
              <Tab key={s.value} label={s.label} value={s.value} />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Filtros */}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, mb: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          gap={1.25}
          flexWrap="wrap"
        >
          <TextField
            placeholder="Buscar producto o etiqueta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton size="small" edge="start" aria-label="buscar">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={category}
              label="Categoría"
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              {categoryOptions.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel>Ordenar</InputLabel>
            <Select value={sort} label="Ordenar" onChange={(e) => setSort(e.target.value)} fullWidth>
              <MenuItem value="default">Recomendados</MenuItem>
              <MenuItem value="uniqueFirst">Únicos primero</MenuItem>
              <MenuItem value="priceAsc">Precio ↑</MenuItem>
              <MenuItem value="priceDesc">Precio ↓</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Únicos del día */}
      {uniqueToday.length > 0 && (
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <StarIcon color="warning" />
            <Typography variant={isXs ? "subtitle1" : "h6"} fontWeight={800}>
              Únicos del día
            </Typography>
          </Stack>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {uniqueToday.map((e) => (
              <Grid key={e.id} item xs={12} sm={6} md={4} lg={3}>
                <ProductCard entry={e} onPreview={handlePreview} />
                

              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Catálogo por sección */}
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <LocalOfferIcon />
        <Typography variant={isXs ? "subtitle1" : "h6"} fontWeight={800}>
          {SECTIONS.find((s) => s.value === section)?.label || "Catálogo"}
        </Typography>
      </Stack>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {(loading ? Array.from({ length: 8 }) : catalogGridItems).map((item, idx) => (
          <Grid key={item?.id || idx} item xs={12} sm={6} md={4} lg={3}>
            {loading ? (
              <Paper
                sx={{
                  height: { xs: 260, sm: 300, md: 320 },
                  borderRadius: 3,
                  bgcolor: "action.hover",
                }}
              />
            ) : item.kind === "group" ? (
              <CompareGroupCard group={item.data} onPreview={handleCompareGroupPreview} />
            ) : (
              <ProductCard entry={item.data} onPreview={handlePreview} />
            )}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
