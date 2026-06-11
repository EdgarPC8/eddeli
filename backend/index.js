import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { sequelize } from "./src/database/connection.js";
import { loggerMiddleware } from "./src/middlewares/loggerMiddleware.js";

import UsersRoutes from "./src/routes/UsersRoutes.js";
import AuthRoutes from "./src/routes/AuthRoutes.js";
import AccountsRoutes from "./src/routes/AccountsRoutes.js";
import NotificationsRoutes from "./src/routes/NotificationsRoutes.js";
import InventoryControlRoutes from "./src/routes/InventoryControlRoutes.js";
import OrderRoutes from "./src/routes/OrderRoutes.js";
import FinanceRoutes from "./src/routes/FinanceRoutes.js";
import ShiftRoutes from "./src/routes/ShiftRoutes.js";
import TaskRoutes from "./src/routes/TaskRoutes.js";
import { syncDatabaseSchema } from "./src/database/syncModels.js";

import ImgRoutes from "./src/routes/ImgRoutes.js";
import FilesRoutes from "./src/routes/FilesRoutes.js";
import EditorRoutes from "./src/routes/EditorRoutes.js";
import ComandsRoutes from "./src/routes/ComandsRoutes.js";

import { initNotificationSocket } from "./src/sockets/notificationSocket.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { corsOriginCallback, isOriginAllowed } from "./src/utils/corsOrigins.js";
import { errorMiddleware, notFoundMiddleware } from "./src/middlewares/errorMiddleware.js";

// ✅ __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const api = "eddeliapi";

const PORT = 3001;

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error(`Origen no permitido: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(loggerMiddleware);

// CORS — localhost, LAN 192.168/10.x y dominio institucional (sin IPs fijas)
app.use(
  cors({
    origin: corsOriginCallback,
    optionsSuccessStatus: 200,
    credentials: true,
  }),
);

app.use(`/${api}/img`, ImgRoutes);

app.use(`/${api}/img`, express.static(path.resolve(__dirname, "src/img")));
app.use(`/${api}/files`, FilesRoutes);

// Sirve los archivos guardados en src/files
app.use(`/${api}/files`, express.static(path.resolve(__dirname, "src/files")));


// ⚠️ Ya NO necesitas estas dos si todo estará bajo /img:
// app.use(`/${api}/photos`, express.static(`src/img/photos`));
// app.use(`/${api}/inventory/imgEdDeli`, express.static(`src/img/EdDeli`));

// ================================
// Rutas EdDeli (inventario, pedidos, finanzas, editor, archivos, auth/cuentas, comandos/backup)
// Quiz, piano, forms, CV, etc. → softed/backend (softedapi); comandos también existen allí para su backup.json
// ================================
app.use(`/${api}/comands`, ComandsRoutes);
app.use(`/${api}/editor`, EditorRoutes);
app.use(`/${api}/users`, UsersRoutes);
app.use(`/${api}`, AuthRoutes);
app.use(`/${api}`, AccountsRoutes);
app.use(`/${api}/notifications`, NotificationsRoutes);
app.use(`/${api}/inventory`, InventoryControlRoutes);
app.use(`/${api}/orders`, OrderRoutes);
app.use(`/${api}/finance`, FinanceRoutes);
app.use(`/${api}/shifts`, ShiftRoutes);
app.use(`/${api}/tasks`, TaskRoutes);

// Socket para notificaciones
initNotificationSocket(io);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export async function main() {
  try {
    await sequelize.authenticate();
    const syncResult = await syncDatabaseSchema();
    if (syncResult.skipped) {
      console.log("✅ Conexión realizada (sin ALTER; usa npm run db:sync si cambiaste modelos).");
    } else {
      console.log("✅ Conexión realizada y esquema sincronizado (DB_SYNC_ALTER activo).");
    }

    httpServer.listen(PORT, () => {
      console.log(`🟢 Backend + Socket.IO escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error en la conexión a la base de datos:", error);
  }
}

main();
