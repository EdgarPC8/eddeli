/** Valores por defecto si el API de configuración no responde. */
export const APP_SETTINGS_FALLBACK = {
  name: "EdDeli - Panadería, Pastelería y Repostería",
  alias: "EdDeli",
  version: "1.0.0",
  description: "Sistema de Gestión de Negocios",
  author: "SoftEd",
  logoPath: "sistema/logos/logo.jpeg",
  phone: "",
  socials: {
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    email: "",
  },
  mediaFolderPrefix: "sistema",
  cajaQuickCategoryMatch: "panader",
  walkInCustomerLabel: "Consumidor Final",
};

/** @deprecated Usar useAppSettings() o getActiveAppSettings() */
export const activeApp = {
  logo: "./logo.jpeg",
  name: APP_SETTINGS_FALLBACK.name,
  alias: APP_SETTINGS_FALLBACK.alias,
  version: APP_SETTINGS_FALLBACK.version,
  description: APP_SETTINGS_FALLBACK.description,
  author: APP_SETTINGS_FALLBACK.author,
  phone: APP_SETTINGS_FALLBACK.phone,
  socials: APP_SETTINGS_FALLBACK.socials,
  year: new Date().getFullYear(),
  background: "#fff8f2",
};

export const activeAppId = "eddeli";
