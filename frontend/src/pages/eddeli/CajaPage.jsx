import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PrintIcon from "@mui/icons-material/Print";
import AppsIcon from "@mui/icons-material/Apps";
import PrintFormatDialog from "../../components/saleReceipt/PrintFormatDialog.jsx";
import {
  getAllProducts,
  registerMovement,
} from "../../api/inventoryControlRequest.js";
import { getAllCustomersRequest, posCheckoutRequest } from "../../api/ordersRequest.js";
import { getActiveShift } from "../../api/shiftRequest.js";
import CajaCustomerFormDialog from "./CajaCustomerFormDialog.jsx";
import CajaQuickProductsDialog from "./CajaQuickProductsDialog.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { buildCajaOrderNotes } from "../../utils/eddeliPosOrderUtils.js";
import { buildCustomerDisplayName, formatCustomerDocument } from "./cajaCustomerUtils.js";
import { formatMoney } from "../../utils/turnoCashUtils.js";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner.js";
import { resolveEddeliLinePricing, findEddeliProductByCode, applyCategoryMixMatchPricing, summarizeCategoryMixMatchGroups, getCategoryMixMatchHint, getCategoryPackageTiers, getProductCategory, findSurtidoCategoriesFromProducts, getCategoryMixMatchLabel } from "../../utils/productLookup.js";
import {
  buildReceiptFromCheckout,
  resolveStoredDocumentType,
} from "../../utils/saleReceiptUtils.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));

const cartRowKey = (row) =>
  row?.mixGroupId ? `${row.mixGroupId}:${row.productId}` : String(row.productId);

const newMixGroupId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? `surtido-${crypto.randomUUID()}`
    : `surtido-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const openCajaInNewTab = () => {
  const url = new URL(`${import.meta.env.BASE_URL}caja`, window.location.origin);
  window.open(url.href, "_blank", "noopener,noreferrer");
};

const formatProductSearchLabel = (item) => {
  const name = item?.name || "—";
  const code = item?.barcode ? ` · ${item.barcode}` : "";
  const sku = item?.sku ? ` · SKU: ${item.sku}` : "";
  return `${name}${code}${sku}`;
};

const formatProductSalePrice = (item) => `$${to2(item?.price ?? 0).toFixed(2)}`;

const renderCajaProductOption = (props, item) => (
  <li {...props} key={props.key}>
    <Box
      component="span"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        width: "100%",
        py: 0.25,
      }}
    >
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {formatProductSearchLabel(item)}
      </Box>
      <Typography
        component="span"
        variant="body2"
        fontWeight={700}
        color="primary.main"
        sx={{ flexShrink: 0, ml: "auto", textAlign: "right" }}
      >
        {formatProductSalePrice(item)}
      </Typography>
    </Box>
  </li>
);

const aggregateRequestedByProduct = (cart) => {
  const m = new Map();
  for (const row of cart) {
    const id = Number(row.productId);
    if (!Number.isFinite(id)) continue;
    m.set(id, (m.get(id) || 0) + Number(row.quantity || 0));
  }
  return m;
};

/** Líneas agregadas por producto donde lo pedido supera el stock en sistema. */
const buildStockIssues = (cart, productList) => {
  const req = aggregateRequestedByProduct(cart);
  const list = [];
  for (const [productId, requested] of req) {
    const p = productList.find((x) => Number(x.id) === productId);
    const system = Number(p?.stock ?? 0);
    if (requested > system) {
      list.push({
        productId,
        name: p?.name || `Producto #${productId}`,
        systemStock: system,
        requested,
        deficit: to2(requested - system),
      });
    }
  }
  return list;
};

const lineBreakdown = (row) => {
  const qty = Number(row.quantity || 0);
  const unitPrice = Number(row.price || 0);
  const total =
    row.lineTotal != null &&
    (row.pricingMode === "package" || row.pricingMode === "category_package")
      ? to2(Number(row.lineTotal))
      : to2(qty * unitPrice);
  const taxType = String(row.taxType || "gravado");
  const taxRate = Number(row.taxRate || 0);
  if (taxType !== "gravado" || taxRate <= 0) {
    return { total, base: total, iva: 0 };
  }
  const base = to2(total / (1 + taxRate / 100));
  const iva = to2(total - base);
  return { total, base, iva };
};

