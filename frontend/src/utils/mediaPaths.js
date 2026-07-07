import { getActiveAppSettings } from "../context/AppSettingsContext.jsx";
import { MEDIA_PREFIX_FALLBACK } from "../config/deployEnv.js";

export function getMediaFolderPrefix() {
  return getActiveAppSettings().mediaFolderPrefix || MEDIA_PREFIX_FALLBACK;
}

export function mediaStoragePath(...segments) {
  return [getMediaFolderPrefix(), ...segments].filter(Boolean).join("/");
}
