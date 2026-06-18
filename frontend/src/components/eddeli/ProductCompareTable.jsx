import React from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  useTheme,
  alpha,
  Divider,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import BakeryDiningIcon from "@mui/icons-material/BakeryDining";

const currency = (n) => `$${Number(n || 0).toFixed(2)}`;

const cellKey = (rowKey, columnKey) => `${rowKey}||${columnKey}`;

/**
 * Tabla comparativa de precios para un grupo (ej. pasteles vainilla/chocolate).
 * embedded=true → para modal (sin cabecera duplicada).
 */
export default function ProductCompareTable({
  group,
  onSelectProduct,
  imageSrc,
  embedded = false,
}) {
  const theme = useTheme();
  if (!group) return null;

  const variants = Array.isArray(group.variants) ? group.variants : [];
  const fillings = Array.isArray(group.fillings) ? group.fillings : [];

  const handleCellClick = (product) => {
    if (product && onSelectProduct) onSelectProduct(product, group);
  };

  const tableContent = (
    <Box sx={{ p: embedded ? 0 : { xs: 1, sm: 2 } }}>
      {variants.map((variant, vIdx) => (
        <Box key={variant.key || vIdx} sx={{ mb: vIdx < variants.length - 1 ? 2.5 : 0 }}>
          {variants.length > 1 && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <BakeryDiningIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={800}>
                {group.variantLabel || "Sabor"}: {variant.key}
              </Typography>
            </Stack>
          )}

          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 280 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>
                    {group.rowLabel || "Tamaño"}
                  </TableCell>
                  {(variant.columns || []).map((col) => (
                    <TableCell key={col.key} align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                      {col.key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(variant.rows || []).map((row) => (
                  <TableRow key={row.key} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {row.key}
                      </Typography>
                      {row.meta && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.meta}
                        </Typography>
                      )}
                    </TableCell>
                    {(variant.columns || []).map((col) => {
                      const cell = variant.cells?.[cellKey(row.key, col.key)];
                      const product = cell?.product;
                      return (
                        <TableCell key={col.key} align="center">
                          {product ? (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleCellClick(product)}
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                minWidth: 72,
                                color: "primary.main",
                              }}
                            >
                              {product.displayPrice || currency(product.price)}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      {fillings.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Rellenos disponibles (sin costo adicional)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {fillings.map((f, i) => (
              <Chip
                key={f.name || i}
                label={f.name}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: f.color ? alpha(f.color, 0.15) : undefined,
                  borderColor: f.color || undefined,
                  border: f.color ? `1px solid ${alpha(f.color, 0.4)}` : undefined,
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );

  if (embedded) return tableContent;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        borderColor: alpha(theme.palette.primary.main, 0.25),
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.warning.main, 0.08)} 100%)`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            {group.name}
          </Typography>
          {group.subtitle && (
            <Typography variant="body2" color="text.secondary">
              — {group.subtitle}
            </Typography>
          )}
        </Stack>
        {group.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {group.description}
          </Typography>
        )}
      </Box>

      {imageSrc && (
        <Box
          component="img"
          src={imageSrc}
          alt={group.name}
          sx={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
        />
      )}

      {tableContent}
    </Paper>
  );
}
