/** Datos extendidos del usuario autenticado (contacto, dirección, etc.). */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const getMyUserData = () => axios.get("/users/me/data", auth());

export const updateMyUserData = (data) => axios.put("/users/me/data", data, auth());
