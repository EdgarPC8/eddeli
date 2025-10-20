import { sequelize } from "../../database/connection.js";
import { Careers, Matriz } from "../../models/Alumni.js";
import { Users } from "../../models/Users.js";


export const getCareers = async (req, res) => {
    const data = await Careers.findAll();
    res.json(data);
//     try {
//       // Consulta SQL cruda a la tabla importada
//       const [usuarios] = await sequelize.query(`
//   SELECT matrices.*, professionals.*,users.*
//   FROM matrices
//   LEFT JOIN professionals ON matrices.idProfessional = professionals.id
//   LEFT JOIN users ON users.ci = professionals.ci
// `);

// // const [usuarios] = await sequelize.query(`
// // SELECT * from matrices
// // `);
//         let valor="";
//       for (const element of usuarios) {
//           valor={
//             idUser:element.userId,
//             idCareer:element.career,
//             idPeriod:element.idPeriod,
//             grateDate:element.grateDate,
//             modality:element.modality,
//           }
//            await Matriz.create(valor);
//       }
//       res.status(200).json({ mensaje: 'Importación completada',data:valor });
//     } catch (error) {
//       console.error('Error al importar datos:', error);
//       res.status(500).json({ error: 'Error en la importación' });
//     }
  };


  
  export const addCareer = async (req, res) => {
    const data = req.body; // Suponiendo que los datos están en el cuerpo de la solicitud
    try {
      await Careers.create(data);
      res.json({ message: `Agregado con éxito` });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  export const editCareer = async (req, res) => {
    const data = req.body;
    const { id } = req.params;
    try {
     await Careers.update(data, {
        where: {
          idCareer: id,
        },
      });
      res.json({ message: "Carrera Editado con éxito" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

  export const deleteCareer= async (req, res) => {
    const { id } = req.params;
    try {
      const form = await Careers.findByPk(id);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado." });
      }
      await form.destroy(); // Esto elimina el formulario, y si está en cascada, también sus preguntas y opciones
      res.json({ message: "Carrera eliminada correctamente." });
    } catch (error) {
      console.error("Error al eliminar la Carrera:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };