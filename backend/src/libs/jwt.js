/**
 * JWT — tokens de sesión EdDeli
 *
 * IMPORTANTE (seguridad):
 * - Definir JWT_SECRET en el entorno del servidor (ver backend/.env.example).
 * - El fallback "privateKey" solo es para desarrollo local sin .env.
 *
 * BUG corregido: antes, en el callback de jwt.sign/verify se hacía resolve()
 * incluso cuando había error (faltaba return tras reject).
 */
import jwt from "jsonwebtoken";

/** Secreto HS256. En producción usar process.env.JWT_SECRET obligatorio. */
const JWT_SECRET = process.env.JWT_SECRET || "privateKey";

function createAccessToken({ payload }) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1d" },
      (err, token) => {
        if (err) return reject(err);
        resolve(token);
      },
    );
  });
}

/**
 * Extrae el token del header Authorization: Bearer <token>
 * @returns {string|null}
 */
function getHeaderToken(req) {
  const auth = req.headers?.authorization;
  if (!auth || typeof auth !== "string") return null;
  const parts = auth.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1] || null;
}

function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

function createLicenseToken({ payload }) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: payload.time },
      (err, token) => {
        if (err) return reject(err);
        resolve(token);
      },
    );
  });
}

export { createAccessToken, getHeaderToken, verifyJWT, createLicenseToken, JWT_SECRET };
