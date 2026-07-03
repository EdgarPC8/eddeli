import { Chip, Paper, Stack, Typography } from "@mui/material";

export function formatProductPrice(amount) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

/**
 * Precio UNITARIO con hasta 3 decimales (ej. $0.125).
 * Los totales de dinero se siguen mostrando con 2 decimales (formatProductPrice),
 * pero el precio por unidad admite 3 decimales para que la multiplicación cuadre
 * (10 × $0.125 = $1.25).
 */
export function formatUnitPrice(amount) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(Number(amount || 0));
}

/** Precio por defecto en pedidos a distribuidor/cliente. */
export function getDefaultDistributorPrice(product) {
  if (!product) return 0;
  const dist = Number(product.distributorPrice ?? 0);
  if (dist > 0) return dist;
  return Number(product.price ?? 0);
}

export function getProductUnitLabel(product) {
  const unit = product?.ERP_inventory_unit;
  return unit?.abbreviation || unit?.name || "u.";
}

export function formatOrderLineTotal(quantity, unitPrice) {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
}

export function OrderLineSummary({ quantity, unitPrice, unitLabel, sx }) {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null;
  const unit = unitLabel || "u.";
  const total = formatOrderLineTotal(qty, price);
  return (
    <Typography variant="body2" fontWeight={600} color="primary.main" sx={sx}>
      {qty} {unit} × {formatUnitPrice(price)} = {formatProductPrice(total)}
    </Typography>
  );
}

export default function ProductPriceReference({
  product,
  compact = false,
  quantity,
  unitPrice,
}) {
  if (!product) return null;

  const supplier = Number(product.supplierPrice ?? 0);
  const distributor = Number(product.distributorPrice ?? 0);
  const retail = Number(product.price ?? 0);
  const unitLabel = getProductUnitLabel(product);
  const lineSummary = (
    <OrderLineSummary
      quantity={quantity}
      unitPrice={unitPrice}
      unitLabel={unitLabel}
      sx={{ mt: compact ? 0.75 : 1 }}
    />
  );

  if (compact) {
    return (
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" label={`Prov. ${formatProductPrice(supplier)}/${unitLabel}`} />
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`Dist. ${formatProductPrice(distributor)}/${unitLabel}`}
          />
          <Chip size="small" variant="outlined" label={`Venta ${formatProductPrice(retail)}/${unitLabel}`} />
        </Stack>
        {lineSummary}
      </Stack>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Precios del producto (por {unitLabel})
      </Typography>
      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Proveedor
          </Typography>
          <Typography variant="body2">{formatProductPrice(supplier)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={600}>
            Distribuidor
          </Typography>
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {formatProductPrice(distributor)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Venta final
          </Typography>
          <Typography variant="body2">{formatProductPrice(retail)}</Typography>
        </Stack>
        {lineSummary}
      </Stack>
    </Paper>
  );
}
