import { AppSettings } from "../models/AppSettings.js";
import { sequelize } from "../database/connection.js";
import { DataTypes } from "sequelize";
import fs from "fs";
import path from "path";
import fileDirName from "../libs/file-dirname.js";

const { __dirname } = fileDirName(import.meta);
const IMG_BASE = path.resolve(__dirname, "../img");

export const DEFAULT_APP_SETTINGS = {
  id: 1,
  name: "EdDeli - Panadería, Pastelería y Repostería",
  alias: "EdDeli",
  version: "1.0.0",
  description: "Sistema de Gestión de Negocios",
  author: "SoftEd",
  logoPath: "sistema/logos/logo.jpeg",
  phone: "0969236901",
  socialWhatsapp: "https://wa.me/593969236901",
  socialFacebook: "https://facebook.com/profile.php?id=61581806494763",
  socialInstagram: "https://instagram.com/panaderia_eddeli",
  socialTiktok: "https://tiktok.com/@panaderia_eddeli",
  socialEmail: "panaderiaeddeli@gmail.com",
  mediaFolderPrefix: "sistema",
  cajaQuickCategoryMatch: "panader",
  walkInCustomerLabel: "Consumidor Final",
  timezone: "America/Guayaquil",
  showPublicCatalog: true,
  showPublicStoresPropia: true,
  showPublicStoresVitrina: true,
};

let cache = { ...DEFAULT_APP_SETTINGS };

export function getAppSettingsSync() {
  return cache;
}

export function mediaFolderPrefix() {
  const p = String(cache.mediaFolderPrefix || "sistema").trim() || "sistema";
  return p.replace(/\/+$/, "");
}

export function mediaSubfolder(...parts) {
  const segs = [mediaFolderPrefix(), ...parts].filter(Boolean);
  return segs.join("/");
}

export function logosFolder() {
  return mediaSubfolder("logos");
}

export function qrFolder() {
  return mediaSubfolder("qr");
}

export function defaultLogoPath(prefix = mediaFolderPrefix()) {
  return `${prefix}/logos/logo.jpeg`;
}

function ensureDirRel(rel) {
  if (!rel) return;
  fs.mkdirSync(path.join(IMG_BASE, rel), { recursive: true });
}

/** Carpetas estándar: {prefix}/logos y {prefix}/qr */
export function ensureStandardAssetDirs(prefix = mediaFolderPrefix()) {
  ensureDirRel(`${prefix}/logos`);
  ensureDirRel(`${prefix}/qr`);
}

async function migrateSettingsRow(row) {
  const prefix = String(row.mediaFolderPrefix || "sistema").trim() || "sistema";
  const canonicalLogo = `${prefix}/logos/logo.jpeg`;
  const patch = {};

  if (
    !row.logoPath ||
    row.logoPath === `${prefix}/logo.jpeg` ||
    row.logoPath === "EdDeli/logo.jpeg" ||
    row.logoPath === "EdDeli/logos/logo.jpeg"
  ) {
    patch.logoPath = canonicalLogo;
  }

  const tz = row.timezone != null ? String(row.timezone).trim() : "";
  if (!tz) {
    patch.timezone = DEFAULT_APP_SETTINGS.timezone;
  }

  if (Object.keys(patch).length) {
    await row.update(patch);
    Object.assign(row, patch);
  }

  ensureStandardAssetDirs(prefix);
  return row;
}

export function getMediaFolders() {
  const p = mediaFolderPrefix();
  return {
    video: [`${p}/media`, `${p}/videos`, "videos", "publicidad/videos"],
    audio: [`${p}/media`, `${p}/audio`, `${p}/music`, "publicidad/audio"],
    image: [`${p}/publicidad`, `${p}/ads`, `${p}/banners`],
  };
}

async function ensureAppSettingsSchema() {
  const qi = sequelize.getQueryInterface();
  let table;
  try {
    table = await qi.describeTable("app_settings");
  } catch {
    return;
  }
  if (!table.timezone) {
    await qi.addColumn("app_settings", "timezone", {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "America/Guayaquil",
    });
  }
  const boolCols = [
    ["showPublicCatalog", true],
    ["showPublicStoresPropia", true],
    ["showPublicStoresVitrina", true],
  ];
  for (const [col, def] of boolCols) {
    if (!table[col]) {
      await qi.addColumn("app_settings", col, {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: def,
      });
    }
  }
}

function asBool(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(s)) return false;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  return fallback;
}

export async function loadAppSettings() {
  await ensureAppSettingsSchema();
  await AppSettings.sync();
  let row = await AppSettings.findByPk(1);
  if (!row) {
    row = await AppSettings.create({ id: 1, ...DEFAULT_APP_SETTINGS });
  }
  row = await migrateSettingsRow(row);
  const raw = row.toJSON();
  cache = {
    ...DEFAULT_APP_SETTINGS,
    ...raw,
    showPublicCatalog: asBool(raw.showPublicCatalog, true),
    showPublicStoresPropia: asBool(raw.showPublicStoresPropia, true),
    showPublicStoresVitrina: asBool(raw.showPublicStoresVitrina, true),
  };
  ensureStandardAssetDirs(cache.mediaFolderPrefix);
  return cache;
}

export async function updateAppSettings(payload) {
  const patch = { ...payload };
  for (const key of [
    "showPublicCatalog",
    "showPublicStoresPropia",
    "showPublicStoresVitrina",
  ]) {
    if (key in patch) patch[key] = asBool(patch[key], true);
  }
  let row = await AppSettings.findByPk(1);
  if (!row) {
    row = await AppSettings.create({ id: 1, ...DEFAULT_APP_SETTINGS, ...patch });
  } else {
    await row.update(patch);
  }
  const raw = row.toJSON();
  cache = {
    ...DEFAULT_APP_SETTINGS,
    ...raw,
    showPublicCatalog: asBool(raw.showPublicCatalog, true),
    showPublicStoresPropia: asBool(raw.showPublicStoresPropia, true),
    showPublicStoresVitrina: asBool(raw.showPublicStoresVitrina, true),
  };
  return cache;
}

export function toPublicSettings(data = cache) {
  return {
    name: data.name,
    alias: data.alias,
    version: data.version,
    description: data.description,
    author: data.author,
    logoPath: data.logoPath,
    phone: data.phone,
    socials: {
      whatsapp: data.socialWhatsapp || "",
      facebook: data.socialFacebook || "",
      instagram: data.socialInstagram || "",
      tiktok: data.socialTiktok || "",
      email: data.socialEmail || "",
    },
    mediaFolderPrefix: data.mediaFolderPrefix,
    logoFolder: logosFolder(),
    qrFolder: qrFolder(),
    cajaQuickCategoryMatch: data.cajaQuickCategoryMatch || "",
    walkInCustomerLabel: data.walkInCustomerLabel || "Consumidor Final",
    timezone: data.timezone || "America/Guayaquil",
    showPublicCatalog: asBool(data.showPublicCatalog, true),
    showPublicStoresPropia: asBool(data.showPublicStoresPropia, true),
    showPublicStoresVitrina: asBool(data.showPublicStoresVitrina, true),
  };
}
