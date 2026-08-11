/**
 * Envío de factura electrónica por correo (SMTP).
 * Respeta enableSendInvoiceEmail + cuota diaria + credenciales SMTP.
 */
import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { decryptSecret } from "../utils/secretCrypto.js";
import {
  SRI_PRIVATE_DIR,
  loadSriBillingSettings,
  getInvoiceEmailQuotaPublic,
  ensureSriEmailSchema,
} from "./sriBillingService.js";

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(n) {
  return Number(Number(n || 0).toFixed(2)).toFixed(2);
}

function invoiceNumberLabel(inv) {
  const a = String(inv.establishmentCode || "001").padStart(3, "0");
  const b = String(inv.emissionPointCode || "001").padStart(3, "0");
  const c = String(Number(inv.sequential) || 0).padStart(9, "0");
  return `${a}-${b}-${c}`;
}

async function bumpEmailSentCount(row) {
  const today = todayIsoDate();
  const sentDate = row.invoiceEmailsSentDate
    ? String(row.invoiceEmailsSentDate).slice(0, 10)
    : null;
  if (sentDate !== today) {
    await row.update({
      invoiceEmailsSentDate: today,
      invoiceEmailsSentCount: 1,
    });
  } else {
    await row.update({
      invoiceEmailsSentCount: (Number(row.invoiceEmailsSentCount) || 0) + 1,
    });
  }
}

