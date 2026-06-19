import { Box, Typography, Skeleton, useTheme } from '@mui/material';

function gaugeMetrics(product) {
  const stock = Number(product?.stock ?? 0);
  const min = Math.max(Number(product?.minStock ?? 0), 0.001);
  const max = Math.max(min * 5, stock * 1.25, min + 1);
  return {
    stock,
    min,
    max,
    criticalEnd: min,
    warningEnd: min * 2,
    goodEnd: min * 3,
  };
}

/** 0 a la izquierda, máximo a la derecha (arco superior). */
function valueToAngle(value, max) {
  const ratio = Math.min(Math.max(value / max, 0), 1);
  return Math.PI * (1 - ratio);
}

function pointOnArc(cx, cy, radius, value, max) {
  const angle = valueToAngle(value, max);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

/** Segmento de anillo (arco relleno y redondeado en los extremos). */
function ringSegment(cx, cy, rInner, rOuter, v0, v1, max) {
  if (v1 <= v0) return '';
  const p0out = pointOnArc(cx, cy, rOuter, v0, max);
  const p1out = pointOnArc(cx, cy, rOuter, v1, max);
  const p1in = pointOnArc(cx, cy, rInner, v1, max);
  const p0in = pointOnArc(cx, cy, rInner, v0, max);
  return [
    `M ${p0out.x} ${p0out.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p1out.x} ${p1out.y}`,
    `L ${p1in.x} ${p1in.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${p0in.x} ${p0in.y}`,
    'Z',
  ].join(' ');
}

function stockStatus(stock, min) {
  if (stock <= 0) return 'critical';
  if (stock <= min) return 'warning';
  if (stock <= min * 2) return 'caution';
  return 'good';
}

const STATUS_LABEL = {
  critical: 'Crítico',
  warning: 'Por agotarse',
  caution: 'Bajo',
  good: 'Adecuado',
};

export function getStockStatus(product) {
  const { stock, min } = gaugeMetrics(product);
  return stockStatus(stock, min);
}

export default function StockGauge({ product, compact = false }) {
  const theme = useTheme();
  const { stock, min, max, criticalEnd, warningEnd, goodEnd } = gaugeMetrics(product);
  const status = stockStatus(stock, min);

  const cx = 100;
  const cy = 108;
  const rOuter = compact ? 76 : 80;
  const rInner = compact ? 58 : 62;

  const zoneColor = {
    critical: theme.palette.error.main,
    warning: theme.palette.warning.main,
    good: theme.palette.success.main,
    muted: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  };

  const zones = [
    { from: 0, to: criticalEnd, color: zoneColor.critical },
    { from: criticalEnd, to: warningEnd, color: zoneColor.warning },
    { from: warningEnd, to: goodEnd, color: zoneColor.good },
    { from: goodEnd, to: max, color: zoneColor.muted },
  ];

  const needleEnd = pointOnArc(cx, cy, (rInner + rOuter) / 2, stock, max);
  const allTicks = [
    { value: 0, label: '0' },
    { value: criticalEnd, label: formatTick(criticalEnd) },
    { value: warningEnd, label: formatTick(warningEnd) },
    { value: goodEnd, label: formatTick(goodEnd) },
    { value: max, label: formatTick(max) },
  ];
  const ticks = compact
    ? [
        { value: 0, label: '0' },
        { value: criticalEnd, label: formatTick(criticalEnd) },
        { value: max, label: formatTick(max) },
      ]
    : allTicks;

  const title = compact
    ? truncateName(product?.name, 14)
    : `${product?.name} (Stock: ${formatTick(stock)})`;

  const statusColor =
    status === 'critical'
      ? theme.palette.error.main
      : status === 'warning' || status === 'caution'
        ? theme.palette.warning.main
        : theme.palette.success.main;

  return (
    <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.primary"
        sx={{
          display: 'block',
          mb: 0.25,
          px: 0.25,
          lineHeight: 1.2,
          fontSize: compact ? '0.65rem' : undefined,
        }}
        noWrap
        title={`${product?.name} (Stock: ${stock})`}
      >
        {title}
        {compact ? ` · ${formatTick(stock)}` : ''}
      </Typography>

      <Box
        component="svg"
        viewBox="0 0 200 124"
        sx={{
          width: '100%',
          maxWidth: compact ? 132 : 270,
          mx: 'auto',
          display: 'block',
        }}
        aria-label={`Stock ${stock} de ${product?.name}`}
      >
        {/* Pista de fondo completa */}
        <path
          d={ringSegment(cx, cy, rInner, rOuter, 0, max, max)}
          fill={zoneColor.muted}
        />

        {zones.map((z) => {
          if (z.to <= z.from) return null;
          return (
            <path
              key={`${z.from}-${z.to}`}
              d={ringSegment(cx, cy, rInner, rOuter, z.from, z.to, max)}
              fill={z.color}
            />
          );
        })}

        {ticks.map((t) => {
          const p = pointOnArc(cx, cy, rOuter + (compact ? 4 : 6), t.value, max);
          const lp = pointOnArc(cx, cy, rOuter + (compact ? 10 : 14), t.value, max);
          const anchor = t.value <= max * 0.15 ? 'start' : t.value >= max * 0.85 ? 'end' : 'middle';
          return (
            <g key={t.value}>
              {!compact && (
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={lp.x}
                  y2={lp.y}
                  stroke={theme.palette.text.disabled}
                  strokeWidth={1}
                />
              )}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={compact ? 7 : 9}
                fill={theme.palette.text.secondary}
              >
                {t.label}
              </text>
            </g>
          );
        })}

        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={theme.palette.text.primary}
          strokeWidth={compact ? 2 : 2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={compact ? 4 : 5} fill={theme.palette.text.primary} />
        <circle cx={cx} cy={cy} r={compact ? 2 : 2.5} fill={theme.palette.background.paper} />
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: statusColor,
          fontWeight: 600,
          fontSize: compact ? '0.6rem' : undefined,
          lineHeight: 1.2,
        }}
      >
        {compact ? formatTick(min) : `${STATUS_LABEL[status]} · mín. ${formatTick(min)}`}
      </Typography>
    </Box>
  );
}

function formatTick(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toFixed(1);
}

function truncateName(name, max = 14) {
  const s = String(name || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Placeholder cuando no hay producto para llenar el slot del grid 4×2. */
export function StockGaugeSkeleton({ compact = true }) {
  const arcW = compact ? 100 : 120;
  const arcH = compact ? 52 : 58;
  return (
    <Box sx={{ textAlign: 'center', minWidth: 0, width: '100%', py: 0.25 }}>
      <Skeleton
        variant="text"
        width="72%"
        height={compact ? 14 : 18}
        sx={{ mx: 'auto', mb: 0.35, borderRadius: 1 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.35 }}>
        <Skeleton
          variant="rounded"
          width={arcW}
          height={arcH}
          sx={{
            borderRadius: `${arcW}px ${arcW}px 4px 4px`,
            opacity: 0.35,
          }}
        />
      </Box>
      <Skeleton
        variant="text"
        width="40%"
        height={compact ? 12 : 14}
        sx={{ mx: 'auto', borderRadius: 1 }}
      />
    </Box>
  );
}
