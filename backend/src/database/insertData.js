import { promises as fs } from 'fs';
import { resolve } from 'path';
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






export const backupFilePath = resolve('./src/database/backup.json'); // Ruta del archivo de respaldo principal
export const backups = resolve('./src/backups'); // Ruta para guardar copias de seguridad

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

    // ===== Inserts =====
    await Roles.bulkCreate(jsonData.Roles, { returning: true });
    await Users.bulkCreate(jsonData.Users, { returning: true });
    await Account.bulkCreate(jsonData.Account, { returning: true });
    await Careers.bulkCreate(jsonData.Careers, { returning: true });
    await Periods.bulkCreate(jsonData.Periods, { returning: true });

    await Form.bulkCreate(jsonData.Form, { returning: true });
    await Question.bulkCreate(jsonData.Question, { returning: true });
    await Option.bulkCreate(jsonData.Option, { returning: true });
    await Response.bulkCreate(jsonData.Response, { returning: true });
    await Answer.bulkCreate(jsonData.Answer, { returning: true });
    await UserForm.bulkCreate(jsonData.UserForm, { returning: true });

    await Matriz.bulkCreate(jsonData.Matriz, { returning: true });
    await Matricula.bulkCreate(jsonData.Matricula, { returning: true });

    await AccountRoles.bulkCreate(jsonData.AccountRoles, { returning: true });
    await Notifications.bulkCreate(jsonData.Notifications, { returning: true });

    await QuizQuizzes.bulkCreate(jsonData.QuizQuizzes, { returning: true });
    await QuizQuestions.bulkCreate(jsonData.QuizQuestions, { returning: true });
    await QuizOptions.bulkCreate(jsonData.QuizOptions, { returning: true });
    await QuizAttempts.bulkCreate(jsonData.QuizAttempts, { returning: true });
    await QuizAnswers.bulkCreate(jsonData.QuizAnswers, { returning: true });
    await QuizAssignment.bulkCreate(jsonData.QuizAssignment, { returning: true });

    await InventoryCategory.bulkCreate(jsonData.InventoryCategory, { returning: true });
    await InventoryUnit.bulkCreate(jsonData.InventoryUnit, { returning: true });

    // ✅ ya llega limpio (wholesaleRules sin escapes infinitos)
    await InventoryProduct.bulkCreate(jsonData.InventoryProduct, { returning: true });

    await InventoryRecipe.bulkCreate(jsonData.InventoryRecipe, { returning: true });
    await InventoryMovement.bulkCreate(jsonData.InventoryMovement, { returning: true });

    await Customer.bulkCreate(jsonData.Customer, { returning: true });
    await Order.bulkCreate(jsonData.Order, { returning: true });
    await OrderItem.bulkCreate(jsonData.OrderItem, { returning: true });

    await Expense.bulkCreate(jsonData.Expense, { returning: true });
    await Income.bulkCreate(jsonData.Income, { returning: true });

    await Store.bulkCreate(jsonData.Store, { returning: true });
    await HomeProduct.bulkCreate(jsonData.HomeProduct, { returning: true });
    await Catalog.bulkCreate(jsonData.Catalog, { returning: true });
    await StoreProduct.bulkCreate(jsonData.StoreProduct, { returning: true });

    await ItemGroup.bulkCreate(jsonData.ItemGroup, { returning: true });
    await ItemGroupItem.bulkCreate(jsonData.ItemGroupItem, { returning: true });
    await Payment.bulkCreate(jsonData.Payment, { returning: true });

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
    const rolesData = await Roles.findAll({ raw: true });
    const usersData = await Users.findAll({ raw: true });
    const accountData = await Account.findAll({ raw: true });
    const careersData = await Careers.findAll({ raw: true });
    const periodsData = await Periods.findAll({ raw: true });

    const FormData = await Form.findAll({ raw: true });
    const QuestionData = await Question.findAll({ raw: true });
    const OptionData = await Option.findAll({ raw: true });
    const ResponseData = await Response.findAll({ raw: true });
    const AnswerData = await Answer.findAll({ raw: true });
    const UserFormData = await UserForm.findAll({ raw: true });

    const MatrizData = await Matriz.findAll({ raw: true });
    const MatriculaData = await Matricula.findAll({ raw: true });

    const AccountRolesData = await AccountRoles.findAll({ raw: true });
    const NotificationsData = await Notifications.findAll({ raw: true });

    const QuizAnswersData = await QuizAnswers.findAll({ raw: true });
    const QuizAttemptsData = await QuizAttempts.findAll({ raw: true });
    const QuizOptionsData = await QuizOptions.findAll({ raw: true });
    const QuizQuestionsData = await QuizQuestions.findAll({ raw: true });
    const QuizQuizzesData = await QuizQuizzes.findAll({ raw: true });
    const QuizAssignmentData = await QuizAssignment.findAll({ raw: true });

    const InventoryCategoryData = await InventoryCategory.findAll({ raw: true });
    const InventoryUnitData = await InventoryUnit.findAll({ raw: true });

    // ✅ IMPORTANTE: raw + sanitize
    const InventoryProductData = sanitizeRows(
      await InventoryProduct.findAll({ raw: true }),
      SANITIZE_CONFIG.InventoryProduct
    );

    const InventoryRecipeData = await InventoryRecipe.findAll({ raw: true });
    const InventoryMovementData = await InventoryMovement.findAll({ raw: true });

    const CustomerData = await Customer.findAll({ raw: true });
    const OrderData = await Order.findAll({ raw: true });
    const OrderItemData = await OrderItem.findAll({ raw: true });

    const ExpenseData = await Expense.findAll({ raw: true });
    const IncomeData = await Income.findAll({ raw: true });

    const HomeProductData = await HomeProduct.findAll({ raw: true });
    const StoreData = await Store.findAll({ raw: true });
    const CatalogData = await Catalog.findAll({ raw: true });
    const StoreProductData = await StoreProduct.findAll({ raw: true });

    const ItemGroupData = await ItemGroup.findAll({ raw: true });
    const ItemGroupItemData = await ItemGroupItem.findAll({ raw: true });
    const PaymentData = await Payment.findAll({ raw: true });

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

