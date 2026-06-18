import { promises as fs } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { Roles } from "../models/Roles.js";
import { Users } from "../models/Users.js";
import { Account, AccountRoles } from "../models/Account.js";
import { sequelize } from "./connection.js";
import { Notifications } from "../models/Notifications.js";

import {
  InventoryCategory,
  InventoryRecipe,
  InventoryMovement,
  InventoryProduct,
  InventoryUnit,
  HomeProduct,
  Store,
  Catalog,
  StoreProduct,
  ProductCompareGroup,
  ProductCompareGroupItem,
} from "../models/Inventory.js";
import {
  Customer,
  Order,
  OrderItem,
  Supplier,
  SupplierOrder,
  SupplierOrderItem,
} from "../models/Orders.js";
import {
  Expense,
  Income,
  ItemGroup,
  ItemGroupItem,
  Payment,
  FinancialObligation,
  ObligationPayment,
} from "../models/Finance.js";
import {
  EditorTemplate,
  EditorTemplateGroup,
  EditorTemplateLayer,
  EditorLayerProp,
  EditorLayerBind,
  EditorDesign,
  EditorDesignLayerOverride,
} from "../models/Editor.js";
import { CashShift } from "../models/CashShift.js";
import { CashShiftMovement } from "../models/CashShiftMovement.js";
import { TaskPlan, TaskItem } from "../models/Tasks.js";
import {
  PublicidadCampaign,
  PublicidadPlaylistItem,
  PublicidadDevice,
} from "../models/Publicidad.js";
import { License } from "../models/License.js";
import { Logs } from "../models/Logs.js";
import { UserData } from "../models/UserData.js";

export const backupFilePath = resolve(__dirname, "backup.json");
export const backups = resolve(__dirname, "..", "backups");

/**
 * Tablas EdDeli incluidas en backup.json (guardar / recargar BD).
 * Excluidas a propósito (módulos SoftEd compartidos): quiz_*, form_*, alumni_*, cv_*.
 */
export const BACKUP_TABLE_ENTRIES = [
  { key: "Roles", model: Roles },
  { key: "Users", model: Users },
  { key: "Account", model: Account },
  { key: "AccountRoles", model: AccountRoles },
  { key: "UserData", model: UserData },
  { key: "Notifications", model: Notifications },
  { key: "InventoryCategory", model: InventoryCategory },
  { key: "InventoryUnit", model: InventoryUnit },
  { key: "InventoryProduct", model: InventoryProduct, sanitize: "InventoryProduct" },
  { key: "InventoryRecipe", model: InventoryRecipe },
  { key: "InventoryMovement", model: InventoryMovement },
  { key: "CashShift", model: CashShift, sanitize: "CashShift" },
  { key: "CashShiftMovement", model: CashShiftMovement },
  { key: "Customer", model: Customer },
  { key: "Order", model: Order },
  { key: "OrderItem", model: OrderItem },
  { key: "Supplier", model: Supplier },
  { key: "SupplierOrder", model: SupplierOrder },
  { key: "SupplierOrderItem", model: SupplierOrderItem },
  { key: "TaskPlan", model: TaskPlan },
  { key: "TaskItem", model: TaskItem },
  { key: "PublicidadCampaign", model: PublicidadCampaign },
  { key: "PublicidadPlaylistItem", model: PublicidadPlaylistItem },
  { key: "PublicidadDevice", model: PublicidadDevice },
  { key: "Expense", model: Expense },
  { key: "Income", model: Income },
  { key: "Store", model: Store },
  { key: "HomeProduct", model: HomeProduct },
  { key: "Catalog", model: Catalog },
  { key: "ProductCompareGroup", model: ProductCompareGroup },
  { key: "ProductCompareGroupItem", model: ProductCompareGroupItem },
  { key: "StoreProduct", model: StoreProduct },
  { key: "ItemGroup", model: ItemGroup },
  { key: "ItemGroupItem", model: ItemGroupItem },
  { key: "Payment", model: Payment },
  { key: "FinancialObligation", model: FinancialObligation },
  { key: "ObligationPayment", model: ObligationPayment },
  { key: "EditorTemplate", model: EditorTemplate },
  { key: "EditorTemplateGroup", model: EditorTemplateGroup },
  { key: "EditorTemplateLayer", model: EditorTemplateLayer },
  { key: "EditorLayerProp", model: EditorLayerProp },
  { key: "EditorLayerBind", model: EditorLayerBind },
  { key: "EditorDesign", model: EditorDesign },
  { key: "EditorDesignLayerOverride", model: EditorDesignLayerOverride },
  { key: "License", model: License },
  { key: "Logs", model: Logs },
];

