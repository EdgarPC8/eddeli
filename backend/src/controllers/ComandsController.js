import { createLicenseToken } from "../libs/jwt.js";
import { License } from "../models/License.js";
import { Logs } from "../models/Logs.js";
import { sequelize } from "../database/connection.js";
import "../database/registerEdDeliModels.js";
import { backupFilePath, insertData, saveBackup } from "../database/insertData.js";
import { promises as fs } from "fs";

export const saveBackupController = async (req, res) => {
  try {
    const { backupPath, counts } = await saveBackup();
    res.json({
      ok: true,
      message: "Copia de seguridad guardada correctamente.",
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

export const uploadBackupController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No se envió ningún archivo",
      });
    }

    const content = req.file.buffer.toString("utf8");

    let jsonData;
    try {
      jsonData = JSON.parse(content);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        message: "El archivo no es un JSON válido",
        error: err.message,
      });
    }

    await fs.writeFile(backupFilePath, JSON.stringify(jsonData, null, 2));

    console.log("✅ backup.json EdDeli reemplazado en:", backupFilePath);

    return res.json({
      ok: true,
      message: "Backup original reemplazado correctamente",
      path: backupFilePath,
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
    console.log("🔄 Reiniciando base de datos (EdDeli)...");

    let safetyBackupPath = null;
    try {
      const safety = await saveBackup();
      safetyBackupPath = safety.backupPath;
      console.log("💾 Copia de seguridad previa guardada en:", safetyBackupPath);
    } catch (backupErr) {
      console.warn("⚠️ No se pudo guardar copia previa; se continúa con backup.json:", backupErr.message);
    }

    const dialect = sequelize.getDialect?.() || "mysql";

    if (dialect === "mysql") {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
      try {
        await sequelize.sync({ force: true });
      } finally {
        await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      }
    } else {
      await sequelize.sync({ force: true });
    }
    console.log("📦 Tablas recreadas");

    await insertData();
    console.log("✅ Datos EdDeli insertados desde backup.json");

    return res.json({
      ok: true,
      message: "Base de datos reiniciada e inicializada desde backup.json (EdDeli)",
      safetyBackup: safetyBackupPath,
    });
  } catch (error) {
    console.error("❌ Error en reloadBdController:", error);
    return res.status(500).json({
      ok: false,
      message:
        "Error al reiniciar la base de datos. Si quedó vacía, restaura desde src/database/backups/ o backup.json.",
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
