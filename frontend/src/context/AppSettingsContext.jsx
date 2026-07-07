import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchAppSettings } from "../api/appSettingsRequest.js";
import { APP_SETTINGS_FALLBACK } from "../config/appInfo.js";
import { buildImageUrl } from "../api/axios.js";

const AppSettingsContext = createContext(null);

function toActiveApp(settings) {
  const s = settings || APP_SETTINGS_FALLBACK;
  const logoPath = s.logoPath || APP_SETTINGS_FALLBACK.logoPath;
  const prefix = s.mediaFolderPrefix || APP_SETTINGS_FALLBACK.mediaFolderPrefix || "app";
  return {
    name: s.name,
    alias: s.alias,
    version: s.version,
    description: s.description,
    author: s.author,
    phone: s.phone || "",
    socials: s.socials || APP_SETTINGS_FALLBACK.socials,
    logoPath,
    logoUrl: logoPath?.startsWith("http") ? logoPath : buildImageUrl(logoPath),
    mediaFolderPrefix: prefix,
    logoFolder: s.logoFolder || `${prefix}/logos`,
    qrFolder: s.qrFolder || `${prefix}/qr`,
    cajaQuickCategoryMatch: s.cajaQuickCategoryMatch || "",
    walkInCustomerLabel: s.walkInCustomerLabel || "Consumidor Final",
    year: new Date().getFullYear(),
    background: "#fff8f2",
  };
}

function applyBrandingToDocument(activeApp) {
  if (activeApp?.name) document.title = activeApp.alias || activeApp.name;
  if (!activeApp?.logoUrl) return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/jpeg";
  link.href = activeApp.logoUrl;
}

let settingsStore = toActiveApp(APP_SETTINGS_FALLBACK);
export function getActiveAppSettings() {
  return settingsStore;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) return { settings: settingsStore, loading: false, reload: async () => {} };
  return ctx;
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(APP_SETTINGS_FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchAppSettings();
      setSettings(data);
      settingsStore = toActiveApp(data);
      applyBrandingToDocument(settingsStore);
    } catch {
      settingsStore = toActiveApp(APP_SETTINGS_FALLBACK);
      applyBrandingToDocument(settingsStore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeApp = useMemo(() => toActiveApp(settings), [settings]);

  useEffect(() => {
    applyBrandingToDocument(activeApp);
  }, [activeApp]);

  const value = useMemo(
    () => ({
      settings,
      activeApp,
      loading,
      reload: load,
      setSettings: (next) => {
        setSettings(next);
        settingsStore = toActiveApp(next);
      },
    }),
    [settings, activeApp, loading],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}
