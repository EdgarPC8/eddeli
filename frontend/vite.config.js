import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const muiDedupe = [
  "react",
  "react-dom",
  "@emotion/react",
  "@emotion/styled",
  "@mui/material",
  "@mui/system",
  "@mui/styled-engine",
];

function normalizeBase(path) {
  const raw = String(path || "/").trim();
  if (!raw.startsWith("/")) return `/${raw.endsWith("/") ? raw : `${raw}/`}`;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBase(env.VITE_BASE_PATH || "/eddeli/");
  const apiPrefix = String(env.VITE_API_PREFIX || "eddeliapi").replace(/^\/+|\/+$/g, "");
  const apiPort = env.VITE_API_PORT || "3001";
  const apiTarget = `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react()],
    base,
    resolve: {
      dedupe: muiDedupe,
    },
    optimizeDeps: {
      include: [
        "@emotion/react",
        "@emotion/react/jsx-runtime",
        "@emotion/styled",
        "@mui/material",
        "@mui/material/styles",
        "@mui/system",
        "@mui/styled-engine",
        "@mui/x-charts",
        "@mui/x-data-grid",
      ],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        [`/${apiPrefix}`]: {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
        "/socket.io": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
