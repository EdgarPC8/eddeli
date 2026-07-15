import {
  loadAppSettings,
  toPublicSettings,
  updateAppSettings,
  ensureStandardAssetDirs,
} from "../services/appSettingsService.js";
import { getTimeStatus } from "../services/timeStatusService.js";

const IANA_TIMEZONE_RE = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;

export async function getAppSettings(req, res) {
  try {
    const data = await loadAppSettings();
    res.json(toPublicSettings(data));
  } catch (err) {
    console.error("getAppSettings", err);
    res.status(500).json({ message: "No se pudo cargar la configuración" });
  }
}

export async function putAppSettings(req, res) {
  try {
    const b = req.body || {};
    const allowed = [
      "name",
      "alias",
      "version",
      "description",
      "author",
      "logoPath",
      "iconPath",
      "phone",
      "socialWhatsapp",
      "socialFacebook",
      "socialInstagram",
      "socialTiktok",
      "socialEmail",
      "mediaFolderPrefix",
      "cajaQuickCategoryMatch",
      "walkInCustomerLabel",
      "timezone",
      "showPublicCatalog",
      "showPublicStoresPropia",
      "showPublicStoresVitrina",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
    }
    if (patch.timezone != null) {
      const tz = String(patch.timezone).trim();
      if (!IANA_TIMEZONE_RE.test(tz)) {
        return res.status(400).json({ message: "Zona horaria IANA inválida (ej. America/Guayaquil)" });
      }
      patch.timezone = tz;
    }
    if (patch.mediaFolderPrefix != null) {
      patch.mediaFolderPrefix = String(patch.mediaFolderPrefix).trim().replace(/\/+$/, "") || "app";
      ensureStandardAssetDirs(patch.mediaFolderPrefix);
    }
    const data = await updateAppSettings(patch);
    res.json({ message: "Configuración actualizada", settings: toPublicSettings(data) });
  } catch (err) {
    console.error("putAppSettings", err);
    res.status(500).json({ message: "No se pudo guardar la configuración" });
  }
}

export async function getAppTimeStatus(req, res) {
  try {
    const status = await getTimeStatus();
    res.json(status);
  } catch (err) {
    console.error("getAppTimeStatus", err);
    res.status(500).json({ message: "No se pudo obtener el estado del reloj" });
  }
}