function buildTransport(settings, passwordPlain) {
  const host = String(settings.smtpHost || "").trim();
  const port = Number(settings.smtpPort) || 587;
  const secure = Boolean(settings.smtpSecure) || port === 465;
  const user = String(settings.smtpUser || "").trim();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: passwordPlain },
  });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceEmailHtml(invoice, settings) {
  const num = invoiceNumberLabel(invoice);
  const env =
    String(invoice.environment || "").toLowerCase() === "produccion"
      ? "PRODUCCIÓN"
      : "PRUEBAS";
  const legal = settings.legalName || settings.tradeName || "Emisor";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><title>Factura ${num}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.45">
  <h2 style="margin:0 0 8px">Factura electrónica ${num}</h2>
  <p style="margin:0 0 12px;color:#444">${esc(legal)} · Ambiente ${env}</p>
  <table style="border-collapse:collapse;width:100%;max-width:560px">
    <tr><td style="padding:4px 0;font-weight:700">Cliente</td><td>${esc(invoice.customerName || "—")}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">Identificación</td><td>${esc(invoice.customerIdent || "—")}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">Clave de acceso</td><td style="word-break:break-all">${esc(invoice.accessKey || "—")}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">Autorización</td><td style="word-break:break-all">${esc(invoice.authorizationNumber || "—")}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">Subtotal</td><td>$${money(invoice.subtotal)}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">IVA</td><td>$${money(invoice.taxTotal)}</td></tr>
    <tr><td style="padding:4px 0;font-weight:700">Total</td><td><strong>$${money(invoice.total)}</strong></td></tr>
  </table>
  <p style="margin-top:16px;font-size:13px;color:#555">
    Adjuntamos el XML autorizado de la factura. Conserve este correo como respaldo.
  </p>
</body>
</html>`;
}

async function resolveXmlAttachment(invoice) {
  const rel = invoice.xmlRelativePath;
  if (!rel) return null;
  const base = path.basename(String(rel));
  const full = path.resolve(SRI_PRIVATE_DIR, "invoices", base);
  try {
    await fs.access(full);
    return {
      filename: `factura-${invoiceNumberLabel(invoice)}.xml`,
      path: full,
      contentType: "application/xml",
    };
  } catch {
    try {
      const alt = path.resolve(SRI_PRIVATE_DIR, base);
      await fs.access(alt);
      return {
        filename: `factura-${invoiceNumberLabel(invoice)}.xml`,
        path: alt,
        contentType: "application/xml",
      };
    } catch {
      return null;
    }
  }
}

/**
 * Envía factura autorizada al correo del cliente si la config lo permite.
 * Nunca lanza hacia el emisor SRI: retorna { ok, skipped, reason, warning }.
 */
export async function maybeSendAuthorizedInvoiceEmail(invoice) {
  try {
    await ensureSriEmailSchema();
    const settings = await loadSriBillingSettings();
    const quota = getInvoiceEmailQuotaPublic(settings);

    if (!quota.enableSendInvoiceEmail) {
      return { ok: false, skipped: true, reason: "Envío por correo desactivado en configuración SRI." };
    }
    const to = String(invoice?.customerEmail || "").trim();
    if (!to || !to.includes("@")) {
      return {
        ok: false,
        skipped: true,
        reason: "La factura no tiene correo de cliente válido.",
      };
    }
    if (!quota.smtpReady) {
      return {
        ok: false,
        skipped: true,
        reason: "Falta configurar SMTP (host, usuario, contraseña y remitente).",
        warning: quota.invoiceEmailWarning,
      };
    }
    if (quota.invoiceEmailLimitReached) {
      return {
        ok: false,
        skipped: true,
        reason: quota.invoiceEmailWarning || "Límite diario de correos alcanzado.",
        warning: quota.invoiceEmailWarning,
        limitReached: true,
      };
    }

    let password = "";
    try {
      password = decryptSecret(settings.smtpPassEnc) || "";
    } catch {
      return { ok: false, skipped: true, reason: "No se pudo leer la contraseña SMTP." };
    }
    if (!password) {
      return { ok: false, skipped: true, reason: "Contraseña SMTP vacía." };
    }

    const from = String(settings.smtpFrom || settings.smtpUser || "").trim();
    const transport = buildTransport(settings, password);
    const attachment = await resolveXmlAttachment(invoice);
    const num = invoiceNumberLabel(invoice);

    await transport.sendMail({
      from: `"${String(settings.legalName || settings.tradeName || "Factura").slice(0, 80)}" <${from}>`,
      to,
      subject: `Factura ${num} — ${settings.legalName || settings.tradeName || "Comprobante"}`,
      text: `Factura ${num} autorizada. Total $${money(invoice.total)}. Clave: ${invoice.accessKey || "—"}`,
      html: buildInvoiceEmailHtml(invoice, settings),
      attachments: attachment ? [attachment] : [],
    });

    await bumpEmailSentCount(settings);
    const after = getInvoiceEmailQuotaPublic(await settings.reload());
    return {
      ok: true,
      skipped: false,
      to,
      warning: after.invoiceEmailWarning,
      usage: {
        sentToday: after.invoiceEmailsSentToday,
        limit: after.invoiceEmailDailyLimit,
        remaining: after.invoiceEmailsRemainingToday,
      },
    };
  } catch (e) {
    console.error("maybeSendAuthorizedInvoiceEmail:", e?.message || e);
    return {
      ok: false,
      skipped: false,
      reason: e?.message || "Error al enviar el correo de la factura.",
    };
  }
}

/** Prueba SMTP: envía un correo de verificación (consume 1 del cupo diario). */
export async function sendSriTestEmail(toAddress) {
  await ensureSriEmailSchema();
  const settings = await loadSriBillingSettings();
  const quota = getInvoiceEmailQuotaPublic(settings);
  if (!quota.smtpReady) {
    const err = new Error("Configura host, usuario, contraseña y remitente SMTP primero.");
    err.status = 400;
    throw err;
  }
  if (quota.invoiceEmailLimitReached) {
    const err = new Error(quota.invoiceEmailWarning || "Límite diario alcanzado.");
    err.status = 429;
    err.warning = quota.invoiceEmailWarning;
    throw err;
  }
  const to = String(toAddress || settings.smtpFrom || settings.smtpUser || "").trim();
  if (!to.includes("@")) {
    const err = new Error("Indica un correo de destino válido para la prueba.");
    err.status = 400;
    throw err;
  }
  let password = "";
  try {
    password = decryptSecret(settings.smtpPassEnc) || "";
  } catch {
    const err = new Error("No se pudo leer la contraseña SMTP.");
    err.status = 400;
    throw err;
  }
  const from = String(settings.smtpFrom || settings.smtpUser).trim();
  const transport = buildTransport(settings, password);
  await transport.sendMail({
    from,
    to,
    subject: "Prueba de correo — facturas SRI",
    text: "Si recibes este mensaje, la configuración SMTP de facturas está correcta.",
    html: `<p>Si recibes este mensaje, la configuración SMTP de facturas está correcta.</p>
           <p>Cupo hoy tras esta prueba: se descontará 1 envío del límite diario.</p>`,
  });
  await bumpEmailSentCount(settings);
  const after = getInvoiceEmailQuotaPublic(await settings.reload());
  return {
    ok: true,
    to,
    warning: after.invoiceEmailWarning,
    usage: {
      sentToday: after.invoiceEmailsSentToday,
      limit: after.invoiceEmailDailyLimit,
      remaining: after.invoiceEmailsRemainingToday,
    },
  };
}
