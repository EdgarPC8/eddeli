// components/RenderFromIntermediate.jsx
import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Stack,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Paper,
  Button,
  Drawer,
  Fab,
  Badge,
  LinearProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";


import {
  simulateFromIntermediate,
  registerProductionIntermediateFromPayload,
} from "../../../../api/inventoryControlRequest";
import { useAuth } from "../../../../context/AuthContext";
import ProgrammerMovementDateField, {
  movementDateForApi,
  todayDateInput,
} from "./ProgrammerMovementDateField.jsx";

/* --- Utils --- */
const numberOrZero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ===== Helpers/Payload ===== */
const buildBackendPayload = ({ resultadoEditable, cart, insumosAggregatedMap }) => {
  const intermedioId = resultadoEditable?.id;
  const intermedioNombre = resultadoEditable?.producto;

  // g consumidos por finales (cada final consume gramos del intermedio)
  const masaConsumidaTotal = cart.reduce(
    (acc, it) => acc + numberOrZero(it.gramosPorUnidad) * numberOrZero(it.cantidad),
    0
  );

  const productosFinales = cart.map((it) => ({
    id: it.id,
    nombre: it.nombre,
    cantidad: numberOrZero(it.cantidad),
    gramosPorUnidadIntermedio: numberOrZero(it.gramosPorUnidad),
    tipo: "final",
  }));

  const intermedioConsumido = {
    id: intermedioId,
    nombre: intermedioNombre,
    gramos: Number(masaConsumidaTotal.toFixed(2)),
    tipo: "intermedio",
  };

  const transformaciones = cart
    .filter((it) => it.transformOfParentId)
    .map((it) => ({
      hijoId: it.id,
      hijoNombre: it.nombre,
      cantidad: it.cantidad,
      padreId: it.transformOfParentId,
      unidadesPadrePorUnidadHijo: it.unitsPerChild,
    }));

  // ⬅️ FORMATO QUE ESPERA EL BACKEND: usa `gramos` o `unidades`
  const insumos = Object.values(insumosAggregatedMap || {}).map((n) => {
    const out = { id: n.id, nombre: n.nombre };
    if (n.gramos != null && Number(n.gramos) > 0) out.gramos = Number(n.gramos);
    if (n.unidades != null && Number(n.unidades) > 0) out.unidades = Number(n.unidades);
    return out;
  });

  return {
    intermedio: intermedioConsumido,
    productos: productosFinales,
    transformaciones,
    insumos,
  };
};

/* ====== Panel carrito ====== */
function CartSummary({
  cart,
  masaRestante,
  onRemove,
  onDistribute,
  resultadoEditable,
  insumosAggMap,
  onProcess,
  isProgrammer,
  movementDate,
  onMovementDateChange,
}) {
  const totalUsado = cart.reduce(
    (acc, it) => acc + numberOrZero(it.gramosPorUnidad) * numberOrZero(it.cantidad),
    0
  );
  const payload = buildBackendPayload({
    resultadoEditable,
    cart,
    insumosAggregatedMap: insumosAggMap,
  });

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
        <Chip color="primary" label={`Usado: ${totalUsado.toFixed(2)} g`} />
        <Chip label={`Masa restante: ${numberOrZero(masaRestante).toFixed(2)} g`} />
      </Stack>

      {resultadoEditable && totalUsado > 0 && (
        <Box
          sx={{
            mb: 1,
            p: 1.2,
            borderRadius: 1,
            border: "1px dashed",
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.common.white, 0.06)
                : theme.palette.grey[50],
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Intermedio consumido
          </Typography>
          <Typography variant="body2">
            <strong>{resultadoEditable.producto}</strong>: {totalUsado.toFixed(2)} g
          </Typography>
        </Box>
      )}

      <List dense>
        {cart.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            El carrito está vacío.
          </Typography>
        )}
        {cart.map((it) => (
          <ListItem
            key={it._key || it.id}
            sx={{ borderBottom: "1px dashed", borderColor: "divider" }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 600 }}>{it.nombre}</Typography>
                  {it.transformOfParentId && <Chip size="small" label="Transformación" />}
                </Stack>
              }
              secondary={
                it.transformOfParentId ? (
                  <>
                    {it.cantidad} u (usa {it.unitsPerChild} u del padre c/u) — <strong>0.00 g</strong> de masa
                  </>
                ) : (
                  <>
                    {it.cantidad} u × {numberOrZero(it.gramosPorUnidad).toFixed(2)} g ={" "}
                    <strong>
                      {(numberOrZero(it.gramosPorUnidad) * numberOrZero(it.cantidad)).toFixed(2)} g
                    </strong>
                  </>
                )
              }
            />
            <Tooltip title="Quitar 1">
              <IconButton edge="end" onMouseDown={(e)=>e.preventDefault()} onClick={() => onRemove(it)}>
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 1, mb: 1 }}>
        <ProgrammerMovementDateField
          isProgrammer={isProgrammer}
          value={movementDate}
          onChange={onMovementDateChange}
          label="Fecha de la producción"
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onDistribute}
          disabled={numberOrZero(masaRestante) <= 0 || cart.length === 0}
        >
          Repartir masa restante
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => onProcess && onProcess(payload)}
          disabled={cart.length === 0}
        >
          Procesar (payload)
        </Button>
      </Stack>
    </Paper>
  );
}

