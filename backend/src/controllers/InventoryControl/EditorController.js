// controllers/EditorController.js
import { Op } from "sequelize";
import {
    EditorTemplate,
    EditorTemplateGroup,
    EditorTemplateLayer,
    EditorLayerProp,
    EditorLayerBind,
    EditorDesign,
    EditorDesignLayerOverride,
  } from "../../models/Editor.js";
import { sequelize } from "../../database/connection.js";

/**
 * Helpers mínimos (reutilizables)
 */
const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};

const toBool = (v, d = false) => {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return d;
};

const propsRowsToObject = (rows = []) => {
  const out = {};
  for (const p of rows) {
    if (!p?.propKey) continue;
    if (p.valueType === "json") out[p.propKey] = p.valueJson;
    else if (p.valueType === "number") out[p.propKey] = Number(p.valueText);
    else if (p.valueType === "boolean") out[p.propKey] = String(p.valueText) === "true";
    else out[p.propKey] = p.valueText;
  }
  return out;
};

/**
 * =========================
 * TEMPLATES
 * =========================
 */

/**
 * POST /editor/templates/import
 * body: templateJson (o el json directo)
 */
export const importTemplate = async (req, res) => {
  const templateJson = req.body?.templateJson ?? req.body;
  const createdBy = toInt(req.user?.id || req.body?.createdBy, 0);

  const isPlainObject = (x) => x && typeof x === "object" && !Array.isArray(x);

  if (!templateJson || !isPlainObject(templateJson)) {
    return res.status(400).json({ message: "templateJson inválido" });
  }
  if (!createdBy) {
    return res.status(400).json({ message: "createdBy requerido (o req.user.id)" });
  }

  const groupsIn = Array.isArray(templateJson.groups) ? templateJson.groups : [];
  const layersIn = Array.isArray(templateJson.layers) ? templateJson.layers : [];

  // infer props value type
  const inferValueType = (value) => {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (isPlainObject(value) || Array.isArray(value)) return "json";
    return "string";
  };

  const splitPropValue = (value) => {
    const valueType = inferValueType(value);
    if (valueType === "json") return { valueType, valueJson: value, valueText: null };
    if (valueType === "boolean") return { valueType, valueJson: null, valueText: value ? "true" : "false" };
    if (valueType === "number") return { valueType, valueJson: null, valueText: String(value) };
    return { valueType, valueJson: null, valueText: value == null ? "" : String(value) };
  };

  const pickBindFields = (bind = {}) => {
    if (!isPlainObject(bind)) return null;
    return {
      textFrom: bind.textFrom ?? null,
      srcFrom: bind.srcFrom ?? null,
      srcPrefix: bind.srcPrefix ?? null,
      fallbackSrc: bind.fallbackSrc ?? null,
      maxLen: bind.maxLen != null ? toInt(bind.maxLen, null) : null,
    };
  };

  const t = await sequelize.transaction();
  try {
    // 1) Template
    const tpl = await EditorTemplate.create(
      {
        name: templateJson.name || req.body?.name || "Template sin nombre",
        app: templateJson.app ?? req.body?.app ?? null,
        format: templateJson.format ?? req.body?.format ?? null,
        canvasWidth: toInt(templateJson.canvas?.width, 1920),
        canvasHeight: toInt(templateJson.canvas?.height, 1080),
        backgroundSrc: templateJson.backgroundSrc ?? null,
        isDefault: toBool(templateJson.isDefault, false),
        isActive: toBool(templateJson.isActive, true),
        createdBy,
        updatedBy: null,
      },
      { transaction: t }
    );

    // Si llega isDefault=true, apagar otros defaults del mismo app+format
    if (tpl.isDefault && tpl.app && tpl.format) {
      await EditorTemplate.update(
        { isDefault: false },
        {
          where: {
            id: { [Op.ne]: tpl.id },
            app: tpl.app,
            format: tpl.format,
          },
          transaction: t,
        }
      );
    }

    // 2) Groups (map key -> id)
    const groupKeyToId = new Map();
    for (const g of groupsIn) {
      const key = g?.id || g?.key;
      if (!key) continue;

      const row = await EditorTemplateGroup.create(
        {
          templateId: tpl.id,
          key: String(key),
          x: toInt(g.x, 0),
          y: toInt(g.y, 0),
          locked: toBool(g.locked, false),
          visible: toBool(g.visible, true),
        },
        { transaction: t }
      );

      groupKeyToId.set(String(key), row.id);
    }

    // 3) Layers + props + bind
    for (const l of layersIn) {
      const layerKey = l?.id || l?.key;
      if (!layerKey) continue;

      const groupKey = l?.groupId || l?.groupKey || null;
      const groupId = groupKey ? groupKeyToId.get(String(groupKey)) || null : null;

      const layerRow = await EditorTemplateLayer.create(
        {
          templateId: tpl.id,
          groupId,
          key: String(layerKey),
          type: String(l.type),
          x: toInt(l.x, 0),
          y: toInt(l.y, 0),
          w: toInt(l.w, 100),
          h: toInt(l.h, 100),
          zIndex: toInt(l.zIndex, 1),
          name: l.name ?? null,
          visible: toBool(l.visible, true),
          locked: toBool(l.locked, false),
        },
        { transaction: t }
      );

      // props
      if (isPlainObject(l.props)) {
        for (const [propKey, rawValue] of Object.entries(l.props)) {
          const { valueType, valueText, valueJson } = splitPropValue(rawValue);
          await EditorLayerProp.create(
            {
              layerId: layerRow.id,
              propKey: String(propKey),
              valueType,
              valueText,
              valueJson,
            },
            { transaction: t }
          );
        }
      }

      // bind
      const bindPayload = pickBindFields(l.bind);
      if (bindPayload) {
        await EditorLayerBind.create(
          { layerId: layerRow.id, ...bindPayload },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return res.json({
      message: "Template importado con éxito",
      templateId: tpl.id,
      groups: groupKeyToId.size,
      layers: layersIn.length,
    });
  } catch (error) {
    await t.rollback();
    console.error("importTemplate error:", error);
    return res.status(500).json({
      message: "Error importando template",
      error: String(error?.message || error),
    });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const { app, format, isActive } = req.query;

    const where = {};
    if (app) where.app = String(app);
    if (format) where.format = String(format);
    if (isActive != null) where.isActive = toBool(isActive, true);

    const rows = await EditorTemplate.findAll({
      where,
      order: [["id", "DESC"]],
    });

    res.json(rows);
  } catch (error) {
    console.error("listTemplates error:", error);
    res.status(500).json({ message: "Error listando templates" });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);

    const row = await EditorTemplate.findByPk(id, {
      include: [
        { model: EditorTemplateGroup, as: "groups" },
        {
          model: EditorTemplateLayer, as: "layers",
          include: [
            { model: EditorLayerProp, as: "props" },
            { model: EditorLayerBind, as: "bind" },
            // para que l.group?.key funcione
            { model: EditorTemplateGroup, as: "group" },
          ],
        },
      ],
    });

    if (!row) return res.status(404).json({ message: "Template no encontrado" });
    res.json(row);
  } catch (error) {
    console.error("getTemplateById error:", error);
    res.status(500).json({ message: "Error leyendo template" });
  }
};

export const updateTemplate = async (req, res) => {
  const id = toInt(req.params.id, 0);
  const updatedBy = toInt(req.user?.id || req.body?.updatedBy, 0);

  try {
    const tpl = await EditorTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: "Template no encontrado" });

    const patch = {};
    if (req.body.name != null) patch.name = String(req.body.name);
    if (req.body.app != null) patch.app = req.body.app ? String(req.body.app) : null;
    if (req.body.format != null) patch.format = req.body.format ? String(req.body.format) : null;
    if (req.body.canvasWidth != null) patch.canvasWidth = toInt(req.body.canvasWidth, tpl.canvasWidth);
    if (req.body.canvasHeight != null) patch.canvasHeight = toInt(req.body.canvasHeight, tpl.canvasHeight);
    if (req.body.backgroundSrc != null) patch.backgroundSrc = req.body.backgroundSrc ? String(req.body.backgroundSrc) : null;
    if (req.body.isActive != null) patch.isActive = toBool(req.body.isActive, tpl.isActive);
    if (req.body.isDefault != null) patch.isDefault = toBool(req.body.isDefault, tpl.isDefault);
    if (updatedBy) patch.updatedBy = updatedBy;

    await tpl.update(patch);

    if (patch.isDefault === true && tpl.app && tpl.format) {
      await EditorTemplate.update(
        { isDefault: false },
        {
          where: { id: { [Op.ne]: tpl.id }, app: tpl.app, format: tpl.format },
        }
      );
    }

    res.json({ message: "Template actualizado", template: tpl });
  } catch (error) {
    console.error("updateTemplate error:", error);
    res.status(500).json({ message: "Error actualizando template" });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);

    const tpl = await EditorTemplate.findByPk(id);
    if (!tpl) return res.status(404).json({ message: "Template no encontrado" });

    await tpl.destroy();
    res.json({ message: "Template eliminado" });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    res.status(500).json({ message: "Error eliminando template" });
  }
};

