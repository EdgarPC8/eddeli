/** Peticiones de usuario: login, sesión y CRUD (admin/programador). */
import axios, { authHeaders, jwt } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export const loginRequest = (data) => axios.post("/login", data);
export const getSessionRequest = () => axios.get("/getSession", authHeaders());

export const getUsersRequest = () => axios.get("/users", auth());
export const getOneUserRequest = (id) => axios.get(`/users/${id}`, auth());
export const addUserRequest = (data) => axios.post("/users", data, auth());
export const updateUserRequest = (id, data) =>
  axios.put(`/users/${id}`, data, auth());
export const deleteUserRequest = (id) => axios.delete(`/users/${id}`, auth());

export const addUser = async (data) => await axios.post("/users", data, auth());

export const updateUser = async (data, id) =>
  await axios.put(`/users/${id}`, data, auth());

export const updateUserPhotoRequest = (userId, formData) =>
  axios.put(`/users/photo/${userId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: jwt(),
    },
  });

export const deleteUserPhotoRequest = (userId) =>
  axios.delete(`/users/photo/${userId}`, auth());
