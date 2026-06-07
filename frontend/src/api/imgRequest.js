/** API gestión de imágenes en servidor (/img). Solo Programador. */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const scanImagesRequest = ({ folder = "", maxDepth = 10 } = {}) =>
  axios.get(
    `/img/scan?folder=${encodeURIComponent(folder)}&maxDepth=${encodeURIComponent(maxDepth)}&includeNonImages=false`,
    auth()
  );

export const uploadImageRequest = ({ file, folder = "", name = "", replace = false }) => {
  const fd = new FormData();
  if (folder) fd.append("folder", folder);
  if (name) fd.append("name", name);
  fd.append("replace", String(!!replace));
  fd.append("file", file);
  return axios.post("/img/upload", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
};

export const deleteImageRequest = (relPath) =>
  axios.delete(`/img/delete?relPath=${encodeURIComponent(relPath)}`, auth());

export const downloadFolderZipRequest = (folder = "") =>
  axios.get(`/img/download?folder=${encodeURIComponent(folder)}`, {
    ...auth(),
    responseType: "blob",
  });

export const deleteFolderRequest = (folder, { force = false } = {}) =>
  axios.delete(
    `/img/folder?folder=${encodeURIComponent(folder)}&force=${encodeURIComponent(force)}`,
    auth()
  );
