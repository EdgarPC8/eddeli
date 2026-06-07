import { Stack, Typography } from '@mui/material';

/**
 * Título + descripción para bloques de gráficos (respeta tema claro/oscuro vía palette.text).
 */
export default function ChartBlockHeader({ title, subtitle, sx }) {
  if (!title && !subtitle) return null;
  return (
    <Stack spacing={0.5} sx={{ mb: 1.25, ...sx }}>
      {title ? (
        <Typography variant="subtitle1" fontWeight={700} color="text.primary" component="h3">
          {title}
        </Typography>
      ) : null}
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}
