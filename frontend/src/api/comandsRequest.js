/**
 * Peticiones de comandos admin: backup, recarga BD, logs.
 */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const reloadBD = () =>
  axios.get("/comands/reloadBD", { ...auth(), timeout: 120000 });

export const saveBackup = () =>
  axios.get("/comands/saveBackup", { ...auth(), timeout: 60000 });

export const getLogs = () => axios.get("/comands/getLogs", auth());

export const downloadBackup = async () => {
  const response = await axios.get("/comands/downloadBackup", {
    ...auth(),
    responseType: "blob",
    timeout: 90000,
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-tienda.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return response;
};

export const uploadBackup = (formData) => {
  const authorization = jwt();
  return axios.post("/comands/upload-backup", formData, {
    headers: authorization ? { Authorization: authorization } : {},
    timeout: 120000,
  });
};
