/**
 * Peticiones de cuentas, roles y reseteo de contraseña (admin/programador).
 */
import axios, { jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const getAccount = (accountId, rolId) =>
  axios.get(`/account/${accountId}/${rolId}`, auth());

export const getAccountsRequest = () => axios.get("/account", auth());

export const getOneAccountRequest = (id) => axios.get(`/account/${id}`, auth());

export const addAccountRequest = (data) => axios.post("/account", data, auth());

export const updateAccountRequest = (id, data) =>
  axios.put(`/account/${id}`, data, auth());

export const deleteAccountRequest = (id) =>
  axios.delete(`/account/${id}`, auth());

export const resetPasswordRequest = (id) =>
  axios.put(`/account/resetPassword/${id}`, {}, auth());

export const getRolRequest = () => axios.get("/rol", auth());

export const addRolRequest = (data) => axios.post("/rol", data, auth());

export const updateRolRequest = (id, data) => axios.put(`/rol/${id}`, data, auth());

export const getOneRolRequest = (id) => axios.get(`/rol/${id}`, auth());

export const deleteRolRequest = (id) => axios.delete(`/rol/${id}`, auth());

export const updateAccountUser = (accountId, userId, rolId, data) =>
  axios.put(
    `/account/updateAccountUser/${accountId}/${userId}/${rolId}`,
    data,
    auth(),
  );