/* ====== Panel de Insumos consumidos ====== */
function InsumosConsumidos({ insumosAggMap }) {
  const insumos = Object.values(insumosAggMap || {});
  if (!insumos.length) {
    return (
      <Paper
        elevation={0}
        sx={{
          mt: 1.5,
          p: 1.5,
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? alpha(theme.palette.common.white, 0.06)
              : theme.palette.grey[50],
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Insumos consumidos de la receta
        </Typography>
        <Typography variant="body2" color="text.secondary">Sin insumos aún.</Typography>
      </Paper>
    );
  }

  insumos.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  const totalGr = insumos.reduce((s, it) => s + (numberOrZero(it.gramos) || 0), 0);
  const totalUn = insumos.reduce((s, it) => s + (numberOrZero(it.unidades) || 0), 0);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1.5,
        p: 1.5,
        border: "1px dashed",
        borderColor: "divider",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.06)
            : theme.palette.grey[50],
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Insumos consumidos de la receta
      </Typography>

      <List dense disablePadding>
        {insumos.map((it) => (
          <ListItem key={it.id} sx={{ px: 0, py: 0.5 }}>
            <ListItemText
              primary={
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
                  <Typography sx={{ fontWeight: 500, flex: 1, pr: 1 }}>{it.nombre}</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {it.gramos != null && (
                      <Chip size="small" label={`${numberOrZero(it.gramos).toFixed(2)} g`} />
                    )}
                    {it.unidades != null && (
                      <Chip size="small" variant="outlined" label={`${numberOrZero(it.unidades)} u`} />
                    )}
                  </Stack>
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        {totalGr > 0 && <Chip size="small" color="primary" label={`Total: ${totalGr.toFixed(2)} g`} />}
        {totalUn > 0 && <Chip size="small" variant="outlined" label={`Total: ${totalUn} u`} />}
      </Stack>
    </Paper>
  );
}

/* =================== COMPONENTE INDEPENDIENTE =================== */
export default function RenderFromIntermediate({ productId, fetchData }) {
  const [loadingIntermediate, setLoadingIntermediate] = React.useState(false);

  // Resultado de simulación del intermedio (masa total y derivados)
  const [resultado, setResultado] = React.useState(null);
  const [masaRestante, setMasaRestante] = React.useState(0);

  // Lotes y masa base
  const [lotes, setLotes] = React.useState(1); // 0.5, 1, 1.5...
  const [baseProducedGrams, setBaseProducedGrams] = React.useState(0); // producedGrams por 1 lote
  const [totalMasaProducida, setTotalMasaProducida] = React.useState(0); // tracking para ajustar restante

  // Carrito e insumos
  const [cart, setCart] = React.useState([]);
  const [insumosAggMap, setInsumosAggMap] = React.useState({});
  const [insumosIntermedioBase, setInsumosIntermedioBase] = React.useState({}); // insumos del intermedio por 1 lote

  // Drawer móvil para carrito
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cantidades, setCantidades] = React.useState({});
  const [openMap, setOpenMap] = React.useState({});
  const { toast: toastAuth, user } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [movementDate, setMovementDate] = React.useState(todayDateInput());

  // refs para inputs de cantidad
  const qtyRefs = React.useRef({});
  const getQtyRef = React.useCallback((key) => {
    if (!qtyRefs.current[key]) qtyRefs.current[key] = React.createRef();
    return qtyRefs.current[key];
  }, []);
  const refocusQty = (key) => {
    requestAnimationFrame(() => {
      qtyRefs.current[key]?.current?.focus?.();
    });
  };

  /* ---------- Helpers de insumos (formato backend-compatible) ---------- */
  const mergeInsumo = React.useCallback((map, node, factor = 1) => {
    const id = node.id;
    const nombre = node.producto || node.nombre || "Insumo";
    const unidad = node.unidad; // "gramos" | "unidad" | etc.

    // formato nuevo
    const cantStd = node.cantidad != null ? numberOrZero(node.cantidad) : null;
    const isGramsFlag = node.isQuantityInGrams === true || unidad === "gramos";

    // compat. formato antiguo
    const cantGrOld = node.cantidadGramos != null ? numberOrZero(node.cantidadGramos) : null;
    const cantUnOld = node.cantidadUnidades != null ? numberOrZero(node.cantidadUnidades) : null;

    const prev = map[id] || { id, nombre, gramos: 0, unidades: 0 };

    if (cantStd != null) {
      if (isGramsFlag) {
        prev.gramos = numberOrZero(prev.gramos) + factor * cantStd;
      } else {
        prev.unidades = numberOrZero(prev.unidades) + factor * cantStd;
      }
    } else if (cantGrOld != null) {
      prev.gramos = numberOrZero(prev.gramos) + factor * cantGrOld;
    } else if (cantUnOld != null) {
      prev.unidades = numberOrZero(prev.unidades) + factor * cantUnOld;
    }

    map[id] = prev;
    return map;
  }, []);

  const walkRequiere = React.useCallback(
    (req, factor, map) => {
      if (!req) return;
      const arr = Array.isArray(req) ? req : req.requiere;
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        const esIntermedio = !!item.esIntermedio;
        // Acumula SOLO insumos no-intermedios
        if (!esIntermedio) mergeInsumo(map, item, factor);
        if (item.requiere) walkRequiere(item.requiere, factor, map);
      }
    },
    [mergeInsumo]
  );

  /* ---------- Simular al elegir producto (intermedio) ---------- */
  React.useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoadingIntermediate(true);
    (async () => {
      try {
        const res = await simulateFromIntermediate(Number(productId));
        const r = res?.data ?? null;
        if (cancelled || !r) return;
        const formatted = {
          ...r,
          cantidadDeseada: numberOrZero(r.producedGrams ?? r.cantidadDeseada),
          unidad: r.unidad ?? "gramos",
        };
        setResultado(formatted);

        const baseG = numberOrZero(formatted.producedGrams);
        setBaseProducedGrams(baseG);
        setLotes(1);
        setTotalMasaProducida(baseG);
        setMasaRestante(baseG);

        const baseMap = {};
        walkRequiere(r?.requiere, 1, baseMap);
        setInsumosIntermedioBase(baseMap);

        setCart([]);
        setCantidades({});
        setOpenMap({});
        setInsumosAggMap(baseMap);
      } catch (err) {
        console.error("Simulación intermedio error:", err);
        if (!cancelled) {
          setResultado(null);
          setCart([]);
          setInsumosAggMap({});
          setInsumosIntermedioBase({});
        }
      } finally {
        if (!cancelled) setLoadingIntermediate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, walkRequiere]);

  /* ---------- Lotes (paso 0.5) ---------- */
  const trySetLotes = (val) => {
    const v = Math.max(0.5, Number(val) || 0.5);
    const norm = Number((Math.round(v * 2) / 2).toFixed(1)); // normaliza a 0.5
    const newTotal = numberOrZero(baseProducedGrams) * norm;
    const delta = newTotal - numberOrZero(totalMasaProducida);
    setMasaRestante((prev) => numberOrZero(prev) + delta); // ajusta disponible para finales
    setTotalMasaProducida(newTotal);
    setLotes(norm);
  };

  /* ---------- Escala insumos del intermedio por lotes (sin sumar finales) ---------- */
  React.useEffect(() => {
    const scaled = {};
    Object.values(insumosIntermedioBase || {}).forEach((n) => {
      scaled[n.id] = {
        id: n.id,
        nombre: n.nombre,
        gramos: n.gramos != null ? numberOrZero(n.gramos) * numberOrZero(lotes) : undefined,
        unidades: n.unidades != null ? numberOrZero(n.unidades) * numberOrZero(lotes) : undefined,
      };
    });

    // Limpieza de ceros
    Object.keys(scaled).forEach((k) => {
      const v = scaled[k];
      if (Math.abs(numberOrZero(v.gramos)) < 1e-9) delete v.gramos;
      if (Math.abs(numberOrZero(v.unidades)) < 1e-9) delete v.unidades;
      if (v.gramos == null && v.unidades == null) delete scaled[k];
    });

    setInsumosAggMap(scaled);
  }, [insumosIntermedioBase, lotes]);

  /* ---------- Carrito: add / remove / distribuir ---------- */
  const handleAddToCart = async (producto, cantidad = 1, gramosOverride, opts = {}) => {
    if (!resultado) return;

    // Transformación: consume unidades del padre, no masa
    if (opts.mode === "transform") {
      const unitsPerChild = numberOrZero(opts.unitsPerChild) || 1;
      const needUnits = unitsPerChild * numberOrZero(cantidad);
      const parentGrams = numberOrZero(opts.parentGramosPorUnidad);
      const parentId = opts.parentId;

      const parentItemNow = cart.find((c) => c.id === parentId);
      const haveUnits = numberOrZero(parentItemNow?.cantidad || 0);
      const deficit = Math.max(0, needUnits - haveUnits);
      const gramsNeededFromMass = deficit * parentGrams;

      if (deficit > 0 && numberOrZero(masaRestante) < gramsNeededFromMass) {
        console.warn("No hay masa suficiente para producir unidades del padre requeridas.");
        return;
      }

      setCart((prev) => {
        let next = [...prev];

        // si falta padre, lo fabricamos desde masa
        if (deficit > 0) {
          const existingParent = next.find((c) => c.id === parentId);
          if (existingParent) existingParent.cantidad += deficit;
          else
            next.push({
              id: parentId,
              nombre: opts.parentName || "Producto base",
              cantidad: deficit,
              gramosPorUnidad: parentGrams,
              tipo: "final",
            });
        }

        // descontar unidades de padre usadas
        const parentLine = next.find((c) => c.id === parentId);
        if (parentLine) {
          parentLine.cantidad -= needUnits;
          if (parentLine.cantidad <= 0) next = next.filter((c) => c.id !== parentId);
        }

        // agregar hijo (no usa masa)
        const childExisting = next.find((c) => c.id === producto.id);
        if (childExisting) {
          childExisting.cantidad += cantidad;
          childExisting.gramosPorUnidad = 0;
          childExisting.transformOfParentId = parentId;
          childExisting.unitsPerChild = unitsPerChild;
          childExisting.parentGramosPorUnidad = parentGrams;
        } else {
          next.push({
            id: producto.id,
            nombre: producto.producto ?? producto.name ?? "Producto",
            cantidad: cantidad,
            gramosPorUnidad: 0,
            tipo: "final",
            transformOfParentId: parentId,
            unitsPerChild: unitsPerChild,
            parentGramosPorUnidad: parentGrams,
          });
        }

        return next;
      });

      if (deficit > 0) setMasaRestante((prev) => numberOrZero(prev) - gramsNeededFromMass);
      return; // ⬅️ ya NO acumulamos insumos de finales
    }

    // Consumo normal (usa masa)
    const gramosPorUnidad = numberOrZero(gramosOverride ?? producto.consumoPorUnidad);
    if (gramosPorUnidad <= 0) return;

    const disponiblesPorMasa = Math.floor(numberOrZero(masaRestante) / gramosPorUnidad);
    const cantidadAgregable = Math.max(0, Math.min(Number(cantidad) || 0, disponiblesPorMasa));
    if (cantidadAgregable <= 0) return;

    setCart((prev) => {
      const existe = prev.find((c) => c.id === producto.id);
      if (existe) {
        return prev.map((c) =>
          c.id === producto.id ? { ...c, cantidad: c.cantidad + cantidadAgregable, gramosPorUnidad } : c
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.producto ?? producto.name ?? "Producto",
          cantidad: cantidadAgregable,
          gramosPorUnidad,
          tipo: "final",
        },
      ];
    });

    setMasaRestante((prev) => numberOrZero(prev) - gramosPorUnidad * cantidadAgregable);
    // ⬅️ ya NO acumulamos insumos de finales
  };

  const handleRemoveFromCart = async (itemOrId) => {
    const productoId = typeof itemOrId === "object" ? itemOrId.id : itemOrId;
    const itemActual =
      typeof itemOrId === "object" ? itemOrId : cart.find((c) => c.id === productoId);
    if (!itemActual) return;

    if (itemActual.transformOfParentId) {
      const parentId = itemActual.transformOfParentId;
      const unitsPerChild = numberOrZero(itemActual.unitsPerChild) || 1;

      setCart((prev) => {
        let next = prev.map((c) => ({ ...c }));
        const child = next.find((c) => c.id === itemActual.id);
        if (!child) return prev;
        child.cantidad -= 1;
        if (child.cantidad <= 0) next = next.filter((c) => c.id !== child.id);

        const parent = next.find((c) => c.id === parentId);
        if (parent) {
          parent.cantidad += unitsPerChild;
        } else {
          next.push({
            id: parentId,
            nombre: "Producto base",
            cantidad: unitsPerChild,
            gramosPorUnidad: numberOrZero(itemActual.parentGramosPorUnidad),
            tipo: "final",
          });
        }
        return next;
      });

      return; // ⬅️ no tocar insumos
    }

    setCart((prev) => {
      const current = prev.find((c) => c.id === productoId);
      if (!current) return prev;
      if (current.cantidad <= 1) {
        return prev.filter((c) => c.id !== productoId);
      }
      return prev.map((c) => (c.id === productoId ? { ...c, cantidad: c.cantidad - 1 } : c));
    });

    setMasaRestante((prev) => numberOrZero(prev) + numberOrZero(itemActual.gramosPorUnidad));
  };

  const handleDistributeRemainingMass = () => {
    if (numberOrZero(masaRestante) <= 0 || cart.length === 0) return;
    const totalUnidades = cart.reduce((s, it) => s + numberOrZero(it.cantidad), 0);
    if (totalUnidades <= 0) return;

    const extraPorUnidad = numberOrZero(masaRestante) / totalUnidades;
    const nuevoCart = cart.map((item) => ({
      ...item,
      gramosPorUnidad: numberOrZero(item.gramosPorUnidad) + extraPorUnidad,
    }));
    setCart(nuevoCart);
    setMasaRestante(0);
  };

  /* ----------------- UI: Tarjetas y derivados (recursivo) ----------------- */
  const getCantidadInt = React.useCallback(
    (k) => {
      const v = Number(cantidades[k] ?? 1);
      if (!Number.isFinite(v) || v < 1) return 1;
      return Math.floor(v);
    },
    [cantidades]
  );
  const toggleOpen = (k) => setOpenMap((p) => ({ ...p, [k]: !p[k] }));

  const resetAfterSuccessfulProcess = React.useCallback(() => {
    setCart([]);
    setCantidades({});
    setOpenMap({});
    setCartOpen(false);
    const totalMasa = numberOrZero(baseProducedGrams) * numberOrZero(lotes);
    setMasaRestante(totalMasa);
    setTotalMasaProducida(totalMasa);
  }, [baseProducedGrams, lotes]);

  const handleProcess = async () => {
    const payload = buildBackendPayload({
      resultadoEditable: resultado,
      cart,
      insumosAggregatedMap: insumosAggMap,
    });
    const dateApi = isProgrammer ? movementDateForApi(movementDate) : undefined;
    if (dateApi) payload.movementDate = dateApi;

    toastAuth({
      promise: registerProductionIntermediateFromPayload(payload),
      onSuccess: () => {
        fetchData?.();
        resetAfterSuccessfulProcess();
        return {
          title: "Producción",
          description: "Producción Intermedia registrada correctamente",
        };
      },
    });
  };

  const RowDerivado = ({ item, parent, depth = 0, consumoAcumuladoPadre = null, pathKey = "" }) => {
    const isTransform = !!parent;

    const gramosBase = numberOrZero(item.consumoPorUnidad);
    const unitsPerChild = isTransform ? (gramosBase > 0 ? gramosBase : 1) : 0;
    const gramosPorUnidad =
      !isTransform
        ? (consumoAcumuladoPadre != null ? gramosBase * consumoAcumuladoPadre : gramosBase)
        : 0;

    const k = `${item.id}::${pathKey}`;
    const inputCantidad = getCantidadInt(k);

    const enCarrito = cart.find((c) => c.id === item.id);
    const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;

    const parentItem = isTransform ? cart.find((c) => c.id === parent.id) : null;
    const disponiblePorPadre = isTransform
      ? Math.floor(numberOrZero(parentItem?.cantidad || 0) / numberOrZero(unitsPerChild || 1))
      : Infinity;

    const maxAddable = isTransform
      ? disponiblePorPadre
      : gramosPorUnidad > 0
      ? Math.floor(numberOrZero(masaRestante) / gramosPorUnidad)
      : 0;

    const needParentUnits = isTransform ? inputCantidad * numberOrZero(unitsPerChild || 1) : 0;
    const sinPadre = isTransform && needParentUnits > numberOrZero(parentItem?.cantidad || 0);

    const hasChildren = Array.isArray(item.puedeProducir) && item.puedeProducir.length > 0;

    return (
      <>
        <ListItem
          sx={{ pl: 1 + depth * 2, alignItems: "flex-start" }}
          secondaryAction={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Agregar cantidad indicada">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onMouseDown={(e)=>e.preventDefault()}
                    disabled={
                      isTransform
                        ? inputCantidad > maxAddable
                        : gramosPorUnidad <= 0 || inputCantidad > maxAddable
                    }
                    onClick={() =>
                      handleAddToCart(
                        { ...item, producto: item.producto },
                        getCantidadInt(k),
                        gramosPorUnidad,
                        isTransform
                          ? {
                              mode: "transform",
                              parentId: parent.id,
                              parentName: parent.producto,
                              unitsPerChild,
                              parentGramosPorUnidad: numberOrZero(consumoAcumuladoPadre),
                            }
                          : {}
                      )
                    }
                  >
                    <PlaylistAddCheckIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Agregar 1">
                <span>
                  <IconButton
                    size="small"
                    onMouseDown={(e)=>e.preventDefault()}
                    disabled={isTransform ? maxAddable <= 0 : gramosPorUnidad <= 0 || maxAddable <= 0}
                    onClick={() =>
                      handleAddToCart(
                        { ...item, producto: item.producto },
                        1,
                        gramosPorUnidad,
                        isTransform
                          ? {
                              mode: "transform",
                              parentId: parent.id,
                              parentName: parent.producto,
                              unitsPerChild,
                              parentGramosPorUnidad: numberOrZero(consumoAcumuladoPadre),
                            }
                          : {}
                      )
                    }
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          }
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                {hasChildren && (
                  <IconButton
                    size="small"
                    onMouseDown={(e)=>e.preventDefault()}
                    onClick={() => toggleOpen(k)}
                    sx={{ mr: 0.5, transform: openMap[k] ? "rotate(180deg)" : "none", transition: "0.15s" }}
                  >
                    <ExpandMoreIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography sx={{ fontWeight: 600 }}>{item.producto}</Typography>
                {isTransform ? (
                  <Chip size="small" label={`Consumo: ${unitsPerChild} u padre/u`} />
                ) : (
                  <Chip size="small" label={`Consumo: ${gramosPorUnidad.toFixed(2)} g/u`} />
                )}
                <Chip size="small" variant="outlined" label={`Máx: ${isTransform ? (maxAddable || 0) : maxAddable}`} />
                <Chip size="small" color={cantidadEnCarrito > 0 ? "primary" : "default"} label={`En carrito: ${cantidadEnCarrito}`} />
              </Stack>
            }
            secondary={
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <TextField
                  type="number"
                  size="small"
                  variant="outlined"
                  label="Cantidad"
                  value={cantidades[k] ?? 1}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCantidades((prev) => ({ ...prev, [k]: val }));
                    refocusQty(k);
                  }}
                  inputProps={{ step: 1, min: 1 }}
                  sx={{ width: 120 }}
                  inputRef={getQtyRef(k)}
                  onWheel={(e)=>e.target.blur()}
                />
                {isTransform && sinPadre && (
                  <Typography variant="caption" color="error">
                    Necesitas {needParentUnits} u del padre.
                  </Typography>
                )}
              </Stack>
            }
          />
        </ListItem>

        {hasChildren && (
          <Collapse in={!!openMap[k]} timeout="auto" unmountOnExit>
            <List disablePadding dense>
              {item.puedeProducir.map((child) => (
                <RowDerivado
                  key={`${child.id}::${k}`}
                  item={child}
                  parent={item}
                  depth={depth + 1}
                  consumoAcumuladoPadre={isTransform ? 0 : gramosPorUnidad}
                  pathKey={`${k}>${child.id}`}
                />
              ))}
            </List>
          </Collapse>
        )}
      </>
    );
  };

  const CardsGrid = () => (
    <Grid container spacing={2} alignItems="flex-start">
      {resultado?.puedeProducir?.map((producto) => {
        const gramosBase = numberOrZero(producto.consumoPorUnidad);
        const gramosPorUnidad = gramosBase;

        const enCarrito = cart.find((c) => c.id === producto.id);
        const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;
        const maxAddable =
          gramosPorUnidad > 0 ? Math.floor(numberOrZero(masaRestante) / gramosPorUnidad) : 0;
        const keyTop = `${producto.id}::top`;

        return (
          <Grid item xs={12} lg={6} key={keyTop} sx={{ alignSelf: "flex-start" }}>
            <Card elevation={3} sx={{ display: "flex", flexDirection: "column", overflow: "visible" }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                  title={producto.producto}
                >
                  {producto.producto}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
                  <Chip size="small" label={`Consumo: ${gramosPorUnidad.toFixed(2)} g/u`} />
                  <Chip size="small" variant="outlined" label={`Máx a agregar: ${maxAddable}`} />
                  <Chip size="small" color={cantidadEnCarrito > 0 ? "primary" : "default"} label={`En carrito: ${cantidadEnCarrito}`} />
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    type="number"
                    size="small"
                    variant="outlined"
                    label="Cantidad"
                    value={cantidades[keyTop] ?? 1}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCantidades((p) => ({ ...p, [keyTop]: val }));
                      refocusQty(keyTop);
                    }}
                    inputProps={{ step: 1, min: 1 }}
                    sx={{ width: 140 }}
                    inputRef={getQtyRef(keyTop)}
                    onWheel={(e)=>e.target.blur()}
                  />
                  <Tooltip title="Agregar cantidad indicada">
                    <span>
                      <IconButton
                        color="primary"
                        onMouseDown={(e)=>e.preventDefault()}
                        disabled={
                          gramosPorUnidad <= 0 ||
                          numberOrZero(masaRestante) < gramosPorUnidad * getCantidadInt(keyTop)
                        }
                        onClick={() =>
                          handleAddToCart(
                            { ...producto, producto: producto.producto },
                            getCantidadInt(keyTop),
                            gramosPorUnidad,
                            {}
                          )
                        }
                      >
                        <PlaylistAddCheckIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Agregar 1">
                    <span>
                      <IconButton
                        onMouseDown={(e)=>e.preventDefault()}
                        disabled={maxAddable <= 0}
                        onClick={() =>
                          handleAddToCart({ ...producto, producto: producto.producto }, 1, gramosPorUnidad, {})
                        }
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </CardContent>

              {Array.isArray(producto.puedeProducir) && producto.puedeProducir.length > 0 && (
                <>
                  <Divider sx={{ mx: 2 }} />
                  <Box sx={{ px: 2, pt: 1, pb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Con {producto.producto} puedes producir:
                    </Typography>
                    <List dense disablePadding>
                      {producto.puedeProducir.map((child) => (
                        <RowDerivado
                          key={`${child.id}::${producto.id}`}
                          item={child}
                          parent={producto}
                          depth={0}
                          consumoAcumuladoPadre={gramosPorUnidad}
                          pathKey={`top>${producto.id}`}
                        />
                      ))}
                    </List>
                  </Box>
                </>
              )}

              <CardActions sx={{ pt: 0, px: 2, pb: 2 }} />
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  /* -------------------- Render principal -------------------- */
  return (
    <Box>
      {loadingIntermediate && <LinearProgress sx={{ mb: 2 }} />}

      {resultado && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Lotes de masa (pasos de 0.5)
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Tooltip title="− 0.5 lote">
              <span>
                <IconButton size="small" onClick={() => trySetLotes(lotes - 0.5)}>
                  <RemoveCircleOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
            <TextField
              type="number"
              size="small"
              variant="outlined"
              value={lotes}
              onChange={(e) => trySetLotes(e.target.value)}
              inputProps={{ step: 0.5, min: 0.5 }}
              sx={{ width: 120 }}
              onWheel={(e) => e.target.blur()}
            />
            <Tooltip title="+ 0.5 lote">
              <span>
                <IconButton size="small" onClick={() => trySetLotes(lotes + 0.5)}>
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Chip
              size="small"
              color="primary"
              label={`Producido: ${(numberOrZero(baseProducedGrams) * numberOrZero(lotes)).toFixed(2)} g`}
            />
          </Stack>
        </Paper>
      )}

      {/* Resultado */}
      {resultado && (
        <Grid container spacing={2} alignItems="flex-start">
          {/* Izquierda: tarjetas */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ mr: 1 }}>
                  Desde <strong>{resultado.producto}</strong>
                </Typography>
                <Chip
                  size="small"
                  color="primary"
                  label={`Masa total: ${(numberOrZero(baseProducedGrams) * numberOrZero(lotes)).toFixed(2)} g`}
                />
                <Chip size="small" label={`Restante: ${numberOrZero(masaRestante).toFixed(2)} g`} />
                <Chip size="small" variant="outlined" label={`Lotes: ${lotes.toFixed(1)}`} />
              </Stack>

              <CardsGrid />
            </Paper>
          </Grid>

          {/* Derecha: carrito + insumos */}
          <Grid item xs={12} md={4} sx={{ display: { xs: "none", md: "block" } }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Carrito
            </Typography>
            <CartSummary
              cart={cart}
              masaRestante={masaRestante}
              resultadoEditable={resultado}
              insumosAggMap={insumosAggMap}
              onRemove={handleRemoveFromCart}
              onDistribute={handleDistributeRemainingMass}
              onProcess={handleProcess}
              isProgrammer={isProgrammer}
              movementDate={movementDate}
              onMovementDateChange={setMovementDate}
            />
            {/* Insumos debajo del carrito (desktop) */}
            <InsumosConsumidos insumosAggMap={insumosAggMap} />
          </Grid>
        </Grid>
      )}

      {/* FAB + Drawer móvil */}
      {resultado && (
        <>
          <Box sx={{ position: "fixed", right: 16, bottom: 16, display: { xs: "block", md: "none" } }}>
            <Badge color="primary" badgeContent={cart.length} overlap="circular">
              <Fab color="secondary" onClick={() => setCartOpen(true)}>
                <ShoppingCartIcon />
              </Fab>
            </Badge>
          </Box>

          <Drawer
            anchor="right"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            PaperProps={{
              sx: {
                bgcolor: "background.paper",
                width: { xs: "100%", sm: 380 },
                maxWidth: "100vw",
              },
            }}
          >
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  px: 2,
                  py: 1.5,
                  bgcolor: "background.paper",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Carrito
                  </Typography>
                  <IconButton
                    aria-label="Cerrar carrito"
                    size="large"
                    edge="end"
                    onClick={() => setCartOpen(false)}
                  >
                    <CloseIcon />
                  </IconButton>
                </Stack>
              </Box>
              <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
                <CartSummary
                  cart={cart}
                  masaRestante={masaRestante}
                  resultadoEditable={resultado}
                  insumosAggMap={insumosAggMap}
                  onRemove={handleRemoveFromCart}
                  onDistribute={handleDistributeRemainingMass}
                  onProcess={handleProcess}
                  isProgrammer={isProgrammer}
                  movementDate={movementDate}
                  onMovementDateChange={setMovementDate}
                />
                <InsumosConsumidos insumosAggMap={insumosAggMap} />
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  startIcon={<CloseIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => setCartOpen(false)}
                >
                  Cerrar
                </Button>
              </Box>
            </Box>
          </Drawer>
        </>
      )}
    </Box>
  );
}
