import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  TablePagination,
  Button,
  alpha,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SearchIcon from "@mui/icons-material/Search";
import { programmerDashboardOrderItemCorrectionRequest } from "../../../../api/ordersRequest.js";
import { useAuth } from "../../../../context/AuthContext.jsx";
import { money } from "../collections/helpers.js";
import {
  ORDER_STATUS_TABS,
  getStatusTab,
  orderMatchesStatus,
  parseDisplayDateToInput,
  inputToApiDate,
} from "./orderStatusHelpers.js";
import { formatDateTime } from "../../../../helpers/functions.js";

const cellSx = { px: 0.75, py: 0.5, fontSize: "0.78rem", overflow: "hidden" };
const headSx = { ...cellSx, fontWeight: 700 };

function StatusChip({ ok, labelOk, labelNo, icon, okColor = "success", noColor = "default", tooltip }) {
  const short = ok ? formatDateTime(labelOk) : labelNo;
  return (
    <Tooltip title={tooltip || (ok ? formatDateTime(labelOk) : labelNo) || ""} arrow placement="top">
      <Chip
        size="small"
        icon={icon}
        color={ok ? okColor : noColor}
        variant={ok ? "filled" : "outlined"}
        label={short}
        sx={{
          fontWeight: ok ? 700 : 500,
          maxWidth: "100%",
          "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" },
        }}
      />
    </Tooltip>
  );
}

function CompactDateField({ value, onChange, onNow }) {
  return (
    <Stack spacing={0.25}>
      <TextField
        type="datetime-local"
        size="small"
        value={value}
        onChange={onChange}
        fullWidth
        sx={{
          "& .MuiInputBase-root": { fontSize: "0.7rem" },
          "& .MuiInputBase-input": { py: 0.5, px: 0.5 },
        }}
      />
      <Button
        size="small"
        variant="text"
        onClick={onNow}
        sx={{ minWidth: 0, p: 0, fontSize: "0.65rem", textTransform: "none", alignSelf: "flex-start" }}
      >
        Ahora
      </Button>
    </Stack>
  );
}

function flattenOrderRows(orders, tab, filter) {
  const byStatus = orders.filter((o) => orderMatchesStatus(o, tab));
  const q = filter.trim().toLowerCase();

  const rows = [];
  for (const order of byStatus) {
    const customer = order.ERP_customer?.name ?? `Cliente #${order.customerId}`;
    const orderDate = order.date ?? "—";
    const items = order.ERP_order_items ?? [];

    if (q) {
      const name = customer.toLowerCase();
      const id = String(order.id);
      if (!name.includes(q) && !id.includes(q)) continue;
    }

    for (const item of items) {
      rows.push({
        order,
        item,
        orderId: order.id,
        customer,
        orderDate,
        productLabel:
          item.productName ??
          item.ERP_inventory_product?.name ??
          `Producto #${item.productId ?? "—"}`,
      });
    }
  }

  return rows;
}

