import { createLicenseToken } from "../libs/jwt.js";
import { License } from "../models/License.js";
import { Logs } from "../models/Logs.js";

  

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




