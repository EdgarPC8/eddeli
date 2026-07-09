import axios from "./axios.js";
import { authHeaders } from "./axios.js";

export async function fetchAppSettings() {
  const { data } = await axios.get("/app/settings");
  return data;
}

export async function fetchAppTimeStatus() {
  const { data } = await axios.get("/app/time-status");
  return data;
}

export async function updateAppSettings(payload) {
  const { data } = await axios.put("/app/settings", payload, authHeaders());
  return data;
}
