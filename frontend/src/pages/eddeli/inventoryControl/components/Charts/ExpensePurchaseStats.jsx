// ExpensePurchaseStats.jsx
import * as React from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack,
} from '@mui/material';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { parseISO, format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v || 0));
const intFmt = (v) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(v || 0));
const dayFmt = (d) => (d && !Number.isNaN(d) ? `${intFmt(d)} días` : '—');
const dateFmt = (iso) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  if (Number.isNaN(d?.getTime?.())) return iso;
  return format(d, "d 'de' MMM yyyy", { locale: es });
};

function median(nums) {
  if (!nums.length) return NaN;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export default function ExpensePurchaseStats({ sampleExpenses = [] }) {
  // 1) Agrupar por producto (referenceId)
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const e of sampleExpenses) {
      if (e?.referenceId == null) continue; // ignora sin producto
      const key = e.referenceId;
      if (!map.has(key)) map.set(key, { productId: key, productName: e.productName || `Producto #${key}`, rows: [] });
      map.get(key).rows.push(e);
    }
    return Array.from(map.values());
  }, [sampleExpenses]);

  // 2) Calcular métricas por grupo
  const stats = React.useMemo(() => {
    const now = new Date();
    const out = [];

    for (const g of groups) {
      const rows = [...g.rows].sort((a, b) => new Date(a.date) - new Date(b.date));
      const purchasesCount = rows.length;
      const totalAmount = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
      const meanAmount = purchasesCount ? totalAmount / purchasesCount : 0;

      const firstDate = rows[0]?.date || null;
      const lastDate = rows[rows.length - 1]?.date || null;

      // Intervalos de compra (días) entre compras consecutivas
      const intervals = [];
      for (let i = 1; i < rows.length; i++) {
        const prev = parseISO(rows[i - 1].date);
        const curr = parseISO(rows[i].date);
        const diff = differenceInCalendarDays(curr, prev);
        if (Number.isFinite(diff)) intervals.push(diff);
      }
      const meanIntervalDays = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : NaN;
      const medianIntervalDays = intervals.length ? median(intervals) : NaN;
      const minIntervalDays = intervals.length ? Math.min(...intervals) : NaN;
      const maxIntervalDays = intervals.length ? Math.max(...intervals) : NaN;

      const daysSinceLastPurchase = lastDate ? differenceInCalendarDays(now, parseISO(lastDate)) : NaN;

      // Frecuencias/montos por mes (normalización simple por rango observado)
      let purchasesPerMonth = NaN;
      let amountPerMonth = NaN;
      if (firstDate && lastDate) {
        const rangeDays = Math.max(1, differenceInCalendarDays(parseISO(lastDate), parseISO(firstDate)) + 1);
        const months = rangeDays / 30.4375; // promedio meses
        purchasesPerMonth = purchasesCount / months;
        amountPerMonth = totalAmount / months;
      }

      out.push({
        productId: g.productId,
        productName: g.productName,
        purchasesCount,
        totalAmount,
        meanAmount,
        firstDate,
        lastDate,
        meanIntervalDays,
        medianIntervalDays,
        minIntervalDays,
        maxIntervalDays,
        daysSinceLastPurchase,
        purchasesPerMonth,
        amountPerMonth,
      });
    }

    // orden sugerido: mayor gasto primero
    out.sort((a, b) => b.totalAmount - a.totalAmount);
    return out;
  }, [groups]);

  // 3) Resumen global (opcional)
  const summary = React.useMemo(() => {
    const totalProducts = stats.length;
    const totalPurchases = stats.reduce((s, r) => s + r.purchasesCount, 0);
    const totalAmount = stats.reduce((s, r) => s + r.totalAmount, 0);
    const avgTicket = totalPurchases ? totalAmount / totalPurchases : 0;
    return { totalProducts, totalPurchases, totalAmount, avgTicket };
  }, [stats]);

  return (
    <Box>
      <ChartBlockHeader
        title="Compras / gastos agregados por producto"
        subtitle="Solo gastos con producto asociado. Intervalos entre compras, ticket medio y ritmo mensual estimado según el historial."
      />
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip label={`Productos: ${intFmt(summary.totalProducts)}`} size="small" />
        <Chip label={`Compras: ${intFmt(summary.totalPurchases)}`} size="small" />
        <Chip label={`Total: ${moneyFmt(summary.totalAmount)}`} color="primary" size="small" />
        <Chip label={`Ticket medio: ${moneyFmt(summary.avgTicket)}`} color="success" size="small" />
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell align="right">Compras</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Media $</TableCell>
            <TableCell align="right">1ra compra</TableCell>
            <TableCell align="right">Última compra</TableCell>
            <TableCell align="right">Δ Promedio</TableCell>
            <TableCell align="right">Δ Mediana</TableCell>
            <TableCell align="right">Δ Min</TableCell>
            <TableCell align="right">Δ Max</TableCell>
            <TableCell align="right">Desde última</TableCell>
            <TableCell align="right">Compras/mes</TableCell>
            <TableCell align="right">$ / mes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((r) => (
            <TableRow key={r.productId} hover>
              <TableCell>{r.productName}</TableCell>
              <TableCell align="right">{intFmt(r.purchasesCount)}</TableCell>
              <TableCell align="right">{moneyFmt(r.totalAmount)}</TableCell>
              <TableCell align="right">{moneyFmt(r.meanAmount)}</TableCell>
              <TableCell align="right">{dateFmt(r.firstDate)}</TableCell>
              <TableCell align="right">{dateFmt(r.lastDate)}</TableCell>
              <TableCell align="right">{dayFmt(r.meanIntervalDays)}</TableCell>
              <TableCell align="right">{dayFmt(r.medianIntervalDays)}</TableCell>
              <TableCell align="right">{dayFmt(r.minIntervalDays)}</TableCell>
              <TableCell align="right">{dayFmt(r.maxIntervalDays)}</TableCell>
              <TableCell align="right">{dayFmt(r.daysSinceLastPurchase)}</TableCell>
              <TableCell align="right">{r.purchasesPerMonth ? r.purchasesPerMonth.toFixed(2) : '—'}</TableCell>
              <TableCell align="right">{Number.isFinite(r.amountPerMonth) ? moneyFmt(r.amountPerMonth) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {stats.length === 0 && (
        <Box sx={{ mt: 2, color: 'text.secondary' }}>
          No hay compras con <b>referenceId</b> para calcular estadísticas.
        </Box>
      )}
    </Box>
  );
}