export function summarizeBackupData(data) {
  const counts = {};
  for (const { key } of BACKUP_TABLE_ENTRIES) {
    const rows = data?.[key];
    counts[key] = Array.isArray(rows) ? rows.length : 0;
  }
  return counts;
}

/** Asegura que existan todas las claves del backup (arrays vacíos si faltan). */
export function ensureBackupShape(data) {
  const out = data && typeof data === "object" && !Array.isArray(data) ? { ...data } : {};
  for (const { key } of BACKUP_TABLE_ENTRIES) {
    if (!Array.isArray(out[key])) out[key] = [];
  }
  return out;
}

const VALID_MOVEMENT_REASONS = new Set([
  "ENTRADA_PRODUCCION",
  "ENTRADA_COMPRA",
  "ENTRADA_DEVOLUCION",
  "ENTRADA_OTRA",
  "SALIDA_VENTA",
  "SALIDA_YAPA",
  "SALIDA_DANIADO",
  "SALIDA_CADUCADO",
  "SALIDA_CONSUMO_INTERNO",
  "SALIDA_CONSUMO",
  "SALIDA_MERMA",
  "SALIDA_OTRA",
  "SALIDA_REEMPLAZO",
  "AJUSTE_ENTRADA",
  "AJUSTE_SALIDA",
  "PRODUCCION_FINAL",
]);

const MOVEMENT_REASON_ALIASES = {
  SALIDA_CONSUMO: "SALIDA_CONSUMO_INTERNO",
  SALIDA_MERMA: "SALIDA_DANIADO",
  PRODUCCION_FINAL: "ENTRADA_PRODUCCION",
  ENTRADA_DEVOLUCION: "ENTRADA_COMPRA",
};

/**
 * Parsea texto JSON de backup (archivo subido o backup.json).
 * Valida forma, normaliza claves y campos problemáticos.
 */
export function parseBackupJsonContent(content) {
  const stripped = String(content ?? "").replace(/^\uFEFF/, "").trim();
  if (!stripped) {
    throw new Error("El archivo está vacío");
  }

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new Error(`JSON inválido: ${err.message}`);
  }

  if (parsed && typeof parsed === "object" && parsed.backup && typeof parsed.backup === "object") {
    parsed = parsed.backup;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "El JSON debe ser un objeto con tablas EdDeli (Roles, Users, Account, InventoryProduct, Order, …)",
    );
  }

  const shaped = ensureBackupShape(parsed);
  const hasRows = BACKUP_TABLE_ENTRIES.some(
    ({ key }) => Array.isArray(shaped[key]) && shaped[key].length > 0,
  );
  if (!hasRows) {
    throw new Error("El backup no contiene datos en ninguna tabla reconocida");
  }

  return prepareBackupForRestore(shaped);
}

/** Escribe backup.json normalizado en disco. */
export async function writeBackupToDisk(jsonData) {
  const normalized = prepareBackupForRestore(ensureBackupShape(jsonData));
  await fs.writeFile(backupFilePath, JSON.stringify(normalized, null, 2), "utf8");
  return { path: backupFilePath, tables: summarizeBackupData(normalized) };
}

const unwrapJsonString = (value, maxDepth = 12) => {
  let v = value;
  for (let i = 0; i < maxDepth; i++) {
    if (typeof v !== "string") break;
    const s = v.trim();
    const looksJson =
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith('"') && s.endsWith('"'));
    if (!looksJson) break;
    try {
      v = JSON.parse(s);
    } catch {
      break;
    }
  }
  return v;
};

const normalizeJsonFieldToString = (value) => {
  const v = unwrapJsonString(value);
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
};

const sanitizeRows = (rows, config = {}) => {
  if (!Array.isArray(rows)) return rows;
  const jsonStringFields = config.jsonStringFields || [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    for (const field of jsonStringFields) {
      if (field in row) row[field] = normalizeJsonFieldToString(row[field]);
    }
    return row;
  });
};

