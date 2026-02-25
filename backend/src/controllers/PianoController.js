import { PianoSong } from "../models/PianoSong.js";

/**
 * Listar todas las canciones (CRUD - Read list)
 */
export const getAllSongs = async (req, res) => {
  try {
    const songs = await PianoSong.findAll({
      order: [["updatedAt", "DESC"]],
    });
    return res.json(songs);
  } catch (error) {
    console.error("Error al listar canciones piano:", error);
    return res.status(500).json({ message: "Error al obtener las canciones." });
  }
};

/**
 * Obtener una canción por id (CRUD - Read one)
 */
export const getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await PianoSong.findByPk(id);
    if (!song) {
      return res.status(404).json({ message: "Canción no encontrada." });
    }
    return res.json(song);
  } catch (error) {
    console.error("Error al obtener canción piano:", error);
    return res.status(500).json({ message: "Error al obtener la canción." });
  }
};

/**
 * Normaliza una nota para guardar: { note, time, duration, hand }
 */
function normalizeNoteForDb(n) {
  if (!n || typeof n.note !== "string") return null;
  return {
    note: String(n.note).trim(),
    time: typeof n.time === "string" ? n.time : "0:0:0",
    duration: n.duration || "8n",
    hand: n.hand === "L" ? "L" : "R",
  };
}

/**
 * Crear una canción (CRUD - Create)
 * Body: { title?, bpm?, notes, chords?, keySignature? }
 */
export const createSong = async (req, res) => {
  try {
    const body = req.body || {};
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Sin título";
    const bpm = Math.max(1, Math.min(999, Number(body.bpm) || 120));
    const rawNotes = Array.isArray(body.notes) ? body.notes : [];
    const notes = rawNotes.map(normalizeNoteForDb).filter(Boolean);

    let chords = [];
    if (Array.isArray(body.chords)) {
      chords = body.chords;
    } else if (typeof body.chords === "string") {
      try {
        const parsed = JSON.parse(body.chords);
        if (Array.isArray(parsed)) chords = parsed;
      } catch {
        chords = [];
      }
    }

    const keySignature =
      typeof body.keySignature === "string" && body.keySignature.trim()
        ? body.keySignature.trim()
        : "C";

    const song = await PianoSong.create({
      title,
      bpm,
      notes,
      chords,
      keySignature,
    });
    return res.status(201).json(song);
  } catch (error) {
    console.error("Error al crear canción piano:", error);
    return res.status(500).json({ message: "Error al crear la canción." });
  }
};

/**
 * Actualizar una canción (CRUD - Update)
 * Body: { title?, bpm?, notes?, chords?, keySignature? }
 */
export const updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, bpm, notes, chords, keySignature } = req.body;
    const song = await PianoSong.findByPk(id);
    if (!song) {
      return res.status(404).json({ message: "Canción no encontrada." });
    }
    if (title !== undefined) song.title = title;
    if (bpm !== undefined) song.bpm = Number(bpm) || 120;
    if (notes !== undefined && Array.isArray(notes)) {
      song.notes = notes.map(normalizeNoteForDb).filter(Boolean);
    }
    if (chords !== undefined) {
      if (Array.isArray(chords)) {
        song.chords = chords;
      } else if (typeof chords === "string") {
        try {
          const parsed = JSON.parse(chords);
          if (Array.isArray(parsed)) song.chords = parsed;
        } catch {
          // dejamos los acordes anteriores si el parse falla
        }
      }
    }
    if (keySignature !== undefined) {
      song.keySignature =
        typeof keySignature === "string" && keySignature.trim()
          ? keySignature.trim()
          : song.keySignature;
    }
    await song.save();
    return res.json(song);
  } catch (error) {
    console.error("Error al actualizar canción piano:", error);
    return res.status(500).json({ message: "Error al actualizar la canción." });
  }
};

/**
 * Eliminar una canción (CRUD - Delete)
 */
export const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    const song = await PianoSong.findByPk(id);
    if (!song) {
      return res.status(404).json({ message: "Canción no encontrada." });
    }
    await song.destroy();
    return res.status(200).json({ message: "Canción eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar canción piano:", error);
    return res.status(500).json({ message: "Error al eliminar la canción." });
  }
};
