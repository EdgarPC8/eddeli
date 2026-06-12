/**
 * Borra todas las tablas, las recrea y carga backup.json.
 * Uso: npm run db:reset
 */
import "dotenv/config";
import "../src/database/registerEdDeliModels.js";
import { sequelize } from "../src/database/connection.js";
import { recreateDatabaseFromBackup } from "../src/database/insertData.js";

try {
  await sequelize.authenticate();
  console.warn("⚠️  Reseteando BD desde backup.json…");
  console.warn("   (Si no existe, se crea desde backup.json.example — sube tu JSON en Comandos para datos reales)");
  const result = await recreateDatabaseFromBackup();
  console.log("✅ BD reseteada.", result.tables);
  process.exit(0);
} catch (error) {
  console.error("❌ Error reseteando BD:", error);
  process.exit(1);
}
