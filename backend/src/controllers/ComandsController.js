import { createLicenseToken } from "../libs/jwt.js";
import { License } from "../models/License.js";
import { Logs } from "../models/Logs.js";
import { promises as fs } from "fs";
import "../database/registerEdDeliModels.js";
import {
  parseBackupJsonContent,
  recreateDatabaseFromBackup,
  saveBackup,
  writeBackupToDisk,
  getBackupsWorkbench,
  setMainBackupFromStored,
  deleteStoredBackup,
  pruneStoredBackupsAndSaveFresh,
  resolveStoredBackupPath,
  readBackupFileSummary,
  backupFilePath,
} from "../database/insertData.js";

export const saveBackupController = async (req, res) => {
  try {
    const { backupPath, counts } = await saveBackup();
    const users = counts?.Users ?? 0;
    const products = counts?.InventoryProduct ?? 0;
    let message = "Copia de seguridad guardada correctamente.";
    if (users === 0 && products === 0) {
      message +=
        " Advertencia: la BD está vacía; el JSON guardado no tendrá usuarios ni productos. Restaura backup.json desde tu PC antes.";
    }
    res.json({
      ok: true,
      message,
      path: backupPath,
      tables: counts,
    });
  } catch (error) {
    console.error("Error en saveBackupController:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al guardar el backup",
      error: error.message,
    });
  }
};

/** Subida de backup.json — ruta protegida: isAuthenticated + requireProgrammer (ComandsRoutes). */
export const uploadBackupController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No se envió ningún archivo",
      });
    }

    const content = req.file.buffer.toString("utf8");

    let normalized;
    try {
      normalized = parseBackupJsonContent(content);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        message: err.message || "El archivo no es un backup EdDeli válido",
        error: err.message,
      });
    }

    const { path: savedPath, tables } = await writeBackupToDisk(normalized);

    console.log("✅ backup.json EdDeli reemplazado en:", savedPath, tables);

    return res.json({
      ok: true,
      message:
        "Backup validado y guardado. Usa «Recargar BD» para aplicarlo a la base de datos.",
      path: savedPath,
      tables,
    });
  } catch (error) {
    console.error("❌ Error al subir y reemplazar backup:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al reemplazar el backup",
      error: error.message,
    });
  }
};

export const reloadBdController = async (req, res) => {
  try {
    const forceFull =
      req.query.forceFull === "1" ||
      req.query.forceFull === "true" ||
      String(process.env.DB_RESET_FORCE || "").trim() === "1";

    console.log(
      forceFull
        ? "🔄 Reiniciando base de datos (EdDeli) — recarga completa forzada…"
        : "🔄 Reiniciando base de datos (EdDeli) — comparando esquema…",
    );

    // Copia de seguridad del estado ACTUAL en src/backups/ — NO tocar backup.json
    // (el usuario pudo haber subido un JSON distinto que debe usarse en la recarga).
    let safetyBackupPath = null;
    try {
      const safety = await saveBackup({ updateMainBackup: false });
      safetyBackupPath = safety.backupPath;
      console.log("💾 Copia de seguridad previa (sin pisar backup.json):", safetyBackupPath);
    } catch (backupErr) {
      console.warn("⚠️ No se pudo guardar copia previa; se continúa con backup.json:", backupErr.message);
    }

    const insertResult = await recreateDatabaseFromBackup({ forceFull });
    const modeLabel =
      insertResult.resetMode === "fast"
        ? "recarga rápida (solo datos, esquema igual)"
        : insertResult.resetMode === "mixed"
          ? `recarga mixta (${insertResult.tablesRecreated?.length || 0} tablas recreadas)`
          : "recarga completa (esquema recreado)";
    console.log(`✅ Datos EdDeli insertados — ${modeLabel}`, insertResult.tables);

    return res.json({
      ok: true,
      message: `Base de datos restaurada desde backup.json (${modeLabel})`,
      resetMode: insertResult.resetMode,
      tablesRecreated: insertResult.tablesRecreated,
      tablesTruncated: insertResult.tablesTruncated,
      safetyBackup: safetyBackupPath,
      tables: insertResult.tables,
    });
  } catch (error) {
    console.error("❌ Error en reloadBdController:", error);
    return res.status(500).json({
      ok: false,
      message:
        "Error al reiniciar la base de datos. Si quedó vacía, restaura desde src/database/backup.json o src/backups/.",
      error: error.message,
    });
  }
};

