/**
 * Copia frontend/dist/ a la raíz de eddeli/ para despliegue Apache (/eddeli/).
 * Ejecutado automáticamente tras `npm run build`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist");
const deployDir = resolve(__dirname, "../..");

if (!existsSync(distDir)) {
  console.error("No existe frontend/dist. Ejecuta vite build primero.");
  process.exit(1);
}

const assetsTarget = join(deployDir, "assets");
if (existsSync(assetsTarget)) {
  rmSync(assetsTarget, { recursive: true, force: true });
}

for (const entry of readdirSync(distDir)) {
  const src = join(distDir, entry);
  const dest = join(deployDir, entry);
  cpSync(src, dest, { recursive: true, force: true });
}

console.log("Build copiado a", deployDir);
