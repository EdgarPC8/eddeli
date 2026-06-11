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
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Edit, Delete, RestaurantMenu } from "@mui/icons-material";

import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import RecipeForm from "./components/RecipeForm";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import {
  getAllProducts,
  getRecipeByProduct,
  deleteRecipeRequest,
  getRecipeCosting,
} from "../../../api/inventoryControlRequest";
import CostingAccordionTable from "./components/CostingAccordionTable";
import SearchableSelect from "../../../components/SearchableSelect";


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

  // Loading
  const [loadingCost, setLoadingCost] = useState(false);

  // Parámetros UI (porcentajes como enteros)
  const [uiParams, setUiParams] = useState({
    extrasPercent: 20,
    laborPercent: 45,
    producedQty: 0,
  });

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  /** JSON en consola del navegador + petición con debug=1 para log en terminal del backend */
  const logRecipeAnalysis = useCallback(async () => {
    if (!selectedProduct) {
      toast({ message: "Selecciona un producto primero", variant: "warning" });
      return;
    }

    const meta = products.find((p) => String(p.id) === String(selectedProduct));

    const pruneCostTree = (node, depth = 0, maxDepth = 6) => {
      if (!node || depth > maxDepth) return null;
      return {
        info: node.info,
        cost: node.cost,
        directItemsCount: node.directItems?.length ?? 0,
        directItemsSample: (node.directItems || []).slice(0, 10),
        childCount: node.children?.length ?? 0,
        children: (node.children || []).map((c) => pruneCostTree(c, depth + 1, maxDepth)),
      };
    };

    const params = {
      extrasPercent: Number(uiParams.extrasPercent) || 0,
      laborPercent: Number(uiParams.laborPercent) || 0,
      producedQty: Number(uiParams.producedQty) || 0,
    };

    const payload = {
      _doc: "EdDeli RecipePage — pegar este JSON en el chat para análisis",
      ts: new Date().toISOString(),
      uiParams: params,
      cabecera: meta
        ? { id: meta.id, name: meta.name, type: meta.type, unitId: meta.unitId }
        : { id: Number(selectedProduct) },
      notaFlujo:
        meta?.type === "intermediate"
          ? "Intermedio: recetaDirecta = insumos del intermedio; destinosSiHayMasa = yieldInfo (padres / finales que lo consumen) si producedQty > 0"
          : "Final: recetaDirecta incluye intermedios e insumos de primer nivel; arbolCostosResumido desglosa todo",
      recetaDirecta: recipe.map((r) => ({
        lineId: r.id,
        productRawId: r.productRawId,
        rawName: r.rawProduct?.name,
        quantity: r.quantity,
        isQuantityInGrams: r.isQuantityInGrams,
        itemType: r.itemType,
      })),
      costeoResumen: costSummary,
      destinosSiHayMasa_oPadres: costSummary?.yieldInfo ?? null,
      arbolCostosResumido: costTreeData?.tree ? pruneCostTree(costTreeData.tree) : null,
      filasPlano_total: costTreeData?.rows?.length ?? 0,
      filasPlano_muestra: (costTreeData?.rows || []).slice(0, 15),
    };

    console.log("========== EdDeli RECETA / COSTEO (copiar JSON siguiente) ==========");
    console.log(JSON.stringify(payload, null, 2));
    console.log("========== /EdDeli ==========");

    try {
      await getRecipeCosting(selectedProduct, { ...params, debug: 1 });
      toast({ message: "Listo: revisa consola del navegador (F12) y la terminal del backend", variant: "success" });
    } catch {
      toast("Log en consola del navegador listo; el backend no respondió al debug", {
        icon: "⚠️",
      });
    }
  }, [selectedProduct, products, recipe, costSummary, costTreeData, uiParams]);

  const fetchProducts = async () => {
    const { data } = await getAllProducts();
    setProducts(data.filter((p) => p.type === "final" || p.type === "intermediate"));
  };

  const fetchRecipe = async (productId) => {
    const { data } = await getRecipeByProduct(productId);
    setRecipe(data);
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
    } catch (e) {
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

  // columnas receta (izquierda)
  const columns = [
    { label: "Insumo", id: "rawProduct", width: 120, render: (row) => row.rawProduct?.name },
    { label: "Cantidad", id: "quantity", width: 80 },
    { label: "¿En gramos?", id: "isQuantityInGrams", width: 100, render: (row) => (row.isQuantityInGrams ? "Sí" : "No") },
    { label: "Tipo", id: "itemType", width: 90 },
    {
      label: "Acciones",
      id: "actions",
      width: 140,
      render: (params) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params);
                setIsEditing(true);
                settitleUserDialog("Editar Insumo");
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

  // helpers para mostrar números seguros
  const fmt = (n, d = 2) => (typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "0.00");
  const t = costSummary?.totales || {};
  const acc = costSummary?.acumulados || {};

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ 2) Deja un solo effect para recargar todo cuando cambie el producto o los params
  useEffect(() => {
    if (!selectedProduct) return;
    fetchRecipe(selectedProduct);
    fetchCostingData(selectedProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, uiParams.extrasPercent, uiParams.laborPercent, uiParams.producedQty]);

  return (
    <Container>
      {/* Diálogos */}
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Insumo"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este insumo?
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
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
            label="Seleccionar Elemento"
            items={products}
            value={selectedProduct}
            onChange={(val) => setSelectedProduct(val)}
          />
        </Grid>

        {/* Izquierda: solo receta */}
        <Grid item xs={12} md={6}>
          <Button
            variant="text"
            endIcon={<RestaurantMenu />}
            onClick={() => {
              setIsEditing(false);
              settitleUserDialog("Agregar Insumo");
              handleDialogUser();
            }}
            disabled={!selectedProduct}
            sx={{ mb: 1 }}
          >
            Agregar Insumo
          </Button>

          <TablePro
            rows={recipe}
            columns={columns}
            defaultRowsPerPage={10}
            title="Receta (insumos)"
            showIndex={true}
          />
        </Grid>

        {/* Derecha: parámetros, resumen único, yield */}
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
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
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
                label="Cant. producida"
                type="number"
                size="small"
                value={uiParams.producedQty}
                onChange={(e) =>
                  setUiParams((p) => ({ ...p, producedQty: Number(e.target.value || 0) }))
                }
                sx={{ width: 128 }}
                inputProps={{ min: 0, step: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => fetchCostingData(selectedProduct)}
                disabled={!selectedProduct || loadingCost}
              >
                {loadingCost ? "…" : "Calcular"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={() => logRecipeAnalysis()}
                disabled={!selectedProduct}
              >
                Debug
              </Button>
            </Stack>

            {costSummary && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Resumen de costos
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
                    Insumos: <b>{fmt(t.subtotalInsumos)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Materiales: <b>{fmt(t.subtotalMateriales)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Subtotal: <b>{fmt(t.subtotal)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Gramos (ins.): <b>{fmt(acc.totalPesoEnMasaGr, 2)} g</b>
                  </Typography>
                  <Typography variant="body2">
                    Extras ({t.extrasPercentInt ?? 0}%): <b>{fmt(t.extras)}</b>
                  </Typography>
                  <Typography variant="body2">
                    Mano obra ({t.laborPercentInt ?? 0}%): <b>{fmt(t.labor)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Total lote: <b>{fmt(t.totalLote)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}>
                    Costo unit. (÷{t.producedQty ?? 0}): <b>{fmt(t.costoUnitario, 4)}</b>
                  </Typography>
                </Box>

                {Array.isArray(costSummary.yieldInfo) && costSummary.yieldInfo.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Con este lote puedes producir
                    </Typography>
                    {costSummary.yieldInfo.map((y) => (
                      <Typography key={y.parentId} variant="body2" sx={{ mb: 0.25 }}>
                        •{" "}
                        <b>
                          {y.unidad === "unidad"
                            ? y.unidadesPosiblesParent.toFixed(2)
                            : `${y.unidadesPosiblesParent.toFixed(2)} g`}
                        </b>{" "}
                        — {y.parentName}
                      </Typography>
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Base: {costSummary.yieldInfo[0].totalGramosDisponibles.toFixed(2)} g del producto
                      seleccionado.
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

        {/* Árbol de costos: ancho completo debajo */}
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
