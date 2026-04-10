import { promises as fs } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { Roles } from "../models/Roles.js";
import { Users } from "../models/Users.js";
import { Account, AccountRoles } from "../models/Account.js";
import { sequelize } from "./connection.js";
import { Notifications } from "../models/Notifications.js";

import {
  InventoryCategory,
  InventoryRecipe,
  InventoryMovement,
  InventoryProduct,
  InventoryUnit,
  HomeProduct,
  Store,
  Catalog,
  StoreProduct,
} from "../models/Inventory.js";
import { Customer, Order, OrderItem } from "../models/Orders.js";
import {
  Expense,
  Income,
  ItemGroup,
  ItemGroupItem,
  Payment,
} from "../models/Finance.js";
import {
  EditorTemplate,
  EditorTemplateGroup,
  EditorTemplateLayer,
  EditorLayerProp,
  EditorLayerBind,
  EditorDesign,
  EditorDesignLayerOverride,
} from "../models/Editor.js";

export const backupFilePath = resolve(__dirname, "backup.json");
export const backups = resolve(__dirname, "..", "backups");

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

const normalizeJsonFieldToString = (value) => {
  const v = unwrapJsonString(value);
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
};

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

const SANITIZE_CONFIG = {
  InventoryProduct: {
    jsonStringFields: ["wholesaleRules"],
  },
};

const BULK_OPT = { returning: false };

/** Respaldo / restore solo tablas EdDeli (inventario, pedidos, finanzas, editor, notificaciones, cuentas). Quiz, forms, alumni, CV → softed/backend. */
export const insertData = async () => {
  try {
    await fs.access(backupFilePath);
    console.log("El archivo de respaldo ya existe.");

    const data = await fs.readFile(backupFilePath, "utf8");
    const jsonData = JSON.parse(data);

    jsonData.InventoryProduct = sanitizeRows(
      jsonData.InventoryProduct,
      SANITIZE_CONFIG.InventoryProduct
    );

    const t = await sequelize.transaction();
    try {
      const opt = { ...BULK_OPT, transaction: t };

      await Roles.bulkCreate(jsonData.Roles || [], opt);
      await Users.bulkCreate(jsonData.Users || [], opt);
      await Account.bulkCreate(jsonData.Account || [], opt);
      await AccountRoles.bulkCreate(jsonData.AccountRoles || [], opt);
      await Notifications.bulkCreate(jsonData.Notifications || [], opt);

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
      if (
        Array.isArray(jsonData.EditorDesignLayerOverride) &&
        jsonData.EditorDesignLayerOverride.length > 0
      ) {
        await EditorDesignLayerOverride.bulkCreate(jsonData.EditorDesignLayerOverride, opt);
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    console.log("Datos insertados correctamente desde el archivo de respaldo (EdDeli).");
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
    const [
      rolesData,
      usersData,
      accountData,
      accountRolesData,
      notificationsData,
      inventoryCategoryData,
      inventoryUnitData,
      inventoryProductRaw,
      inventoryRecipeData,
      inventoryMovementData,
      customerData,
      orderData,
      orderItemData,
      expenseData,
      incomeData,
      homeProductData,
      storeData,
      catalogData,
      storeProductData,
      itemGroupData,
      itemGroupItemData,
      paymentData,
      editorTemplateData,
      editorTemplateGroupData,
      editorTemplateLayerData,
      editorLayerPropData,
      editorLayerBindData,
      editorDesignData,
      editorDesignLayerOverrideData,
    ] = await Promise.all([
      Roles.findAll({ raw: true }),
      Users.findAll({ raw: true }),
      Account.findAll({ raw: true }),
      AccountRoles.findAll({ raw: true }),
      Notifications.findAll({ raw: true }),
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
      EditorTemplate.findAll({ raw: true }),
      EditorTemplateGroup.findAll({ raw: true }),
      EditorTemplateLayer.findAll({ raw: true }),
      EditorLayerProp.findAll({ raw: true }),
      EditorLayerBind.findAll({ raw: true }),
      EditorDesign.findAll({ raw: true }),
      EditorDesignLayerOverride.findAll({ raw: true }),
    ]);

    const InventoryProductData = sanitizeRows(inventoryProductRaw, SANITIZE_CONFIG.InventoryProduct);

    const backupData = {
      Roles: rolesData,
      Users: usersData,
      Account: accountData,
      AccountRoles: accountRolesData,
      Notifications: notificationsData,
      InventoryCategory: inventoryCategoryData,
      InventoryUnit: inventoryUnitData,
      InventoryProduct: InventoryProductData,
      InventoryRecipe: inventoryRecipeData,
      InventoryMovement: inventoryMovementData,
      Customer: customerData,
      Order: orderData,
      OrderItem: orderItemData,
      Expense: expenseData,
      Income: incomeData,
      Store: storeData,
      HomeProduct: homeProductData,
      Catalog: catalogData,
      StoreProduct: storeProductData,
      ItemGroup: itemGroupData,
      ItemGroupItem: itemGroupItemData,
      Payment: paymentData,
      EditorTemplate: editorTemplateData,
      EditorTemplateGroup: editorTemplateGroupData,
      EditorTemplateLayer: editorTemplateLayerData,
      EditorLayerProp: editorLayerPropData,
      EditorLayerBind: editorLayerBindData,
      EditorDesign: editorDesignData,
      EditorDesignLayerOverride: editorDesignLayerOverrideData,
    };

    await fs.mkdir(backups, { recursive: true });

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const backupFileName = `backup-${timestamp}.json`;
    const backupPath = resolve(backups, backupFileName);

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));

    console.log("Backup EdDeli guardado en:", backupPath);
    return backupPath;
  } catch (error) {
    console.error("Error al guardar el backup:", error);
    throw error;
  }
};

/** Descarga JSON de respaldo EdDeli (GET /eddeliapi/comands/downloadBackup). */
export const downloadBackup = async (req, res) => {
  try {
    const backupPath = await saveBackup();
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
