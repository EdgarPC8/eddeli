/**
 * Persistencia local de campañas (fase 1 — validación UX).
 * Sustituir por publicidadRequest → GET/POST /publicidad/campaigns cuando exista API.
 */
import {
  CAMPAIGN_STATUS,
  CONTENT_TYPES,
  DEFAULT_SLIDE_DURATION_SEC,
  STORAGE_KEY_CAMPAIGNS,
  TRANSITIONS,
} from "../constants.js";

const uid = () => `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const slideUid = () => `slide_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function seedCampaigns() {
  const now = new Date().toISOString();
  return [
    {
      id: "cmp_demo_vitrina",
      name: "Vitrina principal — mañana",
      description: "Rotación de productos destacados y banner de apertura.",
      status: CAMPAIGN_STATUS.ACTIVE,
      screenIds: ["pantalla-lobby-1"],
      loop: true,
      playlist: [
        {
          id: "slide_1",
          contentType: CONTENT_TYPES.IMAGE,
          contentId: "img-1",
          title: "Banner promoción mañana",
          mediaPath: "banners/promo-manana.jpg",
          durationSeconds: 10,
          transitionIn: TRANSITIONS.FADE,
          transitionOut: TRANSITIONS.FADE,
          order: 0,
        },
        {
          id: "slide_2",
          contentType: CONTENT_TYPES.PRODUCT,
          contentId: 101,
          title: "Pan de yuca",
          mediaPath: "productos/pan-yuca.jpg",
          durationSeconds: DEFAULT_SLIDE_DURATION_SEC,
          transitionIn: TRANSITIONS.SLIDE_LEFT,
          transitionOut: TRANSITIONS.FADE,
          order: 1,
        },
        {
          id: "slide_3",
          contentType: CONTENT_TYPES.VIDEO,
          contentId: "vid-1",
          title: "Spot panadería 30s",
          mediaPath: "videos/spot-panaderia.mp4",
          durationSeconds: 30,
          transitionIn: TRANSITIONS.FADE,
          transitionOut: TRANSITIONS.ZOOM_OUT,
          order: 2,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cmp_demo_borrador",
      name: "Campaña tarde (borrador)",
      description: "En preparación para pantallas del comedor.",
      status: CAMPAIGN_STATUS.DRAFT,
      screenIds: [],
      loop: true,
      playlist: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    if (!raw) {
      const seeded = seedCampaigns();
      localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedCampaigns();
  } catch {
    return seedCampaigns();
  }
}

function writeAll(campaigns) {
  localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
}

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockCampaignStore = {
  async list() {
    await delay();
    return readAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async getById(id) {
    await delay();
    return readAll().find((c) => c.id === id) ?? null;
  },

  async create(payload) {
    await delay();
    const now = new Date().toISOString();
    const campaign = {
      id: uid(),
      name: payload.name?.trim() || "Nueva campaña",
      description: payload.description?.trim() || "",
      status: payload.status || CAMPAIGN_STATUS.DRAFT,
      screenIds: payload.screenIds || [],
      loop: payload.loop !== false,
      playlist: (payload.playlist || []).map((item, i) => ({
        ...item,
        id: item.id || slideUid(),
        order: i,
      })),
      createdAt: now,
      updatedAt: now,
    };
    const all = readAll();
    all.push(campaign);
    writeAll(all);
    return campaign;
  },

  async update(id, payload) {
    await delay();
    const all = readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Campaña no encontrada");
    const updated = {
      ...all[idx],
      ...payload,
      id,
      playlist: (payload.playlist ?? all[idx].playlist).map((item, i) => ({
        ...item,
        order: i,
      })),
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeAll(all);
    return updated;
  },

  async remove(id) {
    await delay();
    const all = readAll().filter((c) => c.id !== id);
    writeAll(all);
    return { ok: true };
  },
};
