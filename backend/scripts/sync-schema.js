/**
 * Solo sincroniza esquema (tablas/columnas) con los modelos Sequelize.
 * No crea locales, no migra stock, no limpia datos ni IDs.
 *
 * Tras desplegar en el servidor:
 *   git pull && npm run db:sync
 *
 * Muestra qué tablas/columnas se crearon o cambiaron.
 * Para bodega/cajas/FK/stock → npm run db:prepare
 */
import "dotenv/config";
import { sequelize } from "../src/database/connection.js";
import "../src/database/registerEdDeliModels.js";
import { syncDatabaseSchema } from "../src/database/syncModels.js";
import { ensureCustomerNameSchema } from "../src/services/customerNameService.js";
import { ensureEntitlementTable } from "../src/services/entitlementService.js";
import {
  ensureStoreLocationKindEnum,
  ensureStoreIsVisibleColumn,
} from "../src/services/storeStockService.js";
import { ensureAccountIsActiveColumn } from "../src/models/Account.js";

try {
  await sequelize.authenticate();
  const [[dbRow]] = await sequelize.query(`SELECT DATABASE() AS db`);
  const dbName = dbRow?.db || process.env.DB_NAME || "?";
  console.log(`\n▶ npm run db:sync · ${dbName}@${process.env.DB_HOST || "localhost"}`);

  const result = await syncDatabaseSchema({ alter: true, verbose: true });

  console.log("\nParches / ensures adicionales…");
  await ensureStoreLocationKindEnum();
  await ensureStoreIsVisibleColumn();
  await ensureCustomerNameSchema();
  await ensureAccountIsActiveColumn();
  await ensureEntitlementTable({ alter: true });

  if (result.patches?.length) {
    console.log(`Parches críticos aplicados: ${result.patches.join(", ")}`);
  }
  if (result.failed?.length) {
    console.warn(`\n⚠ ${result.failed.length} tabla(s) con error (revisá arriba).`);
    for (const f of result.failed) {
      console.warn(`   · ${f.table}: ${f.message}`);
    }
  }

  console.log("\n✅ Esquema sincronizado (solo tablas/columnas).");
  console.log("   Si necesitás bodega/cajas/migración de stock: npm run db:prepare\n");
  process.exit(result.failed?.length ? 1 : 0);
} catch (error) {
  console.error("❌ Error sincronizando esquema:", error?.message || error);
  if (error?.parent?.sqlMessage) console.error("   SQL:", error.parent.sqlMessage);
  process.exit(1);
}
