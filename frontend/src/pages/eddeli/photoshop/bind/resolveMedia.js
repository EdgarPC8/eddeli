// bind/resolveMedia.js
import { pathImg } from "../../../../api/axios";

// -------------------- utils --------------------
export const joinUrl = (base = "", p = "") =>
  `${String(base).replace(/\/+$/, "")}/${String(p).replace(/^\/+/, "")}`;

export const isAbsoluteUrl = (s = "") =>
  /^https?:\/\//i.test(String(s)) ||
  /^data:image\//i.test(String(s)) ||
  /^blob:/i.test(String(s));

export const isNonEmptyString = (v) =>
  typeof v === "string" && v.trim().length > 0;

export const getByPath = (obj, path) => {
  try {
    return String(path || "")
      .split(".")
      .reduce((acc, k) => acc?.[k], obj);
  } catch {
    return undefined;
  }
};

// Modo limpio:
// - "imageUrl" -> raíz
// - "product.primaryImageUrl" -> path
export const normalizeKey = (k = "") => String(k || "").trim();

// Devuelve el valor tal cual (puede ser null, "", 0, etc.)
// Solo undefined significa "no existe".
export const resolveValue = (docData, rawKey) => {
  const key = normalizeKey(rawKey);
  if (!key) return undefined;

  const root = docData && typeof docData === "object" ? docData : {};
  if (key.includes(".")) return getByPath(root, key);
  return root[key];
};

// Convierte rutas relativas usando pathImg.
// Si ya es absoluta, la respeta.
export const resolveImageUrl = (value, { base = pathImg, prefix = "" } = {}) => {
  if (!isNonEmptyString(value)) return "";

  const v = String(value);

  if (isAbsoluteUrl(v)) return v;

  if (isNonEmptyString(prefix)) return joinUrl(prefix, v);

  return joinUrl(base, v);
};
