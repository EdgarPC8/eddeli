import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
  getTierGroups,
} from "../../api/inventoryControlRequest.js";
import { getAllCustomersRequest, posCheckoutRequest } from "../../api/ordersRequest.js";
import { getActiveShift } from "../../api/shiftRequest.js";
import { fetchSriBillingSettings } from "../../api/sriBillingRequest.js";
import { emitSriInvoice } from "../../api/sriInvoicesRequest.js";
import CajaCustomerFormDialog from "./CajaCustomerFormDialog.jsx";
import CajaQuickProductsDialog from "./CajaQuickProductsDialog.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAppSettings } from "../../context/AppSettingsContext.jsx";
import { buildCajaOrderNotes, findConsumidorFinalCustomer } from "../../utils/eddeliPosOrderUtils.js";
import { buildCustomerDisplayName } from "./cajaCustomerUtils.js";
import { formatMoney } from "../../utils/turnoCashUtils.js";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner.js";
import {
  resolveEddeliLinePricing,
  findEddeliProductByCode,
  applyTierGroupPricing,
  buildEffectiveTierGroups,
  getCartRowTierVisualKind,
  getProductTierVisualKind,
  getTierGroupLabel,
  isPanTierGroup,
} from "../../utils/productLookup.js";
import {
  buildReceiptFromCheckout,
  resolveStoredDocumentType,
} from "../../utils/saleReceiptUtils.js";
import {
  annotateCajaDrafts,
  clearAllCajaDrafts,
  clearCajaDraft,
  countAvailableCajaDrafts,
  createTabDraftId,
  getTabDraftSession,
  isCajaDraftWorthRestoring,
  readCajaDraft,
  subscribeCajaDraftSync,
  summarizeCajaDraft,
  touchCajaDraftPresence,
  tryClaimCajaDraft,
  writeCajaDraft,
} from "../../utils/cajaDraftStorage.js";
import { buildSriInvoicePayloadFromCaja } from "../../utils/cajaSriEmit.js";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RestoreIcon from "@mui/icons-material/Restore";

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

