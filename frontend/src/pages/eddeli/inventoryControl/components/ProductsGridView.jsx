// ProductsGridView.jsx
// Vista alternativa de productos en cards con filtro por categoría y opción de duplicar
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  TablePagination,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { CardsGridSkeleton } from "../../../../components/ContentSkeleton.jsx";
import { useEffect, useMemo, useState } from "react";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Edit from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import {
  createProduct,
  registerMovement,
} from "../../../../api/inventoryControlRequest";
import { pathImg } from "../../../../api/axios";
import { mediaStoragePath } from "../../../../utils/mediaPaths.js";
import toast from "react-hot-toast";
import { useAuth } from "../../../../context/AuthContext";
import {
  formatProductCategoryName,
  productMatchesCategoryFilter,
} from "../../../../utils/categoryUtils.js";

const typeLabels = {
  raw: "Materia Prima",
  intermediate: "Producto Intermedio",
  final: "Producto Final",
};

function stockNum(p) {
  const n = Number(p?.stock);
  return Number.isFinite(n) ? n : 0;
}

function unitAbbrOf(p) {
  return (
    p?.unit?.abbreviation ||
    p?.InventoryUnit?.abbreviation ||
    p?.ERP_inventory_unit?.abbreviation ||
    ""
  );
}

function ProductCard({ product, onEdit, onDuplicate, onStockAdjusted, pathImgBase }) {
  const { toast: authToast } = useAuth();
  const imgSrc = product?.primaryImageUrl
    ? `${pathImgBase}${product.primaryImageUrl}`
    : null;
  const categoryName = formatProductCategoryName(product);
  const current = stockNum(product);
  const abbr = unitAbbrOf(product);
  const [draft, setDraft] = useState(() => String(current));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(stockNum(product)));
  }, [product.id, product.stock]);

  const applyStockAdjust = async () => {
    const nuevo = Number(String(draft).replace(",", "."));
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      authToast({ message: "Ingrese un stock válido (número ≥ 0).", variant: "warning" });
      return;
    }
    if (Math.abs(nuevo - current) < 1e-9) {
      authToast({ message: "El valor es igual al stock actual.", variant: "info" });
      return;
    }
    setSaving(true);
    try {
      await authToast({
        promise: registerMovement({
          productId: Number(product.id),
          type: "ajuste",
          reason: "AJUSTE_INVENTARIO",
          quantity: nuevo,
          description: `Ajuste (productos): ${product.name} ${current} → ${nuevo}${abbr ? ` ${abbr}` : ""}`,
          price: null,
          referenceType: null,
          referenceId: null,
          simulated: null,
        }),
        successMessage: "Ajuste de inventario registrado",
        onSuccess: () => {
          onStockAdjusted?.();
          return { description: "Stock actualizado correctamente" };
        },
      });
    } catch {
      /* authToast ya mostró el error */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "&:hover": { boxShadow: 3 },
      }}
    >
      <Box sx={{ position: "relative", pt: "75%", bgcolor: "action.hover" }}>
        {imgSrc ? (
          <CardMedia
            component="img"
            image={imgSrc}
            alt={product?.name || ""}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Sin imagen
            </Typography>
          </Box>
        )}
        <Chip
          label={typeLabels[product?.type] || product?.type || "—"}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            bgcolor: "background.paper",
            boxShadow: 1,
          }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap title={product?.name}>
          {product?.name || "—"}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap title={product?.desc}>
          {product?.desc || "—"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {categoryName}
          {product?.barcode ? ` · Cód. ${product.barcode}` : ""}
        </Typography>
        <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" fontWeight={600}>
            ${Number(product?.price ?? 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Actual: <strong>{current}</strong>
            {abbr ? ` ${abbr}` : ""}
          </Typography>
        </Box>
        <Box sx={{ mt: 1, display: "flex", gap: 0.5, alignItems: "flex-start" }}>
          <TextField
            size="small"
            fullWidth
            variant="outlined"
            label={abbr ? `Stock (${abbr})` : "Nuevo stock"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyStockAdjust();
              }
            }}
            disabled={saving}
            inputProps={{ inputMode: "decimal" }}
            helperText="Movimiento ajuste"
          />
          <Tooltip title="Guardar ajuste">
            <span>
              <IconButton
                color="primary"
                size="small"
                onClick={applyStockAdjust}
                disabled={saving}
                aria-label="Guardar ajuste de stock"
                sx={{ mt: 0.5 }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box sx={{ mt: 1, display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
          {onEdit && (
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit(product)}>
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Duplicar producto">
            <IconButton size="small" color="primary" onClick={() => onDuplicate(product)}>
              <ContentCopy sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

function DuplicateDialog({ open, product, onClose, onSuccess }) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const defaultName = product ? `Copia de ${product.name || ""}` : "";

  const handleOpen = () => {
    setNewName(defaultName);
  };

  const buildFormData = (p, name) => {
    const fd = new FormData();
    const categoryId = p.categoryId ?? p.ERP_inventory_category?.id ?? "";
    const unitId = p.unitId ?? p.ERP_inventory_unit?.id ?? "";

    fd.append("subfolder", mediaStoragePath("products"));
    fd.append("name", String(name || p?.name || "").trim());
    if (p?.desc) fd.append("desc", p.desc);
    fd.append("type", p?.type || "raw");
    fd.append("unitId", String(unitId));
    if (categoryId) fd.append("categoryId", String(categoryId));
    if (p?.price != null) fd.append("price", String(p.price));
    if (p?.supplierPrice != null) fd.append("supplierPrice", String(p.supplierPrice));
    if (p?.distributorPrice != null) fd.append("distributorPrice", String(p.distributorPrice));
    if (p?.netWeight != null) fd.append("netWeight", String(p.netWeight));
    if (p?.minStock != null) fd.append("minStock", String(p.minStock));
    if (p?.stock != null) fd.append("stock", String(p.stock));
    if (p?.standardWeightGrams != null) fd.append("standardWeightGrams", String(p.standardWeightGrams));

    const rules = (() => {
      try {
        if (Array.isArray(p?.wholesaleRules)) return p.wholesaleRules;
        if (typeof p?.wholesaleRules === "string") return JSON.parse(p.wholesaleRules);
        return [];
      } catch {
        return [];
      }
    })();
    fd.append("wholesaleRules", JSON.stringify(rules));
    fd.append("customFileName", String(name || p?.name || "producto").trim());

    if (p?.primaryImageUrl) {
      fd.append("primaryImageUrl", p.primaryImageUrl);
    }
    return fd;
  };

  const handleDuplicate = async () => {
    if (!product || !newName?.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const fd = buildFormData(product, newName.trim());
      await createProduct(fd);
      toast.success("Producto duplicado correctamente");
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "No se pudo duplicar el producto";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} TransitionProps={{ onEntered: handleOpen }} maxWidth="xs" fullWidth>
      <DialogTitle>Duplicar producto</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Nuevo nombre"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ej: Copia de Pan Integral"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleDuplicate} disabled={loading || !newName?.trim()}>
          {loading ? "Guardando…" : "Duplicar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductsGridView({
  products = [],
  search = "",
  categoryFilter = "",
  onEdit,
  onReload,
  pathImgBase = pathImg,
  loading = false,
}) {
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);

  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter) {
      list = list.filter((p) => productMatchesCategoryFilter(p, categoryFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const parts = [
          p.name,
          p.desc,
          p.description,
          p.barcode,
          p.sku,
          p?.ERP_inventory_category?.name,
          typeLabels[p.type],
          p.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return parts.includes(q);
      });
    }
    return [...list].sort((a, b) => stockNum(b) - stockNum(a));
  }, [products, categoryFilter, search]);

  const paginatedProducts = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [filteredProducts, page, rowsPerPage]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ordenadas por stock (mayor a menor). Puede ajustar stock con movimiento de ajuste.
      </Typography>
      {loading ? (
        <CardsGridSkeleton count={8} />
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedProducts.map((p) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={p.id}>
                <ProductCard
                  product={p}
                  onEdit={onEdit}
                  onDuplicate={(prod) => setDuplicateProduct(prod)}
                  onStockAdjusted={onReload}
                  pathImgBase={pathImgBase}
                />
              </Grid>
            ))}
          </Grid>
          {filteredProducts.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              {products.length === 0
                ? "No hay productos para mostrar"
                : "Ningún producto coincide con la búsqueda o el filtro."}
            </Typography>
          )}
          {filteredProducts.length > 0 && (
            <TablePagination
              component="div"
              count={filteredProducts.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[12, 24, 48]}
              labelRowsPerPage="Por página"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
            />
          )}
        </>
      )}
      <DuplicateDialog
        open={!!duplicateProduct}
        product={duplicateProduct}
        onClose={() => setDuplicateProduct(null)}
        onSuccess={onReload}
      />
    </Box>
  );
}
