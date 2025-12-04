import multer from "multer";
import { join, extname } from "path";
import fileDirName from "../libs/file-dirname.js";
import { unlink } from "fs/promises";
import { Users } from "../models/Users.js";

const { __dirname } = fileDirName(import.meta);

// Definir la ruta de destino para las imágenes
const photosDestination = join(__dirname, "../img/photos");

const diskStorage = multer.diskStorage({
  destination: photosDestination,
  filename: async(req, file, callback) => {


    const photoName = `userPhotoProfileId${
      req.params.userId 
    }${extname(file.originalname)}`;
    callback(null, photoName);
    await Users.update(
      { photo: photoName },
      { where: { id: req.params.userId } },
    );
  },
});


 const deletePhoto = async (req, res) => {
  const { photo: photoToDelete } = await Users.findOne({
    attributes: ["photo"],
    where: { id: req.params.userId },
  });
  try {
    await unlink(join(photosDestination, photoToDelete));
    await Users.update(
      { photo: null },
      { where: { id: req.params.userId } },
    );

    res.json({ message: "Foto de Perfil eleminada con éxito" });
  } catch (error) {
    if(photoToDelete==null){
      return res.status(500).json({
        message: "No existe imagen para eliminar",
      });
    
    }else{
      return res.status(500).json({
        message: error.message,
      });
    }

    
  }
};

const upload = multer({ storage: diskStorage }).single("photo");

const uploadPhoto = (req, res) => {
  upload(req, res, (err) => {

    if (err) {
      return res.status(500).json({
        message: `Error al subir la foto: ${err.message}`,
      });
    }

    // Si no hubo errores, devolver respuesta de éxito
    res.json({
      message: "Foto de perfil subida con éxito",
      photo: req.file.filename, // Aquí puedes devolver el nombre de la foto subida
    });
  });
};

export { uploadPhoto,deletePhoto };

