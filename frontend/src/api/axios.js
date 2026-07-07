/**
 * Cliente HTTP y Socket.IO — URL desde frontend/.env (VITE_API_*).
 */
import axios from "axios";
import { io } from "socket.io-client";
import {
  API_PREFIX,
  API_PORT,
  API_HOST,
  API_ORIGIN,
  API_MODE,
} from "../config/deployEnv.js";

function isTvPlayerRoute() {
  if (typeof window === "undefined") return false;
  return /\/tv(\/|$)/.test(window.location.pathname);
}

function resolveApiBase() {
  if (API_MODE === "production") return `${API_ORIGIN}/${API_PREFIX}`;
  if (API_MODE === "server") return `http://${API_HOST}:${API_PORT}/${API_PREFIX}`;
  if (import.meta.env.DEV && isTvPlayerRoute()) {
    const host =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? API_HOST
        : window.location.hostname;
    return `http://${host}:${API_PORT}/${API_PREFIX}`;
  }
  if (import.meta.env.DEV) return `/${API_PREFIX}`;
  return `http://${API_HOST}:${API_PORT}/${API_PREFIX}`;
}

function resolveSocketOrigin() {
  if (API_MODE === "production") return API_ORIGIN;
  if (API_MODE === "server") return `http://${API_HOST}:${API_PORT}`;
  if (import.meta.env.DEV && isTvPlayerRoute()) {
    const host =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? API_HOST
        : window.location.hostname;
    return `http://${host}:${API_PORT}`;
  }
  if (import.meta.env.DEV) return window.location.origin;
  return `http://${API_HOST}:${API_PORT}`;
}

const baseURL = resolveApiBase();
const socketOrigin = resolveSocketOrigin();

const instance = axios.create({
  baseURL,
  withCredentials: true,
});

export const pathImg = `${baseURL.replace(/\/$/, "")}/img/`;
export const pathFiles = `${baseURL.replace(/\/$/, "")}/files/`;

export const buildImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (/^(https?:|data:)/i.test(imagePath)) return imagePath;
  const clean = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${pathImg}${clean}`;
};

export const socket = io(socketOrigin, { withCredentials: true });

export function isValidJwtShape(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export function normalizeToken(raw) {
  if (raw == null) return null;
  let token = String(raw).trim();
  if (!token || token === "null" || token === "undefined") return null;
  if (token.toLowerCase().startsWith("bearer ")) token = token.slice(7).trim();
  return isValidJwtShape(token) ? token : null;
}

export const getToken = () => normalizeToken(localStorage.getItem("token"));

export const setToken = (raw) => {
  const token = normalizeToken(raw);
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
  return token;
};

export const clearToken = () => localStorage.removeItem("token");

export const jwt = () => {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
};

export const authHeaders = () => {
  const authorization = jwt();
  return authorization ? { headers: { Authorization: authorization } } : {};
};

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const msg = String(error?.response?.data?.message || "").toLowerCase();
    if (
      status === 401 &&
      (msg.includes("jwt") || msg.includes("token") || msg.includes("unauthorized"))
    ) {
      clearToken();
    }
    return Promise.reject(error);
  },
);

if (!getToken() && localStorage.getItem("token")) clearToken();

export default instance;
