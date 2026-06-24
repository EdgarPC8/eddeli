/**
 * Compara modelos vs backup.json vs BACKUP_TABLE_ENTRIES.
 * Uso: node scripts/audit-backup-tables.js
 */
import { readFileSync } from "fs";
import { BACKUP_TABLE_ENTRIES, backupFilePath } from "../src/database/insertData.js";

const data = JSON.parse(readFileSync(backupFilePath, "utf8"));
const backupKeys = Object.keys(data).filter((k) => Array.isArray(data[k]));
const registered = BACKUP_TABLE_ENTRIES.map((e) => e.key);

const inBackupNotRegistered = backupKeys.filter((k) => !registered.includes(k));
const registeredNotInBackup = registered.filter((k) => !backupKeys.includes(k));
const empty = registered.filter((k) => !data[k] || data[k].length === 0);

const modelsNotInBackup = [];

console.log("=== AUDITORÍA BACKUP EdDeli ===\n");
console.log(`Tablas registradas en insertData: ${registered.length}`);
console.log(`Claves con array en backup.json: ${backupKeys.length}\n`);

console.log("--- En JSON pero NO en BACKUP_TABLE_ENTRIES ---");
if (inBackupNotRegistered.length === 0) console.log("(ninguna)");
else inBackupNotRegistered.forEach((k) => console.log(`  ${k}: ${data[k].length} filas`));

console.log("\n--- En BACKUP_TABLE_ENTRIES pero sin clave en JSON ---");
if (registeredNotInBackup.length === 0) console.log("(ninguna)");
else registeredNotInBackup.forEach((k) => console.log(`  ${k}`));

console.log("\n--- Registradas en backup con 0 filas ---");
empty.forEach((k) => console.log(`  ${k}`));

console.log("\n--- Modelos EdDeli registrados sin entrada en backup ---");
if (modelsNotInBackup.length === 0) console.log("(ninguno — todas las tablas del módulo están en BACKUP_TABLE_ENTRIES)");
else modelsNotInBackup.forEach((k) => console.log(`  ${k}`));

console.log("\n--- Conteo por tabla (backup.json) ---");
for (const { key } of BACKUP_TABLE_ENTRIES) {
  const n = Array.isArray(data[key]) ? data[key].length : 0;
  if (n > 0) console.log(`  ${key}: ${n}`);
}