/**
 * =========================
 * DESIGNS + OVERRIDES
 * =========================
 */

export const createDesign = async (req, res) => {
  try {
    const createdBy = toInt(req.user?.id || req.body?.createdBy, 0);
    const templateId = toInt(req.body?.templateId, 0);

    if (!createdBy) return res.status(400).json({ message: "createdBy requerido" });
    if (!templateId) return res.status(400).json({ message: "templateId requerido" });

    const tpl = await EditorTemplate.findByPk(templateId);
    if (!tpl) return res.status(404).json({ message: "Template no existe" });

    const row = await EditorDesign.create({
      templateId,
      name: req.body?.name || "Diseño sin nombre",
      targetType: req.body?.targetType || "custom",
      targetId: req.body?.targetId != null ? toInt(req.body.targetId, null) : null,
      dataJson: req.body?.dataJson ?? null,
      exportedUrl: null,
      isActive: toBool(req.body?.isActive, true),
      createdBy,
      updatedBy: null,
    });

    res.json({ message: "Design creado", design: row });
  } catch (error) {
    console.error("createDesign error:", error);
    res.status(500).json({ message: "Error creando design" });
  }
};

export const updateDesign = async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    const updatedBy = toInt(req.user?.id || req.body?.updatedBy, 0);

    const row = await EditorDesign.findByPk(id);
    if (!row) return res.status(404).json({ message: "Design no encontrado" });

    const patch = {};
    if (req.body.name != null) patch.name = String(req.body.name);
    if (req.body.dataJson !== undefined) patch.dataJson = req.body.dataJson;
    if (req.body.exportedUrl != null) patch.exportedUrl = req.body.exportedUrl ? String(req.body.exportedUrl) : null;
    if (req.body.isActive != null) patch.isActive = toBool(req.body.isActive, row.isActive);
    if (updatedBy) patch.updatedBy = updatedBy;

    await row.update(patch);
    res.json({ message: "Design actualizado", design: row });
  } catch (error) {
    console.error("updateDesign error:", error);
    res.status(500).json({ message: "Error actualizando design" });
  }
};

