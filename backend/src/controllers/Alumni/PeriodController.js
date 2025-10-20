

import {Periods } from "../../models/Alumni.js";

export const getPeriods = async (req, res) => {
  const data = await Periods.findAll();
  res.json(data);
};

export const addPeriod = async (req, res) => {
  const data = req.body; // Suponiendo que los datos están en el cuerpo de la solicitud
  try {
    await Periods.create(data);
    res.json({ message: `Agregado con éxito` });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const editPeriod = async (req, res) => {
  const data = req.body;
  const carrer = req.params;
  try {
   await Periods.update(data, {
      where: {
        id: carrer.periodId,
      },
    });
    res.json({ message: "Periodo Editado con éxito" });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const deletePeriod= async (req, res) => {
  const { id } = req.params;
  try {
    const form = await Periods.findByPk(id);
    if (!form) {
      return res.status(404).json({ message: "Periodo no encontrado." });
    }
    await form.destroy(); // Esto elimina el formulario, y si está en cascada, también sus preguntas y opciones
    res.json({ message: "Periodo eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el Periodo:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};