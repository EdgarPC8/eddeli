import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  LinearProgress,
  Divider,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { money } from "../collections/helpers.js";
import { buildPendingCollectionsBreakdown } from "../finance/pendingCollections.js";

const TABS = [
  { id: "customer", label: "Por cliente", icon: PersonIcon },
  { id: "ungrouped", label: "Sin grupo", icon: ReceiptLongIcon },
  { id: "groups", label: "Grupos abiertos", icon: GroupsIcon },
];

function pct(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export default function ExpectedCollectionsPanel({
  customers = [],
  orders = [],
  groups = [],
  payments = [],
  loading = false,
}) {
  const [tab, setTab] = useState(0);

  const breakdown = useMemo(
    () => buildPendingCollectionsBreakdown({ customers, orders, groups, payments }),
    [customers, orders, groups, payments]
  );

  const currentTab = TABS[tab]?.id || "customer";
  const total = breakdown.total;
  const ungroupedPct = pct(breakdown.ungroupedTotal, total);
  const groupsPct = pct(breakdown.groupsTotal, total);

  return (
    <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
      <CardContent sx={{ px: { xs: 1.5, sm: 2.5 }, py: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={2}
          mb={2}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Detalle del dinero por cobrar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              Desglose de lo pendiente según Cobranzas: ítems sin agrupar y saldos de grupos abiertos
              (después de abonos). Los abonos ya registrados están en ingresos y no se cuentan dos veces.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/inventory/collections"
            variant="contained"
            endIcon={<OpenInNewIcon />}
            sx={{ alignSelf: { xs: "stretch", md: "flex-start" }, whiteSpace: "nowrap" }}
          >
            Ir a Cobranzas
          </Button>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <Chip label={`Total por cobrar: ${money(total)}`} color="warning" />
          <Chip
            label={`Sin grupo: ${money(breakdown.ungroupedTotal)} (${ungroupedPct}%)`}
            variant="outlined"
          />
          <Chip
            label={`En grupos: ${money(breakdown.groupsTotal)} (${groupsPct}%)`}
            variant="outlined"
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Ítems sin grupo
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Grupos abiertos
            </Typography>
          </Stack>
          <Box sx={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", bgcolor: "action.hover" }}>
            <Box sx={{ width: `${ungroupedPct}%`, bgcolor: "warning.main" }} />
            <Box sx={{ width: `${groupsPct}%`, bgcolor: "info.main" }} />
          </Box>
        </Box>

        {total <= 0 ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            No hay dinero pendiente por cobrar. Todo lo registrado en pedidos ya está pagado o agrupado sin saldo.
          </Alert>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
            >
              {TABS.map((t) => (
                <Tab key={t.id} label={t.label} />
              ))}
            </Tabs>

            {currentTab === "customer" && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Sin grupo</TableCell>
                      <TableCell align="right">Grupos</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {breakdown.byCustomer.map((row) => (
                      <TableRow key={row.customerId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.customerName}</TableCell>
                        <TableCell align="right">{money(row.ungrouped)}</TableCell>
                        <TableCell align="right">{money(row.groups)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {money(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {currentTab === "ungrouped" && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Pendiente</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {breakdown.ungroupedItems.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>#{row.orderId}</TableCell>
                        <TableCell>{row.product}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {money(row.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {currentTab === "groups" && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Grupo</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Abonado</TableCell>
                      <TableCell align="right">Pendiente</TableCell>
                      <TableCell align="right">Ítems</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {breakdown.openGroups.map((row) => (
                      <TableRow key={row.groupId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.concept}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            #{row.groupId}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell align="right">{money(row.total)}</TableCell>
                        <TableCell align="right">{money(row.paid)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "warning.dark" }}>
                          {money(row.remaining)}
                        </TableCell>
                        <TableCell align="right">{row.itemsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Tip: en Cobranzas puedes agrupar ítems, registrar abonos parciales y ver el pendiente por cliente.
          Aquí ves el mismo cálculo desde Finanzas.
        </Typography>
      </CardContent>
    </Card>
  );
}
