import { CashShift } from "../models/CashShift.js";
import { CashShiftMovement } from "../models/CashShiftMovement.js";
import { InventoryProduct, InventoryMovement, InventoryCategory, ProductCompareGroup, ProductCompareGroupItem, PricingTierGroup } from "../models/Inventory.js";
import { Order, Supplier, SupplierOrder, SupplierOrderItem } from "../models/Orders.js";
import { TaskPlan, TaskItem } from "../models/Tasks.js";
import { PublicidadCampaign, PublicidadPlaylistItem, PublicidadDevice } from "../models/Publicidad.js";
import { MediaAsset } from "../models/MediaAsset.js";
import { FinancialObligation, ObligationPayment, Income, Expense, Payment, RecurringExpenseTemplate, RecurringExpenseOccurrence } from "../models/Finance.js";
import { DocumentAttachment } from "../models/DocumentAttachment.js";
import { NotificationProgram, NotificationDispatchLog } from "../models/NotificationProgram.js";
import { Notifications } from "../models/Notifications.js";

const MODELS_TO_SYNC = [
  InventoryProduct,
  InventoryMovement,
  InventoryCategory,
  ProductCompareGroup,
  ProductCompareGroupItem,
  PricingTierGroup,
  CashShift,
  CashShiftMovement,
  Order,
  Supplier,
  SupplierOrder,
  SupplierOrderItem,
  TaskPlan,
  TaskItem,
  MediaAsset,
  PublicidadCampaign,
  PublicidadPlaylistItem,
  PublicidadDevice,
  FinancialObligation,
  ObligationPayment,
  RecurringExpenseTemplate,
  RecurringExpenseOccurrence,
  Income,
  Expense,
  Payment,
  DocumentAttachment,
  NotificationProgram,
  NotificationDispatchLog,
  Notifications,
];

/** true solo si DB_SYNC_ALTER=1|true|yes (evita ALTER TABLE en cada reinicio de nodemon). */
export function isDbAlterSyncEnabled() {
  const v = String(process.env.DB_SYNC_ALTER || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Alinea tablas con los modelos Sequelize.
 * En desarrollo normal NO se ejecuta: usa `npm run db:sync` tras cambiar modelos.
 */
export async function syncDatabaseSchema({ alter = isDbAlterSyncEnabled(), force = false } = {}) {
  if (!alter && !force) {
    return { skipped: true, reason: "DB_SYNC_ALTER no está activo" };
  }

  for (const model of MODELS_TO_SYNC) {
    await model.sync({ alter: force ? false : alter, force });
  }

  return { skipped: false, models: MODELS_TO_SYNC.map((m) => m.tableName || m.name) };
}
