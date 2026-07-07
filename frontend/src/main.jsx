import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { Toaster } from "react-hot-toast";
import { ThemeModeProvider } from "./theme/ThemeModeProvider.jsx";
import { AppSettingsProvider } from "./context/AppSettingsContext.jsx";
import App from "./App.jsx";
import "./styles/print.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <AppSettingsProvider>
            <App />
          </AppSettingsProvider>
          <Toaster position="bottom-right" />
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeModeProvider>
  </React.StrictMode>,
);
