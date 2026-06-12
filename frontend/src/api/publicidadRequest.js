/**
 * API del módulo Publicidad — respuestas axios completas (para toast + message del backend).
 */
import axios, { authHeaders, buildImageUrl, pathFiles } from "./axios.js";
import { uploadImageRequest } from "./imgRequest.js";
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
  const isVideo = item.type === CONTENT_TYPES.VIDEO;
  const url = isVideo
    ? `${pathFiles}${String(item.mediaPath || "").replace(/^\/+/, "")}`
    : buildImageUrl(item.mediaPath);
  return { ...item, previewUrl: url };
}

export async function fetchMediaCatalog() {
  const res = await axios.get("/publicidad/media-catalog", authHeaders());
  const data = res.data || {};
  return {
    products: (data.products || []).map(normalizeMediaItem),
    images: (data.images || []).map(normalizeMediaItem),
    videos: (data.videos || []).map(normalizeMediaItem),
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
