import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ListSkeleton } from "../../../components/ContentSkeleton.jsx";
import ScienceIcon from "@mui/icons-material/Science";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InventoryIcon from "@mui/icons-material/Inventory";
import {
  bootstrapGenericIngredientsRequest,
  createGenericIngredientRequest,
  createPresentationRequest,
  getGenericIngredientsWorkbench,
  getUnits,
  linkPresentationRequest,
  unlinkPresentationRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

function formatStock(row) {
  if (row.isCountUnit) return `${row.stock} ${row.unitAbbrev}`;
  return `${row.stock} ${row.unitAbbrev}`;
}

export default function GenericIngredientsPage() {
  const theme = useTheme();
  const { toast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generics, setGenerics] = useState([]);
  const [unlinked, setUnlinked] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [openGeneric, setOpenGeneric] = useState(false);
  const [openPresentation, setOpenPresentation] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  const [genericForm, setGenericForm] = useState({ name: "", unitId: "", categoryFamily: "" });
  const [presentationForm, setPresentationForm] = useState({
    name: "",
    purchasePresentation: "",
    unitId: "",
    stock: "",
    price: "",
  });
  const [linkProductId, setLinkProductId] = useState("");

  const selected = useMemo(
    () => generics.find((g) => g.id === selectedId) ?? null,
    [generics, selectedId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wb, unitsRes] = await Promise.all([
        getGenericIngredientsWorkbench(),
        getUnits(),
      ]);
      setGenerics(wb.data?.generics ?? []);
      setUnlinked(wb.data?.unlinkedProducts ?? []);
      setUnits(unitsRes.data ?? []);
      setSelectedId((prev) => {
        const list = wb.data?.generics ?? [];
        if (prev && list.some((g) => g.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      console.error(e);
      toast?.({ message: "No se pudo cargar insumos y presentaciones", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runBootstrap = async () => {
    await runMutationReload(toast, {
      promise: bootstrapGenericIngredientsRequest(),
      reload: load,
      successMessage: "Presentaciones listas (azúcar, harina, aceite)",
    });
  };

  const saveGeneric = async () => {
    if (!genericForm.name.trim() || !genericForm.unitId) return;
    await runMutationReload(toast, {
      promise: createGenericIngredientRequest({
        name: genericForm.name.trim(),
        unitId: Number(genericForm.unitId),
        categoryFamily: genericForm.categoryFamily.trim() || genericForm.name.trim(),
      }),
      reload: () => {
        load();
        setOpenGeneric(false);
        setGenericForm({ name: "", unitId: "", categoryFamily: "" });
      },
      successMessage: "Insumo genérico creado",
    });
  };

  const savePresentation = async () => {
    if (!selected || !presentationForm.name.trim()) return;
    await runMutationReload(toast, {
      promise: createPresentationRequest(selected.id, {
        name: presentationForm.name.trim(),
        purchasePresentation: presentationForm.purchasePresentation.trim() || null,
        unitId: presentationForm.unitId ? Number(presentationForm.unitId) : selected.unitId,
        stock: presentationForm.stock !== "" ? Number(presentationForm.stock) : 0,
        price: presentationForm.price !== "" ? Number(presentationForm.price) : 0,
      }),
      reload: () => {
        load();
        setOpenPresentation(false);
        setPresentationForm({ name: "", purchasePresentation: "", unitId: "", stock: "", price: "" });
      },
      successMessage: "Presentación creada y enlazada",
    });
  };

  const linkExisting = async () => {
    if (!selected || !linkProductId) return;
    await runMutationReload(toast, {
      promise: linkPresentationRequest(linkProductId, {
        genericProductId: selected.id,
        purchasePresentation: presentationForm.purchasePresentation.trim() || null,
      }),
      reload: () => {
        load();
        setOpenLink(false);
        setLinkProductId("");
        setPresentationForm({ name: "", purchasePresentation: "", unitId: "", stock: "", price: "" });
      },
      successMessage: "Producto enlazado al insumo genérico",
    });
  };

  const unlink = async (productId) => {
    await runMutationReload(toast, {
      promise: unlinkPresentationRequest(productId),
      reload: load,
      successMessage: "Enlace quitado",
    });
  };

  const accent = theme.palette.primary.main;

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
            <ScienceIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Insumos y presentaciones
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
            Los <strong>insumos genéricos</strong> usan las recetas (Harina, Aceite…). Las{" "}
            <strong>presentaciones</strong> son formatos de compra (quintal, arroba, funda 900ml) con
            stock real — sin marca en el nombre. Bajo <strong>Azúcar</strong>: quintal y arroba;{" "}
            <strong>Azúcar impalpable</strong> es otro insumo aparte.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={loading}>
            Actualizar
          </Button>
          <Button
            startIcon={<AutoFixHighIcon />}
            variant="outlined"
            color="secondary"
            onClick={runBootstrap}
            disabled={loading}
          >
            Crear presentaciones frecuentes
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenGeneric(true)}>
            Nuevo insumo
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 1.5, borderRadius: 2, maxHeight: 560, overflow: "auto" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, px: 0.5 }}>
              Insumos genéricos ({generics.length})
            </Typography>
            {loading && <ListSkeleton count={5} itemHeight={72} />}
            {generics.length === 0 && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                Sin insumos. Usa &quot;Crear presentaciones frecuentes&quot; o crea uno nuevo.
              </Typography>
            )}
            <Stack spacing={0.75}>
              {!loading &&
                generics.map((g) => {
                const active = g.id === selectedId;
                return (
                  <Paper
                    key={g.id}
                    elevation={0}
                    onClick={() => setSelectedId(g.id)}
                    sx={{
                      p: 1.25,
                      cursor: "pointer",
                      borderRadius: 1.5,
                      border: "2px solid",
                      borderColor: active ? accent : "divider",
                      bgcolor: active ? alpha(accent, 0.06) : "background.paper",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {g.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Total: {g.totalStockDisplay} · {g.presentationCount} presentación(es)
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.75} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`${g.recipeLines} receta(s)`} variant="outlined" />
                      <Chip size="small" label={g.categoryName} />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {selected ? (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                spacing={1.5}
                mb={2}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selected.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stock disponible (todas las presentaciones):{" "}
                    <strong>{selected.totalStockDisplay}</strong>
                    {selected.stockOnGeneric > 0 && (
                      <> · incl. {selected.stockOnGeneric} g en el genérico directo</>
                    )}
                  </Typography>
                  <Chip
                    size="small"
                    sx={{ mt: 1 }}
                    icon={<InventoryIcon />}
                    label={`Categoría familia: ${selected.categoryName}`}
                  />
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={() => setOpenLink(true)}
                  >
                    Enlazar producto
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setPresentationForm((f) => ({ ...f, unitId: selected.unitId }));
                      setOpenPresentation(true);
                    }}
                  >
                    Nueva presentación
                  </Button>
                </Stack>
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Presentaciones / marcas
              </Typography>

              {selected.presentations?.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay presentaciones. Ej. &quot;Quintal de azúcar&quot; y &quot;Arroba de
                    azúcar&quot; (usa Crear presentaciones frecuentes).
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {selected.presentations.map((p) => (
                    <Paper
                      key={p.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.purchasePresentation || "—"} · Categoría: {p.categoryName} · Stock:{" "}
                          {formatStock(p)}
                          {!p.isCountUnit && p.stockGrams > 0 && ` (${p.stockGrams} g)`}
                        </Typography>
                      </Box>
                      <Tooltip title="Quitar enlace">
                        <IconButton size="small" color="warning" onClick={() => unlink(p.id)}>
                          <LinkOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography color="text.secondary">Selecciona un insumo genérico</Typography>
            </Paper>
          )}

          {unlinked.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Materia prima sin enlazar ({unlinked.length})
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Productos de compra que aún no están ligados a un insumo genérico.
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {unlinked.slice(0, 24).map((p) => (
                  <Chip
                    key={p.id}
                    size="small"
                    label={p.name}
                    variant="outlined"
                    onClick={() => {
                      if (selected) {
                        setLinkProductId(String(p.id));
                        setOpenLink(true);
                      }
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Dialog open={openGeneric} onClose={() => setOpenGeneric(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo insumo genérico</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre (recetas)"
              fullWidth
              value={genericForm.name}
              onChange={(e) => setGenericForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Aceite"
            />
            <TextField
              label="Familia / categoría"
              fullWidth
              value={genericForm.categoryFamily}
              onChange={(e) => setGenericForm((f) => ({ ...f, categoryFamily: e.target.value }))}
              placeholder="Ej: Aceite (para presentaciones)"
            />
            <TextField
              select
              label="Unidad base"
              fullWidth
              value={genericForm.unitId}
              onChange={(e) => setGenericForm((f) => ({ ...f, unitId: e.target.value }))}
            >
              {units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGeneric(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveGeneric}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPresentation} onClose={() => setOpenPresentation(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Nueva presentación · {selected?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre completo"
              fullWidth
              value={presentationForm.name}
              onChange={(e) => setPresentationForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Quintal Harina Pani Plus"
            />
            <TextField
              label="Presentación"
              fullWidth
              value={presentationForm.purchasePresentation}
              onChange={(e) =>
                setPresentationForm((f) => ({ ...f, purchasePresentation: e.target.value }))
              }
              placeholder="Ej: Quintal, Funda 900ml"
            />
            <TextField
              select
              label="Unidad de compra"
              fullWidth
              value={presentationForm.unitId}
              onChange={(e) => setPresentationForm((f) => ({ ...f, unitId: e.target.value }))}
            >
              {units.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </MenuItem>
              ))}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Stock inicial"
                  type="number"
                  fullWidth
                  value={presentationForm.stock}
                  onChange={(e) => setPresentationForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Precio ref."
                  type="number"
                  fullWidth
                  value={presentationForm.price}
                  onChange={(e) => setPresentationForm((f) => ({ ...f, price: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresentation(false)}>Cancelar</Button>
          <Button variant="contained" onClick={savePresentation}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLink} onClose={() => setOpenLink(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enlazar producto a {selected?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Producto existente"
              fullWidth
              value={linkProductId}
              onChange={(e) => setLinkProductId(e.target.value)}
            >
              {unlinked.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} (stock: {formatStock(p)})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nota de presentación"
              fullWidth
              value={presentationForm.purchasePresentation}
              onChange={(e) =>
                setPresentationForm((f) => ({ ...f, purchasePresentation: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLink(false)}>Cancelar</Button>
          <Button variant="contained" onClick={linkExisting}>
            Enlazar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
