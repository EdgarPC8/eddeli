import express from "express";
import cors from "cors";
import { sequelize } from "./src/database/connection.js";
import { insertData } from "./src/database/insertData.js";
import { loggerMiddleware } from "./src/middlewares/loggerMiddleware.js";
import UsersRoutes from "./src/routes/UsersRoutes.js";
import AuthRoutes from "./src/routes/AuthRoutes.js";
import ComandsRoutes from "./src/routes/ComandsRoutes.js";
import AccountsRoutes from "./src/routes/AccountsRoutes.js";
import QuizRoutes from "./src/routes/QuizRoutes.js";
import FormsRoutes from "./src/routes/FormsRoutes.js";
import AlumniRoutes from "./src/routes/AlumniRoutes.js";
import NotificationsRoutes from "./src/routes/NotificationsRoutes.js";
import InventoryControlRoutes from "./src/routes/InventoryControlRoutes.js";
import OrderRoutes from "./src/routes/OrderRoutes.js";
import FinanceRoutes from "./src/routes/FinanceRoutes.js";
import { initNotificationSocket } from "./src/sockets/notificationSocket.js";
import { Server } from "socket.io";
import { createServer } from "http";







const app = express();
const httpServer = createServer(app); // 👈 solo este se usa para arrancar
const api="eddeliapi"

const PORT = 3001;
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8888",
  "http://192.168.137.179:8888",
  "http://192.168.137.179:5173",
  "http://192.168.137.179:5174",
  "https://aplicaciones.marianosamaniego.edu.ec",
  "https://www.aplicaciones.marianosamaniego.edu.ec",
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(loggerMiddleware);

// CORS

const corsOptions = {

  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Acceso no permitido por CORS"));
    }
    // callback(null, true); // ⚠️ Si quieres habilitar control estricto, descomenta el if
  },
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));

// Rutas



app.use(`/${api}/photos`, express.static(`src/img/photos`));
app.use(`/${api}/inventory/imgEdDeli`, express.static(`src/img/EdDeli`));
// Endpoints de subida/borrado
app.use(`/${api}/users`, UsersRoutes);
app.use(`/${api}/quiz`, QuizRoutes);
app.use(`/${api}`, AuthRoutes);
app.use(`/${api}/comands`, ComandsRoutes);
app.use(`/${api}`, AccountsRoutes);
app.use(`/${api}/forms`, FormsRoutes);
app.use(`/${api}/alumni`, AlumniRoutes);
app.use(`/${api}/notifications`, NotificationsRoutes);
app.use(`/${api}/inventory`, InventoryControlRoutes);
app.use(`/${api}/orders`, OrderRoutes);
app.use(`/${api}/finance`, FinanceRoutes);

// Socket para notificaciones
initNotificationSocket(io);

export async function main() {
  try {
    await sequelize.authenticate();
    // await sequelize.sync({ force: true });
    // await insertData();

    console.log("✅ Conexión realizada con éxito.");
    
    // Solo usas httpServer.listen
    httpServer.listen(PORT, () => {
      console.log(`🟢 Backend + Socket.IO escuchando en puerto ${PORT}`);
    });
 
    
  } catch (error) {
    console.error("❌ Error en la conexión a la base de datos:", error);
  }
}

main();


