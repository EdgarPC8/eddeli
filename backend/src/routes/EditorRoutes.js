// routes/editor.routes.js
import { Router } from "express";

import {
    createDesign,
    updateDesign,
    upsertOverride,
    getDesignResolved,
    importTemplate,
    listTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
  } from "../controllers/InventoryControl/EditorController.js";


const router = Router();

// Templates
router.post("/editor/templates/import", importTemplate);
router.get("/editor/templates", listTemplates);
router.get("/editor/templates/:id", getTemplateById);
router.put("/editor/templates/:id", updateTemplate);
router.delete("/editor/templates/:id", deleteTemplate);

// Designs
router.post("/editor/designs", createDesign);
router.put("/editor/designs/:id", updateDesign);
router.post("/editor/designs/:id/overrides", upsertOverride);
router.get("/editor/designs/:id", getDesignResolved);

export default router;
