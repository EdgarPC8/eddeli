import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { Roles } from '../models/Roles.js';
import { Users } from '../models/Users.js';
import { 
  QuizQuizzes,
  QuizQuestions,
  QuizOptions,
  QuizAttempts,
  QuizAssignment,
  QuizAnswers,

} from '../models/Quiz.js';
import { Account, AccountRoles } from '../models/Account.js';
import { sequelize } from './connection.js';
import { Careers, Matricula, Matriz, Periods } from '../models/Alumni.js';
import { Form,
Question,
  Option,
  Response,
  Answer,
  UserForm } from '../models/Forms.js';
import { Notifications } from '../models/Notifications.js';

import { 
  InventoryCategory,
  InventoryRecipe,
  InventoryMovement,
  InventoryProduct, 
  InventoryUnit,
  HomeProduct,
  Store,
  Catalog,
  StoreProduct
} from '../models/Inventory.js';
import { 
  Customer ,
  Order,
  OrderItem
} from '../models/Orders.js';
import { Expense, 
  Income ,
  ItemGroup,
  ItemGroupItem,
  Payment
  
} from '../models/Finance.js';
import { CvTemplate } from '../models/CvTemplate.js';
import {
  EditorTemplate,
  EditorTemplateGroup,
  EditorTemplateLayer,
  EditorLayerProp,
  EditorLayerBind,
  EditorDesign,
  EditorDesignLayerOverride,
} from '../models/Editor.js';





// Rutas relativas al archivo para que siempre sean src/database y src/backups
export const backupFilePath = resolve(__dirname, 'backup.json');
export const backups = resolve(__dirname, '..', 'backups');

// ===== Helpers anti "JSON doble stringificado" =====

const unwrapJsonString = (value, maxDepth = 12) => {
  let v = value;

  for (let i = 0; i < maxDepth; i++) {
    if (typeof v !== "string") break;

    const s = v.trim();
    const looksJson =
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith('"') && s.endsWith('"'));

    if (!looksJson) break;

    try {
      v = JSON.parse(s);
    } catch {
      break;
    }
  }

  return v;
};

// Si tu columna en BD es TEXT/VARCHAR y quieres guardar JSON como string
const normalizeJsonFieldToString = (value) => {
  const v = unwrapJsonString(value);

  if (v === null || v === undefined) return null;

  // ya es string "normal"
  if (typeof v === "string") return v;

  // es objeto/array => lo guardamos UNA sola vez como string
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
};

// Aplica limpieza a una tabla basada en config
const sanitizeRows = (rows, config = {}) => {
  if (!Array.isArray(rows)) return rows;

  const jsonStringFields = config.jsonStringFields || [];

  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;

    for (const field of jsonStringFields) {
      if (field in row) row[field] = normalizeJsonFieldToString(row[field]);
    }

    return row;
  });
};
// Campos que suelen “inflarse” por doble stringify
const SANITIZE_CONFIG = {
  InventoryProduct: {
    jsonStringFields: ["wholesaleRules"], // ✅ tu caso
  },
};


const BULK_OPT = { returning: false };

