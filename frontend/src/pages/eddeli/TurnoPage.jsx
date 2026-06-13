import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import LockIcon from "@mui/icons-material/Lock";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  closeShift,
  createShiftMovement,
  getActiveShift,
  getShifts,
  openShift,
} from "../../api/shiftRequest.js";
import { getAllProducts } from "../../api/inventoryControlRequest.js";
import {
  CASH_BILLS,
  CASH_COINS,
  computeCashTotal,
  emptyCashCounts,
  formatMoney,
  parseQty,
} from "../../utils/turnoCashUtils.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));

const MOVEMENT_CATEGORY_LABELS = {
  gasto_operativo: "Gasto operativo",
  compra_mercancia: "Compra mercancía",
  retiro: "Retiro / depósito",
  entrada: "Entrada de efectivo",
  otro: "Otro",
};

const OUT_CATEGORIES = ["gasto_operativo", "compra_mercancia", "retiro", "otro"];
const IN_CATEGORIES = ["entrada", "otro"];

const emptyMovementForm = () => ({
  direction: "out",
  category: "gasto_operativo",
  amount: "",
  concept: "",
  notes: "",
  product: null,
  quantity: "",
});

const compactFieldSx = {
  m: 0,
  "& .MuiInputBase-root": { fontSize: "0.8rem", py: 0.25 },
  "& .MuiInputLabel-root": { fontSize: "0.72rem" },
  "& .MuiFormHelperText-root": { display: "none" },
};