export const upsertOverride = async (req, res) => {
  const designId = toInt(req.params.id, 0);
  const layerKey = String(req.body?.layerKey || "").trim();

  if (!designId || !layerKey) {
    return res.status(400).json({ message: "designId y layerKey son requeridos" });
  }

  const payload = {
    designId,
    layerKey,
    x: req.body.x != null ? toInt(req.body.x, null) : null,
    y: req.body.y != null ? toInt(req.body.y, null) : null,
    w: req.body.w != null ? toInt(req.body.w, null) : null,
    h: req.body.h != null ? toInt(req.body.h, null) : null,
    zIndex: req.body.zIndex != null ? toInt(req.body.zIndex, null) : null,
    visible: req.body.visible != null ? toBool(req.body.visible, null) : null,
    locked: req.body.locked != null ? toBool(req.body.locked, null) : null,
    propsJson: req.body.propsJson ?? null,
    bindJson: req.body.bindJson ?? null,
  };

  const t = await sequelize.transaction();
  try {
    const design = await EditorDesign.findByPk(designId, { transaction: t });
    if (!design) {
      await t.rollback();
      return res.status(404).json({ message: "Design no encontrado" });
    }

    const [row, created] = await EditorDesignLayerOverride.findOrCreate({
      where: { designId, layerKey },
      defaults: payload,
      transaction: t,
    });

    if (!created) await row.update(payload, { transaction: t });

    await t.commit();
    res.json({ message: "Override guardado", override: row });
  } catch (error) {
    await t.rollback();
    console.error("upsertOverride error:", error);
    res.status(500).json({ message: "Error guardando override" });
  }
};

