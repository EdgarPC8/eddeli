import { Careers, Periods, Matriz } from "../../models/Alumni.js";
import { Users } from "../../models/Users.js";
import { sequelize } from "../../database/connection.js";

/** Extrae un año de 4 dígitos de grateDate (string tipo "2024", "2024-01-15", etc.) */
function extractYear(grateDate) {
  if (grateDate == null || grateDate === "") return null;
  const str = String(grateDate).trim();
  const match = str.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

/** Estadísticas de títulos (matriz) por carrera y género en una sola consulta; usa grateDate para rango de años */
export const getMatrizStats = async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT 
        m.idMatriz,
        m.idCareer,
        m.idUser,
        m.grateDate,
        c.name AS careerName,
        u.gender AS userGender
       FROM alumni_matrices m
       LEFT JOIN users u ON m.idUser = u.id
       LEFT JOIN alumni_careers c ON m.idCareer = c.idCareer`
    );

    const byCareer = {};
    let total = 0;
    let masculino = 0;
    let femenino = 0;
    const years = [];

    for (const row of rows) {
      const rawCareer = row.careerName ?? row.careername;
      const rawGender = row.userGender ?? row.usergender;
      const careerName = rawCareer && String(rawCareer).trim() ? String(rawCareer) : "Sin carrera";
      const gender = (rawGender && String(rawGender).toUpperCase().trim().slice(0, 1)) || "";

      const y = extractYear(row.grateDate ?? row.gratedate);
      if (y != null) years.push(y);

      if (!byCareer[careerName]) {
        byCareer[careerName] = { carrera: careerName, masculino: 0, femenino: 0, total: 0 };
      }
      byCareer[careerName].total += 1;
      total += 1;

      if (gender === "M") {
        byCareer[careerName].masculino += 1;
        masculino += 1;
      } else if (gender === "F") {
        byCareer[careerName].femenino += 1;
        femenino += 1;
      }
    }

    const byCareerList = Object.values(byCareer).sort((a, b) => b.total - a.total);
    const yearFrom = years.length ? Math.min(...years) : new Date().getFullYear();
    const yearTo = years.length ? Math.max(...years) : new Date().getFullYear();
    const subtitle =
      yearFrom === yearTo
        ? `Títulos emitidos (año ${yearFrom})`
        : `Títulos emitidos (desde ${yearFrom} hasta ${yearTo})`;

    res.json({
      title: "ALUMNI EN CIFRAS",
      subtitle,
      yearFrom,
      yearTo,
      source: "Sistema de Gestión de Títulos",
      cutOffDate: new Date().toISOString().slice(0, 10),
      total,
      masculino,
      femenino,
      byCareer: byCareerList,
    });
  } catch (error) {
    console.error("Error getMatrizStats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de la matriz." });
  }
};

export const getMatriz = async (req, res) => {
    try {
      const matriz = await Matriz.findAll({
        attributes: ["idMatriz", "grateDate", "modality"],
        include: [
          {
            model: Users,
            attributes: [
              "firstName",
              "secondName",
              "firstLastName",
              "secondLastName",
              "ci",
            ],
          },
          { model: Careers},
          { model: Periods},
        ],
      });
      
  
      res.json(matriz);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Hubo un problema al obtener los datos de la matriz." });
    }
  };

  export const addMatriz = async (req, res) => {
    const data = req.body; // Suponiendo que los datos están en el cuerpo de la solicitud
    try {
      await Matriz.create(data);
      res.json({ message: `Agregado con éxito` });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  export const editMatriz = async (req, res) => {
    const data = req.body;
    const carrer = req.params;
    try {
     await Matriz.update(data, {
        where: {
          id: carrer.periodId,
        },
      });
      res.json({ message: "Matriz a con éxito" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

  export const deleteMatriz= async (req, res) => {
    const { id } = req.params;
    try {
      const form = await Matriz.findByPk(id);
      if (!form) {
        return res.status(404).json({ message: "Matriz no encontrada." });
      }
      await form.destroy(); // Esto elimina el formulario, y si está en cascada, también sus preguntas y opciones
      res.json({ message: "Matriz eliminada correctamente." });
    } catch (error) {
      console.error("Error al eliminar la Matriz:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };

