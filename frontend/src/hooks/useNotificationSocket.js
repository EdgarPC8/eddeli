/** Suscripción Socket.IO a notificaciones nuevas del usuario. */
import { useEffect } from "react";
import { socket } from "../api/axios.js";

export function useNotificationSocket(userId, _accountId, onNewNotification) {
  useEffect(() => {
    if (!userId) return;
    socket.emit("join", userId);
  }, [userId]);

  useEffect(() => {
    if (!onNewNotification) return;
    socket.on("newNotification", onNewNotification);
    return () => socket.off("newNotification", onNewNotification);
  }, [onNewNotification]);
}
