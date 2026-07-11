import { Notifications } from "../models/Notifications.js";
import { createAndPushNotification } from "../services/notificationService.js";
// controllers/NotificationsController.js

export const getUnreadCountByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const count = await Notifications.count({
      where: {
        userId,
        seen: false,
        deleted: false
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// controllers/NotificationsController.js
// Obtener todas las notificaciones de un usuario
export const getNotificationsByUser = async (req, res) => {
  const { userId } = req.params;
  console.log(userId)
  try {
    const notifications = await Notifications.findAll({
      where: {
        userId,
        deleted: false  // importante para omitir eliminadas
      },
      order: [['createdAt', 'DESC']]
    });
    res.status(201).json(notifications);

    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear una nueva notificación
export const createNotification = async (req, res) => {
  const { userId, type, title, message, link } = req.body;
  try {
    const notification = await createAndPushNotification({
      userId,
      type: type || "info",
      title,
      message,
      link,
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Marcar notificación como vista
export const markAsSeen = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notifications.findByPk(id);
    if (!notification) return res.status(404).json({ message: "No encontrada" });
    notification.seen = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar una notificación
export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notifications.findByPk(id);
    if (!notification) return res.status(404).json({ message: "No encontrada" });

    notification.deleted = true;
    await notification.save();
    res.json({ message: "Notificación marcada como eliminada" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Marcar varias notificaciones como leídas (ids en body). */
export const markManyAsSeen = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return res.status(400).json({ message: "Sin ids" });
  }
  try {
    await Notifications.update(
      { seen: true },
      { where: { id: ids, deleted: false } }
    );
    res.json({ message: "Marcadas como leídas", count: ids.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Soft-delete de varias notificaciones. */
export const deleteManyNotifications = async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return res.status(400).json({ message: "Sin ids" });
  }
  try {
    await Notifications.update(
      { deleted: true },
      { where: { id: ids } }
    );
    res.json({ message: "Eliminadas", count: ids.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Marcar todas las no leídas de un usuario. */
export const markAllAsSeenByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const [count] = await Notifications.update(
      { seen: true },
      { where: { userId, seen: false, deleted: false } }
    );
    res.json({ message: "Todas marcadas como leídas", count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Eliminar (soft) todas las ya leídas de un usuario. */
export const deleteReadByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const [count] = await Notifications.update(
      { deleted: true },
      { where: { userId, seen: true, deleted: false } }
    );
    res.json({ message: "Leídas eliminadas", count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

