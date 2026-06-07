import axios, { authHeaders } from "./axios.js";

const auth = () => authHeaders();

export const getActiveShift = () => axios.get("/shifts/active", auth());

export const getShifts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/shifts${qs ? `?${qs}` : ""}`, auth());
};

export const getShiftById = (id) => axios.get(`/shifts/${id}`, auth());

export const openShift = (payload) => axios.post("/shifts/open", payload, auth());

export const closeShift = (id, payload) =>
  axios.post(`/shifts/${id}/close`, payload, auth());
