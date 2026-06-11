/**
 * Sincroniza el esquema de BD con los modelos (ALTER TABLE).
 * Uso: npm run db:sync
 */
import { sequelize } from "../src/database/connection.js";
import { syncDatabaseSchema } from "../src/database/syncModels.js";

try {
  await sequelize.authenticate();
  const result = await syncDatabaseSchema({ alter: true });
  console.log("✅ Esquema sincronizado:", result.models?.join(", ") || "ok");
  process.exit(0);
} catch (error) {
  console.error("❌ Error sincronizando esquema:", error);
  process.exit(1);
}