export const getLogs = async (req, res) => {
  try {
    const data = await Logs.findAll();
    res.json(data);
  } catch (error) {
    console.error("Error al obtener logs:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const listBackupsController = async (req, res) => {
  try {
    const data = await getBackupsWorkbench();
    res.json(data);
  } catch (error) {
    console.error("listBackupsController:", error);
    res.status(500).json({ message: "Error al listar backups", error: error.message });
  }
};

export const setMainBackupController = async (req, res) => {
  try {
    const { filename } = req.params;
    const { path: savedPath, tables } = await setMainBackupFromStored(filename);
    res.json({
      ok: true,
      message: "backup.json actualizado desde la copia seleccionada. Usa «Recargar BD» en Comandos para aplicarlo.",
      path: savedPath,
      tables,
    });
  } catch (error) {
    console.error("setMainBackupController:", error);
    res.status(400).json({
      ok: false,
      message: error.message || "No se pudo establecer como backup fijo",
    });
  }
};

export const deleteStoredBackupController = async (req, res) => {
  try {
    const { filename } = req.params;
    await deleteStoredBackup(filename);
    res.json({ ok: true, message: "Copia de backup eliminada" });
  } catch (error) {
    console.error("deleteStoredBackupController:", error);
    res.status(400).json({
      ok: false,
      message: error.message || "No se pudo eliminar el backup",
    });
  }
};

export const pruneStoredBackupsController = async (req, res) => {
  try {
    const { deletedCount, filename, backupPath, counts } =
      await pruneStoredBackupsAndSaveFresh();
    res.json({
      ok: true,
      message:
        deletedCount > 0
          ? `Se eliminaron ${deletedCount} copia(s) y se guardó «${filename}» desde la BD actual.`
          : `Se guardó «${filename}» desde la BD actual.`,
      deletedCount,
      filename,
      path: backupPath,
      tables: counts,
    });
  } catch (error) {
    console.error("pruneStoredBackupsController:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "No se pudieron limpiar las copias guardadas",
    });
  }
};

export const downloadStoredBackupController = async (req, res) => {
  try {
    const filePath = resolveStoredBackupPath(req.params.filename);
    await fs.access(filePath);
    res.download(filePath, req.params.filename, (err) => {
      if (err) {
        console.error("downloadStoredBackup:", err);
        if (!res.headersSent) res.status(500).send("Error al descargar");
      }
    });
  } catch (error) {
    console.error("downloadStoredBackupController:", error);
    res.status(404).json({ message: error.message || "Backup no encontrado" });
  }
};

export const downloadMainBackupController = async (req, res) => {
  try {
    const summary = await readBackupFileSummary();
    if (!summary.exists) {
      return res.status(404).json({ message: "No existe backup.json en el servidor" });
    }
    res.download(backupFilePath, "backup.json", (err) => {
      if (err) {
        console.error("downloadMainBackup:", err);
        if (!res.headersSent) res.status(500).send("Error al descargar");
      }
    });
  } catch (error) {
    console.error("downloadMainBackupController:", error);
    res.status(500).json({ message: "Error al descargar backup.json" });
  }
};

export const createLicense = async (req, res) => {
  try {
    const payload = { time: "10 minutos" };
    const token = await createLicenseToken({ payload });
    const newData = await License.create({
      token,
      time: "10 minutos",
      name: "12345",
    });
    res.json({ message: "agregado con éxito", data: newData });
  } catch (error) {
    console.error("error al crear licencia:", error);
    res.status(500).json({ message: "Error al crear licencia" });
  }
};
