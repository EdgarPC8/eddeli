import { Router } from "express";
import {
    getForms,
    createForm,
    deleteForm,
    editForm,
    addQuestionsToForm,
    getFormById,
    getResponses,
    getFormsByUserId,
    respondeForm,
    getQuestionsByForm,
    getUsersByFormAssign,
    deleteUsersByFormAssign,
    assignUsersToForm,
    cloneForm,
} from "../controllers/FormsController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";

const router = new Router();

// Admin
router.get("", isAuthenticated,getForms);                           //Ver todas las encuestas    
router.post("", isAuthenticated,createForm);                          //Crea la encuesta
router.delete("/:id", isAuthenticated,deleteForm);  //Elimina la encuesta
router.put("/:id", isAuthenticated,editForm);      //Edita la encuesta
router.post("/assign/:formId", isAuthenticated,assignUsersToForm);        //trae Preguntas del form por id
router.get("/assign/:formId", isAuthenticated,getUsersByFormAssign);        //trae Preguntas del form por id
router.delete("/assign/:formId/:userId", isAuthenticated,deleteUsersByFormAssign);        //trae Preguntas del form por id
router.get("/manage/:id", isAuthenticated,getQuestionsByForm);        //trae Preguntas del form por id
router.post("/manage/:id", isAuthenticated,addQuestionsToForm);  //Anade o edita preguntas
router.get("/:id", isAuthenticated,getFormById);  //Trae la info de la encuesta por id 
router.get("/clone/:formId", isAuthenticated,cloneForm);                         
router.get("/user/:userId", isAuthenticated,getFormsByUserId);      
router.get("/responses/:id", isAuthenticated,getResponses);         
router.post("/submit/:id", isAuthenticated,respondeForm);           

export default router;
