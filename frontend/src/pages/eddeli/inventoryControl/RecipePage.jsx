import {
  Container,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Grid,
  Typography,
  Box,
  Stack,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Edit, Delete, RestaurantMenu } from "@mui/icons-material";

import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import RecipeForm from "./components/RecipeForm";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import {
  getAllProductsAll,
  getRecipeByProduct,
  deleteRecipeRequest,
  getRecipeCosting,
} from "../../../api/inventoryControlRequest";
import CostingAccordionTable from "./components/CostingAccordionTable";
import SearchableSelect from "../../../components/SearchableSelect";

const fmt = (n, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";

const fmtMoney = (n, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(d)}` : "—";

function componentTypeLabel(type) {
  if (type === "intermediate") return "Intermedio";
  if (type === "raw") return "Insumo";
  return type || "—";
}

function RecipePage() {
  const { toast } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [recipe, setRecipe] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");

  const [costSummary, setCostSummary] = useState(null);
  const [costTreeData, setCostTreeData] = useState(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [loading, setLoading] = useState(false);

  const [uiParams, setUiParams] = useState({
    extrasPercent: 20,
    laborPercent: 45,
    producedQty: 0,
  });

  const selectedMeta = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProduct)),
    [products, selectedProduct],
  );

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();
    setProducts(data.filter((p) => p.type === "final" || p.type === "intermediate"));
  };

  const fetchRecipe = async (productId) => {
    setLoading(true);
    try {
      const { data } = await getRecipeByProduct(productId);
      setRecipe(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostingData = async (productId) => {
    if (!productId) return;
    try {
      setLoadingCost(true);
      const params = {
        extrasPercent: Number(uiParams.extrasPercent) || 0,
        laborPercent: Number(uiParams.laborPercent) || 0,
        producedQty: Number(uiParams.producedQty) || 0,
      };
      const { data } = await getRecipeCosting(productId, params);
      setCostTreeData(data);
      setCostSummary(data.summary || null);
    } catch {
      toast({ message: "Error al calcular el costeo", variant: "error" });
    } finally {
      setLoadingCost(false);
    }
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteRecipeRequest(dataToDelete.id),
      reload: async () => {
        const { data } = await getRecipeByProduct(selectedProduct);
        setRecipe(data || []);
        fetchCostingData(selectedProduct);
      },
      onClose: handleDialog,
    });
  };

  const columns = [
    {
      label: "Componente",
      id: "rawProduct",
      width: 160,
      render: (row) => (
        <Box>
          <Typography variant="body2">{row.rawProduct?.name}</Typography>
          <Chip
            size="small"
            variant="outlined"
            label={componentTypeLabel(row.rawProduct?.type)}
            sx={{ mt: 0.5, height: 20, fontSize: "0.7rem" }}
          />
        </Box>
      ),
    },
    { label: "Cantidad", id: "quantity", width: 80 },
    {
      label: "Unidad",
      id: "isQuantityInGrams",
      width: 90,
      render: (row) => (row.isQuantityInGrams ? "Gramos" : "Unidades"),
    },
    { label: "Tipo costo", id: "itemType", width: 90 },
    {
      label: "Acciones",
      id: "actions",
      width: 120,
      render: (params) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params);
                setIsEditing(true);
                settitleUserDialog("Editar componente");
                handleDialogUser();
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                handleDialog();
                setDataToDelete(params);
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const t = costSummary?.totales || {};
  const acc = costSummary?.acumulados || {};
  const lote = costSummary?.lote || {};
  const rent = costSummary?.rentabilidad || {};
  const yieldInfo = costSummary?.yieldInfo || [];

  const loteHint = useMemo(() => {
    if (!lote.effectiveProducedQty) return "";
    if (lote.producedQtyAuto) {
      if (lote.unidad === "gramos") {
        const src =
          lote.rendimientoSource === "productionYieldGrams"
            ? "override manual"
            : "suma de insumos";
        return `Automático: ${fmt(lote.effectiveProducedQty, 0)} g (${src})`;
      }
      return "Automático: 1 unidad";
    }
    return `Manual: ${fmt(lote.effectiveProducedQty, lote.unidad === "gramos" ? 0 : 2)} ${lote.unidad}`;
  }, [lote]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setUiParams((p) => ({ ...p, producedQty: 0 }));
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    fetchRecipe(selectedProduct);
    fetchCostingData(selectedProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, uiParams.extrasPercent, uiParams.laborPercent, uiParams.producedQty]);

  return (
    <Container>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar componente"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este componente de la receta?
      </SimpleDialog>

      <SimpleDialog open={openDialog} onClose={handleDialogUser} tittle={titleUserDialog}>
        <RecipeForm
          onClose={() => {
            handleDialogUser();
            fetchRecipe(selectedProduct);
            fetchCostingData(selectedProduct);
          }}
          isEditing={isEditing}
          datos={datos}
          reload={() => fetchRecipe(selectedProduct)}
          productFinalId={selectedProduct}
        />
      </SimpleDialog>

      <Grid container spacing={2}>
        <Grid item xs={12} mt={2}>
          <SearchableSelect
            label="Producto (final o intermedio)"
            items={products}
            value={selectedProduct}
            onChange={(val) => setSelectedProduct(val)}
          />
          {selectedMeta && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
              <Chip size="small" label={selectedMeta.type === "intermediate" ? "Intermedio" : "Final"} />
              <Chip
                size="small"
                variant="outlined"
                label={`Venta: ${fmtMoney(Number(selectedMeta.price || 0))}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Distribuidor: ${fmtMoney(Number(selectedMeta.distributorPrice || 0))}`}
              />
            </Stack>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Button
            variant="text"
            endIcon={<RestaurantMenu />}
            onClick={() => {
              setIsEditing(false);
              settitleUserDialog("Agregar componente");
              handleDialogUser();
            }}
            disabled={!selectedProduct}
            sx={{ mb: 1 }}
          >
            Agregar componente
          </Button>

          <TablePro
            rows={recipe}
            columns={columns}
            defaultRowsPerPage={10}
            title="Receta"
            showIndex
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              position: { md: "sticky" },
              top: { md: 16 },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Parámetros de costeo
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
              <TextField
                label="Extras %"
                type="number"
                size="small"
                value={uiParams.extrasPercent}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, extrasPercent: Number(e.target.value || 0) }))
                }
                sx={{ width: 112 }}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="Mano de obra %"
                type="number"
                size="small"
                value={uiParams.laborPercent}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, laborPercent: Number(e.target.value || 0) }))
                }
                sx={{ width: 132 }}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="Cant. lote (0=auto)"
                type="number"
                size="small"
                value={uiParams.producedQty}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, producedQty: Number(e.target.value || 0) }))
                }
                sx={{ width: 148 }}
                inputProps={{ min: 0, step: "any" }}
              />
            </Stack>
            {loteHint && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {loteHint}
                {loadingCost ? " · calculando…" : ""}
              </Typography>
            )}

            {costSummary && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Costo del lote
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0.75,
                    columnGap: 2,
                  }}
                >
                  <Typography variant="body2">
                    Insumos: <b>{fmtMoney(t.subtotalInsumos)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Materiales: <b>{fmtMoney(t.subtotalMateriales)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Extras ({t.extrasPercentInt ?? 0}%): <b>{fmtMoney(t.extras)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Mano obra ({t.laborPercentInt ?? 0}%): <b>{fmtMoney(t.labor)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Total lote: <b>{fmtMoney(t.totalLote)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Gramos insumos: <b>{fmt(acc.totalPesoEnMasaGr, 0)} g</b>
                  </Typography>
                  <Typography variant="body2">
                    Costo / {lote.unidad === "gramos" ? "g" : "u"}:{" "}
                    <b>{fmtMoney(t.costoUnitario, 4)}</b>
                  </Typography>
                </Box>

                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Rentabilidad (producto seleccionado)
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0.75,
                    columnGap: 2,
                  }}
                >
                  <Typography variant="body2">
                    Costo calc.: <b>{fmtMoney(rent.costoUnitario, 4)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Precio venta: <b>{fmtMoney(rent.precioConsumidor)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Precio distrib.: <b>{fmtMoney(rent.precioDistribuidor)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Ganancia venta:{" "}
                    <b
                      style={{
                        color:
                          rent.gananciaConsumidor != null && rent.gananciaConsumidor >= 0
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                    >
                      {fmtMoney(rent.gananciaConsumidor, 4)}
                    </b>
                    {rent.margenConsumidorPct != null ? ` (${rent.margenConsumidorPct}%)` : ""}
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Ganancia distribuidor:{" "}
                    <b
                      style={{
                        color:
                          rent.gananciaDistribuidor != null && rent.gananciaDistribuidor >= 0
                            ? "#2e7d32"
                            : "#c62828",
                      }}
                    >
                      {fmtMoney(rent.gananciaDistribuidor, 4)}
                    </b>
                    {rent.margenDistribuidorPct != null ? ` (${rent.margenDistribuidorPct}%)` : ""}
                  </Typography>
                </Box>

                {yieldInfo.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Rendimiento del lote → productos que salen
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Producto</TableCell>
                          <TableCell align="right">Unidades</TableCell>
                          <TableCell align="right">Costo/u*</TableCell>
                          <TableCell align="right">P. dist.</TableCell>
                          <TableCell align="right">Gan. dist.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {yieldInfo.map((y) => (
                          <TableRow key={y.parentId}>
                            <TableCell>{y.parentName}</TableCell>
                            <TableCell align="right">
                              {y.unidad === "unidad"
                                ? fmt(y.unidadesPosiblesParent, 1)
                                : `${fmt(y.unidadesPosiblesParent, 0)} g`}
                            </TableCell>
                            <TableCell align="right">{fmtMoney(y.costoPorUnidadPadre, 4)}</TableCell>
                            <TableCell align="right">{fmtMoney(y.parentDistributorPrice)}</TableCell>
                            <TableCell align="right">{fmtMoney(y.gananciaVsDistribuidor, 4)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      * Costo/u = solo este producto (masa/intermedio) por unidad del padre, sin
                      decoración ni otros insumos del padre.
                    </Typography>
                  </Box>
                )}

                {costSummary.notas && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      {costSummary.notas}
                    </Typography>
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Árbol de costos
          </Typography>
          {costTreeData && <CostingAccordionTable data={costTreeData} />}
        </Grid>
      </Grid>
    </Container>
  );
}

export default RecipePage;