export const insertData = async () => {
  try {
    await fs.access(backupFilePath);
    console.log("El archivo de respaldo ya existe.");

    const data = await fs.readFile(backupFilePath, "utf8");
    const jsonData = JSON.parse(data);

    // ===== Limpieza ANTES de insertar (evita que vuelva a crecer) =====
    jsonData.InventoryProduct = sanitizeRows(
      jsonData.InventoryProduct,
      SANITIZE_CONFIG.InventoryProduct
    );

    // Si tuviste otros campos como selectedOptionIds (lo mantengo igual)
    if (Array.isArray(jsonData.QuizAnswers)) {
      jsonData.QuizAnswers = jsonData.QuizAnswers.map((row) => {
        if (typeof row.selectedOptionIds === "string") {
          const fixed = unwrapJsonString(row.selectedOptionIds);
          if (Array.isArray(fixed)) row.selectedOptionIds = fixed;
        }
        return row;
      });
    }

    // ===== Inserts en transacción única (más rápido) =====
    const t = await sequelize.transaction();
    try {
      const opt = { ...BULK_OPT, transaction: t };

      await Roles.bulkCreate(jsonData.Roles || [], opt);
      await Users.bulkCreate(jsonData.Users || [], opt);
      await Account.bulkCreate(jsonData.Account || [], opt);
      await Careers.bulkCreate(jsonData.Careers || [], opt);
      await Periods.bulkCreate(jsonData.Periods || [], opt);

      await Form.bulkCreate(jsonData.Form || [], opt);
      await Question.bulkCreate(jsonData.Question || [], opt);
      await Option.bulkCreate(jsonData.Option || [], opt);
      await Response.bulkCreate(jsonData.Response || [], opt);
      await Answer.bulkCreate(jsonData.Answer || [], opt);
      await UserForm.bulkCreate(jsonData.UserForm || [], opt);

      await Matriz.bulkCreate(jsonData.Matriz || [], opt);
      await Matricula.bulkCreate(jsonData.Matricula || [], opt);

      await AccountRoles.bulkCreate(jsonData.AccountRoles || [], opt);
      await Notifications.bulkCreate(jsonData.Notifications || [], opt);

      await QuizQuizzes.bulkCreate(jsonData.QuizQuizzes || [], opt);
      await QuizQuestions.bulkCreate(jsonData.QuizQuestions || [], opt);
      await QuizOptions.bulkCreate(jsonData.QuizOptions || [], opt);
      await QuizAttempts.bulkCreate(jsonData.QuizAttempts || [], opt);
      await QuizAnswers.bulkCreate(jsonData.QuizAnswers || [], opt);
      await QuizAssignment.bulkCreate(jsonData.QuizAssignment || [], opt);

      await InventoryCategory.bulkCreate(jsonData.InventoryCategory || [], opt);
      await InventoryUnit.bulkCreate(jsonData.InventoryUnit || [], opt);
      await InventoryProduct.bulkCreate(jsonData.InventoryProduct || [], opt);
      await InventoryRecipe.bulkCreate(jsonData.InventoryRecipe || [], opt);
      await InventoryMovement.bulkCreate(jsonData.InventoryMovement || [], opt);

      await Customer.bulkCreate(jsonData.Customer || [], opt);
      await Order.bulkCreate(jsonData.Order || [], opt);
      await OrderItem.bulkCreate(jsonData.OrderItem || [], opt);

      await Expense.bulkCreate(jsonData.Expense || [], opt);
      await Income.bulkCreate(jsonData.Income || [], opt);

      await Store.bulkCreate(jsonData.Store || [], opt);
      await HomeProduct.bulkCreate(jsonData.HomeProduct || [], opt);
      await Catalog.bulkCreate(jsonData.Catalog || [], opt);
      await StoreProduct.bulkCreate(jsonData.StoreProduct || [], opt);

      await ItemGroup.bulkCreate(jsonData.ItemGroup || [], opt);
      await ItemGroupItem.bulkCreate(jsonData.ItemGroupItem || [], opt);
      await Payment.bulkCreate(jsonData.Payment || [], opt);

      if (Array.isArray(jsonData.CvTemplates) && jsonData.CvTemplates.length > 0) {
        await CvTemplate.bulkCreate(jsonData.CvTemplates, opt);
      }

      // Plantillas de publicidad / editor
      if (Array.isArray(jsonData.EditorTemplate) && jsonData.EditorTemplate.length > 0) {
        await EditorTemplate.bulkCreate(jsonData.EditorTemplate, opt);
      }
      if (Array.isArray(jsonData.EditorTemplateGroup) && jsonData.EditorTemplateGroup.length > 0) {
        await EditorTemplateGroup.bulkCreate(jsonData.EditorTemplateGroup, opt);
      }
      if (Array.isArray(jsonData.EditorTemplateLayer) && jsonData.EditorTemplateLayer.length > 0) {
        await EditorTemplateLayer.bulkCreate(jsonData.EditorTemplateLayer, opt);
      }
      if (Array.isArray(jsonData.EditorLayerProp) && jsonData.EditorLayerProp.length > 0) {
        await EditorLayerProp.bulkCreate(jsonData.EditorLayerProp, opt);
      }
      if (Array.isArray(jsonData.EditorLayerBind) && jsonData.EditorLayerBind.length > 0) {
        await EditorLayerBind.bulkCreate(jsonData.EditorLayerBind, opt);
      }
      if (Array.isArray(jsonData.EditorDesign) && jsonData.EditorDesign.length > 0) {
        await EditorDesign.bulkCreate(jsonData.EditorDesign, opt);
      }
      if (Array.isArray(jsonData.EditorDesignLayerOverride) && jsonData.EditorDesignLayerOverride.length > 0) {
        await EditorDesignLayerOverride.bulkCreate(jsonData.EditorDesignLayerOverride, opt);
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    console.log("Datos insertados correctamente desde el archivo de respaldo.");
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(
        backupFilePath,
        JSON.stringify({ Roles: [], Users: [], Account: [] }, null, 2)
      );
      console.log("Archivo de respaldo creado: backup.json");
    } else {
      console.error("Error al insertar datos:", error);
    }
  }
};


export const saveBackup = async () => {
  try {
    // Lecturas en paralelo (mucho más rápido)
    const [
      rolesData,
      usersData,
      accountData,
      careersData,
      periodsData,
      FormData,
      QuestionData,
      OptionData,
      ResponseData,
      AnswerData,
      UserFormData,
      MatrizData,
      MatriculaData,
      AccountRolesData,
      NotificationsData,
      QuizAnswersData,
      QuizAttemptsData,
      QuizOptionsData,
      QuizQuestionsData,
      QuizQuizzesData,
      QuizAssignmentData,
      InventoryCategoryData,
      InventoryUnitData,
      InventoryProductRaw,
      InventoryRecipeData,
      InventoryMovementData,
      CustomerData,
      OrderData,
      OrderItemData,
      ExpenseData,
      IncomeData,
      HomeProductData,
      StoreData,
      CatalogData,
      StoreProductData,
      ItemGroupData,
      ItemGroupItemData,
      PaymentData,
      CvTemplatesData,
      EditorTemplateData,
      EditorTemplateGroupData,
      EditorTemplateLayerData,
      EditorLayerPropData,
      EditorLayerBindData,
      EditorDesignData,
      EditorDesignLayerOverrideData,
    ] = await Promise.all([
      Roles.findAll({ raw: true }),
      Users.findAll({ raw: true }),
      Account.findAll({ raw: true }),
      Careers.findAll({ raw: true }),
      Periods.findAll({ raw: true }),
      Form.findAll({ raw: true }),
      Question.findAll({ raw: true }),
      Option.findAll({ raw: true }),
      Response.findAll({ raw: true }),
      Answer.findAll({ raw: true }),
      UserForm.findAll({ raw: true }),
      Matriz.findAll({ raw: true }),
      Matricula.findAll({ raw: true }),
      AccountRoles.findAll({ raw: true }),
      Notifications.findAll({ raw: true }),
      QuizAnswers.findAll({ raw: true }),
      QuizAttempts.findAll({ raw: true }),
      QuizOptions.findAll({ raw: true }),
      QuizQuestions.findAll({ raw: true }),
      QuizQuizzes.findAll({ raw: true }),
      QuizAssignment.findAll({ raw: true }),
      InventoryCategory.findAll({ raw: true }),
      InventoryUnit.findAll({ raw: true }),
      InventoryProduct.findAll({ raw: true }),
      InventoryRecipe.findAll({ raw: true }),
      InventoryMovement.findAll({ raw: true }),
      Customer.findAll({ raw: true }),
      Order.findAll({ raw: true }),
      OrderItem.findAll({ raw: true }),
      Expense.findAll({ raw: true }),
      Income.findAll({ raw: true }),
      HomeProduct.findAll({ raw: true }),
      Store.findAll({ raw: true }),
      Catalog.findAll({ raw: true }),
      StoreProduct.findAll({ raw: true }),
      ItemGroup.findAll({ raw: true }),
      ItemGroupItem.findAll({ raw: true }),
      Payment.findAll({ raw: true }),
      CvTemplate.findAll({ raw: true }),
      EditorTemplate.findAll({ raw: true }),
      EditorTemplateGroup.findAll({ raw: true }),
      EditorTemplateLayer.findAll({ raw: true }),
      EditorLayerProp.findAll({ raw: true }),
      EditorLayerBind.findAll({ raw: true }),
      EditorDesign.findAll({ raw: true }),
      EditorDesignLayerOverride.findAll({ raw: true }),
    ]);

    const InventoryProductData = sanitizeRows(InventoryProductRaw, SANITIZE_CONFIG.InventoryProduct);

    const backupData = {
      Roles: rolesData,
      Users: usersData,
      Account: accountData,
      Careers: careersData,
      Periods: periodsData,
      Form: FormData,
      Question: QuestionData,
      Option: OptionData,
      Response: ResponseData,
      Answer: AnswerData,
      UserForm: UserFormData,
      Matriz: MatrizData,
      Matricula: MatriculaData,
      AccountRoles: AccountRolesData,
      Notifications: NotificationsData,
      QuizAnswers: QuizAnswersData,
      QuizAttempts: QuizAttemptsData,
      QuizOptions: QuizOptionsData,
      QuizQuestions: QuizQuestionsData,
      QuizQuizzes: QuizQuizzesData,
      QuizAssignment: QuizAssignmentData,
      InventoryCategory: InventoryCategoryData,
      InventoryUnit: InventoryUnitData,
      InventoryProduct: InventoryProductData, // ✅ limpio
      InventoryRecipe: InventoryRecipeData,
      InventoryMovement: InventoryMovementData,
      Customer: CustomerData,
      Order: OrderData,
      OrderItem: OrderItemData,
      Expense: ExpenseData,
      Income: IncomeData,
      Store: StoreData,
      HomeProduct: HomeProductData,
      Catalog: CatalogData,
      StoreProduct: StoreProductData,
      ItemGroup: ItemGroupData,
      ItemGroupItem: ItemGroupItemData,
      Payment: PaymentData,
      CvTemplates: CvTemplatesData,
      EditorTemplate: EditorTemplateData,
      EditorTemplateGroup: EditorTemplateGroupData,
      EditorTemplateLayer: EditorTemplateLayerData,
      EditorLayerProp: EditorLayerPropData,
      EditorLayerBind: EditorLayerBindData,
      EditorDesign: EditorDesignData,
      EditorDesignLayerOverride: EditorDesignLayerOverrideData,
    };

    await fs.mkdir(backups, { recursive: true });

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const backupFileName = `backup-${timestamp}.json`;
    const backupPath = resolve(backups, backupFileName);

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));

    console.log("Backup guardado correctamente en:", backupPath);
    console.log("Archivo de respaldo principal actualizado:", backupFilePath);

    return backupPath;
  } catch (error) {
    console.error("Error al guardar el backup:", error);
    throw error;
  }
};


export const downloadBackup = async (req, res) => {
  try {
    const backupPath = await saveBackup(); // Guarda y retorna la ruta del archivo

    res.download(backupPath, (err) => {
      if (err) {
        console.error("Error al enviar el archivo:", err);
        res.status(500).send("Error al enviar el archivo.");
      }
    });
  } catch (error) {
    console.error("Error al realizar el backup:", error);
    res.status(500).send("Error al realizar el backup.");
  }
};

