import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from "@mui/material";
import { useState, memo } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const fmt = (n, d = 2) =>
  typeof n === "number" && isFinite(n) ? n.toFixed(d) : "0.00";

const BadgeTipo = memo(function BadgeTipo({ type }) {
  const color =
    type === "intermediate" ? "warning" : type === "final" ? "success" : "default";
  return <Chip size="small" color={color} label={type || "producto"} />;
});

function CollapsibleRow({ node, level = 0 }) {
  const [open, setOpen] = useState(false);

  // 👇 incluye directItems y directSubtotal
  const {
    info = {},
    cost = {},
    children = [],
    directItems = [],
    directSubtotal = {},
  } = node;

  // 👇 habilita acordeón si hay hijos o insumos directos
  const hasExpand = (children?.length || 0) > 0 || (directItems?.length || 0) > 0;
  const indent = level * 2;

  return (
    <>
      <TableRow hover>
        <TableCell width={48}>
          {hasExpand ? (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          ) : null}
        </TableCell>

        {/* Nodo */}
        <TableCell sx={{ pl: indent }}>
          <Typography variant="body2" fontWeight={600}>
            {info?.nombre}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, alignItems: "center", flexWrap: "wrap" }}>
            <BadgeTipo type={info?.type} />
            <Chip size="small" variant="outlined" label={`Unidad: ${info?.unidad ?? "-"}`} />
            <Chip
              size="small"
              variant="outlined"
              label={`Mult: ${fmt(Number(info?.mult || 0), info?.unitId === 1 ? 0 : 2)}`}
            />
            {/* (opcional) costo unitario y total del nodo si vienen del backend */}
            {typeof cost?.unitCost === "number" && (
              <Chip size="small" color="primary" variant="outlined"
                label={`Costo unit: $${fmt(cost.unitCost, 6)} ${cost.unitCostLabel || ""}`} />
            )}
            {typeof cost?.totalNodo === "number" && (
              <Chip size="small" color="secondary" variant="outlined"
                label={`Total nodo: $${fmt(cost.totalNodo, 4)}`} />
            )}
          </Box>
        </TableCell>

        {/* Subtotales del nodo (acumula hijos + directos) */}
        <TableCell align="right"><Typography variant="body2">${fmt(cost?.subtotalInsumos)}</Typography></TableCell>
        <TableCell align="right"><Typography variant="body2">${fmt(cost?.subtotalMateriales)}</Typography></TableCell>
        <TableCell align="right"><Typography variant="body2">{fmt(cost?.totalPesoEnMasaGr, 2)} g</Typography></TableCell>
        <TableCell align="right"><Typography variant="body2">{fmt(cost?.totalUnidadesMaterial, 2)}</Typography></TableCell>
      </TableRow>

      {/* Contenido expandible: hijos y/o directItems */}
      {hasExpand && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ p: 1.5, pl: 2 }}>

                {/* Tabla de hijos (intermedios) */}
                {children.length > 0 && (
                  <Table size="small" sx={{ background: "rgba(0,0,0,0.02)", borderRadius: 1, mb: directItems.length ? 1.5 : 0 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell width={48} />
                        <TableCell>Producto / Intermedio</TableCell>
                        <TableCell align="right">Subtotal Insumos</TableCell>
                        <TableCell align="right">Subtotal Materiales</TableCell>
                        <TableCell align="right">Peso total (g)</TableCell>
                        <TableCell align="right">Unidades material</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {children.map((child, idx) => (
                        <CollapsibleRow key={idx} node={child} level={level + 1} />
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Tabla de insumos/materiales directos */}
                {directItems.length > 0 && (
                  <Table size="small" sx={{ background: "rgba(0,0,0,0.02)", borderRadius: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Insumo / Material</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Precio Neto</TableCell>
                        <TableCell align="right">Peso Neto</TableCell>
                        <TableCell align="right">Peso en Receta</TableCell>
                        <TableCell align="right">Precio unit.</TableCell>
                        <TableCell align="right">Valor</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {directItems.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell>{d.nombre}</TableCell>
                          <TableCell>{d.tipo === "material" ? "Material" : "Insumo"}</TableCell>
                          <TableCell align="right">{fmt(d.precioNeto, 2)}</TableCell>
                          <TableCell align="right">{fmt(d.pesoNeto, 2)}</TableCell>
                          <TableCell align="right">
                            {d.unidadBase === "gramos" ? `${fmt(d.pesoEnMasa, 2)} g` : fmt(d.consumo, 2)}
                          </TableCell>
                          <TableCell align="right">
                            {d.unidadBase === "gramos"
                              ? `$${fmt(d.precioUnitBase, 6)}/g`
                              : `$${fmt(d.precioUnitBase, 6)}/u`}
                          </TableCell>
                          <TableCell align="right">${fmt(d.valor, 2)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal tipo Excel */}
                      <TableRow>
                        <TableCell colSpan={4} />
                        <TableCell align="right">
                          <b>{fmt(directSubtotal?.totalPesoEnMasaGr, 2)} g</b>
                        </TableCell>
                        <TableCell align="right"><b>Subtotal:</b></TableCell>
                        <TableCell align="right"><b>${fmt(directSubtotal?.totalValor, 2)}</b></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}

              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CostingAccordionTable({ data }) {
  if (!data || !data.tree) return null;
  const { tree } = data;

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              <TableCell>Producto / Intermedio</TableCell>
              <TableCell align="right">Subtotal Insumos</TableCell>
              <TableCell align="right">Subtotal Materiales</TableCell>
              <TableCell align="right">Peso total (g)</TableCell>
              <TableCell align="right">Unidades material</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <CollapsibleRow node={tree} level={0} />
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
