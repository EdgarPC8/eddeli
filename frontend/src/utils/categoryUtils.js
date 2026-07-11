/**
 * Organiza categorías en árbol (principal → subcategoría).
 */
export function indexCategories(categories) {
  const byId = new Map();
  for (const c of categories || []) {
    byId.set(Number(c.id), c);
  }
  return byId;
}

export function getRootCategories(categories) {
  return (categories || []).filter((c) => !c.parentId);
}

export function getChildCategories(categories, parentId) {
  return (categories || []).filter((c) => Number(c.parentId) === Number(parentId));
}

export function hasChildCategories(categories, categoryId) {
  return getChildCategories(categories, categoryId).length > 0;
}

/** Categorías donde se pueden asignar productos (hojas del árbol). */
export function getAssignableCategories(categories) {
  const list = categories || [];
  const parentIdsWithChildren = new Set(
    list.filter((c) => c.parentId).map((c) => Number(c.parentId)),
  );
  return list.filter((c) => {
    if (c.parentId) return true;
    return !parentIdsWithChildren.has(Number(c.id));
  });
}

export function formatCategoryLabel(category, byId) {
  if (!category) return "";
  const parent =
    category.parent ||
    (byId && category.parentId ? byId.get(Number(category.parentId)) : null);
  if (parent?.name) return `${parent.name} › ${category.name}`;
  return category.name || "";
}

export function buildCategoryTreeRows(categories) {
  const roots = getRootCategories(categories).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const rows = [];
  for (const root of roots) {
    rows.push({ ...root, depth: 0, isRoot: true, parentName: null });
    const children = getChildCategories(categories, root.id).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
    for (const child of children) {
      rows.push({
        ...child,
        depth: 1,
        isRoot: false,
        parentName: root.name,
      });
    }
  }
  return rows;
}

export function getRootCategory(category, byId) {
  if (!category) return null;
  let cur = category;
  for (let i = 0; i < 5; i += 1) {
    if (!cur.parentId) return cur;
    const parent =
      cur.parent || (byId ? byId.get(Number(cur.parentId)) : null);
    if (!parent) return cur;
    cur = parent;
  }
  return category;
}

export function getRootCategoryFromProduct(product) {
  const cat = product?.ERP_inventory_category || product?.category || null;
  if (!cat) return null;
  if (cat.parent) return cat.parent;
  return cat.parentId ? null : cat;
}

/** Categorías raíz para filtros (incluye huérfanas si el padre no está en la lista). */
export function getFilterRootCategories(categories) {
  const list = categories || [];
  const byId = indexCategories(list);
  return list
    .filter((c) => !c.parentId || !byId.has(Number(c.parentId)))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Opciones para filtro: principal, «todas» de un padre, y subcategorías. */
export function buildCategoryFilterOptions(categories) {
  const list = categories || [];
  const roots = getFilterRootCategories(list);
  const options = [];
  for (const root of roots) {
    const children = getChildCategories(list, root.id).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
    if (children.length > 0) {
      options.push({
        value: `parent:${root.id}`,
        label: `${root.name} — todas`,
      });
      for (const child of children) {
        options.push({
          value: String(child.id),
          label: `${root.name} › ${child.name}`,
        });
      }
    } else {
      options.push({ value: String(root.id), label: root.name });
    }
  }
  return options;
}

export function formatProductCategoryName(product) {
  const cat = product?.ERP_inventory_category || product?.category;
  if (!cat) return "—";
  if (cat.parent?.name) return `${cat.parent.name} › ${cat.name}`;
  return cat.name || "—";
}

/**
 * @param {object} product
 * @param {string} filterValue - id, o `parent:id`
 * @param {Map<number, object>} [byId] - índice opcional para resolver categoría solo con categoryId
 */
export function productMatchesCategoryFilter(product, filterValue, byId) {
  if (!filterValue) return true;
  const productCatId = product?.categoryId ?? product?.ERP_inventory_category?.id;
  let cat = product?.ERP_inventory_category;
  if (!cat && byId && productCatId != null) {
    cat = byId.get(Number(productCatId)) || null;
  }

  if (String(filterValue).startsWith("parent:")) {
    const parentId = Number(filterValue.slice(7));
    if (!cat && productCatId) {
      return Number(productCatId) === parentId;
    }
    if (!cat) return false;
    if (Number(cat.parentId) === parentId) return true;
    if (cat.parent && Number(cat.parent.id) === parentId) return true;
    return Number(cat.id) === parentId && !cat.parentId;
  }

  return String(productCatId) === String(filterValue);
}
