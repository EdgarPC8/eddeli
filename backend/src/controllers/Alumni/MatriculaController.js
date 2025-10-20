import { Matricula } from "../../models/Alumni.js";


export const addMatriculasBulk = async (req, res) => {

    const matriculas = req.body; // [{ci, nombre, apellido, ...}, ...]

    if (!Array.isArray(matriculas) || matriculas.length === 0) {
      return res.status(400).json({ message: "No hay matriculas para registrar" });
    }
  
    try {
      const resultado = await Matricula.bulkCreate(matriculas, {
        returning: true,
      });
  
      res.json({
        insertados: resultado.length,
        detalles: resultado,
      });
    } catch (error) {
      console.error("Error al insertar matriculas:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
    
  }

  export const getMatriculas = async (req, res) => {
    try {
      const users = await Matricula.findAll();
      // Verifica si los usuarios existen
      if (!users || users.length === 0) {
        return res.json([]);
      }
      res.json(users);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
    };

