// src/api/editorRequest.js
import axios, { jwt } from "./axios.js";

/**
 * =========================
 * TEMPLATES
 * =========================
 */

export const importEditorTemplate = (templateJson, extra = {}) =>
  axios.post(
    "/editor/templates/import",
    { templateJson, ...extra },
    { headers: { Authorization: jwt() } }
  );

export const getEditorTemplates = (params = {}) =>
  axios.get("/editor/templates", {
    params,
    headers: { Authorization: jwt() },
  });

export const getEditorTemplateById = (id) =>
  axios.get(`/editor/templates/${id}`, {
    headers: { Authorization: jwt() },
  });

export const updateEditorTemplate = (id, data = {}) =>
  axios.put(`/editor/templates/${id}`, data, {
    headers: { Authorization: jwt() },
  });

export const deleteEditorTemplate = (id) =>
  axios.delete(`/editor/templates/${id}`, {
    headers: { Authorization: jwt() },
  });

/**
 * =========================
 * DESIGNS
 * =========================
 */

export const createEditorDesign = (data = {}) =>
  axios.post("/editor/designs", data, {
    headers: { Authorization: jwt() },
  });

export const updateEditorDesign = (id, data = {}) =>
  axios.put(`/editor/designs/${id}`, data, {
    headers: { Authorization: jwt() },
  });

export const getEditorDesignResolved = (id) =>
  axios.get(`/editor/designs/${id}`, {
    headers: { Authorization: jwt() },
  });

/**
 * =========================
 * OVERRIDES (UPSERT)
 * =========================
 */

export const upsertEditorOverride = (designId, data = {}) =>
  axios.post(`/editor/designs/${designId}/overrides`, data, {
    headers: { Authorization: jwt() },
  });
  export const getEditorTemplateResolved = (id) =>
  axios.get(`/editor/templates/${id}/resolved`, {
    headers: { Authorization: jwt() },
  });
  export const getEditorDefaultTemplate = (params = {}) =>
  axios.get("/editor/templates/default", {
    params, // app, format opcional
    headers: { Authorization: jwt() },
  });
  export const updateTemplate = (id, doc = {}) =>
  axios.put(
    `/editor/templates/${id}`,
    { doc }, // 👈 mandamos el doc completo aquí
    { headers: { Authorization: jwt() } }
  );
  // ✅ Guarda el DOC completo (reemplazo total: groups + layers + props + bind)
export const updateEditorTemplateDoc = (id, doc = {}) =>
axios.put(
  `/editor/templates/${id}/doc`,
  { doc }, // 👈 doc completo
  { headers: { Authorization: jwt() } }
);

export const deleteTemplateLayer = (templateId, layerKey) =>
  axios.delete(
    `/editor/templates/${templateId}/layers/${layerKey}`,
    {
      headers: { Authorization: jwt() },
    }
  );




