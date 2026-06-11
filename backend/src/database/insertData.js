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
} from "../models/Inventory.js";
import { Customer, Order, OrderItem } from "../models/Orders.js";
import {
  Expense,
  Income,
  ItemGroup,
  ItemGroupItem,
  Payment,
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
  { key: "TaskPlan", model: TaskPlan },
  { key: "TaskItem", model: TaskItem },
  { key: "Expense", model: Expense },
  { key: "Income", model: Income },
  { key: "Store", model: Store },
  { key: "HomeProduct", model: HomeProduct },
  { key: "Catalog", model: Catalog },
  { key: "StoreProduct", model: StoreProduct },
  { key: "ItemGroup", model: ItemGroup },
  { key: "ItemGroupItem", model: ItemGroupItem },
  { key: "Payment", model: Payment },
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

  return data;
}

/** Respaldo / restore solo tablas EdDeli (inventario, pedidos, finanzas, editor, notificaciones, cuentas). Quiz, forms, alumni, CV → softed/backend. */
export const insertData = async () => {
  try {
    await fs.access(backupFilePath);
    console.log("El archivo de respaldo ya existe.");

    const data = await fs.readFile(backupFilePath, "utf8");
    const jsonData = prepareBackupForRestore(JSON.parse(data));

    const t = await sequelize.transaction();
    try {
      const opt = { ...BULK_OPT, transaction: t };

      for (const entry of BACKUP_TABLE_ENTRIES) {
        const rows = jsonData[entry.key];
        await entry.model.bulkCreate(Array.isArray(rows) ? rows : [], opt);
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    console.log("Datos insertados correctamente desde el archivo de respaldo (EdDeli).");
    return { ok: true };
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(
        backupFilePath,
        JSON.stringify({ Roles: [], Users: [], Account: [] }, null, 2)
      );
      console.log("Archivo de respaldo creado: backup.json");
      return { ok: true, createdEmptyBackup: true };
    }
    console.error("Error al insertar datos:", error);
    throw error;
  }
};

export const saveBackup = async () => {
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

    const counts = summarizeBackupData(backupData);

    await fs.mkdir(backups, { recursive: true });

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const backupFileName = `backup-${timestamp}.json`;
    const backupPath = resolve(backups, backupFileName);

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));

    console.log("Backup EdDeli guardado en:", backupPath);
    console.log("Filas por tabla:", counts);
    return { backupPath, counts };
  } catch (error) {
    console.error("Error al guardar el backup:", error);
    throw error;
  }
};

/** Descarga JSON de respaldo EdDeli (GET /eddeliapi/comands/downloadBackup). */
export const downloadBackup = async (req, res) => {
  try {
    const { backupPath } = await saveBackup();
    res.download(backupPath, (err) => {
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
