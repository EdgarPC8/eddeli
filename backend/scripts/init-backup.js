/**
 * Crea src/database/backup.json si falta (tras git clone).
 * Uso: npm run db:init-backup
 */
import { ensureBackupFileExists } from "../src/database/insertData.js";

const result = await ensureBackupFileExists();
if (result.created) {
  console.log("✅ Creado:", result.path);
} else {
  console.log("ℹ️  Ya existe:", result.path);
}
