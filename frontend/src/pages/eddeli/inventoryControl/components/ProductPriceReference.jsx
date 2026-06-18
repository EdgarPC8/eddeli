import { Chip, Paper, Stack, Typography } from "@mui/material";

export function formatProductPrice(amount) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

/** Precio por defecto en pedidos a distribuidor/cliente. */
export function getDefaultDistributorPrice(product) {
  if (!product) return 0;
  const dist = Number(product.distributorPrice ?? 0);
  if (dist > 0) return dist;
  return Number(product.price ?? 0);
}

export default function ProductPriceReference({ product, compact = false }) {
  if (!product) return null;

  const supplier = Number(product.supplierPrice ?? 0);
  const distributor = Number(product.distributorPrice ?? 0);
  const retail = Number(product.price ?? 0);

  if (compact) {
    return (
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        <Chip size="small" variant="outlined" label={`Prov. ${formatProductPrice(supplier)}`} />
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`Dist. ${formatProductPrice(distributor)}`}
        />
        <Chip size="small" variant="outlined" label={`Venta ${formatProductPrice(retail)}`} />
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
        Precios del producto
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
      </Stack>
    </Paper>
  );
}
