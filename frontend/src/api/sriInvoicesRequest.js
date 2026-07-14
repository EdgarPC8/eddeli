/** API comprobantes electrónicos SRI (emisión / bandeja). */
import axios, { authHeaders } from "./axios.js";

export async function emitSriInvoice(payload) {
  const { data } = await axios.post("/sri/invoices/emit", payload, authHeaders());
  return data;
}

export async function fetchSriInvoices(limit = 50, documentType) {
  const { data } = await axios.get("/sri/invoices", {
    ...authHeaders(),
    params: { limit, ...(documentType ? { documentType } : {}) },
  });
  return data?.invoices || [];
}

export async function fetchSriInvoice(id) {
  const { data } = await axios.get(`/sri/invoices/${id}`, authHeaders());
  return data?.invoice || null;
}

export async function refreshSriInvoice(id) {
  const { data } = await axios.post(`/sri/invoices/${id}/refresh`, {}, authHeaders());
  return data;
}