export default function OrderStatusWorkbenchContent({
  orders = [],
  loading = false,
  initialTab = "unpaid",
  onReload,
}) {
  const theme = useTheme();
  const { user, toast } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [tab, setTab] = useState(initialTab);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draft, setDraft] = useState({
    deliveredAt: "",
    paidAt: "",
    stock: "",
    minStock: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setFilter("");
    setPage(0);
    setEditingItemId(null);
    setDraft({ deliveredAt: "", paidAt: "", stock: "", minStock: "" });
  }, [initialTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    for (const t of ORDER_STATUS_TABS) {
      counts[t.id] = orders.filter((o) => orderMatchesStatus(o, t.id)).length;
    }
    return counts;
  }, [orders]);

  const rows = useMemo(
    () => flattenOrderRows(orders, tab, filter),
    [orders, tab, filter]
  );

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const currentTabMeta = getStatusTab(tab);
  const tabColor = theme.palette[currentTabMeta.color]?.main || theme.palette.primary.main;

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setDraft({
      deliveredAt: parseDisplayDateToInput(item.deliveredAt),
      paidAt: parseDisplayDateToInput(item.paidAt),
      stock: String(item.productStock ?? 0),
      minStock: String(item.productMinStock ?? 0),
    });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setDraft({ deliveredAt: "", paidAt: "", stock: "", minStock: "" });
  };

  const saveEdit = async (order, item) => {
    try {
      setSaving(true);
      const productId = item.productId ?? item.ERP_inventory_product?.id;
      const origDelivered = parseDisplayDateToInput(item.deliveredAt);
      const origPaid = parseDisplayDateToInput(item.paidAt);

      const payload = {};
      if (draft.deliveredAt !== origDelivered) {
        payload.deliveredAt = draft.deliveredAt ? inputToApiDate(draft.deliveredAt) : null;
      }
      if (draft.paidAt !== origPaid) {
        payload.paidAt = draft.paidAt ? inputToApiDate(draft.paidAt) : null;
      }

      const stockChanged =
        Number(draft.stock) !== Number(item.productStock ?? 0) ||
        Number(draft.minStock) !== Number(item.productMinStock ?? 0);

      if (stockChanged && productId != null) {
        payload.productId = productId;
        payload.stock = Number(draft.stock);
        payload.minStock = Number(draft.minStock);
      }

      if (!Object.keys(payload).length) {
        cancelEdit();
        return;
      }

      await toast({
        promise: programmerDashboardOrderItemCorrectionRequest(item.id, payload),
        successMessage: "Cambio registrado en Logs",
      });

      cancelEdit();
      if (onReload) await onReload();
    } catch {
      // toast maneja error
    } finally {
      setSaving(false);
    }
  };

  const setNow = (field) => {
    const pad = (n) => String(n).padStart(2, "0");
    const d = new Date();
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setDraft((prev) => ({ ...prev, [field]: local }));
  };

  const colSpan = isProgrammer ? 11 : 10;

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
            spacing={1.5}
            mb={2}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {currentTabMeta.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentTabMeta.subtitle} · {tabCounts[tab] ?? 0} pedido(s) · {rows.length} ítem(s)
              </Typography>
            </Box>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={tab}
              sx={{
                width: { xs: "100%", lg: "auto" },
                flexWrap: "wrap",
                gap: 0.5,
                "& .MuiToggleButtonGroup-grouped": {
                  borderRadius: "8px !important",
                  border: "1px solid",
                  borderColor: "divider",
                  mx: 0.25,
                  my: 0.25,
                },
              }}
              onChange={(_, v) => {
                if (!v) return;
                setTab(v);
                setPage(0);
                cancelEdit();
              }}
            >
              {ORDER_STATUS_TABS.map((t) => {
                const main = theme.palette[t.color]?.main || theme.palette.primary.main;
                const Icon = t.icon;
                const selected = tab === t.id;
                return (
                  <ToggleButton
                    key={t.id}
                    value={t.id}
                    sx={{
                      textTransform: "none",
                      px: 1.25,
                      py: 0.75,
                      gap: 0.5,
                      fontWeight: selected ? 700 : 500,
                      color: selected ? main : "text.secondary",
                      bgcolor: selected ? alpha(main, 0.12) : "transparent",
                      borderColor: selected ? alpha(main, 0.45) : "divider",
                      "&:hover": { bgcolor: alpha(main, selected ? 0.18 : 0.06) },
                      "&.Mui-selected": {
                        color: main,
                        bgcolor: alpha(main, 0.14),
                        borderColor: alpha(main, 0.5),
                        "&:hover": { bgcolor: alpha(main, 0.2) },
                      },
                    }}
                  >
                    <Icon fontSize="small" />
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                      {t.label}
                    </Box>
                    <Chip
                      size="small"
                      label={tabCounts[t.id] ?? 0}
                      sx={{
                        ml: 0.25,
                        height: 20,
                        minWidth: 28,
                        fontWeight: 700,
                        bgcolor: alpha(main, selected ? 0.22 : 0.1),
                        color: main,
                      }}
                    />
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Stack>

          <TextField
            fullWidth
            size="small"
            placeholder="Filtrar por cliente o # pedido…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          {!loading && rows.length === 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              No hay pedidos en esta categoría.
            </Alert>
          )}

          <TableContainer
            sx={{
              border: "1px solid",
              borderColor: alpha(tabColor, 0.25),
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{ tableLayout: "fixed", width: "100%" }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headSx, width: "5%", bgcolor: alpha(tabColor, 0.06) }}>Ped.</TableCell>
                  <TableCell sx={{ ...headSx, width: "14%", bgcolor: alpha(tabColor, 0.06) }}>Cliente</TableCell>
                  <TableCell sx={{ ...headSx, width: "8%", bgcolor: alpha(tabColor, 0.06) }}>Fecha</TableCell>
                  <TableCell sx={{ ...headSx, width: isProgrammer ? "17%" : "20%", bgcolor: alpha(tabColor, 0.06) }}>Producto</TableCell>
                  <TableCell align="right" sx={{ ...headSx, width: "5%", bgcolor: alpha(tabColor, 0.06) }}>
                    Cant.
                  </TableCell>
                  <TableCell align="right" sx={{ ...headSx, width: "7%", bgcolor: alpha(tabColor, 0.06) }}>
                    Precio
                  </TableCell>
                  <TableCell sx={{ ...headSx, width: isProgrammer ? "12%" : "14%", bgcolor: alpha(tabColor, 0.06) }}>Entrega</TableCell>
                  <TableCell sx={{ ...headSx, width: isProgrammer ? "12%" : "14%", bgcolor: alpha(tabColor, 0.06) }}>Pago</TableCell>
                  <TableCell align="right" sx={{ ...headSx, width: "7%", bgcolor: alpha(tabColor, 0.06) }}>
                    Stock
                  </TableCell>
                  <TableCell align="right" sx={{ ...headSx, width: "5%", bgcolor: alpha(tabColor, 0.06) }}>
                    Mín.
                  </TableCell>
                  {isProgrammer && (
                    <TableCell align="center" sx={{ ...headSx, width: "5%", bgcolor: alpha(tabColor, 0.06) }}>
                      ···
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.map(({ order, item, orderId, customer, orderDate, productLabel }) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <TableRow key={`${orderId}-${item.id}`} hover>
                      <TableCell sx={{ ...cellSx, fontWeight: 700 }}>#{orderId}</TableCell>
                      <TableCell
                        sx={{
                          ...cellSx,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={customer}
                      >
                        {customer}
                      </TableCell>
                      <TableCell sx={cellSx} title={orderDate}>
                        {formatDateTime(orderDate)}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...cellSx,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={productLabel}
                      >
                        {productLabel}
                      </TableCell>
                      <TableCell align="right" sx={cellSx}>{item.quantity}</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                        {money(item.price)}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {isEditing ? (
                          <CompactDateField
                            value={draft.deliveredAt}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, deliveredAt: e.target.value }))
                            }
                            onNow={() => setNow("deliveredAt")}
                          />
                        ) : (
                          <StatusChip
                            ok={!!item.deliveredAt}
                            labelOk={item.deliveredAt || "Entregado"}
                            labelNo="Pend."
                            icon={<LocalShippingIcon sx={{ fontSize: "14px !important" }} />}
                            okColor="info"
                            noColor="warning"
                          />
                        )}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {isEditing ? (
                          <CompactDateField
                            value={draft.paidAt}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, paidAt: e.target.value }))
                            }
                            onNow={() => setNow("paidAt")}
                          />
                        ) : (
                          <StatusChip
                            ok={!!item.paidAt}
                            labelOk={item.paidAt || "Pagado"}
                            labelNo="Pend."
                            icon={
                              item.paidAt ? (
                                <CheckCircleIcon sx={{ fontSize: "14px !important" }} />
                              ) : (
                                <CancelIcon sx={{ fontSize: "14px !important" }} />
                              )
                            }
                            okColor="success"
                            noColor="error"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={cellSx}>
                        {isEditing ? (
                          <TextField
                            type="number"
                            size="small"
                            value={draft.stock}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, stock: e.target.value }))
                            }
                            fullWidth
                            sx={{
                              "& .MuiInputBase-root": { fontSize: "0.75rem" },
                              "& .MuiInputBase-input": { py: 0.5, px: 0.5, textAlign: "right" },
                            }}
                            inputProps={{ min: 0, step: "any" }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={item.productStock ?? "—"}
                            color={
                              Number(item.productStock ?? 0) <= 0
                                ? "error"
                                : Number(item.productStock ?? 0) <=
                                    Number(item.productMinStock ?? 0)
                                  ? "warning"
                                  : "default"
                            }
                            variant="outlined"
                            sx={{ "& .MuiChip-label": { px: 0.5, fontSize: "0.7rem" } }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={cellSx}>
                        {isEditing ? (
                          <TextField
                            type="number"
                            size="small"
                            value={draft.minStock}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, minStock: e.target.value }))
                            }
                            fullWidth
                            sx={{
                              "& .MuiInputBase-root": { fontSize: "0.75rem" },
                              "& .MuiInputBase-input": { py: 0.5, px: 0.5, textAlign: "right" },
                            }}
                            inputProps={{ min: 0, step: "any" }}
                          />
                        ) : (
                          item.productMinStock ?? "—"
                        )}
                      </TableCell>
                      {isProgrammer && (
                        <TableCell align="center" sx={{ ...cellSx, px: 0.25 }}>
                          {isEditing ? (
                            <>
                              <Tooltip title="Guardar">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={saving}
                                    onClick={() => saveEdit(order, item)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.success.main, 0.1),
                                      "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.2) },
                                    }}
                                  >
                                    <SaveIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Cancelar">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  sx={{
                                    ml: 0.5,
                                    bgcolor: alpha(theme.palette.error.main, 0.08),
                                    "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.16) },
                                  }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Editar entrega, pago y stock">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => startEdit(item)}
                                sx={{
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {!loading && paginatedRows.length === 0 && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin ítems para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => {
              setPage(p);
              cancelEdit();
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
              cancelEdit();
            }}
            labelRowsPerPage="Filas"
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </Box>
      </Paper>

      {isProgrammer && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Solo Programador: puedes marcar entrega/pago con la fecha que elijas y ajustar stock.
          No se crean movimientos de inventario ni ingresos; todo queda registrado en Logs.
        </Typography>
      )}
    </Box>
  );
}
