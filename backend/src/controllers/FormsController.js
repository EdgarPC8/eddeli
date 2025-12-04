// controllers/formsController.js
import {
    Form,
    Question,
    Option,
    Response,
    Answer,
    UserForm,
  } from "../models/Forms.js";

  
  import { Op } from "sequelize";
import { Users } from "../models/Users.js";
import { Notifications } from "../models/Notifications.js";
import { sendNotificationToUser } from "../sockets/notificationSocket.js";
  
  // Obtener todos los formularios
  export const getForms = async (req, res) => {
    // GET /api/forms/
    try {
      const data = await Form.findAll();
  
      // Recorrer cada formulario para contar los usuarios asignados y los que han respondido
      const formsWithStats = await Promise.all(
        data.map(async (form) => {
          const countUserAssign = await UserForm.count({
            where: {
              formId: form.id,
            },
          });
  
          const countUserResponde = await Response.count({
            where: {
              formId: form.id,
            },
          });
  
          return {
            ...form.toJSON(), // Convertir el formulario a un objeto plano
            assignedUsers: countUserAssign,
            respondedUsers: countUserResponde,
          };
        })
      );
  
      // Devolver los datos con los nuevos parámetros
      res.json(formsWithStats);
    } catch (error) {
      console.error("Error al obtener formularios:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };
  
  // Crear un nuevo formulario con preguntas y opciones
  export const createForm = async (req, res) => {
    // POST /api/forms/
   
    const { title, description, date, isPublic, questions } = req.body;
  
    try {
      const newForm = await Form.create({ title, description, date, isPublic });
  
      res.status(201).json({ message: "Formulario creado correctamente." });
    } catch (error) {
      console.error("Error al crear el formulario:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };
  export const getQuestionsByForm = async (req, res) => {
    const { id } = req.params;
  
    try {
      
      const form = await Form.findByPk(id, {
        attributes: ["id", "title", "description", "date"],
        include: [
          {
            model: Question,
            as: "form_questions", // 👈 alias correcto aquí
            attributes: ["id", "text", "type", "order"],
            include: [
              {
                model: Option,
                as: "form_options", // 👈 alias correcto aquí también
                attributes: ["id", "text", "order"],
              },
            ],
          },
        ],
      });
  
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado." });
      }
  
      // ⚠️ Usar el alias para acceder a las preguntas
      const formattedQuestions = form.form_questions
        ?.sort((a, b) => a.order - b.order)
        .map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          order: q.order,
          options: q.form_options
            ?.sort((a, b) => a.order - b.order)
            .map((opt) => ({
              id: opt.id,
              text: opt.text,
              order: opt.order,
            })),
        })) || [];
  
      res.status(200).json({
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          date: form.date,
        },
        questions: formattedQuestions,
      });
    } catch (error) {
      console.error("Error al obtener el formulario:", error);
      res.status(500).json({ message: "Error al obtener el formulario." });
    }
  };
  export const addQuestionsToForm = async (req, res) => {
    const { id: formId } = req.params;
    const questions = req.body;
  
    try {
      // 1. Obtener preguntas existentes del formulario
      const existingQuestions = await Question.findAll({ where: { formId } });
  
      // 2. Crear un Set con los IDs recibidos del frontend
      const incomingIds = new Set(questions.map((q) => q.id).filter(Boolean));
  
      // 3. Eliminar preguntas que no están en el frontend
      for (const existing of existingQuestions) {
        if (!incomingIds.has(existing.id)) {
          // Eliminar las opciones si la pregunta ya no está en el frontend
          await Option.destroy({ where: { questionId: existing.id } });
          await existing.destroy();
        }
      }
  
      // 4. Crear o actualizar preguntas
      for (const q of questions) {
        const existing = await Question.findByPk(q.id);
  
        if (existing) {
          // Si el tipo cambia a "text" y la pregunta tiene opciones, eliminamos las opciones
          if (q.type === "text" && existing.type !== "text") {
            // Eliminar las opciones de la tabla de opciones
            await Option.destroy({ where: { questionId: existing.id } });
            // Actualizar la pregunta para que no tenga opciones
            await existing.update({
              text: q.question,
              type: q.type,
              order: q.order, // <--- Asegúrate de esto
            });
          } else if (q.type === "text" && existing.options && existing.options.length > 0) {
            // Si ya es tipo "text" y tiene opciones, eliminamos las opciones
            await Option.destroy({ where: { questionId: existing.id } });
            // Actualizar la pregunta sin opciones
            await existing.update({
              text: q.question,
              type: q.type,
              order: q.order, // <--- Asegúrate de esto
            });
          } else {
            // Actualización normal para otros tipos de preguntas
            await existing.update({
              text: q.question,
              type: q.type,
              order: q.order, // <--- Asegúrate de esto
            });
  
            // Si la pregunta tiene opciones, las guardamos
            if (q.options && q.options.length > 0) {
              // Eliminar las opciones antiguas si existen
              await Option.destroy({ where: { questionId: existing.id } });
  
              // Insertar las nuevas opciones
              await Option.bulkCreate(
                q.options.map((opt) => ({
                  questionId: existing.id,
                  text: opt.text,
                }))
              );
            }
          }
        } else {
          // Crear pregunta nueva
          const newQuestion = await Question.create({
            formId,
            text: q.question,
            type: q.type,
            order: q.order, // <--- Asegúrate de esto
          });
  
          // Si la pregunta tiene opciones, crear las opciones
          if (q.options && q.options.length > 0) {
            await Option.bulkCreate(
              q.options.map((opt) => ({
                questionId: newQuestion.id,
                text: opt.text,
              }))
            );
          }
        }
      }
  
      res.status(200).json({ message: "Preguntas actualizadas correctamente." });
    } catch (error) {
      console.error("Error al guardar preguntas:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };
// Página: Eliminar encuesta | Ruta: /softed/forms | Método: DELETE | EndPoint: /api/forms/:id
export const deleteForm = async (req, res) => {
    const { id } = req.params;
    try {
      const form = await Form.findByPk(id);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado." });
      }
  
      await form.destroy(); // Esto elimina el formulario, y si está en cascada, también sus preguntas y opciones
  
      res.json({ message: "Formulario eliminado correctamente." });
    } catch (error) {
      console.error("Error al eliminar el formulario:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };
  
  // Editar un formulario existente
  export const editForm = async (req, res) => {
    // PUT /api/forms/:id
    /* req.body igual que createForm */
    const { id } = req.params;
    const { title, description, date, isPublic, questions } = req.body;
  
    try {
      const form = await Form.findByPk(id);
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
  
      await form.update({ title, description, date, isPublic });
  
      res.json({ message: "Formulario actualizado correctamente." });
    } catch (error) {
      console.error("Error al editar formulario:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };

// GET /api/forms/assign/:formId
export const getUsersByFormAssign = async (req, res) => {
  const { formId } = req.params;
  console.log(formId)

  try {
    const form = await Form.findByPk(formId, {
      include: [
        {
          model: Users,
          through: { attributes: [] }, // esto oculta la tabla intermedia
        }
      ]
    });

    if (!form) {
      return res.status(404).json({ message: 'Formulario no encontrado' });
    }

    res.status(200).json(form.users); // o form.Users dependiendo de cómo defines el alias
  } catch (error) {
    console.error('Error al obtener usuarios asignados:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};




// DELETE /api/forms/assign/:formId/:userId
export const deleteUsersByFormAssign = async (req, res) => {
  const { formId, userId } = req.params;

  try {
    const deleted = await UserForm.destroy({
      where: {
        formId,
        userId
      }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }

    res.status(200).json({ message: 'Usuario eliminado de la asignación correctamente.' });
  } catch (error) {
    console.error('Error al eliminar asignación de usuario:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};




export const assignUsersToForm = async (req, res) => {
  const { formId } = req.params;
  const { userIds } = req.body;

  try {
    const assignments = userIds.map(userId => ({ formId, userId }));
    await UserForm.bulkCreate(assignments, { ignoreDuplicates: true });

    // Crear notificación para cada usuario
    const notifications = userIds.map(userId => ({
      userId,
      type: "info",
      title: "Encuesta asignada",
      message: "Tienes una nueva encuesta disponible para responder.",
      link: `/myforms/${formId}`
    }));
    await Notifications.bulkCreate(notifications);

    // Emitir a cada usuario individual
    userIds.forEach(userId => {
      
      sendNotificationToUser(userId, {
        title: "Encuesta asignada",
        message: "Tienes una nueva encuesta disponible para responder.",
        link: `/myforms/${formId}`,
        seen: false,
      });
    });

    res.status(201).json({ message: "Usuarios asignados y notificados correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al asignar usuarios o notificar" });
  }
};


export const getFormById = async (req, res) => {
  const { id } = req.params;
  try {
    const form = await Form.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: "Formulario no encontrado." });
    }
    res.status(200).json({form: form});
  } catch (error) {
    console.error("Error al obtener el formulario:", error);
    res.status(500).json({ message: "Error al obtener el formulario." });
  }
};



export const getResponses = async (req, res) => {
  const { id } = req.params;

  try {
    const questions = await Question.findAll({
      where: { formId: id },
      attributes: [
        ["id", "questionId"],
        ["text", "questionText"],
        "type"
      ],
      include: [
        {
          model: Option,
          attributes: ["id", "text"],
        },
        {
          model: Answer,
          attributes: ["selectedOptionIds", "answerText"],
        },
      ],
    });

    // Formatea las respuestas
    const formattedResponses = questions.map(question => {
      const options = question.form_options || [];
      const answers = question.form_answers|| [];

      const formattedAnswers = answers.map(answer => {
        const parsedSelected = typeof answer.selectedOptionIds === 'string'
          ? JSON.parse(answer.selectedOptionIds)
          : answer.selectedOptionIds;

        return {
          selectedOptionIds: parsedSelected ?? null,
          answerText: answer.answerText ?? null,
        };
      });

      return {
        questionId: question.get("questionId"),
        questionText: question.get("questionText"),
        type: question.get("type"),
        options: options.map(opt => ({
          id: opt.id,
          text: opt.text,
        })),
        answers: formattedAnswers,
      };
    });

    res.json(formattedResponses);
  } catch (error) {
    console.error("Error al obtener respuestas:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

  
  export const getFormsByUserId = async (req, res) => {
    const { userId } = req.params;
  
    try {
      // Traer formularios asignados al usuario
      const assignedForms = await Form.findAll({
        include: [
          {
            model: Users,
            where: { id: userId },
            attributes: [],
            through: { attributes: [] },
          },
        ],
      });
  
      // Obtener IDs de formularios asignados
      const formIds = assignedForms.map((form) => form.id);
  
      // Traer todas las respuestas del usuario en esos formularios
      const userResponses = await Response.findAll({
        where: {
          userId,
          formId: formIds, // Sequelize lo convierte a IN (...)
        },
      });
  
      // Crear un Set de formIds ya respondidos
      const respondedFormIds = new Set(userResponses.map((r) => r.formId));
  
      // Agregar propiedad `responded` a cada formulario
      const formsWithStatus = assignedForms.map((form) => ({
        ...form.toJSON(),
        responded: respondedFormIds.has(form.id),
      }));
  
      res.status(200).json(formsWithStatus);
    } catch (error) {
      console.error("Error al obtener encuestas del usuario:", error);
      res.status(500).json({ message: "Error al obtener encuestas del usuario" });
    }
  };
  
  
  // Obtener formulario con preguntas y opciones
  export const getFormUserById = async (req, res) => {
    // GET /api/forms/:id
    const { id } = req.params;
  
    try {
      const form = await Form.findByPk(id, {
        include: {
          model: Question,
          include: Option,
        },
      });
      if (!form) return res.status(404).json({ message: "Formulario no encontrado" });
      res.json(form);
    } catch (error) {
      console.error("Error al obtener el formulario:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };
  
  // Guardar respuestas de un usuario a un formulario
  export const respondeForm = async (req, res) => {
    // POST /api/forms/submit/:id
    /*
      req.body esperado:
      {
        userId: 3,
        answers: [
          {
            questionId: 1,
            answerText: "Respuesta libre",
            optionId: 2 // opcional para preguntas con opciones
          },
          ...
        ]
      }
    */
    const { id } = req.params;
    const { userId, answers } = req.body;
  
    try {
      const existing = await Response.findOne({
        where: { formId: id, userId }
      });
      
      if (existing) {
        return res.status(400).json({ message: "Este usuario ya respondió esta encuesta." });
      }

      const response = await Response.create({
        userId,
        formId: id,
      });
  
      for (const ans of answers) {
        await Answer.create({
          responseId: response.id,
          questionId: ans.questionId,
          answerText: ans.answerText || null,
          selectedOptionIds: ans.selectedOptionIds || [],
        });
      }
  
      res.status(201).json({ message: "Respuestas guardadas correctamente." });
    } catch (error) {
      console.error("Error al guardar respuestas:", error);
      res.status(500).json({ message: "Error en el servidor." });
    }
  };

    // controllers/formsController.js
export const cloneForm = async (req, res) => {
  try {
    const { formId } = req.params;

    // Obtener el formulario original con preguntas y opciones
    const formOriginal = await Form.findByPk(formId, {
      include: {
        model: Question,
        include: [Option],
      },
    });

    if (!formOriginal) return res.status(404).json({ error: "Formulario no encontrado" });

    // Crear el nuevo formulario
    const nuevoForm = await Form.create({
      title: formOriginal.title + " (Copia)",
      description: formOriginal.description,
      isPublic: formOriginal.isPublic,
      date: new Date(),
    });

    // Clonar preguntas y opciones
    for (const pregunta of formOriginal.form_questions) {
      const nuevaPregunta = await Question.create({
        formId: nuevoForm.id,
        text: pregunta.text,
        type: pregunta.type,
        required: pregunta.required,
        order: pregunta.order,
      });

      for (const opcion of pregunta.form_options) {
        await Option.create({
          questionId: nuevaPregunta.id,
          text: opcion.text,
          isCorrect: opcion.isCorrect,
          order: opcion.order,
        });
      }
    }

    return res.status(201).json({ message: "Formulario clonado con éxito", form: nuevoForm });
  } catch (error) {
    console.error("Error al clonar formulario:", error);
    res.status(500).json({ error: "Error interno al clonar formulario" });
  }
};