const SANITIZE_CONFIG = {
  InventoryProduct: {
    jsonStringFields: ["wholesaleRules", "packageTiers"],
  },
  CashShift: {
    jsonStringFields: ["openingCashCounts", "closingCashCounts"],
  },
};

const BULK_OPT = { returning: false };
const BULK_CHUNK_SIZE = 400;

async function bulkCreateRows(model, rows, opt) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return;
  for (let i = 0; i < list.length; i += BULK_CHUNK_SIZE) {
    await model.bulkCreate(list.slice(i, i + BULK_CHUNK_SIZE), opt);
  }
}

/** Resumen del backup.json en disco (solo lectura; no crea archivos). */
export async function readBackupFileSummary() {
  try {
    await fs.access(backupFilePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        exists: false,
        path: backupFilePath,
        sizeBytes: 0,
        sizeMB: 0,
        counts: {},
        totalRows: 0,
      };
    }
    throw error;
  }

  const st = await fs.stat(backupFilePath);
  const raw = await fs.readFile(backupFilePath, "utf8");
  const counts = summarizeBackupData(parseBackupJsonContent(raw));
  const totalRows = Object.values(counts).reduce((a, n) => a + n, 0);
  return {
    exists: true,
    path: backupFilePath,
    sizeBytes: st.size,
    sizeMB: Number((st.size / 1024 / 1024).toFixed(2)),
    counts,
    totalRows,
  };
}

/**
 * Exige backup.json con datos reales antes de reset/importar.
 * No genera un JSON vacío (evita resetear la BD con solo 4 roles).
 */
export async function requireValidBackupFile() {
  const summary = await readBackupFileSummary();
  if (!summary.exists) {
    throw new Error(
      `No existe backup.json en ${backupFilePath}. ` +
        "Cópialo desde tu PC (scp) o súbelo en Comandos → Subir backup.json.",
    );
  }
  if ((summary.counts.Users ?? 0) === 0 && (summary.counts.InventoryProduct ?? 0) === 0) {
    const kb = (summary.sizeBytes / 1024).toFixed(0);
    throw new Error(
      `backup.json no tiene usuarios ni productos (${summary.totalRows} filas, ${kb} KB). ` +
        "Reemplázalo con tu copia real (~3 MB desde tu PC) antes de resetear.",
    );
  }
  return summary;
}

/** Evita FK rotas al restaurar backups viejos sin turnos de caja. */
export function prepareBackupForRestore(jsonData) {
  const data = { ...jsonData };

  data.InventoryProduct = sanitizeRows(
    data.InventoryProduct,
    SANITIZE_CONFIG.InventoryProduct,
  );
  data.CashShift = sanitizeRows(data.CashShift, SANITIZE_CONFIG.CashShift);

  const shifts = Array.isArray(data.CashShift) ? data.CashShift : [];
  const validShiftIds = new Set(shifts.map((s) => s?.id).filter((id) => id != null));

  if (Array.isArray(data.Order)) {
    data.Order = data.Order.map((order) => {
      if (!order || order.shiftId == null) return order;
      if (!validShiftIds.has(order.shiftId)) {
        return { ...order, shiftId: null };
      }
      return order;
    });
  }

  if (Array.isArray(data.CashShiftMovement)) {
    data.CashShiftMovement = data.CashShiftMovement.map((row) => {
      if (!row || row.shiftId == null) return row;
      if (!validShiftIds.has(row.shiftId)) return null;
      return row;
    }).filter(Boolean);
  }

  if (Array.isArray(data.InventoryMovement)) {
    data.InventoryMovement = data.InventoryMovement.map((row) => {
      if (!row || row.reason == null) return row;
      let reason = row.reason;
      if (!VALID_MOVEMENT_REASONS.has(reason)) {
        reason = MOVEMENT_REASON_ALIASES[reason] || null;
      }
      if (reason && !VALID_MOVEMENT_REASONS.has(reason)) reason = null;
      return reason === row.reason ? row : { ...row, reason };
    });
  }

  return data;
}

async function setForeignKeyChecks(enabled, transaction) {
  const dialect = sequelize.getDialect?.() || "mysql";
  if (dialect !== "mysql") return;
  const value = enabled ? 1 : 0;
  await sequelize.query(`SET FOREIGN_KEY_CHECKS = ${value}`, { transaction });
}

