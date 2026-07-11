/**
 * Skeletons reutilizables para paneles, grids y listas (no tablas).
 * Las tablas (TablePro) usan CircularProgress.
 */
import { Box, Grid, Paper, Skeleton, Stack } from "@mui/material";

/** Panel tipo dashboard / gráfico */
export function PanelSkeleton({ height = 220 }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        minHeight: height,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Skeleton width="42%" height={22} />
        <Skeleton variant="rounded" width={72} height={28} />
      </Stack>
      <Skeleton variant="rounded" width="100%" height={Math.max(80, height - 80)} sx={{ borderRadius: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Skeleton width={64} height={14} />
        <Skeleton width={48} height={14} />
        <Skeleton width={56} height={14} />
      </Stack>
    </Paper>
  );
}

/** Grid de cards (productos, etc.) */
export function CardsGridSkeleton({ count = 8 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Skeleton variant="rounded" height={110} sx={{ borderRadius: 1.5 }} />
            <Skeleton width="80%" height={18} sx={{ mt: 1 }} />
            <Skeleton width="50%" height={14} sx={{ mt: 0.5 }} />
            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
              <Skeleton variant="rounded" width={48} height={22} />
              <Skeleton variant="rounded" width={40} height={22} />
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

/** Lista lateral de ítems (insumos, menús, etc.) */
export function ListSkeleton({ count = 5, itemHeight = 72 }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={itemHeight}
          sx={{ borderRadius: 1.5 }}
        />
      ))}
    </Stack>
  );
}

/** Bloque de página completa centrado */
export function PageSkeleton({ rows = 3, height = 120 }) {
  return (
    <Box sx={{ width: "100%", py: 2 }}>
      <Skeleton width="30%" height={28} sx={{ mb: 2 }} />
      <Stack spacing={1.5}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={height}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>
    </Box>
  );
}

/** Área de gráfico / canvas */
export function ChartSkeleton({ height = 240 }) {
  return (
    <Box sx={{ width: "100%", py: 1 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Skeleton width="35%" height={20} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={64} height={28} />
          <Skeleton variant="rounded" width={64} height={28} />
        </Stack>
      </Stack>
      <Skeleton variant="rounded" width="100%" height={height} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

export default function ContentSkeleton({ variant = "panel", ...props }) {
  switch (variant) {
    case "cards":
      return <CardsGridSkeleton {...props} />;
    case "list":
      return <ListSkeleton {...props} />;
    case "page":
      return <PageSkeleton {...props} />;
    case "chart":
      return <ChartSkeleton {...props} />;
    case "panel":
    default:
      return <PanelSkeleton {...props} />;
  }
}
