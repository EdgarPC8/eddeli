import { Logs } from "../models/Logs.js";

export const logger = ({ httpMethod, endPoint, action,description,system }) => {
  try {
    const createLog = Logs.create({ httpMethod, endPoint, action,description,system });
  } catch (error) {
    console.log("ocurrio un error", error);
  }
};

