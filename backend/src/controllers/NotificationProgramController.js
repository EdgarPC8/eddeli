import { NotificationProgram } from "../models/NotificationProgram.js";
import { dispatchProgramToUsers } from "../services/notificationService.js";

const ADMIN_ROLES = new Set(["Administrador", "Programador"]);

function assertAdmin(req, res) {
  if (!ADMIN_ROLES.has(String(req.user?.loginRol || ""))) {
    res.status(403).json({ message: "No autorizado." });
    return false;
  }
  return true;
}

function normalizePayload(body) {
  const out = { ...body };
  if ("targetRoleIds" in out && typeof out.targetRoleIds === "string") {
    try {
      out.targetRoleIds = JSON.parse(out.targetRoleIds);
    } catch {
      out.targetRoleIds = [];
    }
  }
  if (out.scheduleIntervalMinutes != null && out.scheduleIntervalMinutes !== "") {
    out.scheduleIntervalMinutes = Number(out.scheduleIntervalMinutes);
  }
  if (out.active != null) out.active = Boolean(out.active);
  return out;
}

export const listNotificationPrograms = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  try {
    const rows = await NotificationProgram.findAll({ order: [["code", "ASC"]] });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNotificationProgram = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  try {
    const payload = normalizePayload(req.body);
    const row = await NotificationProgram.create(payload);
    res.status(201).json(row);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateNotificationProgram = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  try {
    const row = await NotificationProgram.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "No encontrado" });
    await row.update(normalizePayload(req.body));
    res.json(row);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteNotificationProgram = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  try {
    const row = await NotificationProgram.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "No encontrado" });
    if (String(row.code).startsWith("SYSTEM_")) {
      return res.status(400).json({
        message: "Los programas de sistema no se eliminan; desactívalos.",
      });
    }
    await row.destroy();
    res.json({ message: "Eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendNotificationProgramNow = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  try {
    const row = await NotificationProgram.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "No encontrado" });
    const result = await dispatchProgramToUsers(row, { force: true });
    res.json({
      message: `Enviado a ${result.sent} destinatario(s).`,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
