import { createLicenseToken } from "../libs/jwt.js";
import { License } from "../models/License.js";
import { Logs } from "../models/Logs.js";
import { sequelize } from "../database/connection.js";   // ajusta el path según tu estructura
import { backupFilePath, insertData, saveBackup } from "../database/insertData.js";
import { promises as fs } from "fs";
export const saveBackupController = async (req, res) => {
  try {
    const data = await saveBackup();
    res.json("ok");
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

    // El archivo viene en memoria porque vamos a usar memoryStorage
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

    // Si quieres, aquí podrías validar que tenga ciertas claves mínimas:
    // if (!jsonData.Roles || !jsonData.Users) { ... }

    // Sobrescribir el backup original
    await fs.writeFile(backupFilePath, JSON.stringify(jsonData, null, 2));

    console.log("✅ backup.json reemplazado en:", backupFilePath);

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
    console.log("🔄 Reiniciando base de datos...");

    // 1) Dropea TODAS las tablas y las vuelve a crear según los modelos
    await sequelize.sync({ force: true });
    console.log("📦 Tablas recreadas con sequelize.sync({ force: true })");

    // 2) Vuelve a insertar los datos desde backup.json
    await insertData();
    console.log("✅ Datos insertados desde backup.json");

    return res.json({
      ok: true,
      message: "Base de datos reiniciada e inicializada desde backup.json",
    });
  } catch (error) {
    console.error("❌ Error en reloadBdController:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al reiniciar la base de datos",
      error: error.message,
    });
  }
};


export const getLogs = async (req, res) => {
    try {

        const data = await Logs.findAll();
        res.json(data);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error en el servidor." });
    }
};
export const createLicense = async (req, res) => {
  try {
  
  //   const data= req.body;
  const payload={
    time:"10 minutos"
  }

  const token = await createLicenseToken({payload})

  const newData = await License.create({
    token:token,
    time:"10 minutos",
    name:"12345"
  });
  res.json({ message: `agregado con éxito`,data:newData});

  } catch (error) {
    // manejo de errores si ocurre algún problema durante la creación del usuario
    console.error("error al crear el rol:", error);
  }
};







