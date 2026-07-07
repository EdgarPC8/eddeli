import {
  loadAppSettings,
  toPublicSettings,
  updateAppSettings,
  ensureStandardAssetDirs,
} from "../services/appSettingsService.js";

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
      "phone",
      "socialWhatsapp",
      "socialFacebook",
      "socialInstagram",
      "socialTiktok",
      "socialEmail",
      "mediaFolderPrefix",
      "cajaQuickCategoryMatch",
      "walkInCustomerLabel",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
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
