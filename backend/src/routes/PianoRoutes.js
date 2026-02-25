import { Router } from "express";
import {
  getAllSongs,
  getSongById,
  createSong,
  updateSong,
  deleteSong,
} from "../controllers/PianoController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";

const router = Router();

router.get("/", isAuthenticated, getAllSongs);
router.get("/:id", isAuthenticated, getSongById);
router.post("/", isAuthenticated, createSong);
router.put("/:id", isAuthenticated, updateSong);
router.delete("/:id", isAuthenticated, deleteSong);

export default router;
