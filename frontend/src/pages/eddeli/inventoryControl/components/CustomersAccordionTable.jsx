// src/pages/Reports/CustomersAccordionTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Collapse, IconButton, Typography, Box, TablePagination,
  Tooltip, TextField, Stack, Chip, TableSortLabel, Alert, CircularProgress,
  Button, Dialog, DialogActions, DialogContent, DialogTitle, useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PaidIcon from "@mui/icons-material/AttachMoney";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import TableRowsIcon from "@mui/icons-material/TableRows";
import CloseIcon from "@mui/icons-material/Close";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getCustomerSalesSummary } from "../../../../api/financeRequest";
import { getFinanceWorkbenchAllRequest } from "../../../../api/ordersRequest";
import { buildCustomerDebtMetrics } from "../finance/pendingCollections.js";

/* ---------------------- Utils ---------------------- */
// -> Devuelve número o def (0). NO trata 0 como falsy. Soporta "7,50".
const toNum = (v, def = 0) => {
  if (v === null || v === undefined) return def;
  if (typeof v === "number") return Number.isFinite(v) ? v : def;
  if (typeof v === "string") {
    const s = v.trim().replace(/\s+/g, "");
    const normalized = s.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : def;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
// -> Devuelve número o null (para detectar “no vino”)
const numOrNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim().replace(/\s+/g, "");
    const normalized = s.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
// -> Saldo real por cobrar (Cobranzas) o fallback del API.
const getDebt = (row) => {
  const d0 = numOrNull(row?.debe);
  if (d0 !== null) return d0;
  const d1 = numOrNull(row?.totalAmountDeuda);
  if (d1 !== null) return d1;
  const d2 = numOrNull(row?.revenuePending);
  return d2 ?? 0;
};

const billableQty = (it) => {
  const qty = toNum(it?.quantity ?? it?.qty);
  const damaged = toNum(it?.damagedQty);
  const gift = toNum(it?.giftQty);
  return Math.max(0, qty - damaged - gift);
};

const money = (n) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
    .format(toNum(n));

const CHART_TOP_N = 10;

const safeArray = (v) => (Array.isArray(v) ? v : []);

function truncateLabel(name, max = 22) {
  const s = String(name || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Segmentos del gráfico apilado: liquidado + abonado + deuda = total ventas */
function buildChartSegments(row) {
  const revenueTotal = toNum(row?.revenueTotal);
  const abonado = toNum(row?.abonado);
  const deuda = getDebt(row);
  const cobrableBruto = numOrNull(row?.cobrableBruto) ?? deuda + abonado;
  const liquidado = Math.max(0, Number((revenueTotal - cobrableBruto).toFixed(2)));
  return { liquidado, abonado, deuda, revenueTotal, cobrableBruto };
}

/** Normaliza el JSON crudo y calcula pendientes por producto (si no vienen) */
function normalizeRows(rawList) {
  return safeArray(rawList).map((r) => {
    const orders = safeArray(r.orders);

    let lineItems = 0;
    let unitsFromItems = 0;
    let unitsDelivered = 0;

    const productMap = new Map();

    for (const o of orders) {
      const items = safeArray(o.ERP_order_items);
      lineItems += items.length;

      for (const it of items) {
        const qty = billableQty(it);
        const price = toNum(it.price);
        const amt = qty * price;
        const rawQty = toNum(it.quantity);
        const isPaid = Boolean(it.paidAt);
        const isDelivered = Boolean(it.deliveredAt);

        unitsFromItems += rawQty;
        if (isDelivered) unitsDelivered += rawQty;

        const prodId = it?.ERP_inventory_product?.id ?? it.productId ?? "unknown";
        const prodName = it?.ERP_inventory_product?.name ?? `Producto #${prodId}`;

        const prev =
          productMap.get(prodId) ??
          { productId: prodId, name: prodName, totalQuantity: 0, totalAmount: 0, pendingQuantity: 0, pendingAmount: 0 };

        prev.totalQuantity += rawQty;
        prev.totalAmount += amt;

        if (!isPaid) {
          prev.pendingQuantity += qty;
          prev.pendingAmount += amt;
        }

        productMap.set(prodId, prev);
      }
    }

    const productSummary = Array.from(productMap.values());
    const computedTotalAmount = productSummary.reduce((s, p) => s + toNum(p.totalAmount), 0);
    const computedPendingAmount = productSummary.reduce((s, p) => s + toNum(p.pendingAmount), 0);

    return {
      customerId: r.customerId ?? r.customer?.id,
      customer: r.customer ?? null,
      ordersCount: orders.length,
      lineItems,
      units: toNum(r.totalQuantity) || unitsFromItems,
      unitsDelivered,
      revenueTotal: toNum(r.totalAmount) || computedTotalAmount,
      totalAmountDeuda: numOrNull(r.totalAmountDeuda), // preserva null si no viene
      revenuePending: numOrNull(r.revenuePending),      // preserva null si no viene
      lastOrderAt: r.lastOrderAt ?? r.updatedAt ?? null,
      productSummary,
      _raw: r,
    };
  });
}

/* ---------------------- Fila ---------------------- */
function CustomerRow({ row }) {
  const [open, setOpen] = useState(false);

  const lastOrderLabel = row?.lastOrderAt
    ? format(new Date(row.lastOrderAt), "dd/MM/yyyy HH:mm", { locale: es })
    : "—";

  const debt = getDebt(row);
  const abonado = toNum(row?.abonado);
  const cobrableBruto = numOrNull(row?.cobrableBruto) ?? debt + abonado;

  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <IconButton onClick={() => setOpen((v) => !v)} size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">
              {row?.customer?.name ?? `Cliente #${row?.customerId ?? "—"}`}
            </Typography>
            {row?.customer?.email && <Chip size="small" label={row.customer.email} />}
          </Stack>
        </TableCell>

        <TableCell align="right">{toNum(row?.ordersCount)}</TableCell>

        <TableCell align="right">
          <Chip icon={<PaidIcon />} color="success" size="small" label={money(row?.revenueTotal)} />
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Monto cobrable antes de abonos parciales en grupos">
            <Chip size="small" variant="outlined" label={money(cobrableBruto)} />
          </Tooltip>
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Abonos registrados en grupos abiertos (Cobranzas)">
            <Chip
              icon={<PaidIcon />}
              color={abonado > 0 ? "info" : "default"}
              size="small"
              variant={abonado > 0 ? "filled" : "outlined"}
              label={money(abonado)}
            />
          </Tooltip>
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Saldo pendiente = cobrable − abonado (misma lógica que Cobranzas)">
            <Chip icon={<PendingIcon />} color={debt > 0 ? "warning" : "default"} size="small" label={money(debt)} />
          </Tooltip>
        </TableCell>

        <TableCell>{lastOrderLabel}</TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: "action.hover", borderTop: 1, borderColor: "divider" }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Chip size="small" label={`Sin grupo: ${money(row?.ungroupedPending)}`} variant="outlined" />
                <Chip size="small" label={`En grupos: ${money(row?.groupsPending)}`} variant="outlined" />
                <Chip size="small" label={`Abonado: ${money(abonado)}`} color="info" variant="outlined" />
                <Chip size="small" label={`Debe: ${money(debt)}`} color="warning" />
              </Stack>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Productos pedidos por este cliente
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Cantidad total</TableCell>
                      <TableCell align="right">Σ Total $</TableCell>
                      <TableCell align="right">Pendiente (u)</TableCell>
                      <TableCell align="right">Pendiente $</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {safeArray(row?.productSummary).map((p) => {
                      const pq = toNum(p.pendingQuantity);
                      const pa = toNum(p.pendingAmount);
                      return (
                        <TableRow key={p.productId ?? p.name}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell align="right">{toNum(p.totalQuantity).toLocaleString()}</TableCell>
                          <TableCell align="right">{money(p.totalAmount)}</TableCell>
                          <TableCell align="right">{pq > 0 ? <Chip color="warning" size="small" label={pq.toLocaleString()} /> : 0}</TableCell>
                          <TableCell align="right">{pa > 0 ? <Chip color="warning" size="small" label={money(pa)} /> : money(0)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {safeArray(row?.productSummary).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">Sin productos</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function CustomersDataTable({
  loading,
  paginated,
  filteredCount,
  sortBy,
  sortDir,
  requestSort,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell sortDirection={sortBy === "customer" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "customer"}
                direction={sortBy === "customer" ? sortDir : "asc"}
                onClick={() => requestSort("customer")}
              >
                Cliente
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sortDirection={sortBy === "ordersCount" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "ordersCount"}
                direction={sortBy === "ordersCount" ? sortDir : "desc"}
                onClick={() => requestSort("ordersCount")}
              >
                # Pedidos
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sortDirection={sortBy === "revenueTotal" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "revenueTotal"}
                direction={sortBy === "revenueTotal" ? sortDir : "desc"}
                onClick={() => requestSort("revenueTotal")}
              >
                Total ventas
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sortDirection={sortBy === "cobrableBruto" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "cobrableBruto"}
                direction={sortBy === "cobrableBruto" ? sortDir : "desc"}
                onClick={() => requestSort("cobrableBruto")}
              >
                Cobrable
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sortDirection={sortBy === "abonado" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "abonado"}
                direction={sortBy === "abonado" ? sortDir : "desc"}
                onClick={() => requestSort("abonado")}
              >
                Abonado
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sortDirection={sortBy === "debt" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "debt"}
                direction={sortBy === "debt" ? sortDir : "desc"}
                onClick={() => requestSort("debt")}
              >
                Debe
              </TableSortLabel>
            </TableCell>

            <TableCell sortDirection={sortBy === "lastOrderAt" ? sortDir : false}>
              <TableSortLabel
                active={sortBy === "lastOrderAt"}
                direction={sortBy === "lastOrderAt" ? sortDir : "desc"}
                onClick={() => requestSort("lastOrderAt")}
              >
                Último pedido
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Box sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading && paginated.map((row, idx) => (
            <CustomerRow key={row?.customerId ?? row?.customer?.id ?? `row-${idx}`} row={row} />
          ))}

          {!loading && paginated.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">Sin datos</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={filteredCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage="Filas por página"
      />
    </TableContainer>
  );
}

/* --------------- Tabla principal --------------- */
export default function CustomersAccordionTable({ workbench: workbenchProp = null }) {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // sort state
  const [sortBy, setSortBy] = useState("priority"); // prioridad: deuda>0 (desc), luego total (desc), luego fecha (desc)
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [salesRes, workbenchRes] = await Promise.all([
          getCustomerSalesSummary(),
          workbenchProp
            ? Promise.resolve({ data: workbenchProp })
            : getFinanceWorkbenchAllRequest(),
        ]);

        const data = salesRes.data;
        const raw =
          Array.isArray(data?.data) ? data.data :
          Array.isArray(data)       ? data :
          [];

        const wb = workbenchProp ?? {
          customers: workbenchRes.data?.customers ?? [],
          orders: workbenchRes.data?.orders ?? [],
          groups: workbenchRes.data?.groups ?? [],
          payments: workbenchRes.data?.payments ?? [],
        };

        const debtMetrics = buildCustomerDebtMetrics(wb);
        const normalized = normalizeRows(raw).map((r) => {
          const m = debtMetrics.get(r.customerId);
          if (!m) return r;
          return {
            ...r,
            cobrableBruto: m.cobrableBruto,
            abonado: m.abonado,
            debe: m.debe,
            ungroupedPending: m.ungroupedPending,
            groupsPending: m.groupsPending,
          };
        });

        if (!active) return;
        setRows(normalized);
      } catch (e) {
        console.error("Error cargando resumen de clientes:", e);
        if (!active) return;
        setRows([]);
        setErr(e?.message || "Error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workbenchProp]);

  // --- búsqueda
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const name = r?.customer?.name ? r.customer.name.toLowerCase() : "";
      const phone = r?.customer?.phone ? String(r.customer.phone).toLowerCase() : "";
      const email = r?.customer?.email ? r.customer.email.toLowerCase() : "";
      const idStr = String(r?.customerId ?? "");
      return name.includes(s) || phone.includes(s) || email.includes(s) || idStr.includes(s);
    });
  }, [rows, search]);

  // --- helpers de comparación
  const cmpNumber = (a, b, dir = "asc") => (dir === "asc" ? a - b : b - a);
  const cmpString = (a, b, dir = "asc") => {
    const A = (a ?? "").toString().toLowerCase();
    const B = (b ?? "").toString().toLowerCase();
    if (A < B) return dir === "asc" ? -1 : 1;
    if (A > B) return dir === "asc" ? 1 : -1;
    return 0;
  };

  // === Regla de prioridad por defecto ===
  // Deudores (>0) arriba, ordenados DESC por deuda;
  // luego los de deuda = 0, ordenados DESC por total; desempate por fecha DESC.
  const priorityComparator = (a, b) => {
    const debtA = getDebt(a);
    const debtB = getDebt(b);

    const posA = debtA > 0 ? 0 : 1; // 0 = grupo deudores, 1 = grupo cero
    const posB = debtB > 0 ? 0 : 1;

    if (posA !== posB) return posA - posB; // deudores primero SIEMPRE

    if (posA === 0) {
      // ambos con deuda: DESC por deuda (ignora sortDir para mantener la lógica)
      if (debtA !== debtB) return debtB - debtA;
      const totA = toNum(a.revenueTotal);
      const totB = toNum(b.revenueTotal);
      if (totA !== totB) return totB - totA;
      const tA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const tB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return tB - tA;
    }

    // ambos sin deuda: DESC por total, desempate fecha DESC
    const totA = toNum(a.revenueTotal);
    const totB = toNum(b.revenueTotal);
    if (totA !== totB) return totB - totA;
    const tA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const tB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    return tB - tA;
  };

  // === Comparador por columna (con regla de “0 al final” en Deuda) ===
  const columnComparator = useMemo(() => {
    switch (sortBy) {
      case "customer":
        return (a, b) => cmpString(a?.customer?.name, b?.customer?.name, sortDir);
      case "ordersCount":
        return (a, b) => cmpNumber(toNum(a.ordersCount), toNum(b.ordersCount), sortDir);
      case "lineItems":
        return (a, b) => cmpNumber(toNum(a.lineItems), toNum(b.lineItems), sortDir);
      case "units":
        return (a, b) => cmpNumber(toNum(a.units), toNum(b.units), sortDir);
      case "revenueTotal":
        return (a, b) => cmpNumber(toNum(a.revenueTotal), toNum(b.revenueTotal), sortDir);
      case "cobrableBruto":
        return (a, b) => cmpNumber(toNum(a.cobrableBruto), toNum(b.cobrableBruto), sortDir);
      case "abonado":
        return (a, b) => cmpNumber(toNum(a.abonado), toNum(b.abonado), sortDir);
      case "debt":
        return (a, b) => {
          const dA = getDebt(a);
          const dB = getDebt(b);
          const posA = dA > 0 ? 0 : 1;
          const posB = dB > 0 ? 0 : 1;

          // deudores primero SIEMPRE; ceros al final
          if (posA !== posB) return posA - posB;

          // dentro del grupo deudores: respeta flecha (asc/desc) por monto
          if (posA === 0 && dA !== dB) return sortDir === "asc" ? dA - dB : dB - dA;

          // desempate por Total y luego por fecha (respeta flecha también)
          const totA = toNum(a.revenueTotal);
          const totB = toNum(b.revenueTotal);
          if (totA !== totB) return sortDir === "asc" ? totA - totB : totB - totA;

          const tA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
          const tB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
          return sortDir === "asc" ? tA - tB : tB - tA;
        };
      case "lastOrderAt":
        return (a, b) =>
          cmpNumber(
            a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0,
            b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0,
            sortDir
          );
      case "priority":
      default:
        return priorityComparator;
    }
  }, [sortBy, sortDir]);

  const filteredSorted = useMemo(() => {
    return [...filtered].sort(columnComparator);
  }, [filtered, columnComparator]);

  // --- paginación
  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredSorted.slice(start, start + rowsPerPage);
  }, [filteredSorted, page, rowsPerPage]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const requestSort = (columnKey) => {
    setPage(0);
    setSortBy((prevKey) => {
      if (prevKey === columnKey) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      // por defecto: asc para texto, desc para números/fechas
      if (columnKey === "customer") setSortDir("asc");
      else setSortDir("desc");
      return columnKey;
    });
  };

  const summary = useMemo(() => {
    let totalVentas = 0;
    let totalCobrable = 0;
    let totalAbonado = 0;
    let totalDeuda = 0;
    for (const r of filtered) {
      const seg = buildChartSegments(r);
      totalVentas += seg.revenueTotal;
      totalCobrable += seg.cobrableBruto;
      totalAbonado += seg.abonado;
      totalDeuda += seg.deuda;
    }
    return {
      clientes: filtered.length,
      totalVentas,
      totalCobrable,
      totalAbonado,
      totalDeuda,
    };
  }, [filtered]);

  const chartDataset = useMemo(
    () =>
      filteredSorted.slice(0, CHART_TOP_N).map((r) => {
        const seg = buildChartSegments(r);
        const name = r?.customer?.name ?? `Cliente #${r?.customerId ?? "—"}`;
        return {
          label: truncateLabel(name),
          fullName: name,
          liquidado: seg.liquidado,
          abonado: seg.abonado,
          deuda: seg.deuda,
          total: seg.revenueTotal,
        };
      }),
    [filteredSorted]
  );

  const cLiquidado = theme.palette.success.main;
  const cAbonado = theme.palette.info.main;
  const cDeuda = theme.palette.error.main;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "flex-start" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 0.5 }}
      >
        <ChartBlockHeader
          title="Clientes — Ventas y Pedidos"
          subtitle="Estado de cuenta por cliente: ventas liquidadas, abonos parciales y saldo pendiente (alineado con Cobranzas)."
          sx={{ mb: 0, flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<TableRowsIcon />}
          onClick={() => setDetailOpen(true)}
          disabled={loading || filteredSorted.length === 0}
          sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.5 } }}
        >
          Ver detalle
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 1.5 }}>
        <TextField
          label="Buscar cliente / teléfono / email"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          fullWidth
        />
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>Error: {err}</Alert>}

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 0.5 }}>
        <Chip size="small" label={`Clientes: ${summary.clientes}`} />
        <Chip size="small" label={`Ventas: ${money(summary.totalVentas)}`} color="primary" />
        <Chip size="small" label={`Cobrable: ${money(summary.totalCobrable)}`} variant="outlined" />
        <Chip size="small" label={`Abonado: ${money(summary.totalAbonado)}`} sx={{ bgcolor: alpha(cAbonado, 0.15) }} />
        <Chip size="small" label={`Deuda: ${money(summary.totalDeuda)}`} color="warning" />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 0.5 }}>
        <Chip size="small" label="Ingresos liquidados" sx={{ bgcolor: cLiquidado, color: theme.palette.getContrastText(cLiquidado) }} />
        <Chip size="small" label="Abonos realizados" sx={{ bgcolor: cAbonado, color: theme.palette.getContrastText(cAbonado) }} />
        <Chip size="small" label="Deuda pendiente" sx={{ bgcolor: cDeuda, color: theme.palette.getContrastText(cDeuda) }} />
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, px: 0.5 }}>
          Estado de cuenta por cliente (top {CHART_TOP_N} por prioridad de cobro)
          {filteredSorted.length > CHART_TOP_N ? ` · ${filteredSorted.length} en total` : ""}
        </Typography>

        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : chartDataset.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Sin clientes con ventas en el período.
          </Typography>
        ) : (
          <BarChart
            layout="horizontal"
            dataset={chartDataset}
            height={Math.max(220, 44 * chartDataset.length)}
            yAxis={[{ scaleType: "band", dataKey: "label", width: 120 }]}
            xAxis={[{ valueFormatter: (v) => money(v) }]}
            series={[
              {
                type: "bar",
                dataKey: "liquidado",
                label: "Ingresos liquidados",
                stack: "cuenta",
                valueFormatter: (v) => money(v),
                color: cLiquidado,
              },
              {
                type: "bar",
                dataKey: "abonado",
                label: "Abonos realizados",
                stack: "cuenta",
                valueFormatter: (v) => money(v),
                color: cAbonado,
              },
              {
                type: "bar",
                dataKey: "deuda",
                label: "Deuda pendiente",
                stack: "cuenta",
                valueFormatter: (v) => money(v),
                color: cDeuda,
              },
            ]}
            margin={{ left: 4, right: 12, top: 8, bottom: 36 }}
            slotProps={{
              legend: { hidden: true },
            }}
          />
        )}
      </Paper>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Detalle de clientes — ventas y pedidos
          <IconButton aria-label="Cerrar" onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {summary.clientes} clientes · Ventas {money(summary.totalVentas)} · Deuda pendiente {money(summary.totalDeuda)}
          </Typography>
          <CustomersDataTable
            loading={loading}
            paginated={paginated}
            filteredCount={filteredSorted.length}
            sortBy={sortBy}
            sortDir={sortDir}
            requestSort={requestSort}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
