/** API configuración facturación electrónica SRI (datos + certificado). */
import axios, { authHeaders, jwt } from "./axios.js";

export async function fetchSriBillingSettings() {
  const { data } = await axios.get("/sri/settings", authHeaders());
  return data;
}

export async function updateSriBillingSettings(payload) {
  const { data } = await axios.put("/sri/settings", payload, authHeaders());
  return data;
}

export async function uploadSriCertificate({ file, certificatePassword }) {
  const fd = new FormData();
  fd.append("certificate", file);
  if (certificatePassword) fd.append("certificatePassword", certificatePassword);
  const { data } = await axios.post("/sri/certificate", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteSriCertificate() {
  const { data } = await axios.delete("/sri/certificate", authHeaders());
  return data;
}