export const getDesignResolved = async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);

    const design = await EditorDesign.findByPk(id, {
      include: [{ model: EditorDesignLayerOverride, as: "overrides" }],
    });
    if (!design) return res.status(404).json({ message: "Design no encontrado" });

    const template = await EditorTemplate.findByPk(design.templateId, {
      include: [
        { model: EditorTemplateGroup, as: "groups" },
        {
          model: EditorTemplateLayer,
          as: "layers",
          include: [
            { model: EditorLayerProp, as: "props" },
            { model: EditorLayerBind, as: "bind" },
            { model: EditorTemplateGroup, as: "group" },
          ],
        },
      ],
    });

    if (!template) return res.status(404).json({ message: "Template no encontrado" });

    // map overrides por layerKey
    const overrideMap = new Map();
    for (const o of design.overrides || []) overrideMap.set(o.layerKey, o);

    // merge layer inline (sin helper grande)
    const mergeLayer = (baseLayer, overrideRow) => {
      const out = JSON.parse(JSON.stringify(baseLayer));
      if (!overrideRow) return out;

      const fields = ["x", "y", "w", "h", "zIndex", "visible", "locked"];
      for (const f of fields) {
        if (overrideRow[f] !== null && overrideRow[f] !== undefined) out[f] = overrideRow[f];
      }

      if (overrideRow.propsJson && typeof overrideRow.propsJson === "object") {
        out.props = { ...(out.props || {}), ...overrideRow.propsJson };
      }
      if (overrideRow.bindJson && typeof overrideRow.bindJson === "object") {
        out.bind = { ...(out.bind || {}), ...overrideRow.bindJson };
      }
      return out;
    };

    const groups = (template.groups || []).map((g) => ({
      id: g.key,
      x: g.x,
      y: g.y,
      locked: g.locked,
      visible: g.visible,
    }));

    const layersBase = (template.layers || []).map((l) => ({
      id: l.key,
      groupId: l.group?.key || null,
      type: l.type,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      zIndex: l.zIndex,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      props: propsRowsToObject(l.props || []),
      bind: l.bind
        ? {
            textFrom: l.bind.textFrom,
            srcFrom: l.bind.srcFrom,
            srcPrefix: l.bind.srcPrefix,
            fallbackSrc: l.bind.fallbackSrc,
            maxLen: l.bind.maxLen,
          }
        : undefined,
    }));

    const layers = layersBase
      .map((l) => mergeLayer(l, overrideMap.get(l.id)))
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const resolved = {
      canvas: { width: template.canvasWidth, height: template.canvasHeight },
      backgroundSrc: template.backgroundSrc,
      groups,
      layers,
    };

    res.json({ design, resolved });
  } catch (error) {
    console.error("getDesignResolved error:", error);
    res.status(500).json({ message: "Error obteniendo design resuelto" });
  }
};
