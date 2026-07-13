/**
 * Mesa de trabajo de Cobranzas por ítems.
 * Orquesta: helpers, reportBuilders, ItemsTable, CollectionsDialogs.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tabs,
  Tab,
  useMediaQuery,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getFinanceWorkbenchAllRequest,
  createItemGroupRequest,
  addItemsToGroupRequest,
  payItemGroupRequest,
  moveItemBetweenGroupsRequest,
  updateItemGroupRequest,
  updateOrderItemRequest,
  updateGroupPaymentRequest,
  deleteGroupPaymentRequest,
} from "../../../../api/ordersRequest";
import { useAuth } from "../../../../context/AuthContext";
import {
  safeFileName,
  downloadTextFile,
  money,
  todayISO,
  nowLocalDateTime,
  toLocalDateTimeInput,
  sum,
  dayLabel,
  getItemGroupId,
  toNum,
  getBillableQty,
  sameGroupId,
} from "./helpers.js";
import { formatDateTime } from "../../../../helpers/functions.js";
import { buildReportTxtByProduct } from "./reportBuilders.js";
import ItemsTable from "./ItemsTable.jsx";
import CollectionsDialogs from "./CollectionsDialogs.jsx";
import PendingSummaryPanel from "./PendingSummaryPanel.jsx";
import DebtReportDialog from "./DebtReportDialog.jsx";

export default function CollectionsWorkbench() {
  const isMobile = useMediaQuery("(max-width:900px)");
  const { user, toast: toastAuth } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uiMsg, setUiMsg] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedPaidItemIds, setSelectedPaidItemIds] = useState([]);
  const [tab, setTab] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("pending");
  const [groupConcept, setGroupConcept] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(nowLocalDateTime());
  const [payNote, setPayNote] = useState("Abono");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [editMode, setEditMode] = useState({});
  const [editFields, setEditFields] = useState({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState(null);
  const [moveToGroupId, setMoveToGroupId] = useState("");
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [groupEditConcept, setGroupEditConcept] = useState("");
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [addItemsSelectedIds, setAddItemsSelectedIds] = useState([]);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState(nowLocalDateTime());
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("efectivo");
  const [debtReportOpen, setDebtReportOpen] = useState(false);

  const loadWorkbench = async (keepSelection = true) => {
    try {
      setLoading(true);
      setUiMsg(null);
      const res = await getFinanceWorkbenchAllRequest();
      const data = res?.data || {};
      const nextCustomers = Array.isArray(data.customers) ? data.customers : [];
      const nextOrders = Array.isArray(data.orders) ? data.orders : [];
      const nextGroups = Array.isArray(data.groups) ? data.groups : [];
      const nextPayments = Array.isArray(data.payments) ? data.payments : [];
      setCustomers(nextCustomers);
      setOrders(nextOrders);
      setGroups(nextGroups);
      setPayments(nextPayments);
      if (!keepSelection || !selectedCustomerId) {
        setSelectedCustomerId(nextCustomers[0]?.id ?? null);
        setSelectedGroupId(null);
        setSelectedItemIds([]);
        setSelectedPaidItemIds([]);
        setEditMode({});
        setEditFields({});
        return;
      }
      const stillExists = nextCustomers.some((c) => c.id === selectedCustomerId);
      if (!stillExists) {
        setSelectedCustomerId(nextCustomers[0]?.id ?? null);
        setSelectedGroupId(null);
        setSelectedItemIds([]);
        setSelectedPaidItemIds([]);
        setEditMode({});
        setEditFields({});
      }
    } catch (err) {
      console.error("loadWorkbench:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error cargando cobranzas",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkbench(false);
  }, []);

  const customer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  /** Deuda pendiente por cliente (saldo de grupos abiertos + ítems sin pagar no agrupados) - igual que backend. */
  const totalCobrableByCustomer = useMemo(() => {
    const map = {};
    
    // Mapa: orderItemId -> groupId
    const groupIdByItemId = new Map();
    for (const o of orders) {
      const itemsArr = Array.isArray(o.items) ? o.items : [];
      for (const it of itemsArr) {
        const raw = getItemGroupId(it);
        if (raw == null || raw === "__grouped__") continue;
        const gid = Number(raw);
        if (!Number.isFinite(gid)) continue;
        groupIdByItemId.set(it.id, gid);
      }
    }
    
    // Mapa: groupId -> [orderItemId]
    const itemsByGroupId = new Map();
    for (const [itemId, groupId] of groupIdByItemId.entries()) {
      if (!itemsByGroupId.has(groupId)) itemsByGroupId.set(groupId, []);
      itemsByGroupId.get(groupId).push(itemId);
    }
    
    // Mapa: groupId -> total abonado
    const paidByGroupId = new Map();
    for (const p of payments) {
      if (p.status !== "completed") continue;
      const pg = Number(p.groupId);
      if (!Number.isFinite(pg)) continue;
      paidByGroupId.set(
        pg,
        Number(((paidByGroupId.get(pg) || 0) + toNum(p.amount)).toFixed(2))
      );
    }
    
    // (a) Saldo pendiente de grupos abiertos (total - abonado)
    for (const g of groups) {
      if (g.status !== "open") continue;
      
      // Calcular total del grupo
      const itemIds = itemsByGroupId.get(Number(g.id)) || [];
      let groupTotalCalc = 0;
      for (const o of orders) {
        const itemsArr = Array.isArray(o.items) ? o.items : [];
        for (const it of itemsArr) {
          if (!itemIds.includes(it.id)) continue;
          const qty = getBillableQty({
            ...it,
            qty: it.qty ?? it.quantity ?? 0,
            damagedQty: it.damagedQty ?? 0,
            giftQty: it.giftQty ?? 0,
          });
          const price = toNum(it.price, 0);
          groupTotalCalc = Number((groupTotalCalc + qty * price).toFixed(2));
        }
      }
      
      const groupPaidAmount = paidByGroupId.get(Number(g.id)) || 0;
      const remaining = Number(Math.max(0, groupTotalCalc - groupPaidAmount).toFixed(2));
      if (remaining <= 0) continue;
      
      map[g.customerId] = Number(((map[g.customerId] || 0) + remaining).toFixed(2));
    }
    
    // (b) Ítems sin pagar y no agrupados
    for (const c of customers) {
      const custOrders = orders.filter((o) => o.customerId === c.id);
      let ungroupedPending = 0;
      
      for (const o of custOrders) {
        const items = Array.isArray(o.items) ? o.items : [];
        for (const it of items) {
          if (it.paidAt) continue;
          // Si está en grupo, ya se contó arriba (saldo del grupo)
          if (getItemGroupId(it)) continue;
          
          const qty = getBillableQty({
            ...it,
            qty: it.qty ?? it.quantity ?? 0,
            damagedQty: it.damagedQty ?? 0,
            giftQty: it.giftQty ?? 0,
          });
          const price = toNum(it.price, 0);
          const line = Number((qty * price).toFixed(2));
          ungroupedPending = Number((ungroupedPending + line).toFixed(2));
        }
      }
      
      if (ungroupedPending > 0) {
        map[c.id] = Number(((map[c.id] || 0) + ungroupedPending).toFixed(2));
      }
    }
    
    // Asegurar que todos los clientes tengan un valor (aunque sea 0)
    for (const c of customers) {
      if (!(c.id in map)) map[c.id] = 0;
    }
    
    return map;
  }, [customers, orders, groups, payments]);

  /** Clientes con deuda pendiente (> 0), ordenados de mayor a menor. */
  const customersWithDebt = useMemo(
    () =>
      [...customers]
        .filter((c) => Number(totalCobrableByCustomer[c.id] ?? 0) > 0)
        .sort(
          (a, b) =>
            (totalCobrableByCustomer[b.id] ?? 0) - (totalCobrableByCustomer[a.id] ?? 0)
        ),
    [customers, totalCobrableByCustomer]
  );

  const customerOrders = useMemo(
    () => orders.filter((o) => o.customerId === selectedCustomerId),
    [orders, selectedCustomerId]
  );
  const customerItems = useMemo(() => {
    const out = [];
    for (const o of customerOrders) {
      const itemsArr = Array.isArray(o.items) ? o.items : [];
      for (const it of itemsArr) {
        out.push({
          ...it,
          orderId: o.id,
          orderDate: o.date,
          qty: it.qty ?? it.quantity ?? 0,
          price: it.price ?? 0,
          product: it.product ?? it.productName ?? it.name ?? "(sin nombre)",
          damagedQty: it.damagedQty ?? 0,
          giftQty: it.giftQty ?? 0,
          replacedQty: it.replacedQty ?? 0,
        });
      }
    }
    return out;
  }, [customerOrders]);

  const itemsUngrouped = useMemo(
    () => customerItems.filter((it) => !it.paidAt && !getItemGroupId(it)),
    [customerItems]
  );
  const itemsPaidUngrouped = useMemo(
    () => customerItems.filter((it) => !!it.paidAt && !getItemGroupId(it)),
    [customerItems]
  );
  const customerGroups = useMemo(
    () => groups.filter((g) => g.customerId === selectedCustomerId),
    [groups, selectedCustomerId]
  );
  const itemsByGroup = useMemo(() => {
    const map = new Map();
    for (const it of customerItems) {
      const gid = Number(it?.itemGroupId ?? it?.groupId);
      if (!Number.isFinite(gid)) continue;
      if (!map.has(gid)) map.set(gid, []);
      map.get(gid).push(it);
    }
    for (const [gid, arr] of map.entries()) {
      map.set(
        gid,
        arr.slice().sort(
          (a, b) =>
            a.orderId - b.orderId ||
            String(a.product).localeCompare(String(b.product), "es")
        )
      );
    }
    return map;
  }, [customerItems]);

  const itemLineTotal = (it) =>
    Number((getBillableQty(it) * toNum(it.price, 0)).toFixed(2));
  const groupTotal = (groupId) => {
    const arr = itemsByGroup.get(groupId) || [];
    return Number(sum(arr, (it) => itemLineTotal(it)).toFixed(2));
  };
  const groupPaid = (groupId) => {
    const arr = payments.filter(
      (p) => sameGroupId(p.groupId, groupId) && p.status === "completed"
    );
    return Number(sum(arr, (p) => p.amount).toFixed(2));
  };
  const groupRemaining = (groupId) => {
    const rem = groupTotal(groupId) - groupPaid(groupId);
    return Number(Math.max(0, rem).toFixed(2));
  };
  const groupStatus = (groupId) => {
    const total = groupTotal(groupId);
    const paid = groupPaid(groupId);
    if (total <= 0) return "empty";
    if (paid <= 0) return "pending";
    if (paid >= total - 0.0001) return "paid";
    return "partial";
  };

  const selectedGroup = useMemo(
    () => (selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null),
    [groups, selectedGroupId]
  );
  const selectedGroupItems = useMemo(
    () => (selectedGroupId ? itemsByGroup.get(selectedGroupId) || [] : []),
    [itemsByGroup, selectedGroupId]
  );
  const selectedGroupPayments = useMemo(
    () =>
      payments.filter(
        (p) => selectedGroupId != null && sameGroupId(p.groupId, selectedGroupId)
      ),
    [payments, selectedGroupId]
  );
  const selectedItemsTotal = useMemo(() => {
    const selected = itemsUngrouped.filter((it) => selectedItemIds.includes(it.id));
    return Number(sum(selected, (it) => itemLineTotal(it)).toFixed(2));
  }, [itemsUngrouped, selectedItemIds]);
  const selectedPaidItemsTotal = useMemo(() => {
    const selected = itemsPaidUngrouped.filter((it) =>
      selectedPaidItemIds.includes(it.id)
    );
    return Number(sum(selected, (it) => itemLineTotal(it)).toFixed(2));
  }, [itemsPaidUngrouped, selectedPaidItemIds]);

  const displayPending = Number((totalCobrableByCustomer[selectedCustomerId] ?? 0).toFixed(2));

  const prepareOrderGroup = ({ itemIds, concept }) => {
    if (!itemIds?.length) {
      setUiMsg({
        type: "info",
        text: "Ese pedido no tiene ítems pendientes sin grupo. Revisa el grupo existente en la pestaña Grupos.",
      });
      setTab(2);
      return;
    }
    setSelectedItemIds(itemIds);
    setCreateMode("pending");
    setGroupConcept(concept || `Grupo de ${customer?.name || ""} (${todayISO()})`.trim());
    setCreateOpen(true);
    setTab(0);
  };

  const abonarOrderGroup = async ({ itemIds, concept, existingGroupId }) => {
    try {
      setUiMsg(null);
      if (existingGroupId) {
        setSelectedGroupId(existingGroupId);
        setTab(3);
        const rem = groupRemaining(existingGroupId);
        setPayAmount(rem > 0 ? String(rem) : "");
        setPayDate(nowLocalDateTime());
        setPayNote(
          rem > 0
            ? `Abono al grupo del pedido (saldo ${money(rem)})`
            : "Abono"
        );
        setPayMethod("efectivo");
        setPayOpen(true);
        return;
      }
      if (!itemIds?.length) {
        setUiMsg({
          type: "warning",
          text: "No hay ítems sin grupo en este pedido. Si ya están agrupados en varios grupos, abona desde la pestaña Grupos.",
        });
        setTab(2);
        return;
      }
      if (!selectedCustomerId) return;
      setLoading(true);
      const res = await createItemGroupRequest({
        customerId: selectedCustomerId,
        itemIds,
        concept: concept || "Pedido",
      });
      const createdId = res?.data?.grupo?.id ?? res?.data?.groupId ?? res?.data?.id ?? null;
      await loadWorkbench(true);
      if (createdId) {
        setSelectedGroupId(createdId);
        setTab(3);
        setUiMsg({
          type: "success",
          text: "Grupo del pedido creado. Registra el abono del cliente.",
        });
        const totalHint = Number(res?.data?.grupo?.totalAmount ?? res?.data?.totalAmount ?? 0);
        setPayAmount(totalHint > 0 ? String(totalHint) : "");
        setPayDate(nowLocalDateTime());
        setPayMethod("efectivo");
        setPayNote(`Abono vinculado a ${concept || "pedido"}`);
        setPayOpen(true);
      }
    } catch (err) {
      console.error("abonarOrderGroup:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error al preparar abono del pedido",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
    );
  };
  const toggleSelectPaidItem = (itemId) => {
    setSelectedPaidItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
    );
  };
  const resetOnCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    setSelectedGroupId(null);
    setSelectedItemIds([]);
    setSelectedPaidItemIds([]);
    setUiMsg(null);
    setTab(0);
    setEditMode({});
    setEditFields({});
  };
  const openCreateGroup = (mode) => {
    setUiMsg(null);
    setCreateMode(mode);
    setGroupConcept(
      mode === "paid"
        ? `Grupo HISTÓRICO de ${customer?.name || ""} (${todayISO()})`.trim()
        : `Grupo de ${customer?.name || ""} (${todayISO()})`.trim()
    );
    setCreateOpen(true);
  };

  const createGroup = async () => {
    try {
      if (!selectedCustomerId) {
        setUiMsg({ type: "error", text: "Selecciona un cliente." });
        return;
      }
      const selectedIds = createMode === "paid" ? selectedPaidItemIds : selectedItemIds;
      if (selectedIds.length === 0) {
        setUiMsg({ type: "error", text: "Selecciona al menos un ítem." });
        return;
      }
      const badGrouped = customerItems.find(
        (it) => selectedIds.includes(it.id) && getItemGroupId(it)
      );
      if (badGrouped) {
        setUiMsg({ type: "error", text: `El ítem #${badGrouped.id} ya está en un grupo.` });
        return;
      }
      if (createMode === "pending") {
        const paidBad = customerItems.find((it) => selectedIds.includes(it.id) && it.paidAt);
        if (paidBad) {
          setUiMsg({ type: "error", text: `El ítem #${paidBad.id} ya está pagado.` });
          return;
        }
      } else {
        const notPaidBad = customerItems.find((it) => selectedIds.includes(it.id) && !it.paidAt);
        if (notPaidBad) {
          setUiMsg({ type: "error", text: `El ítem #${notPaidBad.id} NO está pagado.` });
          return;
        }
      }
      setLoading(true);
      setUiMsg(null);
      const res = await createItemGroupRequest({
        customerId: selectedCustomerId,
        itemIds: selectedIds,
        concept: groupConcept,
      });
      const createdId = res?.data?.grupo?.id ?? res?.data?.groupId ?? res?.data?.id ?? null;
      await loadWorkbench(true);
      setCreateOpen(false);
      setSelectedItemIds([]);
      setSelectedPaidItemIds([]);
      if (createdId) {
        setSelectedGroupId(createdId);
        setTab(3);
      }
      setUiMsg({
        type: "success",
        text:
          createMode === "paid"
            ? "Grupo HISTÓRICO creado ✅"
            : "Grupo creado ✅ Ahora puedes registrar abonos.",
      });
    } catch (err) {
      console.error("createGroup:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error creando grupo",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildSuggestedPayNote = (amount, groupId) => {
    const rem = groupRemaining(groupId);
    const grp = customerGroups.find((g) => g.id === groupId);
    const cliente = customer?.name || "Cliente";
    const grupo = grp?.concept || `Grupo #${groupId}`;
    const amt = Number(amount);
    if (Number.isFinite(amt) && amt > 0 && Math.abs(amt - rem) < 0.0001) {
      return `Liquidación total: ${cliente} canceló por completo el grupo «${grupo}» (abono $${amt.toFixed(2)}, saldo $0.00)`;
    }
    if (Number.isFinite(amt) && amt > 0) {
      const pendiente = Number(Math.max(0, rem - amt).toFixed(2));
      return `Abono parcial: ${cliente} | grupo «${grupo}» | $${amt.toFixed(2)} | pendiente $${pendiente.toFixed(2)}`;
    }
    return "Abono";
  };

  const openPay = () => {
    if (!selectedGroupId) return;
    setUiMsg(null);
    const rem = groupRemaining(selectedGroupId);
    setPayAmount(rem > 0 ? String(rem) : "");
    setPayDate(nowLocalDateTime());
    setPayNote(buildSuggestedPayNote(rem, selectedGroupId));
    setPayMethod("efectivo");
    setPayOpen(true);
  };
  const confirmPay = async () => {
    try {
      if (!selectedGroupId) return;
      const amt = Number(payAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setUiMsg({ type: "error", text: "Monto inválido." });
        return;
      }
      const rem = groupRemaining(selectedGroupId);
      if (amt > rem + 0.0001) {
        setUiMsg({ type: "error", text: `El abono excede el saldo. Saldo: ${money(rem)}` });
        return;
      }
      setLoading(true);
      setUiMsg(null);
      const suggested = buildSuggestedPayNote(amt, selectedGroupId);
      const noteToSend =
        !payNote ||
        String(payNote).trim() === "" ||
        String(payNote).trim() === suggested ||
        String(payNote).trim().toLowerCase().startsWith("abono parcial:") ||
        String(payNote).trim().toLowerCase().startsWith("liquidación total:") ||
        String(payNote).trim().toLowerCase().startsWith("liquidacion total:")
          ? "Abono"
          : String(payNote).trim();
      const res = await payItemGroupRequest(selectedGroupId, {
        amount: amt,
        date: payDate,
        note: noteToSend,
        method: payMethod,
      });
      const closed = !!res?.data?.closed;
      await loadWorkbench(true);
      setPayOpen(false);
      setUiMsg({
        type: "success",
        text: closed
          ? `Grupo liquidado ✅ ${res?.data?.pago?.note || "El cliente saldó todo el saldo pendiente."}`
          : `Abono registrado ✅ ${res?.data?.pago?.note || ""}`.trim(),
      });
    } catch (err) {
      console.error("confirmPay:", err);
      setUiMsg({
        type: "error",
        text: err?.response?.data?.message || "Error registrando abono",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEditItem = (item) => {
    const itemId = item.id;
    setEditMode((prev) => {
      const next = !prev[itemId];
      if (next) {
        setEditFields((fprev) => ({
          ...fprev,
          [itemId]: {
            qty: String(item.qty ?? ""),
            price: String(item.price ?? ""),
            damagedQty: String(item.damagedQty ?? 0),
            giftQty: String(item.giftQty ?? 0),
            replacedQty: String(item.replacedQty ?? 0),
          },
        }));
      }
      return { ...prev, [itemId]: next };
    });
  };
  const setItemField = (itemId, field, value) => {
    setEditFields((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };
  const confirmEditItem = async (item) => {
    const itemId = item.id;
    const f = editFields[itemId] || {};
    const qty = Math.max(0, Number(f.qty));
    const price = Math.max(0, Number(f.price));
    const damagedQty = Math.max(0, Number(f.damagedQty));
    const giftQty = Math.max(0, Number(f.giftQty));
    const replacedQty = Math.max(0, Number(f.replacedQty));
    if (![qty, price, damagedQty, giftQty, replacedQty].every(Number.isFinite)) {
      setUiMsg({ type: "error", text: "Hay valores inválidos." });
      return;
    }
    const sumClose = damagedQty + giftQty;
    if (sumClose > qty + 1e-9) {
      setUiMsg({
        type: "error",
        text: `La suma (dañado+yapa=${sumClose}) no puede ser mayor que entregado (${qty}).`,
      });
      return;
    }
    if (item.paidAt) {
      setUiMsg({ type: "error", text: "No se puede editar un ítem pagado." });
      return;
    }
    await toastAuth({
      promise: updateOrderItemRequest(itemId, {
        quantity: qty,
        price,
        damagedQty,
        giftQty,
        replacedQty,
      }),
      onSuccess: async () => {
        setEditMode((prev) => ({ ...prev, [itemId]: false }));
        await loadWorkbench(true);
        return { title: "Ítem", description: "Actualizado (entregado + cierre)" };
      },
      onError: (res) => ({
        title: "Ítem",
        description: res?.response?.data?.message || "No se pudo actualizar",
      }),
    });
  };

  const handleRemoveFromGroup = async (item) => {
    if (!item?.id) {
      setUiMsg({ type: "error", text: "Falta id del ítem." });
      return;
    }
    await toastAuth({
      promise: moveItemBetweenGroupsRequest({ orderItemId: item.id, toGroupId: null }),
      onSuccess: async () => {
        await loadWorkbench(true);
        return { title: "Grupo", description: "Ítem removido del grupo" };
      },
      onError: (res) => ({
        title: "Grupo",
        description: res?.response?.data?.message || "No se pudo remover",
      }),
    });
  };
  const openMoveDialog = (item) => {
    setMoveItem(item);
    setMoveToGroupId("");
    setMoveOpen(true);
  };
  const confirmMoveToGroup = async () => {
    if (!moveItem) return;
    if (!moveToGroupId) {
      setUiMsg({ type: "error", text: "Selecciona el grupo destino." });
      return;
    }
    await toastAuth({
      promise: moveItemBetweenGroupsRequest({
        orderItemId: moveItem.id,
        toGroupId: Number(moveToGroupId),
      }),
      onSuccess: async () => {
        setMoveOpen(false);
        setMoveItem(null);
        await loadWorkbench(true);
        return { title: "Grupo", description: "Ítem movido al nuevo grupo" };
      },
      onError: (res) => ({
        title: "Grupo",
        description: res?.response?.data?.message || "No se pudo mover",
      }),
    });
  };
  const openEditGroupConcept = () => {
    if (!selectedGroupId) return;
    setGroupEditConcept(selectedGroup?.concept || "");
    setGroupEditOpen(true);
  };
  const confirmEditGroupConcept = async () => {
    if (!selectedGroupId) return;
    const concept = String(groupEditConcept || "").trim();
    if (!concept) {
      setUiMsg({ type: "error", text: "El concepto no puede estar vacío." });
      return;
    }
    await toastAuth({
      promise: updateItemGroupRequest(selectedGroupId, { concept }),
      onSuccess: async () => {
        setGroupEditOpen(false);
        await loadWorkbench(true);
        return { title: "Grupo", description: "Concepto actualizado" };
      },
      onError: (res) => ({
        title: "Grupo",
        description: res?.response?.data?.message || "No se pudo actualizar",
      }),
    });
  };

  const openAddItemsToGroup = () => {
    if (!selectedGroupId) {
      setUiMsg({ type: "error", text: "Selecciona un grupo primero." });
      return;
    }
    if (selectedGroup?.status !== "open") {
      setUiMsg({ type: "error", text: "Solo se pueden agregar ítems a grupos abiertos." });
      return;
    }
    setAddItemsSelectedIds([]);
    setAddItemsOpen(true);
  };

  const toggleAddItemsSelect = (itemId) => {
    setAddItemsSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
    );
  };

  const openEditPayment = (payment) => {
    if (!isProgrammer) return;
    setEditingPayment(payment);
    setEditPaymentAmount(String(payment.amount ?? ""));
    setEditPaymentDate(payment.date ? toLocalDateTimeInput(payment.date) : nowLocalDateTime());
    setEditPaymentNote(payment.note || "Abono");
    setEditPaymentMethod(payment.method || "efectivo");
    setEditPaymentOpen(true);
  };

  const confirmEditPayment = async () => {
    if (!editingPayment?.id) return;
    const amt = Number(editPaymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setUiMsg({ type: "error", text: "Monto inválido." });
      return;
    }
    await toastAuth({
      promise: updateGroupPaymentRequest(editingPayment.id, {
        amount: amt,
        date: editPaymentDate,
        note: editPaymentNote,
        method: editPaymentMethod,
      }),
      onSuccess: async () => {
        setEditPaymentOpen(false);
        setEditingPayment(null);
        await loadWorkbench(true);
        return { title: "Abono", description: "Actualizado" };
      },
      onError: (res) => ({
        title: "Abono",
        description: res?.response?.data?.message || "No se pudo actualizar",
      }),
    });
  };

  const handleDeletePayment = async (payment) => {
    if (!isProgrammer || !payment?.id) return;
    if (!window.confirm(`¿Eliminar abono de ${money(payment.amount)} del ${payment.date}?`)) {
      return;
    }
    await toastAuth({
      promise: deleteGroupPaymentRequest(payment.id),
      onSuccess: async () => {
        await loadWorkbench(true);
        return { title: "Abono", description: "Eliminado" };
      },
      onError: (res) => ({
        title: "Abono",
        description: res?.response?.data?.message || "No se pudo eliminar",
      }),
    });
  };

  const confirmAddItemsToGroup = async () => {
    if (!selectedGroupId) return;
    if (addItemsSelectedIds.length === 0) {
      setUiMsg({ type: "error", text: "Selecciona al menos un ítem." });
      return;
    }
    const badGrouped = customerItems.find(
      (it) => addItemsSelectedIds.includes(it.id) && getItemGroupId(it)
    );
    if (badGrouped) {
      setUiMsg({ type: "error", text: `El ítem #${badGrouped.id} ya está en un grupo.` });
      return;
    }
    await toastAuth({
      promise: addItemsToGroupRequest(selectedGroupId, { itemIds: addItemsSelectedIds }),
      onSuccess: async () => {
        setAddItemsOpen(false);
        setAddItemsSelectedIds([]);
        await loadWorkbench(true);
        return { title: "Grupo", description: "Ítems agregados al grupo" };
      },
      onError: (res) => ({
        title: "Grupo",
        description: res?.response?.data?.message || "No se pudieron agregar los ítems",
      }),
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minHeight: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", sm: 1400 },
          p: { xs: 1, sm: 1.5, md: 2 },
          mx: "auto",
          boxSizing: "border-box",
        }}
      >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Clientes (por ítems / pedidos)
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={customer?.name ? `Cliente: ${customer.name} · Pendiente: ${money(displayPending)}` : ""}
          >
            Cliente: <b>{customer?.name || "—"}</b> · Pendiente:{" "}
            <b>{money(displayPending)}</b>
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={{ xs: 0.5, sm: 1 }}
          flexWrap="wrap"
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
          useFlexGap
          sx={{ minWidth: 0 }}
        >
          <Button
            size="small"
            variant="outlined"
            disabled={loading}
            onClick={() => loadWorkbench(true)}
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          >
            Refrescar
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!customer || loading || customerItems.length === 0}
            onClick={() => setDebtReportOpen(true)}
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}
          >
            Resumen de cuenta
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>Cargando...</Alert>
      )}
      {uiMsg && (
        <Alert severity={uiMsg.type} sx={{ mb: 2 }}>{uiMsg.text}</Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2, width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.5, sm: 2 }, width: "100%", boxSizing: "border-box" }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
            Clientes (ordenados por deuda)
          </Typography>
          {customers.length === 0 ? (
            <Alert severity="info">No hay clientes.</Alert>
          ) : customersWithDebt.length === 0 ? (
            <Alert severity="success">No hay clientes con deuda pendiente.</Alert>
          ) : (
            <Box
              sx={{
                width: "100%",
                maxWidth: "100%",
                maxHeight: 200,
                overflowX: "hidden",
                overflowY: "auto",
                pb: 0.5,
                "-webkitOverflowScrolling": "touch",
                "&::-webkit-scrollbar": { width: 8 },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 4 },
                boxSizing: "border-box",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: { xs: 0.5, sm: 1 },
                  py: 0.5,
                  width: "100%",
                }}
              >
                {customersWithDebt.map((c) => {
                  const active = c.id === selectedCustomerId;
                  const amount = Number(totalCobrableByCustomer[c.id] ?? 0);
                  const displayName = c.name.length > 25 ? `${c.name.slice(0, 22)}...` : c.name;
                  return (
                    <Chip
                      key={c.id}
                      clickable
                      onClick={() => resetOnCustomerChange(c.id)}
                      color={active ? "primary" : amount > 0 ? "warning" : "default"}
                      variant={active ? "filled" : "outlined"}
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: { xs: 200, sm: "none" } }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: { xs: 120, sm: "none" },
                            }}
                            title={c.name}
                          >
                            {displayName}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                            · {money(amount)}
                          </Typography>
                        </Box>
                      }
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <PendingSummaryPanel
        customerId={selectedCustomerId}
        customerItems={customerItems}
        displayPending={displayPending}
        onPrepareOrderGroup={prepareOrderGroup}
        onAbonarOrderGroup={abonarOrderGroup}
      />

      <Card variant="outlined" sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, width: "100%", boxSizing: "border-box" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
          >
            <Tab label={`Pendientes sin grupo (${itemsUngrouped.length})`} />
            <Tab label={`Pagados sin grupo (${itemsPaidUngrouped.length})`} />
            <Tab label={`Grupos (${customerGroups.length})`} />
            <Tab label="Detalle" />
          </Tabs>
          <Divider />

          {tab === 0 && (
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">Ítems pendientes sin grupo</Typography>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    disabled={loading || itemsUngrouped.length === 0}
                    onClick={() => {
                      const { txt } = buildReportTxtByProduct({
                        title: "REPORTE PENDIENTE SIN GRUPO (POR PRODUCTO)",
                        customer,
                        items: itemsUngrouped,
                      });
                      const filename = `pendiente_sin_grupo_${safeFileName(customer?.name)}_${todayISO()}.txt`;
                      downloadTextFile(filename, txt);
                    }}
                  >
                    TXT sin grupo
                  </Button>
                  <Button
                    variant="contained"
                    disabled={loading || itemsUngrouped.length === 0}
                    onClick={() => openCreateGroup("pending")}
                  >
                    Crear grupo
                  </Button>
                </Stack>
              </Stack>
              {customerOrders.length === 0 ? (
                <Alert severity="info">Este cliente no tiene pedidos.</Alert>
              ) : itemsUngrouped.length === 0 ? (
                <Alert severity="info">No hay ítems pendientes sin grupo.</Alert>
              ) : (
                <Stack spacing={1}>
                  {customerOrders
                    .slice()
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((o) => {
                      const items = (o.items || [])
                        .map((it) => ({
                          ...it,
                          qty: it.qty ?? it.quantity ?? 0,
                          product: it.product ?? it.productName ?? it.name ?? "(sin nombre)",
                          damagedQty: it.damagedQty ?? 0,
                          giftQty: it.giftQty ?? 0,
                          replacedQty: it.replacedQty ?? 0,
                        }))
                        .filter((it) => !it.paidAt);
                      if (items.length === 0) return null;
                      const selectableItems = items.filter((it) => !getItemGroupId(it));
                      const hasSelectable = selectableItems.length > 0;
                      const orderPendingTotal = Number(
                        sum(items, (it) => itemLineTotal(it)).toFixed(2)
                      );
                      return (
                        <Accordion key={o.id} variant="outlined" disableGutters>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ width: "100%", pr: 1 }}
                            >
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800 }}>
                                  Pedido #{o.id}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                  Día: {dayLabel(o.date)}
                                </Typography>
                              </Box>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  label={`Pendiente ${money(orderPendingTotal)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={
                                    hasSelectable
                                      ? "Tiene ítems sin grupo"
                                      : "Todo ya en grupo"
                                  }
                                  color={hasSelectable ? "warning" : "default"}
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Ítems pendientes (selecciona los SIN GRUPO)
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1 }}>
                              <ItemsTable
                                items={items}
                                selectable
                                selectedItemIds={selectedItemIds}
                                onToggleItem={toggleSelectItem}
                                isItemSelectable={(it) =>
                                  !it.paidAt && !getItemGroupId(it)
                                }
                                editable={isProgrammer}
                                canEditItem={(it) => isProgrammer && !it.paidAt}
                                isEditingItem={(id) => !!editMode[id]}
                                getEditFields={(id) => editFields[id] || {}}
                                onEditToggle={(it) => toggleEditItem(it)}
                                onEditFieldChange={(id, field, value) =>
                                  setItemField(id, field, value)
                                }
                                onEditConfirm={(it) => confirmEditItem(it)}
                              />
                            </Paper>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                </Stack>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mt: 2 }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Selecciona ítems pendientes sin grupo para crear un grupo.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`Seleccionados: ${selectedItemIds.length}`}
                    variant="outlined"
                  />
                  <Chip label={`Total: ${money(selectedItemsTotal)}`} variant="outlined" />
                </Stack>
              </Stack>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">
                  Ítems pagados sin grupo (histórico) — agrupados por pedido
                </Typography>
                <Button
                  variant="contained"
                  disabled={loading || itemsPaidUngrouped.length === 0}
                  onClick={() => openCreateGroup("paid")}
                >
                  Crear grupo (pagados)
                </Button>
              </Stack>
              {customerOrders.length === 0 ? (
                <Alert severity="info">Este cliente no tiene pedidos.</Alert>
              ) : itemsPaidUngrouped.length === 0 ? (
                <Alert severity="info">No hay ítems pagados sin grupo.</Alert>
              ) : (
                <Stack spacing={1}>
                  {customerOrders
                    .slice()
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((o) => {
                      const paidItems = (o.items || [])
                        .map((it) => ({
                          ...it,
                          qty: it.qty ?? it.quantity ?? 0,
                          product: it.product ?? it.productName ?? it.name ?? "(sin nombre)",
                          damagedQty: it.damagedQty ?? 0,
                          giftQty: it.giftQty ?? 0,
                          replacedQty: it.replacedQty ?? 0,
                        }))
                        .filter((it) => !!it.paidAt);
                      if (paidItems.length === 0) return null;
                      const selectablePaid = paidItems.filter((it) => !getItemGroupId(it));
                      const hasSelectable = selectablePaid.length > 0;
                      const orderPaidTotal = Number(
                        sum(paidItems, (it) => itemLineTotal(it)).toFixed(2)
                      );
                      return (
                        <Accordion key={o.id} variant="outlined" disableGutters>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ width: "100%", pr: 1 }}
                            >
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800 }}>
                                  Pedido #{o.id}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                  Día: {dayLabel(o.date)}
                                </Typography>
                              </Box>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  label={`Pagado ${money(orderPaidTotal)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={
                                    hasSelectable
                                      ? "Tiene pagados sin grupo"
                                      : "Todo ya en grupo"
                                  }
                                  color={hasSelectable ? "warning" : "default"}
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Ítems pagados (selecciona los PAGADOS SIN GRUPO)
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 1 }}>
                              <ItemsTable
                                items={paidItems}
                                selectable
                                selectedItemIds={selectedPaidItemIds}
                                onToggleItem={toggleSelectPaidItem}
                                isItemSelectable={(it) =>
                                  !!it.paidAt && !getItemGroupId(it)
                                }
                              />
                            </Paper>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", display: "block", mt: 1 }}
                            >
                              * Solo se pueden seleccionar ítems pagados que NO estén en un
                              grupo.
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                </Stack>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mt: 2 }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Selecciona ítems pagados sin grupo para crear un grupo histórico.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`Seleccionados: ${selectedPaidItemIds.length}`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Total: ${money(selectedPaidItemsTotal)}`}
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Grupos del cliente
              </Typography>
              {customerGroups.length === 0 ? (
                <Alert severity="info">Aún no hay grupos para este cliente.</Alert>
              ) : (
                <Stack spacing={1}>
                  {customerGroups
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt || b.date || 0) -
                        new Date(a.createdAt || a.date || 0)
                    )
                    .map((g) => {
                      const total = groupTotal(g.id);
                      const paid = groupPaid(g.id);
                      const rem = groupRemaining(g.id);
                      const st = groupStatus(g.id);
                      const active = g.id === selectedGroupId;
                      const chip =
                        st === "paid"
                          ? { label: "Pagado", color: "success" }
                          : st === "partial"
                          ? { label: "Parcial", color: "warning" }
                          : { label: "Pendiente", color: "default" };
                      return (
                        <Card
                          key={g.id}
                          variant="outlined"
                          sx={{
                            borderColor: active ? "primary.main" : "divider",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSelectedGroupId(g.id);
                            setTab(3);
                          }}
                        >
                          <CardContent>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              justifyContent="space-between"
                              alignItems={{ xs: "stretch", sm: "center" }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 900 }}>
                                  #{g.id} · {g.concept}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                  Estado: {g.status || "—"} · Creado:{" "}
                                  {formatDateTime(g.createdAt || g.date)}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                  size="small"
                                  label={chip.label}
                                  color={chip.color}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`Total ${money(total)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`Abonado ${money(paid)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`Saldo ${money(rem)}`}
                                  color={rem > 0 ? "warning" : "success"}
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Stack>
              )}
            </Box>
          )}

          {tab === 3 && (
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              {!selectedGroupId ? (
                <Alert severity="info">
                  Selecciona un grupo en la pestaña "Grupos".
                </Alert>
              ) : (
                <>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="subtitle1">
                        Grupo #{selectedGroupId} · {selectedGroup?.concept}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Total: <b>{money(groupTotal(selectedGroupId))}</b> · Abonado:{" "}
                        <b>{money(groupPaid(selectedGroupId))}</b> · Saldo:{" "}
                        <b>{money(groupRemaining(selectedGroupId))}</b>
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        disabled={loading || !selectedGroupId}
                        onClick={() => {
                          const { txt } = buildReportTxtByProduct({
                            title: `REPORTE DEL GRUPO #${selectedGroupId} (POR PRODUCTO)`,
                            customer,
                            items: selectedGroupItems,
                          });
                          const filename = `grupo_${selectedGroupId}_${safeFileName(customer?.name)}_${todayISO()}.txt`;
                          downloadTextFile(filename, txt);
                        }}
                      >
                        TXT del grupo
                      </Button>
                      {isProgrammer && (
                        <Button
                          variant="outlined"
                          onClick={openEditGroupConcept}
                          disabled={loading}
                        >
                          Editar grupo
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={loading || selectedGroup?.status !== "open"}
                        onClick={openAddItemsToGroup}
                      >
                        Agregar ítems
                      </Button>
                      <Button
                        variant="contained"
                        disabled={
                          loading || groupStatus(selectedGroupId) === "paid"
                        }
                        onClick={openPay}
                      >
                        Abonar
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Ítems del grupo
                  </Typography>
                  {selectedGroupItems.length === 0 ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No hay ítems en este grupo. Si los ítems no muestran groupId
                      (itemGroupId), el backend debe enviarlo.
                    </Alert>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                      <ItemsTable
                        items={selectedGroupItems}
                        editable={isProgrammer}
                        canEditItem={(it) => isProgrammer && !it.paidAt}
                        isEditingItem={(id) => !!editMode[id]}
                        getEditFields={(id) => editFields[id] || {}}
                        onEditToggle={(it) => toggleEditItem(it)}
                        onEditFieldChange={(id, field, value) =>
                          setItemField(id, field, value)
                        }
                        onEditConfirm={(it) => confirmEditItem(it)}
                        showGroupActions={isProgrammer}
                        onRemoveFromGroup={handleRemoveFromGroup}
                        onMoveToGroup={openMoveDialog}
                      />
                    </Paper>
                  )}
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Abonos
                    </Typography>
                    {selectedGroupPayments.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Aún no hay abonos.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {selectedGroupPayments
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() - new Date(a.date).getTime()
                          )
                          .map((p) => (
                            <Box
                              key={p.id}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                                {formatDateTime(p.date)} · {p.note || "Abono"} · {p.method || "—"}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                                {money(p.amount)}
                              </Typography>
                              {isProgrammer && (
                                <Stack direction="row" spacing={0}>
                                  <Tooltip title="Editar abono">
                                    <IconButton
                                      size="small"
                                      onClick={() => openEditPayment(p)}
                                      disabled={loading}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar abono">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeletePayment(p)}
                                      disabled={loading}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                            </Box>
                          ))}
                      </Stack>
                    )}
                  </Paper>
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <CollectionsDialogs
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        createMode={createMode}
        groupConcept={groupConcept}
        setGroupConcept={setGroupConcept}
        selectedItemIds={selectedItemIds}
        selectedPaidItemIds={selectedPaidItemIds}
        selectedItemsTotal={selectedItemsTotal}
        selectedPaidItemsTotal={selectedPaidItemsTotal}
        createGroup={createGroup}
        loading={loading}
        payOpen={payOpen}
        setPayOpen={setPayOpen}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payDate={payDate}
        setPayDate={setPayDate}
        payNote={payNote}
        setPayNote={setPayNote}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        confirmPay={confirmPay}
        selectedGroupId={selectedGroupId}
        groupRemaining={groupRemaining}
        onPayAmountChange={(value) => {
          setPayAmount(value);
          if (!selectedGroupId) return;
          const amt = Number(value);
          if (!Number.isFinite(amt) || amt <= 0) return;
          setPayNote((prev) => {
            const prevGeneric = !prev || prev === "Abono" || prev.startsWith("Abono parcial:") || prev.startsWith("Liquidación total:");
            return prevGeneric ? buildSuggestedPayNote(amt, selectedGroupId) : prev;
          });
        }}
        moveOpen={moveOpen}
        setMoveOpen={setMoveOpen}
        moveItem={moveItem}
        moveToGroupId={moveToGroupId}
        setMoveToGroupId={setMoveToGroupId}
        confirmMoveToGroup={confirmMoveToGroup}
        customerGroups={customerGroups}
        groupEditOpen={groupEditOpen}
        setGroupEditOpen={setGroupEditOpen}
        groupEditConcept={groupEditConcept}
        setGroupEditConcept={setGroupEditConcept}
        confirmEditGroupConcept={confirmEditGroupConcept}
        addItemsOpen={addItemsOpen}
        setAddItemsOpen={setAddItemsOpen}
        addItemsSelectedIds={addItemsSelectedIds}
        toggleAddItemsSelect={toggleAddItemsSelect}
        confirmAddItemsToGroup={confirmAddItemsToGroup}
        itemsUngrouped={itemsUngrouped}
        customerOrders={customerOrders}
        itemLineTotal={itemLineTotal}
        getItemGroupId={getItemGroupId}
        editPaymentOpen={editPaymentOpen}
        setEditPaymentOpen={setEditPaymentOpen}
        editPaymentAmount={editPaymentAmount}
        setEditPaymentAmount={setEditPaymentAmount}
        editPaymentDate={editPaymentDate}
        setEditPaymentDate={setEditPaymentDate}
        editPaymentNote={editPaymentNote}
        setEditPaymentNote={setEditPaymentNote}
        editPaymentMethod={editPaymentMethod}
        setEditPaymentMethod={setEditPaymentMethod}
        confirmEditPayment={confirmEditPayment}
        editingPayment={editingPayment}
      />

      <DebtReportDialog
        open={debtReportOpen}
        onClose={() => setDebtReportOpen(false)}
        customer={customer}
        items={customerItems}
        onError={(text) => setUiMsg({ type: "error", text })}
      />
      </Box>
    </Box>
  );
}
