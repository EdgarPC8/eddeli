/** API de notificaciones en bandeja (listar, marcar leída, eliminar). */
import axios, { authHeaders, jwt } from "./axios.js";

export const getNotificationsByUser = (userId) =>
  axios.get(`/notifications/${userId}`, authHeaders());

export const getUnreadCount = (userId) =>
  axios.get(`/notifications/unreadCount/${userId}`, authHeaders());

export const markNotificationAsSeen = (id) =>
  axios.put(`/notifications/seen/${id}`, null, authHeaders());

export const deleteNotification = (id) =>
  axios.delete(`/notifications/${id}`, authHeaders());

export const createNotification = (data) =>
  axios.post("/notifications", data, {
    headers: { Authorization: jwt() },
  });
