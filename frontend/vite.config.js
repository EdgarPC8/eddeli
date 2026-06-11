import { defineConfig } from "vite";
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

export default defineConfig({
  plugins: [react()],
  base: "/eddeli/",
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
    ],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      "/eddeliapi": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "..",
    emptyOutDir: false,
  },
});
