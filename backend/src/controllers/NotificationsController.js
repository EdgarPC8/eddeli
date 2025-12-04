import { Notifications } from "../models/Notifications.js";
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
    const notification = await Notifications.create({
      userId,
      type,
      title,
      message,
      link
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

