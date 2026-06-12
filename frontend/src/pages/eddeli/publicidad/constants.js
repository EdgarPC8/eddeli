/**
 * Constantes del módulo Publicidad (signage / pantallas digitales).
 * Centralizadas para reutilizar en UI, mock y futura API.
 */

/** Tipos de contenido que se pueden añadir a una playlist (recursos del backend). */
export const CONTENT_TYPES = {
  PRODUCT: "product",
  IMAGE: "image",
  VIDEO: "video",
  /** Tablero con varios productos (vista menú digital) */
  MENU: "menu",
  /** Mensaje de texto grande (promoción, aviso) */
  TEXT: "text",
};

export const CONTENT_TYPE_LABELS = {
  [CONTENT_TYPES.PRODUCT]: "Producto",
  [CONTENT_TYPES.IMAGE]: "Imagen",
  [CONTENT_TYPES.VIDEO]: "Video",
  [CONTENT_TYPES.MENU]: "Tablero menú",
  [CONTENT_TYPES.TEXT]: "Mensaje de texto",
};

/**
 * Paleta signage — rojo/dorado metálico (solo módulo Publicidad).
 */
export const SIGNAGE_THEME = {
  red: "#E4002B",
  redLight: "#FF4D6D",
  redDark: "#A8001F",
  gold: "#D4AF37",
  goldLight: "#F5E6A3",
  goldDark: "#9A7B0A",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#F5F5F7",
  crema: "#FFF8EE",
  panelDark: "#1A1A1D",
};

/**
 * Publicidad fija sin conexión — sin logo ni precios, solo comunicado de panadería.
 * No depende de la API.
 */
export const OFFLINE_SLIDE_DURATION_SEC = 8;

export const OFFLINE_SIGNAGE = {
  /** Emojis que caen como lluvia de fondo */
  rainFigures: ["🍩", "🧁", "🍰", "🥐", "🎂", "🍪", "🥖", "🧇", "🍞", "🥧"],
  /** Mensajes rotativos (título + comunicado) */
  slides: [
    {
      title: "Panadería",
      message: "Aquí hacemos un delicioso pan, recién horneado para ti",
    },
    {
      title: "Pastelería",
      message: "Pasteles ricos que endulzan tu día",
    },
    {
      title: "Repostería",
      message: "Dulces y repostería artesanal hechos con cariño",
    },
    {
      title: "Panadería y pastelería",
      message: "Lo mejor en pan, pasteles y repostería",
    },
    {
      title: "¡Vuelve pronto!",
      message: "Estamos horneando cosas deliciosas",
    },
  ],
};

/** Estados de una campaña publicitaria. */
export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  ENDED: "ended",
};

/** Estados de un dispositivo TV/APK registrado. */
export const DEVICE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  DISABLED: "disabled",
};

export const DEVICE_STATUS_LABELS = {
  [DEVICE_STATUS.PENDING]: "Pendiente",
  [DEVICE_STATUS.APPROVED]: "Aprobado",
  [DEVICE_STATUS.REJECTED]: "Rechazado",
  [DEVICE_STATUS.DISABLED]: "Deshabilitado",
};

export const CAMPAIGN_STATUS_LABELS = {
  [CAMPAIGN_STATUS.DRAFT]: "Borrador",
  [CAMPAIGN_STATUS.SCHEDULED]: "Programada",
  [CAMPAIGN_STATUS.ACTIVE]: "Activa",
  [CAMPAIGN_STATUS.PAUSED]: "Pausada",
  [CAMPAIGN_STATUS.ENDED]: "Finalizada",
};

/**
 * Plantilla fija de transición (backend aplica lo mismo al guardar).
 * La UI no permite cambiarlas por ahora.
 */
export const PLAYLIST_TRANSITION_TEMPLATE = {
  transitionIn: "fade",
  transitionOut: "fade",
};

/** Transiciones de entrada/salida entre piezas de la playlist. */
export const TRANSITIONS = {
  NONE: "none",
  FADE: "fade",
  SLIDE_LEFT: "slide-left",
  SLIDE_RIGHT: "slide-right",
  ZOOM_IN: "zoom-in",
  ZOOM_OUT: "zoom-out",
};

export const TRANSITION_LABELS = {
  [TRANSITIONS.NONE]: "Sin transición",
  [TRANSITIONS.FADE]: "Fundido",
  [TRANSITIONS.SLIDE_LEFT]: "Deslizar izquierda",
  [TRANSITIONS.SLIDE_RIGHT]: "Deslizar derecha",
  [TRANSITIONS.ZOOM_IN]: "Zoom entrada",
  [TRANSITIONS.ZOOM_OUT]: "Zoom salida",
};

/** Duración del crossfade entre diapositivas (ms). */
export const SLIDE_CROSSFADE_MS = 600;

/** Tamaño de letra del título (producto / mensaje texto) en pantalla TV. */
export const TITLE_FONT_SIZE = {
  MIN: 28,
  MAX: 120,
  PRODUCT_DEFAULT: 56,
  TEXT_DEFAULT: 64,
};

/** Estilos tipográficos del título en signage TV. */
export const TITLE_FONT_STYLES = {
  DEFAULT: "default",
  ROUNDED: "rounded",
  OUTLINE: "outline",
  SHADOW_3D: "shadow3d",
  ROUNDED_3D: "rounded3d",
};

export const TITLE_FONT_STYLE_LABELS = {
  [TITLE_FONT_STYLES.DEFAULT]: "Clásica",
  [TITLE_FONT_STYLES.ROUNDED]: "Redondeada",
  [TITLE_FONT_STYLES.OUTLINE]: "Con borde",
  [TITLE_FONT_STYLES.SHADOW_3D]: "Efecto 3D",
  [TITLE_FONT_STYLES.ROUNDED_3D]: "Redondeada 3D",
};

/** Modo de música de fondo por campaña. */
export const MUSIC_MODES = {
  NONE: "none",
  SINGLE_LOOP: "single_loop",
  PLAYLIST_LOOP: "playlist_loop",
};

export const MUSIC_MODE_LABELS = {
  [MUSIC_MODES.NONE]: "Sin música",
  [MUSIC_MODES.SINGLE_LOOP]: "Una pista en bucle",
  [MUSIC_MODES.PLAYLIST_LOOP]: "Lista de pistas en bucle",
};

/** Duración por defecto de cada pieza (segundos). */
export const DEFAULT_SLIDE_DURATION_SEC = 8;

/** Min / max duración por slide (segundos). */
export const MIN_SLIDE_DURATION_SEC = 3;
export const MAX_SLIDE_DURATION_SEC = 120;

/** Clave localStorage para campañas simuladas. */
export const STORAGE_KEY_CAMPAIGNS = "eddeli_publicidad_campaigns_v1";

/**
 * Eventos WebSocket previstos (reproductor TV ↔ servidor).
 * Usar cuando exista backend de signage.
 */
export const WS_EVENTS = {
  SCREEN_REGISTER: "publicidad:screen:register",
  SCREEN_REGISTERED: "publicidad:screen:registered",
  SCREEN_PLAYLIST: "publicidad:screen:playlist",
  PLAYLIST_UPDATE: "publicidad:playlist:update",
  PLAYBACK_CONTROL: "publicidad:playback:control",
  PLAYBACK_COMMAND: "publicidad:playback:command",
  DEVICE_UPDATED: "publicidad:device:updated",
};

/** Polling HTTP de respaldo cuando el socket está activo / caído. */
export const PLAYBACK_POLL_MS = {
  SOCKET_ON: 60_000,
  SOCKET_OFF: 30_000,
};
