/**
 * API escalable de medios (video, audio) — reutilizable fuera de Publicidad.
 */
import axios, { authHeaders, jwt, pathFiles } from "./axios.js";
import { mediaStoragePath } from "../utils/mediaPaths.js";

export const MEDIA_MODULES = {
  PUBLICIDAD: "publicidad",
  GENERAL: "general",
};

export function getMediaFolders() {
  return {
    VIDEO: mediaStoragePath("videos"),
    AUDIO: mediaStoragePath("audio"),
  };
}

/** @deprecated usar getMediaFolders() */
export const MEDIA_FOLDERS = {
  get VIDEO() {
    return mediaStoragePath("videos");
  },
  get AUDIO() {
    return mediaStoragePath("audio");
  },
};

export function mediaFileUrl(relativePath) {
  if (!relativePath) return null;
  return `${pathFiles}${String(relativePath).replace(/^\/+/, "")}`;
}

export const getMediaCatalog = (params = {}) =>
  axios.get("/media/catalog", { ...authHeaders(), params });

export async function uploadMediaFile(file, { mediaType, module = "general", folder, title } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mediaType", mediaType);
  fd.append("module", module);
  if (folder) fd.append("folder", folder);
  if (title) fd.append("title", title);

  const res = await axios.post("/media/upload", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export const deleteMediaAsset = (id) =>
  axios.delete(`/media/${id}`, authHeaders());
