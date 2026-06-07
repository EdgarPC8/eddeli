import axios, { authHeaders } from "./axios.js";

const auth = () => authHeaders();

export const getTaskAssignees = () => axios.get("/tasks/assignees", auth());
export const getTaskPlans = () => axios.get("/tasks/plans", auth());
export const createTaskPlan = (payload) => axios.post("/tasks/plans", payload, auth());
export const publishTaskPlan = (id) => axios.post(`/tasks/plans/${id}/publish`, {}, auth());
export const getMyTaskItems = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/tasks/my-items${qs ? `?${qs}` : ""}`, auth());
};
export const updateTaskItemStatus = (id, payload) =>
  axios.put(`/tasks/items/${id}/status`, payload, auth());
export const executeTaskOpenBox = (id) =>
  axios.post(`/tasks/items/${id}/execute-open-box`, {}, auth());