function DenominationRow({ label, items, counts, onChange, disabled }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ width: 52, flexShrink: 0, lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Grid container spacing={0.75} wrap="nowrap" sx={{ flex: 1, minWidth: 0 }}>
        {items.map((d) => {
          const qty = parseQty(counts[d.key]);
          const subtotal = Number((qty * d.value).toFixed(2));
          return (
            <Grid item xs={2} key={d.key} sx={{ minWidth: 0, flex: "1 1 0" }}>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                type="number"
                label={d.label}
                value={counts[d.key]}
                onChange={(e) => onChange(d.key, e.target.value)}
                disabled={disabled}
                inputProps={{ min: 0, step: 1 }}
                sx={compactFieldSx}
                InputProps={
                  qty > 0
                    ? {
                        endAdornment: (
                          <InputAdornment position="end" sx={{ "& p": { fontSize: "0.65rem" } }}>
                            {formatMoney(subtotal)}
                          </InputAdornment>
                        ),
                      }
                    : undefined
                }
              />
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

function CashArqueoBlock({ counts, onChange, disabled }) {
  return (
    <Box sx={{ mb: 1 }}>
      <DenominationRow
        label="Monedas"
        items={CASH_COINS}
        counts={counts}
        onChange={onChange}
        disabled={disabled}
      />
      <DenominationRow
        label="Billetes"
        items={CASH_BILLS}
        counts={counts}
        onChange={onChange}
        disabled={disabled}
      />
    </Box>
  );
}

function StatChip({ label, value, highlight }) {
  return (
    <Box sx={{ minWidth: 0, flex: "1 1 0", textAlign: "center", px: 0.5 }}>
      <Typography variant="caption" color="text.secondary" noWrap display="block" title={label}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        noWrap
        color={highlight ? "primary.main" : "text.primary"}
      >
        {value}
      </Typography>
    </Box>
  );
}

function formatShiftDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-EC", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function operatorFromShift(shift, user) {
  if (shift?.user) {
    const u = shift.user;
    const parts = [u.firstName, u.firstLastName].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return [user?.firstName, user?.firstLastName].filter(Boolean).join(" ") || "—";
}

export default function TurnoPage() {
  const { user, toast } = useAuth();
  const isAdmin = user?.loginRol === "Administrador" || user?.loginRol === "Programador";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [openCounts, setOpenCounts] = useState(emptyCashCounts);
  const [closeCounts, setCloseCounts] = useState(emptyCashCounts);
  const [openNotes, setOpenNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [movementSaving, setMovementSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const openTotal = useMemo(() => computeCashTotal(openCounts), [openCounts]);
  const closeTotal = useMemo(() => computeCashTotal(closeCounts), [closeCounts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, histRes] = await Promise.all([
        getActiveShift(),
        getShifts({ limit: 12 }),
      ]);
      setActiveShift(activeRes.data || null);
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo cargar turnos.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (movementForm.category !== "compra_mercancia" || products.length > 0) return;
    setProductsLoading(true);
    getAllProducts()
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [movementForm.category, products.length]);

  const movementCategories =
    movementForm.direction === "out" ? OUT_CATEGORIES : IN_CATEGORIES;

  const handleMovementDirection = (_, value) => {
    if (!value) return;
    const defaultCategory = value === "out" ? "gasto_operativo" : "entrada";
    setMovementForm((p) => ({
      ...p,
      direction: value,
      category: defaultCategory,
      product: null,
      quantity: "",
    }));
  };

  const handleAddMovement = async () => {
    if (!activeShift?.id) return;
    const amt = Number(movementForm.amount);
    if (!amt || amt <= 0) {
      void toast?.({ message: "Ingresa un monto válido.", variant: "warning" });
      return;
    }
    if (!String(movementForm.concept || "").trim()) {
      void toast?.({ message: "Indica un concepto.", variant: "warning" });
      return;
    }
    if (movementForm.category === "compra_mercancia") {
      const hasProduct = Boolean(movementForm.product);
      const hasQty = movementForm.quantity !== "" && Number(movementForm.quantity) > 0;
      if (hasProduct !== hasQty) {
        void toast?.({
          message: "Para compra de mercancía indica producto y cantidad, o deja ambos vacíos.",
          variant: "warning",
        });
        return;
      }
    }

    try {
      setMovementSaving(true);
      await createShiftMovement(activeShift.id, {
        direction: movementForm.direction,
        category: movementForm.category,
        amount: amt,
        concept: movementForm.concept.trim(),
        notes: movementForm.notes?.trim() || undefined,
        productId: movementForm.product?.id,
        quantity:
          movementForm.quantity !== "" ? Number(movementForm.quantity) : undefined,
      });
      void toast?.({ message: "Movimiento registrado.", variant: "success" });
      setMovementForm(emptyMovementForm());
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo registrar el movimiento.",
        variant: "error",
      });
    } finally {
      setMovementSaving(false);
    }
  };

  const handleOpenShift = async () => {
    if (openTotal <= 0) {
      void toast?.({ message: "Ingresa el capital inicial en monedas o billetes.", variant: "warning" });
      return;
    }
    try {
      setSaving(true);
      await openShift({
        cashCounts: openCounts,
        notes: openNotes || undefined,
      });
      void toast?.({ message: "Turno abierto. Ya puedes vender en caja.", variant: "success" });
      setOpenCounts(emptyCashCounts());
      setOpenNotes("");
      setCloseCounts(emptyCashCounts());
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo abrir el turno.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift?.id) return;
    try {
      setSaving(true);
      const { data } = await closeShift(activeShift.id, {
        cashCounts: closeCounts,
        notes: closeNotes || undefined,
      });
      const diff = Number(data?.summary?.cashDifference ?? 0);
      void toast?.({
        message:
          diff === 0
            ? "Turno cerrado. Cuadre perfecto en efectivo."
            : `Turno cerrado. Diferencia en efectivo: ${formatMoney(diff)}`,
        variant: diff === 0 ? "success" : "warning",
      });
      setCloseCounts(emptyCashCounts());
      setCloseNotes("");
      await load();
    } catch (e) {
      void toast?.({
        message: e?.response?.data?.message || "No se pudo cerrar el turno.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const sales = activeShift?.sales;
  const cashMovements = activeShift?.cashMovements;
  const cashOut = Number(cashMovements?.cashOut ?? 0);
  const cashIn = Number(cashMovements?.cashIn ?? 0);
  const movementItems = Array.isArray(cashMovements?.items) ? cashMovements.items : [];
  const expectedCash = Number(activeShift?.expectedCashTotal ?? 0);
  const diffPreview = to2(closeTotal - expectedCash);

  const panelSx = { p: 1.5, borderRadius: 1.5, mb: 1.5 };

  return (
    <Box sx={{ px: 0, pt: 0, pb: 1.5, maxWidth: 1280, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }} flexWrap="wrap">
        <Typography variant="h6" fontWeight={800}>
          Turno
        </Typography>
        {activeShift && (
          <>
            <Chip label="Abierto" color="success" size="small" sx={{ height: 22 }} />
            <Typography variant="caption" color="text.secondary">
              {formatShiftDate(activeShift.openedAt)}
            </Typography>
          </>
        )}
        {isAdmin && (
          <Button component={RouterLink} to="/turno/supervision" size="small" variant="outlined" sx={{ ml: "auto" }}>
            Supervisión por fecha
          </Button>
        )}
      </Stack>
      {!isAdmin && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Abre tu turno, registra salidas de efectivo y cierra caja al terminar tu jornada.
        </Typography>
      )}

      {!activeShift ? (
        <Paper variant="panel" sx={panelSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Apertura de caja
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {operatorFromShift(null, user)}
              {user?.loginRol ? ` · ${user.loginRol}` : ""}
            </Typography>
          </Stack>

          <CashArqueoBlock
            counts={openCounts}
            onChange={(key, val) => setOpenCounts((p) => ({ ...p, [key]: val }))}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ minWidth: 140 }}>
              Total: {formatMoney(openTotal)}
            </Typography>
            <TextField
              size="small"
              margin="dense"
              label="Notas (opc.)"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              sx={{ ...compactFieldSx, flex: 1 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              disabled={saving || openTotal <= 0}
              onClick={() => void handleOpenShift()}
              sx={{ flexShrink: 0, px: 2 }}
            >
              {saving ? "Abriendo…" : "Abrir turno"}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
        <Paper variant="panel" sx={panelSx}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
            <SwapVertIcon sx={{ fontSize: 18 }} color="action" />
            <Typography variant="subtitle2" fontWeight={700}>
              Movimientos de caja
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={movementForm.direction}
              onChange={handleMovementDirection}
              disabled={movementSaving}
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton value="out" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Salida
              </ToggleButton>
              <ToggleButton value="in" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Entrada
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 160, ...compactFieldSx }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                label="Categoría"
                value={movementForm.category}
                onChange={(e) =>
                  setMovementForm((p) => ({
                    ...p,
                    category: e.target.value,
                    product: null,
                    quantity: "",
                  }))
                }
                disabled={movementSaving}
              >
                {movementCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {MOVEMENT_CATEGORY_LABELS[cat]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              margin="dense"
              label="Monto"
              type="number"
              value={movementForm.amount}
              onChange={(e) => setMovementForm((p) => ({ ...p, amount: e.target.value }))}
              disabled={movementSaving}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ ...compactFieldSx, width: 110 }}
            />

            <TextField
              size="small"
              margin="dense"
              label="Concepto"
              value={movementForm.concept}
              onChange={(e) => setMovementForm((p) => ({ ...p, concept: e.target.value }))}
              disabled={movementSaving}
              sx={{ ...compactFieldSx, flex: 1, minWidth: 120 }}
            />

            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              disabled={movementSaving}
              onClick={() => void handleAddMovement()}
              sx={{ flexShrink: 0, alignSelf: { xs: "stretch", md: "center" } }}
            >
              {movementSaving ? "Guardando…" : "Registrar"}
            </Button>
          </Stack>

          {movementForm.category === "compra_mercancia" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
              <Autocomplete
                size="small"
                options={products}
                loading={productsLoading}
                getOptionLabel={(opt) => opt?.name || ""}
                value={movementForm.product}
                onChange={(_, val) => setMovementForm((p) => ({ ...p, product: val }))}
                disabled={movementSaving}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin="dense"
                    label="Producto (opc.)"
                    placeholder="Si compraste mercancía para inventario"
                    sx={compactFieldSx}
                  />
                )}
                sx={{ flex: 1, minWidth: 180 }}
              />
              <TextField
                size="small"
                margin="dense"
                label="Cantidad"
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((p) => ({ ...p, quantity: e.target.value }))}
                disabled={movementSaving}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ ...compactFieldSx, width: 110 }}
              />
              <TextField
                size="small"
                margin="dense"
                label="Notas (opc.)"
                value={movementForm.notes}
                onChange={(e) => setMovementForm((p) => ({ ...p, notes: e.target.value }))}
                disabled={movementSaving}
                sx={{ ...compactFieldSx, flex: 1, minWidth: 120 }}
              />
            </Stack>
          )}

          {movementItems.length > 0 && (
            <TableContainer sx={{ maxHeight: 140, mb: 1 }}>
              <Table
                size="small"
                stickyHeader
                sx={{ "& .MuiTableCell-root": { py: 0.35, px: 1, fontSize: "0.72rem" } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movementItems.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>{formatShiftDate(m.createdAt)}</TableCell>
                      <TableCell>
                        {m.direction === "out" ? "Salida" : "Entrada"}
                        {" · "}
                        {MOVEMENT_CATEGORY_LABELS[m.category] || m.category}
                      </TableCell>
                      <TableCell>{m.concept}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: m.direction === "out" ? "error.main" : "success.main",
                        }}
                      >
                        {m.direction === "out" ? "−" : "+"}
                        {formatMoney(m.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="caption" color="text.secondary">
            Registra aquí papel, comida, compras en efectivo, retiros o entradas de cambio para que el arqueo cuadre.
          </Typography>
        </Paper>

        <Paper variant="panel" sx={panelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
            Cierre de caja
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ mb: 0.25 }} wrap="nowrap">
            <StatChip label="Apertura" value={formatMoney(activeShift.openingCashTotal)} />
            <StatChip label="Efec. ventas" value={formatMoney(sales?.salesCash)} />
            <StatChip label="Salidas" value={formatMoney(cashOut)} />
            <StatChip label="Entradas" value={formatMoney(cashIn)} />
            <StatChip label="Esperado" value={formatMoney(expectedCash)} highlight />
            <StatChip label="Transfer." value={formatMoney(sales?.salesTransfer)} />
            <StatChip label="Tarjeta" value={formatMoney(sales?.salesCard)} />
            <StatChip label="Pedidos" value={String(activeShift.orderCount ?? 0)} />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Esperado = apertura + ventas en efectivo − salidas + entradas. Transfer. y tarjeta solo se resumen.
          </Typography>

          <CashArqueoBlock
            counts={closeCounts}
            onChange={(key, val) => setCloseCounts((p) => ({ ...p, [key]: val }))}
            disabled={saving}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Typography variant="body2" sx={{ minWidth: 100 }}>
              Contado: <strong>{formatMoney(closeTotal)}</strong>
            </Typography>
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{
                minWidth: 120,
                color: diffPreview === 0 ? "success.main" : "warning.main",
              }}
            >
              Dif.: {formatMoney(diffPreview)}
            </Typography>
            <TextField
              size="small"
              margin="dense"
              label="Notas (opc.)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              sx={{ ...compactFieldSx, flex: 1 }}
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<LockIcon />}
              disabled={saving}
              onClick={() => void handleCloseShift()}
              sx={{ flexShrink: 0, px: 2 }}
            >
              {saving ? "Cerrando…" : "Cerrar turno"}
            </Button>
          </Stack>
        </Paper>
        </>
      )}

      <Paper variant="panel" sx={{ p: 1, borderRadius: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
          <HistoryIcon sx={{ fontSize: 18 }} color="action" />
          <Typography variant="subtitle2" fontWeight={700}>
            {isAdmin ? "Historial de turnos" : "Mis turnos"}
          </Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 160 }}>
          <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { py: 0.4, px: 1, fontSize: "0.75rem" } }}>
            <TableHead>
              <TableRow>
                <TableCell>Est.</TableCell>
                {isAdmin && <TableCell>Operador</TableCell>}
                <TableCell>Apertura</TableCell>
                <TableCell>Cierre</TableCell>
                <TableCell align="right">Inic.</TableCell>
                <TableCell align="right">Cierre</TableCell>
                <TableCell align="right">Dif.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status === "open" ? "A" : "C"}
                      color={row.status === "open" ? "success" : "default"}
                      sx={{ height: 20, fontSize: "0.65rem", minWidth: 28 }}
                    />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {operatorFromShift(row, null)}
                    </TableCell>
                  )}
                  <TableCell>{formatShiftDate(row.openedAt)}</TableCell>
                  <TableCell>{formatShiftDate(row.closedAt)}</TableCell>
                  <TableCell align="right">{formatMoney(row.openingCashTotal)}</TableCell>
                  <TableCell align="right">
                    {row.closingCashTotal != null ? formatMoney(row.closingCashTotal) : "—"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        Number(row.cashDifference) === 0
                          ? "success.main"
                          : row.cashDifference != null
                            ? "warning.main"
                            : "text.secondary",
                      fontWeight: 700,
                    }}
                  >
                    {row.cashDifference != null ? formatMoney(row.cashDifference) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6}>
                    <Typography variant="caption" color="text.secondary">
                      Sin turnos registrados.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