/** Crea backup.json vacío si no existe (p. ej. tras git clone). */
export async function ensureBackupFileExists() {
  try {
    await fs.access(backupFilePath);
    return { created: false, path: backupFilePath };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const empty = ensureBackupShape({});
  empty.Roles = [
    { id: 1, name: "Programador" },
    { id: 2, name: "Administrador" },
    { id: 3, name: "Profesional" },
    { id: 4, name: "Estudiante" },
  ];
  const payload = JSON.stringify(empty, null, 2);
  await fs.writeFile(backupFilePath, payload, "utf8");
  console.log("backup.json no existía: creado en src/database/backup.json");
  return { created: true, path: backupFilePath };
}

/** Borra tablas, las recrea e importa backup.json (Comandos / scripts). */
export async function recreateDatabaseFromBackup() {
  await requireValidBackupFile();

  const dialect = sequelize.getDialect?.() || "mysql";
  if (dialect === "mysql") {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    try {
      await sequelize.sync({ force: true });
    } finally {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  } else {
    await sequelize.sync({ force: true });
  }

  return insertData();
}

/** Respaldo / restore solo tablas EdDeli (inventario, pedidos, finanzas, editor, notificaciones, cuentas). Quiz, forms, alumni, CV → softed/backend. */
export const insertData = async () => {
  await requireValidBackupFile();

  const raw = await fs.readFile(backupFilePath, "utf8");
  const jsonData = parseBackupJsonContent(raw);
  const counts = summarizeBackupData(jsonData);

  const t = await sequelize.transaction();
  try {
    await setForeignKeyChecks(false, t);
    const opt = { ...BULK_OPT, transaction: t };

    for (const entry of BACKUP_TABLE_ENTRIES) {
      const rows = jsonData[entry.key];
      try {
        await bulkCreateRows(entry.model, rows, opt);
      } catch (err) {
        const detail = err?.parent?.sqlMessage || err?.message || String(err);
        throw new Error(`Error al importar tabla ${entry.key}: ${detail}`);
      }
    }

    await setForeignKeyChecks(true, t);
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  console.log("Datos insertados correctamente desde backup.json. Filas:", counts);
  return { ok: true, tables: counts };
};

/**
 * @param {{ updateMainBackup?: boolean }} options
 * - updateMainBackup true (default): copia con fecha en src/backups/ y actualiza src/database/backup.json
 * - updateMainBackup false: solo copia con fecha en src/backups/ (antes de recargar BD)
 */
export const saveBackup = async ({ updateMainBackup = true } = {}) => {
  try {
    const fetched = await Promise.all(
      BACKUP_TABLE_ENTRIES.map((entry) => entry.model.findAll({ raw: true })),
    );

    const backupData = {};
    BACKUP_TABLE_ENTRIES.forEach((entry, index) => {
      let rows = fetched[index];
      if (entry.sanitize && SANITIZE_CONFIG[entry.sanitize]) {
        rows = sanitizeRows(rows, SANITIZE_CONFIG[entry.sanitize]);
      }
      backupData[entry.key] = rows;
    });

    const normalized = prepareBackupForRestore(ensureBackupShape(backupData));
    const counts = summarizeBackupData(normalized);

    await fs.mkdir(backups, { recursive: true });

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const backupFileName = `backup-eddeli-${timestamp}.json`;
    const backupPath = resolve(backups, backupFileName);

    const payload = JSON.stringify(normalized, null, 2);
    await fs.writeFile(backupPath, payload, "utf8");
    if (updateMainBackup) {
      await fs.writeFile(backupFilePath, payload, "utf8");
    }

    console.log("Backup EdDeli guardado en:", backupPath);
    if (updateMainBackup) {
      console.log("backup.json principal actualizado:", backupFilePath);
    }
    console.log("Filas por tabla:", counts);
    return { backupPath, counts, mainBackupUpdated: updateMainBackup };
  } catch (error) {
    console.error("Error al guardar el backup:", error);
    throw error;
  }
};

/** Descarga JSON de respaldo EdDeli (GET /eddeliapi/comands/downloadBackup). */
export const downloadBackup = async (req, res) => {
  try {
    const { backupPath } = await saveBackup();
    res.download(backupPath, "backup-eddeli.json", (err) => {
      if (err) {
        console.error("Error al enviar el archivo:", err);
        res.status(500).send("Error al enviar el archivo.");
      }
    });
  } catch (error) {
    console.error("Error al realizar el backup:", error);
    res.status(500).send("Error al realizar el backup.");
  }
};
