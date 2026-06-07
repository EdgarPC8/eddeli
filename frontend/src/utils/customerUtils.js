/**
 * Utilidades de cliente: tipos de documento, validación y mapeo formulario ↔ API.
 */
export const DOC_TYPE_OPTIONS = [
  { value: "cedula", label: "Cédula" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "otro", label: "Otro" },
];

export const EMPTY_CUSTOMER_FORM = {
  firstName: "",
  secondName: "",
  firstLastName: "",
  secondLastName: "",
  birthDate: "",
  documentType: "cedula",
  documentNumber: "",
  nickname: "",
  email: "",
  phone: "",
  secondaryPhone: "",
  city: "",
  address: "",
  reference: "",
  notes: "",
};

export function buildCustomerDisplayName(customer) {
  if (!customer) return "—";
  const parts = [customer.firstName, customer.secondName, customer.firstLastName, customer.secondLastName]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return String(customer.name ?? "").trim() || "—";
}

export function formatCustomerDocument(customer) {
  if (!customer) return "";
  const num = customer.documentNumber || customer.ci;
  if (!num) return "";
  const type = DOC_TYPE_OPTIONS.find((d) => d.value === customer.documentType)?.label;
  return type ? `${type}: ${num}` : num;
}

export function customerToForm(customer) {
  if (!customer) return { ...EMPTY_CUSTOMER_FORM };
  return {
    firstName: customer.firstName || "",
    secondName: customer.secondName || "",
    firstLastName: customer.firstLastName || "",
    secondLastName: customer.secondLastName || "",
    birthDate: customer.birthDate ? String(customer.birthDate).slice(0, 10) : "",
    documentType: customer.documentType || "cedula",
    documentNumber: customer.documentNumber || customer.ci || "",
    nickname: customer.nickname || "",
    email: customer.email || "",
    phone: customer.phone || "",
    secondaryPhone: customer.secondaryPhone || "",
    city: customer.city || "",
    address: customer.address || "",
    reference: customer.reference || "",
    notes: customer.notes || "",
  };
}

export function formToCustomerPayload(form) {
  const firstName = form.firstName?.trim();
  const firstLastName = form.firstLastName?.trim();
  const name = [firstName, form.secondName?.trim(), firstLastName, form.secondLastName?.trim()]
    .filter(Boolean)
    .join(" ");
  return {
    name,
    firstName,
    secondName: form.secondName?.trim() || null,
    firstLastName,
    secondLastName: form.secondLastName?.trim() || null,
    birthDate: form.birthDate || null,
    documentType: form.documentType || "cedula",
    documentNumber: form.documentNumber?.trim() || null,
    ci: form.documentNumber?.trim() || null,
    nickname: form.nickname?.trim() || null,
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    secondaryPhone: form.secondaryPhone?.trim() || null,
    city: form.city?.trim() || null,
    address: form.address?.trim() || null,
    reference: form.reference?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export function validateCustomerForm(form) {
  if (!form.firstName?.trim() || !form.firstLastName?.trim()) {
    return "Nombre y apellido son obligatorios.";
  }
  return null;
}
