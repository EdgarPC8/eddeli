/**
 * Crea tablas de Publicidad si no existen (sin ALTER masivo en cada arranque).
 * Tras cambiar columnas del modelo: npm run db:sync
 */
import {
  PublicidadCampaign,
  PublicidadPlaylistItem,
  PublicidadDevice,
} from "../models/Publicidad.js";

export async function ensurePublicidadSchema() {
  await PublicidadCampaign.sync();
  await PublicidadPlaylistItem.sync({ alter: true });
  await PublicidadDevice.sync({ alter: true });
}
