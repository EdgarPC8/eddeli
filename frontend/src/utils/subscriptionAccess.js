/** Rutas autenticadas que no requieren plan activo. */
export const SUBSCRIPTION_SKIP_PATHS = ["/subscription-expired", "/no-subscription"];

/** Rutas públicas (sin login ni suscripción). */
export const PUBLIC_PATHS = ["/login", "/home", "/catalogo", "/punto_venta"];

/** Catálogo de rutas EdDeli (alineado con gestor eddeli-product-catalog). */
const EDDELI_MODULE_ROUTES = {
  workspace: [
    "/",
    "/inicio",
    "/perfil",
    "/notifications",
    "/info",
    "/donaciones",
  ],
  "store-ops": ["/caja", "/turno", "/turno/supervision", "/tareas", "/facturacion"],
  inventory: [
    "/inventory/products",
    "/inventory/categories",
    "/inventory/tramos",
    "/inventory/units",
    "/inventory/movement",
    "/inventory/insumos",
    "/inventory/recipes",
  ],
  production: [
    "/inventory/production",
    "/inventory/puntos-venta",
    "/inventory/productos-destacados",
  ],
  sales: ["/inventory/orders", "/inventory/customers", "/inventory/suppliers"],
  finance: [
    "/inventory/finance",
    "/inventory/collections",
    "/inventory/prestamos-deudas",
    "/inventory/gastos-recurrentes",
  ],
  catalog: ["/catalogo", "/punto_venta", "/catalog_manager", "/compare_groups"],
  signage: [
    "/publicidad",
    "/publicidad/dispositivos",
    "/publicidad/reproductor",
    "/publicidad/campanas/nueva",
  ],
  creative: [
    "/diseno-promocional/editor",
    "/diseno-promocional/vista",
    "/diseno-promocional/plantillas",
  ],
  admin: [
    "/users",
    "/cuentas",
    "/roles",
    "/panel_control",
    "/notification-programs",
  ],
  platform: ["/comandos", "/backups", "/logs", "/img", "/file"],
};

/** Nombre de sección del gestor → ruta SPA. */
const SECTION_NAME_TO_ROUTE = Object.fromEntries(
  Object.values(EDDELI_MODULE_ROUTES)
    .flat()
    .map((route) => [route, route]),
);

// Nombres legibles del catálogo (gestor devuelve `sections` como strings con el name)
const SECTION_LABELS = {
  "Dashboard / Inicio": "/",
  Inicio: "/inicio",
  Perfil: "/perfil",
  Notificaciones: "/notifications",
  Info: "/info",
  Donaciones: "/donaciones",
  "Caja / POS": "/caja",
  Turnos: "/turno",
  "Supervisión caja": "/turno/supervision",
  Tareas: "/tareas",
  Facturación: "/facturacion",
  Productos: "/inventory/products",
  Categorías: "/inventory/categories",
  Tramos: "/inventory/tramos",
  Unidades: "/inventory/units",
  Movimientos: "/inventory/movement",
  "Insumos y marcas": "/inventory/insumos",
  Recetas: "/inventory/recipes",
  Producción: "/inventory/production",
  "Puntos de venta": "/inventory/puntos-venta",
  "Productos destacados": "/inventory/productos-destacados",
  Pedidos: "/inventory/orders",
  Clientes: "/inventory/customers",
  Proveedores: "/inventory/suppliers",
  Finanzas: "/inventory/finance",
  Cobranzas: "/inventory/collections",
  "Préstamos y deudas": "/inventory/prestamos-deudas",
  "Gastos recurrentes": "/inventory/gastos-recurrentes",
  "Catálogo público": "/catalogo",
  "Locales públicos": "/punto_venta",
  "Gestor catálogo": "/catalog_manager",
  "Grupos comparativos": "/compare_groups",
  Campañas: "/publicidad",
  "Dispositivos TV": "/publicidad/dispositivos",
  Reproductor: "/publicidad/reproductor",
  "Nueva campaña": "/publicidad/campanas/nueva",
  "Editor de diseño": "/diseno-promocional/editor",
  "Vista con productos": "/diseno-promocional/vista",
  Plantillas: "/diseno-promocional/plantillas",
  Usuarios: "/users",
  Cuentas: "/cuentas",
  Roles: "/roles",
  "Panel de control": "/panel_control",
  "Programas de notificación": "/notification-programs",
  Comandos: "/comandos",
  "Backups JSON": "/backups",
  Logs: "/logs",
  Imágenes: "/img",
  Archivos: "/file",
};

Object.assign(SECTION_NAME_TO_ROUTE, SECTION_LABELS);

function resolveSectionRoute(section) {
  if (!section) return null;
  if (typeof section === "string") {
    if (section.startsWith("/")) return section;
    return SECTION_NAME_TO_ROUTE[section] ?? null;
  }
  if (section.route_path) return section.route_path;
  if (section.key && section.name) return SECTION_NAME_TO_ROUTE[section.name] ?? null;
  return SECTION_NAME_TO_ROUTE[section.name] ?? null;
}

export function getAllowedPaths(subscription) {
  const paths = new Set();
  const modules = subscription?.subscription?.modules;
  if (!Array.isArray(modules)) return paths;

  for (const mod of modules) {
    if (mod.key && EDDELI_MODULE_ROUTES[mod.key]) {
      EDDELI_MODULE_ROUTES[mod.key].forEach((route) => paths.add(route));
    }

    for (const sec of mod.sections || []) {
      const route = resolveSectionRoute(sec);
      if (route) paths.add(route);
    }
  }
  return paths;
}

export function isPathAllowed(pathname, allowedPaths) {
  if (!pathname || !allowedPaths?.size) return false;
  if (allowedPaths.has(pathname)) return true;

  for (const base of allowedPaths) {
    if (base !== "/" && pathname.startsWith(`${base}/`)) return true;
  }
  return false;
}
