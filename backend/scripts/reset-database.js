/**
 * Borra todas las tablas, las recrea y carga backup.json.
 * Uso: npm run db:reset
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "../src/database/registerEdDeliModels.js";
import { sequelize } from "../src/database/connection.js";
import {
  recreateDatabaseFromBackup,
  requireValidBackupFile,
} from "../src/database/insertData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runFixExpenseReferenceFk() {
  const script = path.resolve(__dirname, "fix-expense-reference-fk.js");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: process.env,
      cwd: path.resolve(__dirname, ".."),
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`fix-expense-reference-fk exit ${code}`)),
    );
    child.on("error", reject);
  });
}

try {
  await sequelize.authenticate();
  console.warn("⚠️  Reseteando BD desde backup.json…");
  console.warn(
    `   MySQL: ${process.env.DB_USER || "root"}@${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "softed"}`,
  );

  const summary = await requireValidBackupFile();
  console.warn(`   Archivo: ${summary.path}`);
  console.warn(`   Tamaño: ${summary.sizeMB} MB · Filas totales: ${summary.totalRows}`);
  console.warn("   Por tabla:", summary.counts);

  const result = await recreateDatabaseFromBackup();
  await runFixExpenseReferenceFk();
  console.log(`✅ BD reseteada (modo: ${result.resetMode}).`, result.tables);
  if (result.tablesRecreated?.length) {
    console.log("   Tablas recreadas:", result.tablesRecreated.join(", "));
  }
  process.exit(0);
} catch (error) {
  console.error("❌ Error reseteando BD:", error?.message || error);
  if (error?.parent?.sqlMessage) {
    console.error("   SQL:", error.parent.sqlMessage);
  }
  process.exit(1);
}
