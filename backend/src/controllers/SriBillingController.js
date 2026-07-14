import multer from "multer";
import {
  loadSriBillingSettings,
  updateSriBillingSettings,
  toPublicSriSettings,
  saveSriCertificate,
  clearSriCertificate,
} from "../services/sriBillingService.js";
import {
  emitManualInvoice,
  emitSriDocument,
  listElectronicInvoices,
  getElectronicInvoiceById,
  refreshInvoiceAuthorization,
} from "../services/sriInvoiceEmitService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    if (name.endsWith(".p12") || name.endsWith(".pfx")) cb(null, true);
    else cb(new Error("Solo se permiten archivos .p12 o .pfx"));
  },
});

export const sriCertificateUploadMiddleware = (req, res, next) => {
  upload.single("certificate")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Error al subir el certificado" });
    }
    next();
  });
};

export async function getSriBillingSettings(req, res) {
  try {
    const row = await loadSriBillingSettings();
    res.json(toPublicSriSettings(row));
  } catch (err) {
    console.error("getSriBillingSettings", err);
    res.status(500).json({ message: "No se pudo cargar la configuración SRI" });
  }
}

export async function putSriBillingSettings(req, res) {
  try {
    const row = await updateSriBillingSettings(req.body || {});
    res.json({
      message: "Configuración SRI guardada",
      settings: toPublicSriSettings(row),
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("putSriBillingSettings", err);
    res.status(status).json({ message: err.message || "No se pudo guardar" });
  }
}

export async function uploadSriCertificate(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Falta el archivo certificate (.p12 / .pfx)" });
    }
    const row = await saveSriCertificate({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
    });

    const password = req.body?.certificatePassword;
    if (password != null && String(password).length > 0) {
      await updateSriBillingSettings({ certificatePassword: String(password) });
    }

    const fresh = await loadSriBillingSettings();
    res.json({
      message: "Certificado guardado",
      settings: toPublicSriSettings(fresh),
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("uploadSriCertificate", err);
    res.status(status).json({ message: err.message || "No se pudo guardar el certificado" });
  }
}

export async function deleteSriCertificate(req, res) {
  try {
    const row = await clearSriCertificate();
    res.json({
      message: "Certificado eliminado",
      settings: toPublicSriSettings(row),
    });
  } catch (err) {
    console.error("deleteSriCertificate", err);
    res.status(500).json({ message: "No se pudo eliminar el certificado" });
  }
}

export async function postEmitSriInvoice(req, res) {
  try {
    const documentType = req.body?.documentType || "01";
    const result =
      String(documentType).padStart(2, "0") === "01"
        ? await emitManualInvoice(req.body || {})
        : await emitSriDocument(documentType, req.body || {});
    const status = result.invoice?.status;
    const message =
      status === "authorized"
        ? "Comprobante autorizado por el SRI"
        : status === "rejected"
          ? "El SRI rechazó el comprobante"
          : status === "sent"
            ? "Enviado al SRI; autorización pendiente (usa Consultar)"
            : "Comprobante procesado";
    res.json({ message, ...result });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("postEmitSriInvoice", err);
    res.status(status).json({
      message: err.message || "No se pudo emitir el comprobante",
      invoice: err.invoice || null,
    });
  }
}

export async function getSriInvoices(req, res) {
  try {
    const invoices = await listElectronicInvoices({
      limit: req.query?.limit,
      documentType: req.query?.documentType,
    });
    res.json({ invoices });
  } catch (err) {
    console.error("getSriInvoices", err);
    res.status(500).json({ message: "No se pudo listar los comprobantes" });
  }
}

export async function getSriInvoiceById(req, res) {
  try {
    const invoice = await getElectronicInvoiceById(req.params.id);
    res.json({ invoice });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("getSriInvoiceById", err);
    res.status(status).json({ message: err.message || "No se pudo obtener el comprobante" });
  }
}

export async function postRefreshSriInvoice(req, res) {
  try {
    const result = await refreshInvoiceAuthorization(req.params.id);
    res.json({
      message:
        result.invoice?.status === "authorized"
          ? "Autorizada"
          : result.invoice?.status === "rejected"
            ? "No autorizada / rechazada"
            : "Consulta actualizada",
      ...result,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("postRefreshSriInvoice", err);
    res.status(status).json({ message: err.message || "No se pudo consultar la autorización" });
  }
}
