/**
 * Middlewares de autenticación y autorización.
 *
 * El payload JWT (AuthController) incluye:
 *   userId, accountId, rolId, loginRol
 * NO incluye `id` — usar accountId o userId según el caso.
 */
import { getHeaderToken, verifyJWT } from "../libs/jwt.js";

/** Sesión válida requerida. Token inválido → 401 (no 500). */
const isAuthenticated = async (req, res, next) => {
  try {
    const token = getHeaderToken(req);
    if (!token) {
      return res.status(401).json({ message: "No token, unauthorized" });
    }

    const verify = await verifyJWT(token);
    req.user = verify;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
      error: error.message,
    });
  }
};

/**
 * Solo rol Programador (Comandos, backup, reload BD, rutas de mantenimiento).
 * Debe usarse DESPUÉS de isAuthenticated.
 */
const requireProgrammer = (req, res, next) => {
  if (req.user?.loginRol !== "Programador") {
    return res.status(403).json({
      message: "Solo el rol Programador puede ejecutar esta acción",
    });
  }
  next();
};

export { isAuthenticated, requireProgrammer };
