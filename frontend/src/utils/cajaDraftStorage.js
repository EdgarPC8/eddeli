/**
 * Borradores de Caja en localStorage (varios a la vez: una pestaña / uno).
 * El prefijo de clave sale del alias (o mediaFolderPrefix) de la config del sistema.
 * Presencia (heartbeat) avisa a otras pestañas qué borrador está en uso.
 */

const SESSION_DRAFT_ID_KEY = "caja.draft.sessionDraftId.v1";
const SESSION_TOKEN_KEY = "caja.draft.sessionToken.v1";
const MAX_DRAFTS = 8;
/** Tiempo sin heartbeat para considerar liberado un borrador. */
export const CAJA_DRAFT_LIVE_MS = 8000;

/** @param {{ alias?: string, mediaFolderPrefix?: string } | null | undefined} activeApp */
export function cajaDraftAppNamespace(activeApp) {
  const raw = String(activeApp?.alias || activeApp?.mediaFolderPrefix || "app")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "app";
}

function uidOf(userId) {
  return userId != null && String(userId).trim() ? String(userId) : "anon";
}

function indexKey(ns, userId) {
  return `${ns}.cajaDrafts.v1.${uidOf(userId)}`;
}

function draftKey(ns, userId, draftId) {
  return `${ns}.cajaDrafts.v1.${uidOf(userId)}.${draftId}`;
}

function presenceKey(ns, userId) {
  return `${ns}.cajaDrafts.presence.v1.${uidOf(userId)}`;
}

