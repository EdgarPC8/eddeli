/**
 * Crea tablas de Publicidad si no existen (sin ALTER masivo en cada arranque).
 * Tras cambiar columnas del modelo: npm run db:sync
 */
import {
  PublicidadCampaign,
  PublicidadPlaylistItem,
  PublicidadDevice,
} from "../models/Publicidad.js";
import { MediaAsset } from "../models/MediaAsset.js";

export async function ensurePublicidadSchema() {
  await MediaAsset.sync();
  await PublicidadCampaign.sync({ alter: true });
  await PublicidadPlaylistItem.sync({ alter: true });
  await PublicidadDevice.sync({ alter: true });
}
