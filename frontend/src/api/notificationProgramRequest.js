/**
 * API de notificaciones programadas (CRUD y envío inmediato).
 *
 * PENDIENTE: no hay rutas backend /notification-programs registradas.
 * El menú está oculto en NavBar hasta implementar modelo + router.
 * La página NotificationProgramsPage muestra aviso si BACKEND_ENABLED = false.
 */
import axios, { authHeaders } from "./axios.js";

export const getNotificationPrograms = () =>
  axios.get("/notification-programs", authHeaders());

export const createNotificationProgram = (data) =>
  axios.post("/notification-programs", data, authHeaders());

export const updateNotificationProgram = (id, data) =>
  axios.put(`/notification-programs/${id}`, data, authHeaders());

export const deleteNotificationProgram = (id) =>
  axios.delete(`/notification-programs/${id}`, authHeaders());

export const sendNotificationProgramNow = (id) =>
  axios.post(`/notification-programs/${id}/send`, null, authHeaders());
