/** API configuración de la app (nombre, versión, logo, autores). */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const getAppSettingsRequest = () => axios.get("/app-settings");

export const updateAppSettingsRequest = (data) =>
  axios.put("/app-settings", data, auth());

export const uploadAppLogoRequest = (file) => {
  const fd = new FormData();
  fd.append("logo", file);
  return axios.post("/app-settings/logo", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
};
