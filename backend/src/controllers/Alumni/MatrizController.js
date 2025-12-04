import { Careers,Periods,Matriz } from "../../models/Alumni.js";
import { Users } from "../../models/Users.js";
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

