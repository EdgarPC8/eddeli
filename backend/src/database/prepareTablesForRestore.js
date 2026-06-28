import { sequelize } from "./connection.js";
import { auditBackupTablesSchema, resolveTableName } from "./dbSchemaCompare.js";

async function setForeignKeyChecks(enabled) {
  const dialect = sequelize.getDialect?.() || "mysql";
  if (dialect !== "mysql") return;
  await sequelize.query(`SET FOREIGN_KEY_CHECKS = ${enabled ? 1 : 0}`);
}

async function truncateTable(model) {
  const tableName = resolveTableName(model);
  await sequelize.query(`TRUNCATE TABLE \`${tableName}\``);
}

async function dropAndSyncTable(model) {
  const tableName = resolveTableName(model);
  await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  await model.sync();
}

/**
 * Prepara tablas antes de importar backup.json.
 * - Si el esquema coincide: solo TRUNCATE (rápido).
 * - Si cambió: DROP + CREATE solo en esas tablas.
 */
export async function prepareTablesForRestore(entries, { forceFull = false } = {}) {
  const audit = await auditBackupTablesSchema(entries);
  const mismatchKeys = new Set(audit.mismatched.map((m) => m.key));

  await setForeignKeyChecks(false);
  try {
    if (forceFull) {
      const dialect = sequelize.getDialect?.() || "mysql";
      if (dialect === "mysql") {
        await sequelize.sync({ force: true });
      } else {
        await sequelize.sync({ force: true });
      }
      return {
        mode: "full",
        allMatch: audit.allMatch,
        recreated: entries.map((e) => e.key),
        truncated: [],
        schemaAudit: audit.results,
      };
    }

    if (audit.allMatch) {
      for (const entry of [...entries].reverse()) {
        await truncateTable(entry.model);
      }
      return {
        mode: "fast",
        allMatch: true,
        recreated: [],
        truncated: entries.map((e) => e.key),
        schemaAudit: audit.results,
      };
    }

    const recreated = [];
    const truncated = [];

    for (const entry of entries) {
      if (mismatchKeys.has(entry.key)) {
        await dropAndSyncTable(entry.model);
        recreated.push(entry.key);
      } else {
        await truncateTable(entry.model);
        truncated.push(entry.key);
      }
    }

    return {
      mode: "mixed",
      allMatch: false,
      recreated,
      truncated,
      schemaAudit: audit.results,
    };
  } finally {
    await setForeignKeyChecks(true);
  }
}
