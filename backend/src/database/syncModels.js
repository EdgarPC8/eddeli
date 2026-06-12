import { CashShift } from "../models/CashShift.js";
import { CashShiftMovement } from "../models/CashShiftMovement.js";
import { InventoryProduct, InventoryMovement } from "../models/Inventory.js";
import { Order } from "../models/Orders.js";
import { TaskPlan, TaskItem } from "../models/Tasks.js";
import { PublicidadCampaign, PublicidadPlaylistItem } from "../models/Publicidad.js";

const MODELS_TO_SYNC = [
  InventoryProduct,
  InventoryMovement,
  CashShift,
  CashShiftMovement,
  Order,
  TaskPlan,
  TaskItem,
  PublicidadCampaign,
  PublicidadPlaylistItem,
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
