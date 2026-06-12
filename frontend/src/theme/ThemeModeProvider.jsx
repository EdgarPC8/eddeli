/**
 * Contexto único de tema EdDeli (modo claro/oscuro/neón + ThemeProvider MUI).
 *
 * Toda la app debe envolver con <ThemeModeProvider> (ver main.jsx).
 * No montar otro ThemeProvider de MUI en páginas hijas.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "./muiRuntime.js";
import { getTheme } from "./getTheme.js";

const STORAGE_KEY = "eddeli-theme-mode";

const ThemeModeContext = createContext({
  mode: "light",
  setMode: () => {},
  toggle: () => {},
});

/** Modo visual: light | dark | neon */
export function useThemeMode() {
  return useContext(ThemeModeContext);
}

/**
 * Proveedor raíz: persiste modo, construye theme con createTheme (muiRuntime) y envuelve la app.
 */
export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || "light");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === "light" ? "dark" : "light")),
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
