/**
 * Borra todas las tablas, las recrea y carga backup.json.
 * Uso: npm run db:reset
 */
import "dotenv/config";
import "../src/database/registerEdDeliModels.js";
import { sequelize } from "../src/database/connection.js";
import {
  recreateDatabaseFromBackup,
  readBackupFileSummary,
} from "../src/database/insertData.js";

try {
  await sequelize.authenticate();
  console.warn("⚠️  Reseteando BD desde backup.json…");
  console.warn(
    `   MySQL: ${process.env.DB_USER || "root"}@${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "softed"}`,
  );

  const summary = await readBackupFileSummary();
  console.warn(`   Archivo: ${summary.path}`);
  console.warn(`   Tamaño: ${summary.sizeMB} MB · Filas totales: ${summary.totalRows}`);
  console.warn("   Por tabla:", summary.counts);

  if (summary.totalRows <= 4 || (summary.counts.Users ?? 0) === 0) {
    console.warn("");
    console.warn("⚠️  backup.json casi vacío o sin usuarios — el reset no traerá tus datos reales.");
    console.warn("   Este archivo NO baja con git clone. Cópialo desde tu PC, por ejemplo:");
    console.warn("   scp backend/src/database/backup.json root@SERVIDOR:/var/www/html/eddeli/backend/src/database/");
    console.warn("   O en la app: Comandos → Subir backup.json → Recargar BD");
    console.warn("");
  }

  const result = await recreateDatabaseFromBackup();
  console.log("✅ BD reseteada.", result.tables);
  process.exit(0);
} catch (error) {
  console.error("❌ Error reseteando BD:", error?.message || error);
  if (error?.parent?.sqlMessage) {
    console.error("   SQL:", error.parent.sqlMessage);
  }
  process.exit(1);
}
