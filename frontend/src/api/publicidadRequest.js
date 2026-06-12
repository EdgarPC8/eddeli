/**
 * API del módulo Publicidad — respuestas axios completas (para toast + message del backend).
 */
import axios, { authHeaders, buildImageUrl, pathFiles } from "./axios.js";
import { uploadImageRequest } from "./imgRequest.js";
import {
  MEDIA_FOLDERS,
  MEDIA_MODULES,
  mediaFileUrl,
  uploadMediaFile,
} from "./mediaRequest.js";
import { CONTENT_TYPES } from "../pages/eddeli/publicidad/constants.js";

export const PUBLICIDAD_IMG_FOLDER = "EdDeli/publicidad";

export const getCampaigns = () => axios.get("/publicidad/campaigns", authHeaders());

export const getCampaignById = (id) =>
  axios.get(`/publicidad/campaigns/${id}`, authHeaders());

/** Playlist pública para TV / kiosco (sin sesión). */
export const getCampaignPlayback = (id) =>
  axios.get(`/publicidad/campaigns/${id}/playback`);

/** Registro público de dispositivo TV/APK. */
export const registerPublicidadDevice = (deviceId, label = "") =>
  axios.post("/publicidad/devices/register", { deviceId, label });

/** Playlist pública por dispositivo aprobado (sin sesión). */
export const getDevicePlayback = (deviceId) =>
  axios.get(`/publicidad/devices/${encodeURIComponent(deviceId)}/playback`);

export const getPublicidadDevices = () =>
  axios.get("/publicidad/devices", authHeaders());

export const updatePublicidadDevice = (deviceId, payload) =>
  axios.put(`/publicidad/devices/${encodeURIComponent(deviceId)}`, payload, authHeaders());

export const deletePublicidadDevice = (deviceId) =>
  axios.delete(`/publicidad/devices/${encodeURIComponent(deviceId)}`, authHeaders());

export const createCampaign = (payload) =>
  axios.post("/publicidad/campaigns", payload, authHeaders());

export const updateCampaign = (id, payload) =>
  axios.put(`/publicidad/campaigns/${id}`, payload, authHeaders());

export const deleteCampaign = (id) =>
  axios.delete(`/publicidad/campaigns/${id}`, authHeaders());

export function normalizeMediaItem(item) {
  const isFileMedia =
    item.type === CONTENT_TYPES.VIDEO || item.type === "audio" || item.type === "video";
  const url = isFileMedia ? mediaFileUrl(item.mediaPath) : buildImageUrl(item.mediaPath);
  return { ...item, previewUrl: url };
}

export async function fetchMediaCatalog() {
  const res = await axios.get("/publicidad/media-catalog", authHeaders());
  const data = res.data || {};
  return {
    products: (data.products || []).map(normalizeMediaItem),
    images: (data.images || []).map(normalizeMediaItem),
    videos: (data.videos || []).map(normalizeMediaItem),
    audios: (data.audios || []).map(normalizeMediaItem),
  };
}

export async function uploadPublicidadImage(file, { name = "" } = {}) {
  const res = await uploadImageRequest({
    file,
    folder: PUBLICIDAD_IMG_FOLDER,
    name,
    replace: false,
  });
  const relPath = res.data?.data?.relativePath;
  const backendMsg = res.data?.message;
  if (!relPath) {
    const err = new Error(backendMsg || "No se recibió la ruta de la imagen");
    throw err;
  }
  const item = normalizeMediaItem({
    id: relPath,
    type: CONTENT_TYPES.IMAGE,
    title: res.data?.data?.fileName || file.name,
    subtitle: relPath,
    mediaPath: relPath,
  });
  return { data: item, message: backendMsg || "Imagen subida correctamente" };
}

export async function uploadPublicidadVideo(file, { title = "" } = {}) {
  const res = await uploadMediaFile(file, {
    mediaType: "video",
    module: MEDIA_MODULES.PUBLICIDAD,
    folder: MEDIA_FOLDERS.VIDEO,
    title: title || file.name,
  });
  const relPath = res?.relativePath || res?.data?.relativePath;
  if (!relPath) throw new Error(res?.message || "No se recibió la ruta del video");
  const item = normalizeMediaItem({
    id: relPath,
    type: CONTENT_TYPES.VIDEO,
    title: res?.data?.title || file.name,
    subtitle: relPath,
    mediaPath: relPath,
    durationHint: res?.data?.durationSeconds || 30,
  });
  return { data: item, message: "Video subido correctamente" };
}

export async function uploadPublicidadAudio(file, { title = "" } = {}) {
  const res = await uploadMediaFile(file, {
    mediaType: "audio",
    module: MEDIA_MODULES.PUBLICIDAD,
    folder: MEDIA_FOLDERS.AUDIO,
    title: title || file.name,
  });
  const relPath = res?.relativePath || res?.data?.relativePath;
  if (!relPath) throw new Error(res?.message || "No se recibió la ruta del audio");
  const item = normalizeMediaItem({
    id: relPath,
    type: "audio",
    title: res?.data?.title || file.name,
    subtitle: relPath,
    mediaPath: relPath,
    durationHint: res?.data?.durationSeconds || 180,
  });
  return { data: item, message: "Audio subido correctamente" };
}