/** Clave antigua (un solo borrador). Solo se usa para migrar. */
function legacySingleKey(ns, userId) {
  return `${ns}.cajaDraft.v1.${uidOf(userId)}`;
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readIndex(ns, userId) {
  const data = readJson(indexKey(ns, userId));
  if (Array.isArray(data?.ids)) return data.ids.map(String).filter(Boolean);
  if (Array.isArray(data)) return data.map(String).filter(Boolean);
  return [];
}

function writeIndex(ns, userId, ids) {
  writeJson(indexKey(ns, userId), { ids: [...new Set(ids.map(String))] });
}

function readPresenceMap(ns, userId) {
  const data = readJson(presenceKey(ns, userId));
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function prunePresence(map, liveMs = CAJA_DRAFT_LIVE_MS) {
  const now = Date.now();
  const next = {};
  for (const [id, entry] of Object.entries(map || {})) {
    const at = Number(entry?.at || 0);
    if (Number.isFinite(at) && now - at < liveMs * 3) next[id] = entry;
  }
  return next;
}

export function getTabDraftSession() {
  try {
    let draftId = sessionStorage.getItem(SESSION_DRAFT_ID_KEY) || "";
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY) || "";
    if (!token) {
      token = newId();
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return { draftId: draftId || null, token };
  } catch {
    return { draftId: null, token: newId() };
  }
}

export function setTabDraftId(draftId) {
  try {
    if (draftId) sessionStorage.setItem(SESSION_DRAFT_ID_KEY, String(draftId));
    else sessionStorage.removeItem(SESSION_DRAFT_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** ¿Hay algo que valga la pena recuperar? */
export function isCajaDraftWorthRestoring(draft) {
  if (!draft) return false;
  const cart = Array.isArray(draft.cart) ? draft.cart : [];
  if (cart.length > 0) return true;
  if (String(draft.notes || "").trim()) return true;
  if (draft.documentType && draft.documentType !== "documento") return true;
  if (draft.saleType === "credito") return true;
  if (draft.useCustomerData) return true;
  return false;
}

export function formatCajaDraftProductLines(draft, { max = 8 } = {}) {
  const cart = Array.isArray(draft?.cart) ? draft.cart : [];
  const items = cart.map((row) => ({
    name: String(row?.name || `Producto #${row?.productId ?? "?"}`),
    quantity: Number(row?.quantity || 0),
  }));
  return {
    items: items.slice(0, max),
    more: Math.max(0, items.length - max),
  };
}

export function summarizeCajaDraft(draft) {
  const cart = Array.isArray(draft?.cart) ? draft.cart : [];
  const lines = cart.length;
  const units = cart.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const when = draft?.savedAt ? new Date(draft.savedAt) : null;
  const whenLabel =
    when && !Number.isNaN(when.getTime())
      ? when.toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })
      : "sesión anterior";
  const products = formatCajaDraftProductLines(draft);
  return { lines, units, whenLabel, products };
}

export function readCajaDraft(activeApp, userId, draftId) {
  if (!draftId) return null;
  const ns = cajaDraftAppNamespace(activeApp);
  const data = readJson(draftKey(ns, userId, draftId));
  if (!data || typeof data !== "object") return null;
  return { ...data, id: String(draftId) };
}

/**
 * Migra el formato de un solo borrador (si existía) al índice multi-borrador.
 * @returns {string|null} id migrado
 */
function migrateLegacySingleDraft(ns, userId) {
  const key = legacySingleKey(ns, userId);
  const legacy = readJson(key);
  if (!legacy || typeof legacy !== "object" || !isCajaDraftWorthRestoring(legacy)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
  const id = newId();
  writeJson(draftKey(ns, userId, id), {
    ...legacy,
    id,
    savedAt: legacy.savedAt || new Date().toISOString(),
  });
  const ids = readIndex(ns, userId);
  if (!ids.includes(id)) writeIndex(ns, userId, [...ids, id]);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  return id;
}

/** Lista borradores recuperables (más recientes primero). */
export function listCajaDrafts(activeApp, userId) {
  const ns = cajaDraftAppNamespace(activeApp);
  migrateLegacySingleDraft(ns, userId);
  const ids = readIndex(ns, userId);
  const out = [];
  const keepIds = [];
  for (const id of ids) {
    const draft = readCajaDraft(activeApp, userId, id);
    if (!draft) continue;
    if (!isCajaDraftWorthRestoring(draft)) {
      try {
        localStorage.removeItem(draftKey(ns, userId, id));
      } catch {
        /* ignore */
      }
      continue;
    }
    keepIds.push(id);
    out.push(draft);
  }
  if (keepIds.length !== ids.length) writeIndex(ns, userId, keepIds);
  out.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  return out;
}

export function isDraftLiveInOtherTab(presenceMap, draftId, myToken, liveMs = CAJA_DRAFT_LIVE_MS) {
  if (!draftId) return false;
  const entry = presenceMap?.[String(draftId)];
  if (!entry) return false;
  if (myToken && entry.token === myToken) return false;
  const at = Number(entry.at || 0);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < liveMs;
}

/**
 * Anota cada borrador: mine | in_use | available
 */
export function annotateCajaDrafts(activeApp, userId, { myToken, myDraftId } = {}) {
  const ns = cajaDraftAppNamespace(activeApp);
  const presence = prunePresence(readPresenceMap(ns, userId));
  const drafts = listCajaDrafts(activeApp, userId);
  return drafts.map((d) => {
    const isMine = myDraftId != null && String(d.id) === String(myDraftId);
    const inUse = !isMine && isDraftLiveInOtherTab(presence, d.id, myToken);
    return {
      ...d,
      status: isMine ? "mine" : inUse ? "in_use" : "available",
    };
  });
}

/** Borradores libres (no esta pestaña, no en uso en otra). */
export function countAvailableCajaDrafts(activeApp, userId, { myToken, myDraftId } = {}) {
  return annotateCajaDrafts(activeApp, userId, { myToken, myDraftId }).filter(
    (d) => d.status === "available",
  ).length;
}

export function touchCajaDraftPresence(activeApp, userId, draftId, sessionToken) {
  if (!draftId || !sessionToken) return;
  const ns = cajaDraftAppNamespace(activeApp);
  const map = prunePresence(readPresenceMap(ns, userId));
  map[String(draftId)] = { token: sessionToken, at: Date.now() };
  writeJson(presenceKey(ns, userId), map);
}

export function clearCajaDraftPresence(activeApp, userId, draftId) {
  if (!draftId) return;
  const ns = cajaDraftAppNamespace(activeApp);
  const map = prunePresence(readPresenceMap(ns, userId));
  delete map[String(draftId)];
  writeJson(presenceKey(ns, userId), map);
}

export function writeCajaDraft(activeApp, userId, draftId, draft, sessionToken) {
  if (!draftId) return null;
  const ns = cajaDraftAppNamespace(activeApp);
  const key = draftKey(ns, userId, draftId);
  const existing = readJson(key);
  if (existing?.claimToken && sessionToken && existing.claimToken !== sessionToken) {
    const presence = readPresenceMap(ns, userId);
    if (isDraftLiveInOtherTab(presence, draftId, sessionToken)) {
      const forkedId = newId();
      setTabDraftId(forkedId);
      return writeCajaDraft(activeApp, userId, forkedId, draft, sessionToken);
    }
  }

  const payload = {
    ...draft,
    id: String(draftId),
    savedAt: new Date().toISOString(),
    claimToken: sessionToken || existing?.claimToken || null,
  };
  writeJson(key, payload);

  let ids = readIndex(ns, userId);
  if (!ids.includes(String(draftId))) ids = [...ids, String(draftId)];
  if (ids.length > MAX_DRAFTS) {
    const drop = ids.slice(0, ids.length - MAX_DRAFTS);
    ids = ids.slice(ids.length - MAX_DRAFTS);
    for (const oldId of drop) {
      try {
        localStorage.removeItem(draftKey(ns, userId, oldId));
      } catch {
        /* ignore */
      }
      clearCajaDraftPresence(activeApp, userId, oldId);
    }
  }
  writeIndex(ns, userId, ids);
  if (sessionToken) touchCajaDraftPresence(activeApp, userId, draftId, sessionToken);
  return String(draftId);
}

export function clearCajaDraft(activeApp, userId, draftId) {
  if (!draftId) return;
  const ns = cajaDraftAppNamespace(activeApp);
  try {
    localStorage.removeItem(draftKey(ns, userId, draftId));
  } catch {
    /* ignore */
  }
  clearCajaDraftPresence(activeApp, userId, draftId);
  writeIndex(
    ns,
    userId,
    readIndex(ns, userId).filter((id) => id !== String(draftId)),
  );
}

export function clearAllCajaDrafts(activeApp, userId) {
  const ns = cajaDraftAppNamespace(activeApp);
  const ids = readIndex(ns, userId);
  for (const id of ids) {
    try {
      localStorage.removeItem(draftKey(ns, userId, id));
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(indexKey(ns, userId));
    localStorage.removeItem(legacySingleKey(ns, userId));
    localStorage.removeItem(presenceKey(ns, userId));
  } catch {
    /* ignore */
  }
}

/** Crea un id nuevo para esta pestaña y lo deja en sessionStorage. */
export function createTabDraftId() {
  const id = newId();
  setTabDraftId(id);
  return id;
}

/**
 * Intenta reclamar un borrador. Falla si otra pestaña lo tiene vivo.
 * @returns {{ ok: true, id: string } | { ok: false, reason: 'in_use' | 'missing' }}
 */
export function tryClaimCajaDraft(activeApp, userId, draftId, sessionToken) {
  if (!draftId) return { ok: false, reason: "missing" };
  const ns = cajaDraftAppNamespace(activeApp);
  const existing = readJson(draftKey(ns, userId, draftId));
  if (!existing) return { ok: false, reason: "missing" };

  const presence = readPresenceMap(ns, userId);
  if (isDraftLiveInOtherTab(presence, draftId, sessionToken)) {
    return { ok: false, reason: "in_use" };
  }

  const id = String(draftId);
  writeJson(draftKey(ns, userId, id), {
    ...existing,
    id,
    claimToken: sessionToken || null,
    savedAt: existing.savedAt || new Date().toISOString(),
  });
  const ids = readIndex(ns, userId);
  if (!ids.includes(id)) writeIndex(ns, userId, [...ids, id]);
  setTabDraftId(id);
  if (sessionToken) touchCajaDraftPresence(activeApp, userId, id, sessionToken);
  return { ok: true, id };
}

/** @deprecated usar tryClaimCajaDraft */
export function claimCajaDraft(activeApp, userId, draftId, sessionToken) {
  const result = tryClaimCajaDraft(activeApp, userId, draftId, sessionToken);
  if (result.ok) return result.id;
  const id = createTabDraftId();
  if (sessionToken) touchCajaDraftPresence(activeApp, userId, id, sessionToken);
  return id;
}

/**
 * Escucha cambios de borradores / presencia en otras pestañas.
 * @returns {() => void} unsubscribe
 */
export function subscribeCajaDraftSync(activeApp, userId, onChange) {
  const ns = cajaDraftAppNamespace(activeApp);
  const prefix = `${ns}.cajaDrafts.`;
  const uid = uidOf(userId);
  const handler = (e) => {
    if (!e?.key || !e.key.startsWith(prefix)) return;
    if (!e.key.includes(uid)) return;
    onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