export default function CajaPage() {
  const { toast } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [documentType, setDocumentType] = useState("documento");
  const [saleType, setSaleType] = useState("contado");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [amountReceived, setAmountReceived] = useState("");
  const [useCustomerData, setUseCustomerData] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockIssues, setStockIssues] = useState([]);
  const [stockAdjustQty, setStockAdjustQty] = useState({});
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [quickDownOpen, setQuickDownOpen] = useState(false);
  const [quickDownProductId, setQuickDownProductId] = useState("");
  const [quickDownQty, setQuickDownQty] = useState("");
  const [quickDownNote, setQuickDownNote] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(undefined);
  const [showOpenShiftBanner, setShowOpenShiftBanner] = useState(false);
  const [showCartStock, setShowCartStock] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null);
  const [quickProductsOpen, setQuickProductsOpen] = useState(false);

  const loadData = async () => {
    const [productsRes, customersRes, shiftRes] = await Promise.allSettled([
      getAllProducts(),
      getAllCustomersRequest(),
      getActiveShift(),
    ]);
    const nextProducts =
      productsRes.status === "fulfilled" ? productsRes.value.data || [] : [];
    const nextCustomers =
      customersRes.status === "fulfilled" ? customersRes.value.data || [] : [];
    setProducts(nextProducts);
    setCustomers(nextCustomers);
    setActiveShift(shiftRes.status === "fulfilled" ? shiftRes.value.data : null);
    if (!customerId && nextCustomers.length > 0) {
      setCustomerId(String(nextCustomers[0].id));
    }
    return { products: nextProducts, customers: nextCustomers };
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeShift?.id) {
      setShowOpenShiftBanner(false);
      return;
    }
    setShowOpenShiftBanner(true);
    const timer = window.setTimeout(() => setShowOpenShiftBanner(false), 5000);
    return () => window.clearTimeout(timer);
  }, [activeShift?.id]);

  const findProductByQuery = (query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return null;
    return (
      products.find((p) => String(p.barcode || "").trim().toLowerCase() === q) ||
      products.find((p) => String(p.sku || "").trim().toLowerCase() === q) ||
      products.find((p) => String(p.name || "").trim().toLowerCase() === q) ||
      products.find((p) => String(p.name || "").toLowerCase().includes(q)) ||
      null
    );
  };

  const stockByProductId = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      map.set(Number(p.id), Number(p.stock || 0));
    }
    return map;
  }, [products]);

  const surtidoCategories = useMemo(
    () => findSurtidoCategoriesFromProducts(products),
    [products],
  );

  const addToCart = (product, qtyToAdd = 1) => {
    const addQty = Math.max(1, Math.floor(Number(qtyToAdd) || 1));
    setCart((prev) => {
      const id = Number(product.id);
      const key = String(id);
      const exists = prev.find((row) => cartRowKey(row) === key);
      const quantity = exists ? Number(exists.quantity) + addQty : addQty;
      const pricing = resolveEddeliLinePricing(product, quantity);
      const line = {
        productId: id,
        name: product.name,
        quantity,
        price: pricing.unitPrice,
        lineTotal: pricing.lineTotal,
        pricingMode: pricing.mode,
        stock: Number(product.stock || 0),
        barcode: product.barcode || "",
        taxType: product.taxType || "gravado",
        taxRate: Number(product.taxRate ?? 15),
      };
      const rest = prev.filter((row) => cartRowKey(row) !== key);
      return [...rest, line];
    });
  };

  const addSurtidoBatch = ({ lines, label, category }) => {
    const mixGroupId = newMixGroupId();
    const mixGroupLabel = label || getCategoryMixMatchLabel(category);
    setCart((prev) => {
      const next = [...prev];
      for (const { product, quantity } of lines) {
        const id = Number(product.id);
        const qty = Math.max(1, Math.floor(Number(quantity) || 1));
        const pricing = resolveEddeliLinePricing(product, qty);
        next.push({
          productId: id,
          name: product.name,
          quantity: qty,
          price: pricing.unitPrice,
          lineTotal: pricing.lineTotal,
          pricingMode: pricing.mode,
          stock: Number(product.stock || 0),
          barcode: product.barcode || "",
          taxType: product.taxType || "gravado",
          taxRate: Number(product.taxRate ?? 15),
          mixGroupId,
          mixGroupLabel,
          categoryId: category?.id,
        });
      }
      return next;
    });
  };

  const addSelectedProduct = () => {
    const found = products.find((p) => String(p.id) === String(selectedProductId));
    if (!found) {
      void toast?.({ message: "Selecciona un producto para agregar.", variant: "warning" });
      return;
    }
    addToCart(found);
    setSelectedProductId("");
  };

  const scannerUiBlocked =
    saving || stockDialogOpen || quickDownOpen || addCustomerOpen || quickProductsOpen;

  const handleBarcodeCode = useCallback(
    (code) => {
      const found = findEddeliProductByCode(products, code);
      if (found) {
        addToCart(found);
        setSelectedProductId("");
        return;
      }
      void toast?.({
        message: `Código ${code} leído, pero no existe en productos.`,
        variant: "warning",
      });
    },
    [products, toast]
  );

  useBarcodeScanner({
    enabled: !scannerUiBlocked && products.length > 0,
    onScan: handleBarcodeCode,
    ignoreWhenTypingInInputs: true,
  });

  const updateCartRow = (rowKey, key, value) => {
    setCart((prev) =>
      prev.map((row) => {
        if (cartRowKey(row) !== String(rowKey)) return row;
        const next = { ...row, [key]: value };
        if (key === "quantity") {
          const product = products.find((p) => Number(p.id) === Number(row.productId));
          if (product) {
            const pricing = resolveEddeliLinePricing(product, next.quantity);
            next.price = pricing.unitPrice;
            next.lineTotal = pricing.lineTotal;
            next.pricingMode = pricing.mode;
          }
        }
        if (key === "price") {
          next.lineTotal = null;
          next.pricingMode = "manual";
        }
        return next;
      })
    );
  };

  const removeRow = (rowKey) => {
    setCart((prev) => prev.filter((row) => cartRowKey(row) !== String(rowKey)));
  };

  const removeMixGroup = (mixGroupId) => {
    setCart((prev) => prev.filter((row) => row.mixGroupId !== mixGroupId));
  };

  const pricedCart = useMemo(
    () => applyCategoryMixMatchPricing(cart, products),
    [cart, products],
  );

  const cartDisplayGroups = useMemo(() => {
    const groups = [];
    const mixSeen = new Set();
    for (const row of pricedCart) {
      if (!row.mixGroupId) {
        groups.push({ type: "single", row });
        continue;
      }
      if (mixSeen.has(row.mixGroupId)) continue;
      mixSeen.add(row.mixGroupId);
      const rows = pricedCart.filter((r) => r.mixGroupId === row.mixGroupId);
      const groupTotal = rows.reduce((sum, r) => sum + lineBreakdown(r).total, 0);
      groups.push({
        type: "mix",
        mixGroupId: row.mixGroupId,
        label: row.mixGroupLabel || "Pan surtido",
        rows,
        groupTotal,
      });
    }
    return groups;
  }, [pricedCart]);

  const categoryMixSummaries = useMemo(() => {
    return summarizeCategoryMixMatchGroups(pricedCart).map((g) => {
      const sample = products.find((p) => Number(getProductCategory(p)?.id) === g.categoryId);
      const tiers = getCategoryPackageTiers(getProductCategory(sample));
      return { ...g, hint: getCategoryMixMatchHint(tiers, g.quantity) };
    });
  }, [pricedCart, products]);

  const summary = useMemo(() => {
    return pricedCart.reduce(
      (acc, row) => {
        const { base, iva, total } = lineBreakdown(row);
        acc.subtotal += base;
        acc.iva += iva;
        acc.total += total;
        return acc;
      },
      { subtotal: 0, iva: 0, total: 0 }
    );
  }, [pricedCart]);
  const subtotal = to2(summary.subtotal);
  const iva = to2(summary.iva);
  const total = to2(summary.total);
  const receivedNum = Number(String(amountReceived ?? "").trim().replace(",", "."));
  const receivedParsed = Number.isFinite(receivedNum) ? to2(receivedNum) : NaN;
  const change = Math.max((Number.isFinite(receivedParsed) ? receivedParsed : 0) - total, 0);

  const productsByStockDesc = useMemo(() => {
    return [...products].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
  }, [products]);

  const quickDownProduct = useMemo(
    () => products.find((p) => String(p.id) === String(quickDownProductId)),
    [products, quickDownProductId]
  );

  const applyQuickDownStock = async () => {
    if (!quickDownProductId || !String(quickDownQty).trim()) {
      void toast?.({ message: "Elige producto y cantidad a rebajar.", variant: "warning" });
      return;
    }
    const q = Number(String(quickDownQty).trim().replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      void toast?.({ message: "Cantidad inválida.", variant: "warning" });
      return;
    }
    try {
      setSaving(true);
      await registerMovement({
        productId: Number(quickDownProductId),
        type: "salida",
        reason: "SALIDA_OTRA",
        quantity: q,
        description: quickDownNote || "Salida rápida desde caja",
        price: null,
      });
      void toast?.({ message: "Listo: stock en sistema rebajado.", variant: "success" });
      setQuickDownOpen(false);
      setQuickDownProductId("");
      setQuickDownQty("");
      setQuickDownNote("");
      await loadData();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo registrar la salida.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const performSaleDelivery = async ({ resolvedCustomerId, notesText, isInvoice, useCustomerData }) => {
    const baseNote =
      (notesText || "").trim() ||
      (isInvoice || useCustomerData
        ? "Venta generada desde caja"
        : "Venta mostrador sin datos de cliente (consumidor final)");
    const orderNotes = buildCajaOrderNotes({ baseNote, saleType });
    const isCreditSale = saleType === "credito";
    const storedDocType =
      documentType === "factura"
        ? "factura"
        : resolveStoredDocumentType(documentType, useCustomerData || isInvoice);
    const cartSnapshot = pricedCart.map((row) => ({ ...row }));
    const customer = customers.find((c) => String(c.id) === String(resolvedCustomerId));
    const { data } = await posCheckoutRequest({
      customerId: Number(resolvedCustomerId),
      notes: orderNotes,
      saleType: isCreditSale ? "credito" : "contado",
      paymentMethod: isCreditSale ? "credito" : paymentMethod || "efectivo",
      documentType: storedDocType,
      items: cartSnapshot.map((row) => ({
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        price:
          (row.pricingMode === "package" || row.pricingMode === "category_package") &&
          row.lineTotal != null
            ? Number(row.lineTotal) / Number(row.quantity || 1)
            : Number(row.price || 0),
      })),
    });
    if (!data?.orderId && !data?.ok) {
      throw new Error(data?.message || "No se obtuvo el id del pedido.");
    }
    const receipt = buildReceiptFromCheckout({
      orderId: data.orderId,
      cart: cartSnapshot,
      customer,
      documentType: storedDocType,
      paymentMethod: isCreditSale ? "credito" : paymentMethod || "efectivo",
      saleType,
      notes: orderNotes,
    });
    setCart([]);
    setNotes("");
    setSelectedProductId("");
    setAmountReceived("");
    setLastSaleReceipt(receipt);
    return receipt;
  };

  const closeStockDialog = () => {
    setStockDialogOpen(false);
    setStockIssues([]);
    setStockAdjustQty({});
    setAdjustmentNote("");
    setPendingCheckout(null);
  };

  const handleConfirmStockAdjustAndCheckout = async () => {
    if (!pendingCheckout) return;
    for (const issue of stockIssues) {
      const raw = String(stockAdjustQty[issue.productId] ?? "").trim().replace(",", ".");
      const adj = Number(raw);
      if (!Number.isFinite(adj) || adj < issue.deficit) {
        void toast?.({
          message: `“${issue.name}”: sistema ${issue.systemStock}, carrito ${issue.requested}. Pon al menos +${issue.deficit} en “Entrada”.`,
          variant: "warning",
        });
        return;
      }
    }
    try {
      setSaving(true);
      const stockPatches = new Map();
      for (const issue of stockIssues) {
        const raw = String(stockAdjustQty[issue.productId] ?? "").trim().replace(",", ".");
        const adj = Number(raw);
        await registerMovement({
          productId: issue.productId,
          type: "entrada",
          reason: "ENTRADA_OTRA",
          quantity: adj,
          description: adjustmentNote || "Entrada desde caja (ajuste de stock)",
          price: null,
          referenceType: "caja_stock_adjust",
        });
        stockPatches.set(
          Number(issue.productId),
          Number(issue.systemStock) + adj,
        );
      }
      if (stockPatches.size > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            const nextStock = stockPatches.get(Number(p.id));
            return nextStock == null ? p : { ...p, stock: nextStock };
          }),
        );
      }
      const { products: fresh } = await loadData();
      const still = buildStockIssues(cart, fresh);
      if (still.length > 0) {
        setStockIssues(still);
        const init = {};
        still.forEach((i) => {
          init[i.productId] = String(i.deficit);
        });
        setStockAdjustQty(init);
        void toast?.({
          message: "Aún no alcanza: sube la entrada o baja cantidades en el carrito.",
          variant: "warning",
        });
        return;
      }
      setStockDialogOpen(false);
      setStockIssues([]);
      setStockAdjustQty({});
      setAdjustmentNote("");
      const ctx = pendingCheckout;
      setPendingCheckout(null);
      const receipt = await performSaleDelivery({
        resolvedCustomerId: ctx.resolvedCustomerId,
        notesText: ctx.notesSnapshot,
        isInvoice: ctx.isInvoice,
        useCustomerData: ctx.useCustomerData,
      });
      void toast?.({ message: "Ajuste aplicado y venta registrada.", variant: "success" });
      setPrintReceipt(receipt);
      setPrintOpen(true);
      await loadData();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || e.message || "Error al ajustar o cobrar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const onCheckout = async () => {
    if (!activeShift) {
      void toast?.({
        message: "Debes abrir un turno en Turno antes de cobrar.",
        variant: "warning",
      });
      return;
    }
    if (cart.length === 0) {
      void toast?.({ message: "Agrega al menos un producto al carrito.", variant: "warning" });
      return;
    }
    const hasInvalidQty = cart.some((row) => Number(row.quantity || 0) <= 0);
    if (hasInvalidQty) {
      void toast?.({ message: "Todas las cantidades deben ser mayores a 0.", variant: "warning" });
      return;
    }
    const isInvoice = documentType === "factura";
    if (isInvoice && !customerId) {
      void toast?.({ message: "Para factura debes seleccionar un cliente.", variant: "warning" });
      return;
    }
    const fallbackCustomer =
      customers.find((c) => {
        const n = String(c.name || "").toLowerCase();
        return n.includes("consumidor") || n.includes("final");
      }) || customers[0];
    const resolvedCustomerId = isInvoice || useCustomerData ? customerId : String(fallbackCustomer?.id || "");
    if (!resolvedCustomerId) {
      void toast?.({
        message: "No hay clientes registrados. Crea uno (idealmente 'Consumidor Final') para continuar.",
        variant: "warning",
      });
      return;
    }
    if (saleType === "credito") {
      if (!useCustomerData && documentType !== "factura") {
        void toast?.({
          message: "Para venta a crédito selecciona un cliente (marca «Registrar datos del cliente»).",
          variant: "warning",
        });
        return;
      }
      if (!customerId) {
        void toast?.({
          message: "Selecciona el cliente para la venta a crédito.",
          variant: "warning",
        });
        return;
      }
    }
    if (saleType === "contado" && paymentMethod === "efectivo") {
      const raw = String(amountReceived ?? "").trim();
      if (raw === "") {
        void toast?.({
          message: "Ingresa el monto recibido en efectivo antes de cobrar.",
          variant: "warning",
        });
        return;
      }
      if (!Number.isFinite(receivedParsed)) {
        void toast?.({
          message: "El monto recibido no es un número válido.",
          variant: "warning",
        });
        return;
      }
      if (receivedParsed < total) {
        void toast?.({
          message: `El monto recibido debe ser al menos $${total.toFixed(2)} (total de la venta).`,
          variant: "warning",
        });
        return;
      }
    }

    const issues = buildStockIssues(cart, products);
    if (issues.length > 0) {
      setPendingCheckout({
        resolvedCustomerId,
        isInvoice,
        useCustomerData,
        notesSnapshot: notes,
      });
      setStockIssues(issues);
      const init = {};
      issues.forEach((i) => {
        init[i.productId] = String(i.deficit);
      });
      setStockAdjustQty(init);
      setAdjustmentNote("");
      setStockDialogOpen(true);
      return;
    }

    try {
      setSaving(true);
      const receipt = await performSaleDelivery({
        resolvedCustomerId,
        notesText: notes,
        isInvoice,
        useCustomerData,
      });
      void toast?.({ message: "Venta registrada correctamente.", variant: "success" });
      setPrintReceipt(receipt);
      setPrintOpen(true);
      await loadData();
    } catch (error) {
      void toast?.({
        message: error?.response?.data?.message || error.message || "No se pudo registrar la venta.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pt: 0, pb: 1.5, px: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Punto de Venta
          </Typography>
          {activeShift === undefined ? null : activeShift ? (
            <Tooltip
              title={`Turno abierto · capital ${formatMoney(activeShift.openingCashTotal)} · esperado ${formatMoney(activeShift.expectedCashTotal)}`}
            >
              <CheckCircleIcon color="success" aria-label="Turno abierto" />
            </Tooltip>
          ) : (
            <Tooltip title="No hay turno abierto">
              <ErrorOutlineIcon color="error" aria-label="Sin turno abierto" />
            </Tooltip>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          {lastSaleReceipt ? (
            <Tooltip title="Imprimir última venta">
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => {
                  setPrintReceipt(lastSaleReceipt);
                  setPrintOpen(true);
                }}
              >
                Imprimir
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip title="Abre otra instancia de caja en una pestaña nueva (mismo turno)">
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={openCajaInNewTab}
            >
              Abrir otra caja
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {activeShift === undefined ? null : !activeShift ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          No hay turno abierto.{" "}
          <Button component={RouterLink} to="/turno" size="small" sx={{ ml: 0.5 }}>
            Abrir turno
          </Button>{" "}
          para registrar ventas en caja.
        </Alert>
      ) : showOpenShiftBanner ? (
        <Alert severity="success" sx={{ mb: 1 }}>
          Turno abierto · capital inicial {formatMoney(activeShift.openingCashTotal)} · efectivo
          esperado ahora {formatMoney(activeShift.expectedCashTotal)}
        </Alert>
      ) : null}

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8.5}>
          <Paper sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Total Venta: ${total.toFixed(2)}
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
              <SearchableSelect
                fullWidth
                label="Producto"
                placeholder="Buscar o escanear código de barras"
                items={productsByStockDesc}
                value={selectedProductId}
                onChange={setSelectedProductId}
                getOptionLabel={formatProductSearchLabel}
                getOptionValue={(item) => String(item.id)}
                renderOption={renderCajaProductOption}
                onEnterWithInput={handleBarcodeCode}
              />
              <Button variant="outlined" startIcon={<AppsIcon />} onClick={() => setQuickProductsOpen(true)}>
                Accesos rápidos
              </Button>
              <Button variant="contained" onClick={addSelectedProduct}>
                Agregar
              </Button>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  Registros en venta: {cart.length}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={showCartStock}
                      onChange={(e) => setShowCartStock(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Mostrar stock
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PointOfSaleIcon />}
                  disabled={saving || cart.length === 0}
                  onClick={onCheckout}
                >
                  Realizar venta
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => setCart([])}
                >
                  Vaciar listado
                </Button>
              </Stack>
            </Stack>

            {categoryMixSummaries.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {categoryMixSummaries.map((g) => (
                  <Chip
                    key={g.categoryId}
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={
                      g.hint
                        ? `${g.categoryName}: ${g.quantity} u. · $${g.total.toFixed(2)} — falta ${g.hint.remaining} para ${g.hint.nextQty}=$${g.hint.nextTotal.toFixed(2)}`
                        : `${g.categoryName}: ${g.quantity} u. · $${g.total.toFixed(2)}`
                    }
                  />
                ))}
              </Stack>
            )}

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Producto</TableCell>
                    {showCartStock ? (
                      <TableCell align="center">Stock</TableCell>
                    ) : null}
                    <TableCell align="center">Cantidad</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="right">IVA</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Opciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartDisplayGroups.map((group) => {
                    if (group.type === "single") {
                      const row = group.row;
                      const rowKey = cartRowKey(row);
                      const stockQty =
                        stockByProductId.get(Number(row.productId)) ?? Number(row.stock || 0);
                      return (
                        <TableRow key={rowKey}>
                          <TableCell>{row.barcode || "—"}</TableCell>
                          <TableCell>
                            {row.name}
                            {row.pricingMode === "category_package" && row.categoryName ? (
                              <Typography variant="caption" color="primary" display="block">
                                Tramo {row.categoryName}
                              </Typography>
                            ) : null}
                          </TableCell>
                          {showCartStock ? (
                            <TableCell align="center">{stockQty}</TableCell>
                          ) : null}
                          <TableCell align="center" sx={{ minWidth: 105 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={row.quantity}
                              onChange={(e) =>
                                updateCartRow(rowKey, "quantity", Number(e.target.value || 0))
                              }
                              inputProps={{ min: 0, step: "1" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ minWidth: 120 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={row.price}
                              onChange={(e) =>
                                updateCartRow(rowKey, "price", Number(e.target.value || 0))
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">$</InputAdornment>
                                ),
                              }}
                              inputProps={{ min: 0, step: "0.01" }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            ${lineBreakdown(row).iva.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${lineBreakdown(row).total.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeRow(rowKey)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const colSpan = showCartStock ? 8 : 7;
                    return (
                      <React.Fragment key={group.mixGroupId}>
                        <TableRow sx={{ bgcolor: "action.hover" }}>
                          <TableCell colSpan={colSpan - 2}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                {group.label}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${group.rows.reduce((s, r) => s + Number(r.quantity || 0), 0)} u.`}
                                color="primary"
                                variant="outlined"
                              />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight={700}>
                              ${to2(group.groupTotal).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeMixGroup(group.mixGroupId)}
                              title="Quitar canasta"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        {group.rows.map((row) => {
                          const rowKey = cartRowKey(row);
                          const stockQty =
                            stockByProductId.get(Number(row.productId)) ?? Number(row.stock || 0);
                          return (
                            <TableRow key={rowKey}>
                              <TableCell sx={{ pl: 3 }}>{row.barcode || "—"}</TableCell>
                              <TableCell sx={{ pl: 3 }}>
                                <Typography variant="body2">{row.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  dentro de {group.label}
                                </Typography>
                              </TableCell>
                              {showCartStock ? (
                                <TableCell align="center">{stockQty}</TableCell>
                              ) : null}
                              <TableCell align="center" sx={{ minWidth: 105 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateCartRow(
                                      rowKey,
                                      "quantity",
                                      Number(e.target.value || 0),
                                    )
                                  }
                                  inputProps={{ min: 0, step: "1" }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ minWidth: 120 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={row.price}
                                  onChange={(e) =>
                                    updateCartRow(rowKey, "price", Number(e.target.value || 0))
                                  }
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">$</InputAdornment>
                                    ),
                                  }}
                                  inputProps={{ min: 0, step: "0.01" }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                ${lineBreakdown(row).iva.toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                ${lineBreakdown(row).total.toFixed(2)}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeRow(rowKey)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={showCartStock ? 8 : 7}>
                        <Typography variant="body2" color="text.secondary">
                          Aún no hay productos agregados.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={3.5}>
          <Paper sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
              Total Venta: ${total.toFixed(2)}
            </Typography>
            <Stack spacing={0.75} sx={{ "& .MuiFormControl-root": { mt: 0, mb: 0 } }}>
              <TextField
                select
                fullWidth
                size="small"
                margin="dense"
                label="Documento"
                value={documentType}
                onChange={(e) => {
                  const next = e.target.value;
                  setDocumentType(next);
                  if (next === "factura") {
                    setUseCustomerData(true);
                  }
                }}
              >
                <MenuItem value="documento">Documento</MenuItem>
                <MenuItem value="factura">Factura</MenuItem>
                <MenuItem value="nota_venta">Nota de venta</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                margin="dense"
                label="Condición de pago"
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
              >
                <MenuItem value="contado">Contado</MenuItem>
                <MenuItem value="credito">Crédito</MenuItem>
              </TextField>
              {saleType === "credito" ? (
                <Typography variant="caption" color="text.secondary">
                  Queda pendiente de cobro; no suma al turno hasta cobrarla en Cobranzas.
                </Typography>
              ) : null}
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={documentType === "factura" || useCustomerData}
                    disabled={documentType === "factura"}
                    onChange={(e) => setUseCustomerData(e.target.checked)}
                  />
                }
                label="Registrar datos del cliente"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.5 }}>
                {documentType === "factura"
                  ? "En factura es obligatorio registrar cliente."
                  : "Si no marcas la casilla, se usa Consumidor Final automáticamente."}
              </Typography>
              {useCustomerData || documentType === "factura" ? (
                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <SearchableSelect
                      fullWidth
                      label="Cliente"
                      value={customerId}
                      onChange={setCustomerId}
                      items={customers}
                      getOptionLabel={(customer) => {
                        const doc = formatCustomerDocument(customer);
                        const phone = customer.phone ? ` · ${customer.phone}` : "";
                        return `${buildCustomerDisplayName(customer)}${doc ? ` · ${doc}` : ""}${phone}`;
                      }}
                      getOptionValue={(customer) => String(customer.id)}
                    />
                  </Box>
                  <Tooltip title="Agregar cliente nuevo">
                    <IconButton
                      color="primary"
                      size="small"
                      sx={{ mt: 0.25 }}
                      onClick={() => setAddCustomerOpen(true)}
                      aria-label="Agregar cliente"
                    >
                      <PersonAddIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : null}
              <TextField
                select
                fullWidth
                size="small"
                margin="dense"
                label="Método de pago"
                value={paymentMethod}
                disabled={saleType === "credito"}
                onChange={(e) => {
                  const next = e.target.value;
                  setPaymentMethod(next);
                  if (next !== "efectivo") setAmountReceived("");
                }}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
                <MenuItem value="tarjeta">Tarjeta</MenuItem>
              </TextField>
              <Button
                size="small"
                variant="text"
                sx={{ alignSelf: "flex-start", textTransform: "none", fontSize: "0.8rem", py: 0 }}
                onClick={() => {
                  setQuickDownProductId("");
                  setQuickDownQty("");
                  setQuickDownNote("");
                  setQuickDownOpen(true);
                }}
              >
                Sistema marca de más → bajar stock
              </Button>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                label="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<PointOfSaleIcon />}
                disabled={saving}
                onClick={onCheckout}
                fullWidth
              >
                {saving ? "Guardando..." : "Cobrar"}
              </Button>
            </Stack>

            <Divider sx={{ my: 1 }} />
            <Stack spacing={0.75} sx={{ "& .MuiFormControl-root": { mt: 0, mb: 0 } }}>
              {saleType === "contado" && paymentMethod === "efectivo" ? (
                <>
                  <TextField
                    type="number"
                    size="small"
                    margin="dense"
                    label="Monto recibido"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                  <Typography variant="body2">
                    Vuelto: ${change.toFixed(2)}
                  </Typography>
                </>
              ) : saleType === "contado" ? (
                <Typography variant="caption" color="text.secondary">
                  {paymentMethod === "transferencia"
                    ? "Pago por transferencia: no suma al arqueo de efectivo del turno."
                    : "Pago con tarjeta: no suma al arqueo de efectivo del turno."}
                </Typography>
              ) : null}
              <Typography variant="body2">
                SUBTOTAL: ${subtotal.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                IVA: ${iva.toFixed(2)}
              </Typography>
              <Typography fontWeight={700}>
                TOTAL: ${total.toFixed(2)}
              </Typography>
            </Stack>

          </Paper>
        </Grid>
      </Grid>

      <Dialog open={stockDialogOpen} onClose={closeStockDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: "1rem", py: 1.5 }}>
          Sistema con menos stock que el carrito
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Suma unidades al inventario del sistema y cobra (movimiento con marca de revisión).
          </Typography>
          <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Sis.</TableCell>
                  <TableCell align="right">Carrito</TableCell>
                  <TableCell align="right">Mín.</TableCell>
                  <TableCell align="right">Entrada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockIssues.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.systemStock}</TableCell>
                    <TableCell align="right">{row.requested}</TableCell>
                    <TableCell align="right">{row.deficit}</TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={stockAdjustQty[row.productId] ?? ""}
                        onChange={(e) =>
                          setStockAdjustQty((prev) => ({
                            ...prev,
                            [row.productId]: e.target.value,
                          }))
                        }
                        inputProps={{ min: row.deficit, step: "0.01" }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TextField
            fullWidth
            size="small"
            label="Nota (opcional)"
            placeholder="Conteo, mercancía no cargada…"
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={closeStockDialog} disabled={saving} size="small">
            Volver
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleConfirmStockAdjustAndCheckout()}
            disabled={saving}
          >
            {saving ? "…" : "Ajustar y cobrar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quickDownOpen} onClose={() => !saving && setQuickDownOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: "1rem", py: 1.5 }}>Bajar stock en sistema</DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Si el sistema marca de más (robo, merma, error de carga), rebaja aquí antes o después de vender.
          </Typography>
          <SearchableSelect
            fullWidth
            label="Producto"
            placeholder="Buscar…"
            items={productsByStockDesc}
            value={quickDownProductId}
            onChange={setQuickDownProductId}
            getOptionLabel={(item) =>
              `${item.name || "—"} · sis. ${item.stock ?? 0}${item.baseUnit?.abbreviation ? ` ${item.baseUnit.abbreviation}` : ""}`
            }
            getOptionValue={(item) => String(item.id)}
          />
          {quickDownProductId ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, mb: 1 }}>
              Stock en sistema ahora: {quickDownProduct?.stock ?? "—"}
            </Typography>
          ) : null}
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Cantidad a rebajar (unidad base)"
            value={quickDownQty}
            onChange={(e) => setQuickDownQty(e.target.value)}
            sx={{ mb: 1 }}
            inputProps={{ min: 0.01, step: "0.01" }}
          />
          <TextField
            fullWidth
            size="small"
            label="Motivo (opcional)"
            placeholder="Ej. conteo físico, merma…"
            value={quickDownNote}
            onChange={(e) => setQuickDownNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button size="small" onClick={() => setQuickDownOpen(false)} disabled={saving}>
            Cerrar
          </Button>
          <Button size="small" variant="contained" disabled={saving} onClick={() => void applyQuickDownStock()}>
            {saving ? "…" : "Guardar salida"}
          </Button>
        </DialogActions>
      </Dialog>

      <CajaQuickProductsDialog
        open={quickProductsOpen}
        onClose={() => setQuickProductsOpen(false)}
        products={products}
        surtidoCategories={surtidoCategories}
        onAdd={(product, qty) => addToCart(product, qty)}
        onAddSurtido={addSurtidoBatch}
      />

      <CajaCustomerFormDialog
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        toast={toast}
        onCreated={(created) => {
          if (!created?.id) return;
          setCustomers((prev) => {
            const exists = prev.some((c) => Number(c.id) === Number(created.id));
            if (exists) {
              return prev.map((c) =>
                Number(c.id) === Number(created.id) ? { ...c, ...created } : c
              );
            }
            return [...prev, created].sort((a, b) =>
              buildCustomerDisplayName(a).localeCompare(buildCustomerDisplayName(b), "es")
            );
          });
          setCustomerId(String(created.id));
          setUseCustomerData(true);
        }}
      />

      <PrintFormatDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={printReceipt}
      />
    </Box>
  );
}
