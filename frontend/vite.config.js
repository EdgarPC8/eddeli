import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/eddeli/",
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
