/**
 * API pública del tema EdDeli — importar desde aquí en código nuevo.
 *
 * @example
 * import { ThemeModeProvider, useThemeMode } from "./theme";
 * import { createTheme, useTheme } from "./theme/muiRuntime.js";
 */
export { ThemeModeProvider, useThemeMode } from "./ThemeModeProvider.jsx";
export {
  createTheme,
  alpha,
  useTheme,
  ThemeProvider,
  CssBaseline,
} from "./muiRuntime.js";
export { getTheme } from "./getTheme.js";
