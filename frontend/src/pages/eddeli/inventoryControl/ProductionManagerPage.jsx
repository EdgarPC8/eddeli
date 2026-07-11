// pages/ProductionManagerPage.jsx
import {
  Container,
  Grid,
  Typography,
  Paper,
  Stack,
  Chip,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useEffect, useMemo, useState } from "react";
import RenderFromFinal from "./components/SimulateProduction";
import RenderFromIntermediate from "./components/RenderFromIntermediate";
import SearchableSelect from "../../../components/SearchableSelect";
import TablePro from "../../../components/Tables/TablePro";
import {
  getAllProductsAll,
  registerMovement,
} from "../../../api/inventoryControlRequest";
import { useAuth } from "../../../context/AuthContext";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
} from "./components/ProgrammerMovementDateField.jsx";

function isIntermediateProduct(p) {
  if (!p) return false;
  return p.type === "intermediate" || Boolean(p.esIntermedio);
}

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

function FinalStockAdjustCell({ product, onAdjusted, movementDate, isProgrammer }) {
  const { toast } = useAuth();
  const current = stockNum(product);
  const abbr = unitAbbrOf(product);
  const [draft, setDraft] = useState(() => String(current));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(stockNum(product)));
  }, [product.id, product.stock]);

  const applyAdjust = async () => {
    const nuevo = Number(String(draft).replace(",", "."));
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      toast({ message: "Ingrese un stock válido (número ≥ 0).", variant: "warning" });
      return;
    }
    if (Math.abs(nuevo - current) < 1e-9) {
      toast({ message: "El valor es igual al stock actual.", variant: "info" });
      return;
    }
    setSaving(true);
    try {
      await toast({
        promise: registerMovement({
          productId: Number(product.id),
          type: "ajuste",
          reason: "AJUSTE_INVENTARIO",
          quantity: nuevo,
          description: `Ajuste (producción): ${product.name} ${current} → ${nuevo}${abbr ? ` ${abbr}` : ""}`,
          price: null,
          referenceType: null,
          referenceId: null,
          simulated: null,
          ...(isProgrammer && movementDate
            ? { date: movementDateForApi(movementDate) }
            : {}),
        }),
        successMessage: "Ajuste de inventario registrado",
        onSuccess: () => {
          onAdjusted?.();
          return { description: "Stock actualizado correctamente" };
        },
      });
    } catch {
      /* toast ya mostró el error */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexWrap: "wrap", maxWidth: 320 }}>
      <TextField
        size="small"
        variant="outlined"
        label={abbr ? `Stock (${abbr})` : "Stock"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            applyAdjust();
          }
        }}
        disabled={saving}
        inputProps={{ inputMode: "decimal" }}
        sx={{ minWidth: 120 }}
      />
      <Tooltip title="Guardar como ajuste">
        <span>
          <IconButton
            color="primary"
            size="small"
            onClick={applyAdjust}
            disabled={saving}
            aria-label="Guardar ajuste de stock"
            sx={{ mt: 0.25 }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

export default function ProductionManagerPage() {
  const { user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [movementDate, setMovementDate] = useState(todayDateInput());
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchdata = async () => {
    setLoading(true);
    try {
      const { data } = await getAllProductsAll();
      const productsData = data
        .filter((p) => p.type !== "raw")
        .sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
      setProducts(productsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchdata();
  }, []);

  const selected = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)),
    [products, selectedProductId]
  );

  const finalProductsOnly = useMemo(
    () => products.filter((p) => !isIntermediateProduct(p)),
    [products]
  );

  const finalStockColumns = [
    { id: "name", label: "Producto final" },
    {
      id: "stock",
      label: "Stock (ajuste)",
      getSortValue: (r) => stockNum(r),
      getSearchValue: (r) => `${r.name ?? ""} ${stockNum(r)}`,
      render: (row) => (
        <FinalStockAdjustCell
          product={row}
          onAdjusted={fetchdata}
          isProgrammer={isProgrammer}
          movementDate={movementDate}
        />
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Producción
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {isProgrammer && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <ProgrammerMovementDateField
                isProgrammer={isProgrammer}
                value={movementDate}
                onChange={setMovementDate}
                label="Fecha para ajustes de stock"
              />
            </Paper>
          )}
          <TablePro
            rows={finalProductsOnly}
            columns={finalStockColumns}
            title="Productos finales"
            showSearch
            showPagination
            defaultRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            loading={loading}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            El valor del campo es el stock absoluto; al guardar se registra un movimiento de ajuste.
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Producto a producir
              </Typography>
              <SearchableSelect
                label="Seleccionar producto"
                items={products}
                value={selectedProductId}
                onChange={(id) => setSelectedProductId(String(id ?? ""))}
                getOptionLabel={(p) => {
                  const tag = isIntermediateProduct(p) ? "Intermedio" : "Final";
                  return `${p?.name ?? ""} (${tag})`;
                }}
              />
              {selected && (
                <Chip
                  size="small"
                  color={isIntermediateProduct(selected) ? "secondary" : "primary"}
                  label={isIntermediateProduct(selected) ? "Flujo: masa y derivados" : "Flujo: árbol de receta"}
                />
              )}
              {!selectedProductId && (
                <Typography variant="body2" color="text.secondary">
                  Elija un producto para cargar la simulación automáticamente.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {selectedProductId && isIntermediateProduct(selected) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <RenderFromIntermediate
                key={selectedProductId}
                productId={selectedProductId}
                fetchData={fetchdata}
              />
            </Paper>
          </Grid>
        )}

        {selectedProductId && selected && !isIntermediateProduct(selected) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <RenderFromFinal
                key={selectedProductId}
                productId={selectedProductId}
                fetchData={fetchdata}
              />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
