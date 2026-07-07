/** Variables de despliegue del API (backend/.env). */
export const PORT = Number(process.env.PORT || 3001);

export const API_PREFIX = String(process.env.API_PREFIX || "eddeliapi").replace(/^\/+|\/+$/g, "");
