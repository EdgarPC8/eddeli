/**
 * Utilidades de cliente: tipos de documento SRI, nombre en 4 partes, mapeo formulario ↔ API.
 */

export const IDENT_TYPE_OPTIONS = [
  { value: "05", label: "Cédula (05)" },
  { value: "04", label: "RUC (04)" },
  { value: "06", label: "Pasaporte (06)" },
  { value: "08", label: "Id. del exterior (08)" },
  { value: "07", label: "Consumidor final (07)" },
];

/** @deprecated usar IDENT_TYPE_OPTIONS */
export const DOC_TYPE_OPTIONS = IDENT_TYPE_OPTIONS;

export const EMPTY_CUSTOMER_FORM = {
  firstName: "",
  secondName: "",
  firstLastName: "",
  secondLastName: "",
  identType: "05",
  cedula: "",
  email: "",
  phone: "",
  address: "",
};

export function buildCustomerDisplayName(customer) {
  if (!customer) return "—";
  const parts = [
    customer.firstName,
    customer.secondName,
    customer.firstLastName,
    customer.secondLastName,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(" ");
  return String(customer.name ?? "").trim() || "—";
}

export function formatCustomerDocument(customer) {
  if (!customer) return "";
  const num = String(customer.cedula || "").trim();
  if (!num) return "";
  const type =
    IDENT_TYPE_OPTIONS.find((d) => d.value === customer.identType)?.label ||
    customer.identType ||
    "Doc";
  return `${type}: ${num}`;
}

export function customerToForm(customer) {
  if (!customer) return { ...EMPTY_CUSTOMER_FORM };
  return {
    firstName: customer.firstName || (customer.name && !customer.firstLastName ? customer.name : "") || "",
    secondName: customer.secondName || "",
    firstLastName: customer.firstLastName || "",
    secondLastName: customer.secondLastName || "",
    identType: customer.identType || "05",
    cedula: customer.cedula || "",
    email: customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
  };
}

export function formToCustomerPayload(form) {
  const firstName = String(form.firstName || "").trim();
  const secondName = String(form.secondName || "").trim();
  const firstLastName = String(form.firstLastName || "").trim();
  const secondLastName = String(form.secondLastName || "").trim();
  const name = [firstName, secondName, firstLastName, secondLastName].filter(Boolean).join(" ");
  return {
    name,
    firstName: firstName || null,
    secondName: secondName || null,
    firstLastName: firstLastName || null,
    secondLastName: secondLastName || null,
    identType: form.identType || "05",
    cedula: String(form.cedula || "").trim() || null,
    email: String(form.email || "").trim() || null,
    phone: String(form.phone || "").trim() || null,
    address: String(form.address || "").trim() || null,
  };
}

export function validateCustomerForm(form) {
  if (!String(form.firstName || "").trim()) {
    return "El primer nombre es obligatorio.";
  }
  return null;
}
