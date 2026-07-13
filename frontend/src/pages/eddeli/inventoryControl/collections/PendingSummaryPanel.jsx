import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Divider,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { money, moneyUnitPrice, toNum } from "./helpers.js";
import { buildPendingByProduct, buildPendingByDate } from "./summaryBuilders.js";
import { getBillableQty } from "./helpers.js";

const SUB_VIEWS = [
  { id: "orders", label: "Por pedidos" },
  { id: "product", label: "Por producto" },
  { id: "date", label: "Por fecha" },
];

function SummaryTable({ head, rows }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {head.map((h) => (
            <TableCell key={h} sx={{ fontWeight: 800 }}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((cols, i) => (
          <TableRow key={i}>
            {cols.map((c, j) => (
              <TableCell key={j}>{c}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function itemPendingTotal(it) {
  const qty = getBillableQty(it);
  return Number((qty * toNum(it.price)).toFixed(2));
}

export default function PendingSummaryPanel({
  customerId,
  customerItems,
  displayPending,
  onPrepareOrderGroup,
  onAbonarOrderGroup,
}) {
  const [subView, setSubView] = useState(0);

  const byProduct = useMemo(
    () => buildPendingByProduct(customerItems),
    [customerItems]
  );
  const byDate = useMemo(() => buildPendingByDate(customerItems), [customerItems]);

  const byOrders = useMemo(() => {
    const map = new Map();
    for (const it of customerItems || []) {
      if (it.paidAt) continue;
      const oid = it.orderId;
      if (oid == null) continue;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          date: it.orderDate || "",
          items: [],
          ungrouped: [],
          grouped: [],
          total: 0,
          ungroupedTotal: 0,
        });
      }
      const row = map.get(oid);
      const line = itemPendingTotal(it);
      row.items.push(it);
      row.total = Number((row.total + line).toFixed(2));
      const gid = it.itemGroupId ?? it.groupId;
      if (gid) {
        row.grouped.push(it);
      } else {
        row.ungrouped.push(it);
        row.ungroupedTotal = Number((row.ungroupedTotal + line).toFixed(2));
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = String(b.date || "");
      const db = String(a.date || "");
      if (da !== db) return da.localeCompare(db);
      return b.orderId - a.orderId;
    });
  }, [customerItems]);

  const currentView = SUB_VIEWS[subView]?.id || "orders";

  return (
    <Card variant="outlined" sx={{ mb: 2, width: "100%", boxSizing: "border-box" }}>
      <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Resumen pendiente (cobrable)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pendiente real: <b>{money(displayPending)}</b>
              {currentView === "product" && (
                <>
                  {" "}
                  · Cantidad pendiente: <b>{byProduct.grandQty}</b>
                </>
              )}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`Pendiente: ${money(displayPending)}`}
            color="warning"
            variant="outlined"
          />
        </Stack>

        <Tabs
          value={subView}
          onChange={(_, v) => setSubView(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {SUB_VIEWS.map((v) => (
            <Tab key={v.id} label={v.label} />
          ))}
        </Tabs>

        <Divider sx={{ my: 1.5 }} />

        {currentView === "orders" && (
          <Stack spacing={1}>
            {byOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin pedidos con deuda pendiente para este cliente.
              </Typography>
            ) : (
              byOrders.map((ord) => (
                <Accordion key={ord.orderId} variant="outlined" disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ width: "100%", pr: 1 }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography sx={{ fontWeight: 800 }}>Pedido #{ord.orderId}</Typography>
                      {ord.date ? (
                        <Chip size="small" label={ord.date} variant="outlined" />
                      ) : null}
                      <Chip
                        size="small"
                        label={money(ord.total)}
                        color="warning"
                        variant="outlined"
                      />
                      {ord.ungrouped.length > 0 ? (
                        <Chip
                          size="small"
                          label={`${ord.ungrouped.length} sin grupo`}
                          color="info"
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="En grupo(s)" variant="outlined" />
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <SummaryTable
                      head={["Producto", "Cant.", "P/U", "Total", "Estado"]}
                      rows={ord.items.map((it) => [
                        it.product,
                        getBillableQty(it),
                        moneyUnitPrice(it.price),
                        money(itemPendingTotal(it)),
                        it.itemGroupId || it.groupId
                          ? `Grupo #${it.itemGroupId || it.groupId}`
                          : "Sin grupo",
                      ])}
                    />
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ mt: 1.5 }}
                      justifyContent="flex-end"
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!ord.ungrouped.length || !onPrepareOrderGroup}
                        onClick={() =>
                          onPrepareOrderGroup?.({
                            orderId: ord.orderId,
                            itemIds: ord.ungrouped.map((it) => it.id),
                            concept: `Pedido #${ord.orderId}${ord.date ? ` (${ord.date})` : ""}`,
                          })
                        }
                      >
                        Agrupar ítems del pedido
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!onAbonarOrderGroup}
                        onClick={() =>
                          onAbonarOrderGroup?.({
                            orderId: ord.orderId,
                            itemIds: ord.ungrouped.map((it) => it.id),
                            concept: `Pedido #${ord.orderId}${ord.date ? ` (${ord.date})` : ""}`,
                            existingGroupId:
                              ord.ungrouped.length === 0 &&
                              ord.grouped.length > 0 &&
                              new Set(
                                ord.grouped.map((it) => Number(it.itemGroupId || it.groupId))
                              ).size === 1
                                ? Number(
                                    ord.grouped[0].itemGroupId || ord.grouped[0].groupId
                                  )
                                : null,
                          })
                        }
                      >
                        Abonar este pedido
                      </Button>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
            <Typography variant="caption" color="text.secondary">
              Tip: «Abonar este pedido» crea (o usa) un grupo con los ítems del pedido y abre el
              diálogo de abono. Así vinculas el cobro al pedido del cliente.
            </Typography>
          </Stack>
        )}

        {currentView === "product" && (
          <>
            {byProduct.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin deuda pendiente por producto.
              </Typography>
            ) : (
              <SummaryTable
                head={["Producto", "Cant. cobrable", "P/U", "Total"]}
                rows={byProduct.rows.map((r) => [
                  r.product,
                  r.qty,
                  moneyUnitPrice(r.unitPrice),
                  money(r.total),
                ])}
              />
            )}
          </>
        )}

        {currentView === "date" && (
          <>
            {byDate.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin ítems pendientes por fecha.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {byDate.rows.map((day) => (
                  <Accordion key={day.date} variant="outlined" disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%", pr: 1 }}
                        flexWrap="wrap"
                      >
                        <Typography sx={{ fontWeight: 800 }}>{day.date}</Typography>
                        <Chip size="small" label={`Cant. ${day.qty}`} variant="outlined" />
                        <Chip
                          size="small"
                          label={money(day.total)}
                          color="warning"
                          variant="outlined"
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <SummaryTable
                        head={["Producto", "Cant.", "P/U", "Total"]}
                        rows={day.products.map((p) => [
                          p.product,
                          p.qty,
                          moneyUnitPrice(p.unitPrice),
                          money(p.total),
                        ])}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Total pendiente por fechas: {money(byDate.grandTotal)}
                </Typography>
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
