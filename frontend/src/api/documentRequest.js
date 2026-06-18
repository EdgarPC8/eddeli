import axios, { jwt, pathFiles } from "./axios.js";

const auth = () => ({ headers: { Authorization: jwt() } });

export function documentViewUrl(filePath) {
  if (!filePath) return null;
  const clean = String(filePath).replace(/^\/+/, "");
  return `${pathFiles}${clean}`;
}

export const uploadDocumentRequest = async ({
  file,
  entityType,
  entityId,
  batchKey,
  linkExpenseIds,
  label,
}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entityType", entityType);
  if (entityId != null && entityId !== "") fd.append("entityId", String(entityId));
  if (batchKey) fd.append("batchKey", batchKey);
  if (label) fd.append("label", label);
  if (linkExpenseIds?.length) {
    fd.append("linkExpenseIds", JSON.stringify(linkExpenseIds));
  }
  return axios.post("/documents/upload", fd, {
    headers: { Authorization: jwt(), "Content-Type": "multipart/form-data" },
  });
};

export const listDocumentsRequest = ({ entityType, entityId, batchKey }) => {
  const params = new URLSearchParams({ entityType });
  if (batchKey) params.set("batchKey", batchKey);
  else if (entityId != null) params.set("entityId", String(entityId));
  return axios.get(`/documents?${params.toString()}`, auth());
};

export const deleteDocumentRequest = (id) =>
  axios.delete(`/documents/${id}`, auth());

/** Sube comprobante tras guardar movimiento de compra. */
export async function uploadMovementVoucher(file, apiResponse) {
  if (!file) return null;
  const data = apiResponse?.data ?? apiResponse ?? {};
  const expenseIds = data.expenseIds || (data.expenseId ? [data.expenseId] : []);

  if (data.batchKey) {
    return uploadDocumentRequest({
      file,
      entityType: "movement_batch",
      batchKey: data.batchKey,
      linkExpenseIds: expenseIds,
      label: "Factura de compra",
    });
  }
  if (data.movementId) {
    return uploadDocumentRequest({
      file,
      entityType: "movement",
      entityId: data.movementId,
      linkExpenseIds: expenseIds,
      label: "Factura de compra",
    });
  }
  return null;
}

export async function uploadExpenseVoucher(file, expenseId) {
  if (!file || !expenseId) return null;
  return uploadDocumentRequest({
    file,
    entityType: "expense",
    entityId: expenseId,
    label: "Comprobante de gasto",
  });
}

export async function uploadSupplierOrderVoucher(file, orderId) {
  if (!file || !orderId) return null;
  return uploadDocumentRequest({
    file,
    entityType: "supplier_order",
    entityId: orderId,
    label: "Factura / nota proveedor",
  });
}
