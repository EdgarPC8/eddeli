/** Prefijo de despliegue (vite base). Ej: /eddeli/ */
export const BASE_URL = import.meta.env.BASE_URL;

/** @deprecated Usar useAppSettings().activeApp.logoUrl (servido desde /eddeliapi/img/…/logos/) */
export const LOGO_PATH = `${BASE_URL}logo.jpeg`;
