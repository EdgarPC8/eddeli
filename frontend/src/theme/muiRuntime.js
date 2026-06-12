/**
 * Punto único de importación MUI para el tema EdDeli.
 *
 * Usar solo importaciones nombradas (nunca default) — Vite pre-bundlea
 * @mui/material/styles sin export default y rompe con import X from "...".
 *
 * En código de tema: importar desde aquí o ThemeModeProvider.
 */
export { createTheme, alpha, useTheme, ThemeProvider } from "@mui/material/styles";
export { CssBaseline } from "@mui/material";
