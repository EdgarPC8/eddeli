/** API gestión de archivos en servidor (/files). Solo Programador. */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const scanFilesRequest = ({ folder = "", maxDepth = 10 } = {}) =>
  axios.get(
    `/files/scan?folder=${encodeURIComponent(folder)}&maxDepth=${encodeURIComponent(maxDepth)}&includeAll=true`,
    auth()
  );

export const uploadFileRequest = ({ file, folder = "", name = "", replace = false }) => {
  const fd = new FormData();
  if (folder) fd.append("folder", folder);
  if (name) fd.append("name", name);
  fd.append("replace", String(!!replace));
  fd.append("file", file);
  return axios.post("/files/upload", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
};

export const deleteFileRequest = (relPath) =>
  axios.delete(`/files/delete?relPath=${encodeURIComponent(relPath)}`, auth());

export const downloadFilesFolderZipRequest = (folder = "") =>
  axios.get(`/files/download?folder=${encodeURIComponent(folder)}`, {
    ...auth(),
    responseType: "blob",
  });

export const deleteFilesFolderRequest = (folder, { force = false } = {}) =>
  axios.delete(
    `/files/folder?folder=${encodeURIComponent(folder)}&force=${encodeURIComponent(force)}`,
    auth()
  );

export const downloadOneFileRequest = (relPath) =>
  axios.get(`/files/file/download?relPath=${encodeURIComponent(relPath)}`, {
    ...auth(),
    responseType: "blob",
  });

export const saveBlobAsFile = (blob, filename = "archivo") => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