function getTierVisualRowSx(kind, theme) {
  if (kind === "pan-group") {
    return {
      bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.28),
    };
  }
  if (kind === "other-group") {
    return {
      bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.16 : 0.18),
    };
  }
  if (kind === "product-tier") {
    return {
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.12 : 0.14),
    };
  }
  return {};
}

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
  const usesLineTotal =
    row.lineTotal != null &&
    (row.pricingMode === "package" ||
      row.pricingMode === "category_package" ||
      row.pricingMode === "tier_group_package");
  const total = usesLineTotal ? to2(Number(row.lineTotal)) : to2(qty * unitPrice);
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
  const { toast, user } = useAuth();
  const { activeApp, loading: appSettingsLoading } = useAppSettings();
  const theme = useTheme();
  const draftUserId = user?.userId != null ? String(user.userId) : null;
  const [products, setProducts] = useState([]);
  const [tierGroups, setTierGroups] = useState([]);
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
  const [sriSettings, setSriSettings] = useState(null);
  const [draftChoices, setDraftChoices] = useState(null);
  const [draftModalLocked, setDraftModalLocked] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);
  const draftTokenRef = useRef(null);
  const draftChoicesOpenRef = useRef(false);
  const skipDefaultCustomerRef = useRef(false);

  useEffect(() => {
    draftChoicesOpenRef.current = Boolean(draftChoices?.length);
  }, [draftChoices]);

  const refreshPendingDraftCount = useCallback(() => {
    if (draftUserId == null) {
      setPendingDraftCount(0);
      return;
    }
    setPendingDraftCount(
      countAvailableCajaDrafts(activeApp, draftUserId, {
        myToken: draftTokenRef.current,
        myDraftId: activeDraftId,
      }),
    );
  }, [activeApp, draftUserId, activeDraftId]);

  const refreshDraftChoices = useCallback(() => {
    if (draftUserId == null) return;
    const annotated = annotateCajaDrafts(activeApp, draftUserId, {
      myToken: draftTokenRef.current,
      myDraftId: activeDraftId,
    });
    setDraftChoices(annotated);
    setPendingDraftCount(annotated.filter((d) => d.status === "available").length);
  }, [activeApp, draftUserId, activeDraftId]);

  const openDraftRecoverModal = () => {
    if (draftUserId == null) return;
    const annotated = annotateCajaDrafts(activeApp, draftUserId, {
      myToken: draftTokenRef.current,
      myDraftId: activeDraftId,
    });
    setPendingDraftCount(annotated.filter((d) => d.status === "available").length);
    if (annotated.length === 0) {
      void toast?.({ message: "No hay cajas pendientes por recuperar.", variant: "info" });
      return;
    }
    setDraftModalLocked(false);
    setDraftChoices(annotated);
  };

  const applyDraftState = (d, nextCustomers = customers) => {
    setCart(Array.isArray(d?.cart) ? d.cart : []);
    setNotes(String(d?.notes || ""));
    if (d?.documentType) setDocumentType(d.documentType);
    if (d?.saleType) setSaleType(d.saleType);
    if (d?.paymentMethod) setPaymentMethod(d.paymentMethod);
    setAmountReceived(d?.amountReceived != null ? String(d.amountReceived) : "");
    setUseCustomerData(Boolean(d?.useCustomerData));
    const cid = d?.customerId != null ? String(d.customerId) : "";
    if (cid && nextCustomers.some((c) => String(c.id) === cid)) {
      setCustomerId(cid);
    } else {
      const consumidorFinal = findConsumidorFinalCustomer(nextCustomers);
      if (consumidorFinal) setCustomerId(String(consumidorFinal.id));
    }
  };

  const loadData = async () => {
    const [productsRes, customersRes, shiftRes, tierGroupsRes, sriRes] = await Promise.allSettled([
      getAllProducts({ withTierGroups: "true", all: "true" }),
      getAllCustomersRequest(),
      getActiveShift(),
      getTierGroups({ active: "true" }),
      fetchSriBillingSettings(),
    ]);
    let nextProducts = [];
    let nextTierGroups = [];
    if (productsRes.status === "fulfilled") {
      const body = productsRes.value.data;
      if (body?.products && Array.isArray(body.products)) {
        nextProducts = body.products;
        nextTierGroups = Array.isArray(body.tierGroups) ? body.tierGroups : [];
      } else if (Array.isArray(body)) {
        nextProducts = body;
      }
    }
    if (!nextTierGroups.length && tierGroupsRes.status === "fulfilled") {
      nextTierGroups = tierGroupsRes.value.data || [];
    }
    const nextCustomers =
      customersRes.status === "fulfilled" ? customersRes.value.data || [] : [];
    setProducts(nextProducts);
    setCustomers(nextCustomers);
    setTierGroups(nextTierGroups);
    setActiveShift(shiftRes.status === "fulfilled" ? shiftRes.value.data : null);
    if (sriRes.status === "fulfilled") {
      setSriSettings(sriRes.value || null);
    }
    if (!customerId && !skipDefaultCustomerRef.current) {
      const consumidorFinal = findConsumidorFinalCustomer(nextCustomers);
      if (consumidorFinal) setCustomerId(String(consumidorFinal.id));
    }
    return { products: nextProducts, customers: nextCustomers };
  };

  useEffect(() => {
    if (draftUserId == null || appSettingsLoading) return;
    let cancelled = false;
    (async () => {
      const { draftId: sessionDraftId, token } = getTabDraftSession();
      draftTokenRef.current = token;
      const { customers: nextCustomers } = await loadData();
      if (cancelled) return;

      if (sessionDraftId) {
        const mine = readCajaDraft(activeApp, draftUserId, sessionDraftId);
        if (mine && isCajaDraftWorthRestoring(mine)) {
          skipDefaultCustomerRef.current = true;
          applyDraftState(mine, nextCustomers);
          skipDefaultCustomerRef.current = false;
          setActiveDraftId(sessionDraftId);
          touchCajaDraftPresence(activeApp, draftUserId, sessionDraftId, token);
          setDraftReady(true);
          return;
        }
      }

      const pending = annotateCajaDrafts(activeApp, draftUserId, {
        myToken: token,
        myDraftId: null,
      });
      const available = pending.filter((d) => d.status === "available");
      if (available.length > 0) {
        skipDefaultCustomerRef.current = true;
        setDraftModalLocked(true);
        setDraftChoices(pending);
        setPendingDraftCount(available.length);
        return;
      }

      const freshId = createTabDraftId();
      setActiveDraftId(freshId);
      setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftUserId, appSettingsLoading, activeApp?.alias, activeApp?.mediaFolderPrefix]);

  useEffect(() => {
    if (!draftReady || draftChoices || draftUserId == null || !activeDraftId) return;
    const timer = window.setTimeout(() => {
      const draft = {
        cart,
        notes,
        documentType,
        saleType,
        paymentMethod,
        amountReceived,
        useCustomerData,
        customerId,
      };
      if (isCajaDraftWorthRestoring(draft)) {
        const writtenId = writeCajaDraft(
          activeApp,
          draftUserId,
          activeDraftId,
          draft,
          draftTokenRef.current,
        );
        if (writtenId && writtenId !== activeDraftId) setActiveDraftId(writtenId);
      } else {
        clearCajaDraft(activeApp, draftUserId, activeDraftId);
      }
      refreshPendingDraftCount();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    draftReady,
    draftChoices,
    draftUserId,
    activeDraftId,
    activeApp,
    cart,
    notes,
    documentType,
    saleType,
    paymentMethod,
    amountReceived,
    useCustomerData,
    customerId,
    refreshPendingDraftCount,
  ]);

  // Heartbeat de presencia + sync entre pestañas
  useEffect(() => {
    if (draftUserId == null || appSettingsLoading) return undefined;
    const sync = () => {
      refreshPendingDraftCount();
      if (draftChoicesOpenRef.current) refreshDraftChoices();
    };
    const unsub = subscribeCajaDraftSync(activeApp, draftUserId, sync);
    const beat = window.setInterval(() => {
      if (activeDraftId && draftTokenRef.current && draftReady) {
        touchCajaDraftPresence(activeApp, draftUserId, activeDraftId, draftTokenRef.current);
      }
      sync();
    }, 3000);
    sync();
    return () => {
      unsub();
      window.clearInterval(beat);
    };
  }, [
    activeApp,
    draftUserId,
    appSettingsLoading,
    activeDraftId,
    draftReady,
    refreshPendingDraftCount,
    refreshDraftChoices,
  ]);

  const pickCajaDraft = (draft) => {
    if (!draft?.id || draftUserId == null) return;
    if (draft.status === "in_use") {
      void toast?.({
        message: "Esa caja ya está en uso en otra pestaña.",
        variant: "warning",
      });
      refreshDraftChoices();
      return;
    }
    if (draft.status === "mine") {
      setDraftChoices(null);
      setDraftModalLocked(false);
      return;
    }
    const result = tryClaimCajaDraft(
      activeApp,
      draftUserId,
      draft.id,
      draftTokenRef.current,
    );
    if (!result.ok) {
      void toast?.({
        message:
          result.reason === "in_use"
            ? "Otra pestaña ya recuperó esa caja. Elige otra o empieza limpia."
            : "Ese borrador ya no existe.",
        variant: "warning",
      });
      refreshDraftChoices();
      return;
    }
    applyDraftState(draft, customers);
    skipDefaultCustomerRef.current = false;
    setActiveDraftId(result.id);
    setDraftChoices(null);
    setDraftModalLocked(false);
    setDraftReady(true);
    refreshPendingDraftCount();
  };

  const startFreshCajaDraft = () => {
    const id = createTabDraftId();
    skipDefaultCustomerRef.current = false;
    setActiveDraftId(id);
    setDraftChoices(null);
    setDraftModalLocked(false);
    setDraftReady(true);
    if (draftTokenRef.current) {
      touchCajaDraftPresence(activeApp, draftUserId, id, draftTokenRef.current);
    }
    if (!customerId) {
      const consumidorFinal = findConsumidorFinalCustomer(customers);
      if (consumidorFinal) setCustomerId(String(consumidorFinal.id));
    }
    refreshPendingDraftCount();
  };

  const discardOneCajaDraft = (draftId) => {
    if (draftUserId == null || !draftId) return;
    clearCajaDraft(activeApp, draftUserId, draftId);
    const annotated = annotateCajaDrafts(activeApp, draftUserId, {
      myToken: draftTokenRef.current,
      myDraftId: activeDraftId,
    });
    const available = annotated.filter((d) => d.status === "available");
    setPendingDraftCount(available.length);
    if (!draftReady) {
      if (available.length === 0) {
        startFreshCajaDraft();
        return;
      }
      setDraftChoices(annotated);
      return;
    }
    if (annotated.length === 0) {
      setDraftChoices(null);
      setDraftModalLocked(false);
      return;
    }
    setDraftChoices(annotated);
  };

  const discardAllCajaDrafts = () => {
    if (draftUserId != null) clearAllCajaDrafts(activeApp, draftUserId);
    if (!draftReady) {
      startFreshCajaDraft();
      return;
    }
    setDraftChoices(null);
    setDraftModalLocked(false);
    setPendingDraftCount(0);
  };

  const closeDraftModalIfAllowed = () => {
    if (draftModalLocked) return;
    setDraftChoices(null);
  };

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

  const effectiveTierGroups = useMemo(
    () => buildEffectiveTierGroups(tierGroups, products),
    [tierGroups, products],
  );

  const renderCajaProductOption = useCallback(
    (props, item) => {
      const tierKind = getProductTierVisualKind(item, effectiveTierGroups);
      return (
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
              pl: tierKind ? 1 : 0,
              borderLeft: tierKind ? 3 : 0,
              borderColor:
                tierKind === "pan-group"
                  ? "warning.main"
                  : tierKind === "other-group"
                    ? "info.main"
                    : tierKind === "product-tier"
                      ? "success.main"
                      : "transparent",
            }}
          >
            <Box
              component="span"
              sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
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
    },
    [effectiveTierGroups],
  );

  const addToCart = (product, qtyToAdd = 1) => {
    const addQty = Math.max(1, Math.floor(Number(qtyToAdd) || 1));
    setCart((prev) => {
      const id = Number(product.id);
      const key = String(id);
      const exists = prev.find((row) => cartRowKey(row) === key);
      const quantity = exists ? Number(exists.quantity) + addQty : addQty;
      const pricing = resolveEddeliLinePricing(product, quantity, effectiveTierGroups);
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

  const addSurtidoBatch = ({ lines, label, tierGroup }) => {
    const mixGroupId = newMixGroupId();
    const mixGroupLabel = label || getTierGroupLabel(tierGroup);
    setCart((prev) => {
      const next = [...prev];
      for (const { product, quantity } of lines) {
        const id = Number(product.id);
        const qty = Math.max(1, Math.floor(Number(quantity) || 1));
        const pricing = resolveEddeliLinePricing(product, qty, effectiveTierGroups);
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
          tierGroupId: tierGroup?.id,
        });
      }
      return next;
    });
  };

  const handleProductPick = (productId) => {
    if (!productId) return;
    const found = products.find((p) => String(p.id) === String(productId));
    if (found) {
      addToCart(found);
      setSelectedProductId("");
    }
  };

  const handleProductSearchEnter = useCallback(
    (query) => {
      const trimmed = String(query || "").trim();
      if (!trimmed) return;
      const byCode = findEddeliProductByCode(products, trimmed);
      if (byCode) {
        addToCart(byCode);
        setSelectedProductId("");
        return;
      }
      const found = findProductByQuery(trimmed);
      if (found) {
        addToCart(found);
        setSelectedProductId("");
        return;
      }
      void toast?.({
        message: `No se encontró "${trimmed}" en productos.`,
        variant: "warning",
      });
    },
    [products, toast],
  );

  const scannerUiBlocked =
    saving ||
    stockDialogOpen ||
    quickDownOpen ||
    addCustomerOpen ||
    quickProductsOpen ||
    Boolean(draftChoices);

  const handleBarcodeCode = useCallback(
    (code) => {
      handleProductSearchEnter(code);
    },
    [handleProductSearchEnter],
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
            const pricing = resolveEddeliLinePricing(product, next.quantity, effectiveTierGroups);
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
    () => applyTierGroupPricing(cart, products, effectiveTierGroups),
    [cart, products, effectiveTierGroups],
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
    const payMethod = isCreditSale ? "credito" : paymentMethod || "efectivo";
    const { data } = await posCheckoutRequest({
      customerId: Number(resolvedCustomerId),
      notes: orderNotes,
      saleType: isCreditSale ? "credito" : "contado",
      paymentMethod: payMethod,
      documentType: storedDocType,
      items: cartSnapshot.map((row) => ({
        productId: Number(row.productId),
        quantity: Number(row.quantity),
        price:
          (row.pricingMode === "package" ||
            row.pricingMode === "category_package" ||
            row.pricingMode === "tier_group_package") &&
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
      paymentMethod: payMethod,
      saleType,
      notes: orderNotes,
    });

    // Factura electrónica SRI: no bloquea el cobro si falla
    if (isInvoice && sriSettings?.readyForInvoicing) {
      void (async () => {
        try {
          const payload = buildSriInvoicePayloadFromCaja({
            customer,
            cartRows: cartSnapshot,
            paymentMethod: payMethod,
          });
          payload.orderId = data.orderId;
          if (customer?.id) payload.customerId = Number(customer.id);
          const result = await emitSriInvoice(payload);
          const st = result?.invoice?.status;
          void toast?.({
            message:
              st === "authorized"
                ? `Factura electrónica autorizada (SRI). Clave: ${result.invoice.accessKey || "—"}`
                : st === "rejected"
                  ? `Venta OK. SRI rechazó la factura: ${result.invoice?.sriMessage || result.message || ""}`
                  : result?.message || "Factura electrónica enviada al SRI",
            variant: st === "authorized" ? "success" : st === "rejected" ? "warning" : "info",
          });
        } catch (err) {
          void toast?.({
            message: `Venta registrada. No se pudo emitir al SRI: ${
              err?.response?.data?.message || err.message || "error"
            }`,
            variant: "warning",
          });
        }
      })();
    } else if (isInvoice && !sriSettings?.readyForInvoicing) {
      void toast?.({
        message:
          "Factura POS guardada. Facturación electrónica SRI no está lista (configura firma/RUC).",
        variant: "info",
      });
    }

    setCart([]);
    setNotes("");
    setSelectedProductId("");
    setAmountReceived("");
    if (draftUserId != null && activeDraftId) {
      clearCajaDraft(activeApp, draftUserId, activeDraftId);
      const freshId = createTabDraftId();
      setActiveDraftId(freshId);
    }
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
    const fallbackCustomer = findConsumidorFinalCustomer(customers);
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
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
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
          {pendingDraftCount > 0 ? (
            <Tooltip title="Hay cajas guardadas por recuperar en este navegador">
              <Chip
                size="small"
                color="info"
                icon={<RestoreIcon />}
                label={`${pendingDraftCount} por recuperar`}
                onClick={openDraftRecoverModal}
                clickable
              />
            </Tooltip>
          ) : null}
          {sriSettings?.readyForInvoicing ? (
            <Chip
              size="small"
              color="success"
              icon={<FactCheckIcon />}
              label="Facturación electrónica activa"
              component={RouterLink}
              to="/sistema/configuracion?tab=sri"
              clickable
            />
          ) : (
            <Chip
              size="small"
              variant="outlined"
              color="warning"
              icon={<FactCheckIcon />}
              label="SRI no listo"
              component={RouterLink}
              to="/sistema/configuracion?tab=sri"
              clickable
            />
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
          Turno abierto
          {activeShift.store?.name
            ? ` · ${activeShift.store.name}`
            : activeShift.establishmentCode
              ? ` · ${activeShift.establishmentCode}-${activeShift.emissionPointCode}`
              : ""}
          {" · "}capital inicial {formatMoney(activeShift.openingCashTotal)} · efectivo esperado
          ahora {formatMoney(activeShift.expectedCashTotal)}
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
                placeholder="Buscar, clic o Enter para agregar al carrito"
                items={productsByStockDesc}
                value={selectedProductId}
                onChange={handleProductPick}
                clearInputOnSelect
                getOptionLabel={formatProductSearchLabel}
                getOptionValue={(item) => String(item.id)}
                getSearchText={(item) =>
                  [item.name, item.barcode, item.sku].filter(Boolean).join(" ")
                }
                renderOption={renderCajaProductOption}
                onEnterWithInput={handleProductSearchEnter}
              />
              <Button variant="outlined" startIcon={<AppsIcon />} onClick={() => setQuickProductsOpen(true)}>
                Accesos rápidos
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
                      const tierKind = getCartRowTierVisualKind(row, products, effectiveTierGroups);
                      return (
                        <TableRow key={rowKey} sx={getTierVisualRowSx(tierKind, theme)}>
                          <TableCell>{row.barcode || "—"}</TableCell>
                          <TableCell>{row.name}</TableCell>
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
                    const mixTierKind = isPanTierGroup({ name: group.label }) ? "pan-group" : "other-group";
                    return (
                      <React.Fragment key={group.mixGroupId}>
                        <TableRow sx={getTierVisualRowSx(mixTierKind, theme)}>
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
                            <TableRow
                              key={rowKey}
                              sx={getTierVisualRowSx(mixTierKind, theme)}
                            >
                              <TableCell sx={{ pl: 3 }}>{row.barcode || "—"}</TableCell>
                              <TableCell sx={{ pl: 3 }}>
                                <Typography variant="body2">{row.name}</Typography>
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
                helperText={
                  documentType === "factura"
                    ? sriSettings?.readyForInvoicing
                      ? "Al cobrar se emite también la factura electrónica al SRI (cliente o consumidor final)."
                      : "Factura POS local. Configura SRI para emitir al fisco."
                    : undefined
                }
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
                        const name = buildCustomerDisplayName(customer);
                        const cedula = String(customer?.cedula || "").trim();
                        if (cedula) return `${name} · ${cedula}`;
                        const phone = String(customer?.phone || "").trim();
                        if (phone) return `${name} · ${phone}`;
                        return name;
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

      <Dialog
        open={Boolean(draftChoices?.length)}
        onClose={closeDraftModalIfAllowed}
        disableEscapeKeyDown={draftModalLocked}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: "1rem", py: 1.5 }}>
          Recuperar cajas anteriores
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Elige un borrador libre para esta pestaña. Si está “En uso”, ya lo tomó otra caja.
          </Typography>
          <Stack spacing={1.25}>
            {(draftChoices || []).map((draft) => {
              const summary = summarizeCajaDraft(draft);
              const busy = draft.status === "in_use";
              const mine = draft.status === "mine";
              return (
                <Paper
                  key={draft.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    opacity: busy ? 0.72 : 1,
                    borderColor: mine ? "success.main" : busy ? "warning.main" : "divider",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "flex-start" }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" fontWeight={600}>
                          {summary.whenLabel}
                        </Typography>
                        {mine ? (
                          <Chip size="small" color="success" label="Esta pestaña" />
                        ) : busy ? (
                          <Chip size="small" color="warning" label="En uso en otra pestaña" />
                        ) : (
                          <Chip size="small" color="info" variant="outlined" label="Disponible" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {summary.lines > 0
                          ? `${summary.lines} línea${summary.lines === 1 ? "" : "s"} · ${summary.units} unidad${
                              summary.units === 1 ? "" : "es"
                            }`
                          : "Notas u opciones sin productos"}
                      </Typography>
                      {summary.products.items.length > 0 ? (
                        <Box
                          component="ul"
                          sx={{
                            m: 0,
                            mt: 0.75,
                            pl: 2,
                            maxHeight: 120,
                            overflow: "auto",
                          }}
                        >
                          {summary.products.items.map((item, idx) => (
                            <Typography
                              key={`${draft.id}-${idx}`}
                              component="li"
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.name} × {item.quantity}
                            </Typography>
                          ))}
                          {summary.products.more > 0 ? (
                            <Typography component="li" variant="caption" color="text.secondary">
                              … y {summary.products.more} más
                            </Typography>
                          ) : null}
                        </Box>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                      {!mine ? (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => discardOneCajaDraft(draft.id)}
                        >
                          Descartar
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={() => pickCajaDraft(draft)}
                      >
                        {mine ? "Ya está aquí" : "Usar"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={discardAllCajaDrafts} color="inherit" size="small">
            Descartar todas
          </Button>
          {!draftModalLocked ? (
            <Button onClick={closeDraftModalIfAllowed} size="small">
              Cerrar
            </Button>
          ) : null}
          <Button onClick={startFreshCajaDraft} size="small" variant={draftModalLocked ? "outlined" : "text"}>
            Empezar limpia
          </Button>
        </DialogActions>
      </Dialog>

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
        tierGroups={effectiveTierGroups}
        categoryMatch={activeApp.cajaQuickCategoryMatch}
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
