/**
 * Socket en tiempo real + polling HTTP de respaldo para reproductores publicidad.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../../../../api/axios.js";
import { PLAYBACK_POLL_MS, WS_EVENTS } from "../constants.js";

export function applyPlaybackCommand(command, engine) {
  if (!command?.action || !engine) return false;
  switch (command.action) {
    case "play":
      engine.play?.();
      return true;
    case "pause":
      engine.pause?.();
      return true;
    case "next":
      engine.next?.();
      return true;
    case "prev":
      engine.prev?.();
      return true;
    case "reload":
      return false;
    default:
      return false;
  }
}

/**
 * @param {object} options
 * @param {string} [options.deviceId]
 * @param {string|number} [options.campaignId]
 * @param {boolean} [options.enabled]
 * @param {() => void|Promise<void>} [options.onPoll] — HTTP de respaldo
 * @param {(payload: object) => void} [options.onPlaylist] — playlist vía socket
 * @param {() => void|Promise<void>} [options.onDeviceUpdated]
 * @param {(command: { action: string }) => void|boolean} [options.onPlaybackCommand]
 */
export function usePublicidadPlaybackSync({
  deviceId,
  campaignId,
  enabled = true,
  onPoll,
  onPlaylist,
  onDeviceUpdated,
  onPlaybackCommand,
} = {}) {
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const onPollRef = useRef(onPoll);
  const onPlaylistRef = useRef(onPlaylist);
  const onDeviceUpdatedRef = useRef(onDeviceUpdated);
  const onPlaybackCommandRef = useRef(onPlaybackCommand);

  onPollRef.current = onPoll;
  onPlaylistRef.current = onPlaylist;
  onDeviceUpdatedRef.current = onDeviceUpdated;
  onPlaybackCommandRef.current = onPlaybackCommand;

  const register = useCallback(() => {
    if (!enabled) return;
    socket.emit(WS_EVENTS.SCREEN_REGISTER, {
      deviceId: deviceId || undefined,
      campaignId: campaignId != null && campaignId !== "" ? String(campaignId) : undefined,
      screenId: deviceId || (campaignId != null ? String(campaignId) : undefined),
    });
  }, [enabled, deviceId, campaignId]);

  useEffect(() => {
    if (!enabled) {
      setSocketConnected(false);
      return undefined;
    }

    const handleConnect = () => {
      setSocketConnected(true);
      register();
    };

    const handleDisconnect = () => setSocketConnected(false);

    const handlePlaylist = (payload) => {
      onPlaylistRef.current?.(payload);
    };

    const handleDeviceUpdated = () => {
      onDeviceUpdatedRef.current?.();
    };

    const handleCommand = (command) => {
      const handled = onPlaybackCommandRef.current?.(command);
      if (command?.action === "reload" || handled === false) {
        onPollRef.current?.();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(WS_EVENTS.SCREEN_PLAYLIST, handlePlaylist);
    socket.on(WS_EVENTS.PLAYLIST_UPDATE, handlePlaylist);
    socket.on(WS_EVENTS.DEVICE_UPDATED, handleDeviceUpdated);
    socket.on(WS_EVENTS.PLAYBACK_COMMAND, handleCommand);

    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(WS_EVENTS.SCREEN_PLAYLIST, handlePlaylist);
      socket.off(WS_EVENTS.PLAYLIST_UPDATE, handlePlaylist);
      socket.off(WS_EVENTS.DEVICE_UPDATED, handleDeviceUpdated);
      socket.off(WS_EVENTS.PLAYBACK_COMMAND, handleCommand);
    };
  }, [enabled, register]);

  useEffect(() => {
    if (!enabled || !onPoll) return undefined;
    const ms = socketConnected ? PLAYBACK_POLL_MS.SOCKET_ON : PLAYBACK_POLL_MS.SOCKET_OFF;
    const tick = () => onPollRef.current?.();
    const interval = setInterval(tick, ms);
    return () => clearInterval(interval);
  }, [enabled, onPoll, socketConnected]);

  const emitControl = useCallback(
    (action, target = {}) => {
      socket.emit(WS_EVENTS.PLAYBACK_CONTROL, {
        action,
        deviceId: target.deviceId || deviceId || undefined,
        campaignId:
          target.campaignId != null
            ? String(target.campaignId)
            : campaignId != null
              ? String(campaignId)
              : undefined,
      });
    },
    [deviceId, campaignId],
  );

  return {
    socketConnected,
    emitControl,
  };
}
