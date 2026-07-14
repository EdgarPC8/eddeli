import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const RECEPCION = {
  pruebas:
    "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
  produccion:
    "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
};

const AUTORIZACION = {
  pruebas:
    "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  produccion:
    "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findDeep(obj, key) {
  if (obj == null) return undefined;
  if (typeof obj !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const v of Object.values(obj)) {
    const found = findDeep(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function asArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function soapFaultMessage(parsed) {
  const fault = findDeep(parsed, "Fault") || findDeep(parsed, "faultstring");
  if (!fault) return null;
  if (typeof fault === "string") return fault;
  return fault.faultstring || fault.faultcode || JSON.stringify(fault);
}

/**
 * @param {"pruebas"|"produccion"} environment
 * @param {string} signedXml
 */
export async function sendReception(environment, signedXml) {
  const url = RECEPCION[environment] || RECEPCION.pruebas;
  const b64 = Buffer.from(signedXml, "utf8").toString("base64");
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${b64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

  const { data } = await axios.post(url, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    timeout: 60000,
    validateStatus: () => true,
  });

  const parsed = parser.parse(String(data || ""));
  const fault = soapFaultMessage(parsed);
  if (fault) {
    return { estado: "ERROR", messages: [fault], raw: data };
  }

  const estado = String(findDeep(parsed, "estado") || "").toUpperCase();
  const comps = asArray(findDeep(parsed, "comprobante") || findDeep(parsed, "comprobantes"));
  const messages = [];
  for (const c of comps) {
    const msgs = asArray(c?.mensajes?.mensaje || c?.mensaje);
    for (const m of msgs) {
      const text = [m?.identificador, m?.mensaje, m?.informacionAdicional, m?.tipo]
        .filter(Boolean)
        .join(" · ");
      if (text) messages.push(text);
    }
  }
  const topMsgs = asArray(findDeep(parsed, "mensaje"));
  for (const m of topMsgs) {
    if (typeof m === "string") messages.push(m);
    else if (m && typeof m === "object") {
      const text = [m.identificador, m.mensaje, m.informacionAdicional].filter(Boolean).join(" · ");
      if (text) messages.push(text);
    }
  }

  return {
    estado: estado || "DESCONOCIDO",
    messages: [...new Set(messages)],
    raw: typeof data === "string" ? data.slice(0, 4000) : data,
  };
}

/**
 * @param {"pruebas"|"produccion"} environment
 * @param {string} accessKey
 */
export async function consultAuthorization(environment, accessKey) {
  const url = AUTORIZACION[environment] || AUTORIZACION.pruebas;
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

  const { data } = await axios.post(url, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "",
    },
    timeout: 60000,
    validateStatus: () => true,
  });

  const parsed = parser.parse(String(data || ""));
  const fault = soapFaultMessage(parsed);
  if (fault) {
    return {
      estado: "ERROR",
      numeroAutorizacion: null,
      fechaAutorizacion: null,
      messages: [fault],
      authorizedXml: null,
    };
  }

  const auths = asArray(findDeep(parsed, "autorizacion"));
  // Prefer AUTORIZADO; else first entry
  let chosen =
    auths.find((a) => String(a?.estado || "").toUpperCase() === "AUTORIZADO") || auths[0] || null;

  const estado = String(chosen?.estado || findDeep(parsed, "estado") || "SIN_AUTORIZACION").toUpperCase();
  const messages = [];
  const msgs = asArray(chosen?.mensajes?.mensaje || chosen?.mensaje);
  for (const m of msgs) {
    const text = [m?.identificador, m?.mensaje, m?.informacionAdicional, m?.tipo]
      .filter(Boolean)
      .join(" · ");
    if (text) messages.push(text);
  }

  let authorizedXml = chosen?.comprobante || null;
  if (authorizedXml && typeof authorizedXml === "object") {
    authorizedXml = null;
  }

  return {
    estado,
    numeroAutorizacion: chosen?.numeroAutorizacion || null,
    fechaAutorizacion: chosen?.fechaAutorizacion || null,
    messages: [...new Set(messages)],
    authorizedXml: typeof authorizedXml === "string" ? authorizedXml : null,
  };
}

/**
 * Consulta autorización con reintentos (el SRI a veces demora unos segundos).
 */
export async function consultAuthorizationWithRetry(environment, accessKey, { attempts = 4, delayMs = 2500 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) await sleep(delayMs);
    last = await consultAuthorization(environment, accessKey);
    const st = String(last.estado || "").toUpperCase();
    if (st === "AUTORIZADO" || st === "NO AUTORIZADO" || st === "RECHAZADO") {
      return last;
    }
  }
  return last;
}
