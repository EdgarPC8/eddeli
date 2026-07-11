/**
 * Planes comerciales de EdDeli (Sistema → Planes / Info).
 * Referencia de producto; la activación real puede ir por Subify más adelante.
 */

/** Plan por defecto mientras no haya licencia Subify amarrada. */
export const DEFAULT_SYSTEM_PLAN_ID = "pro";

export const SYSTEM_PLANS = [
  {
    id: "prueba",
    name: "Plan Prueba",
    tagline:
      "Acceso a muchas funciones del sistema, pero con límites (usuarios, volumen y tiempo). No es gratis para siempre.",
    priceLabel: "Prueba",
    priceHint: "Evaluación · con limitaciones",
    highlighted: false,
    features: [
      "Amplio acceso a módulos (con cupos)",
      "Límite de usuarios y operaciones",
      "Caja, inventario y finanzas en modo prueba",
      "Caduca al terminar el periodo",
      "Luego hay que pasar a un plan de pago",
    ],
    cta: "Empezar prueba",
  },
  {
    id: "basico",
    name: "Plan Básico",
    tagline: "Operación diaria en mostrador para negocios pequeños.",
    priceLabel: "Básico",
    priceHint: "Entrada de pago",
    highlighted: false,
    features: [
      "Caja, turno y tareas",
      "Comprobantes POS",
      "Notificaciones",
      "Configuración del negocio",
      "Usuarios de operación limitados",
    ],
    cta: "Contratar",
  },
  {
    id: "medio",
    name: "Plan Medio",
    tagline: "Inventario, ventas y finanzas del negocio.",
    priceLabel: "Medio",
    priceHint: "Ideal para crecer",
    highlighted: true,
    features: [
      "Todo del Plan Básico",
      "Inventario y movimientos",
      "Pedidos y clientes",
      "Finanzas y cobranzas",
      "Producción e insumos",
    ],
    cta: "Contratar",
  },
  {
    id: "pro",
    name: "Plan Pro",
    tagline: "Canal digital, publicidad y preparación SRI.",
    priceLabel: "Pro",
    priceHint: "Negocio completo",
    highlighted: false,
    features: [
      "Todo del Plan Medio",
      "Comprobantes electrónicos SRI",
      "Catálogo web y puntos de venta",
      "Publicidad en pantallas TV",
      "Diseño promocional",
    ],
    cta: "Contratar",
  },
  {
    id: "socios",
    name: "Plan Socios",
    tagline: "Para redes o aliados: varias sucursales y prioridad comercial.",
    priceLabel: "Socios",
    priceHint: "Alianzas y multi-local",
    highlighted: false,
    features: [
      "Todo del Plan Pro",
      "Varias sucursales / locales",
      "Usuarios ampliados",
      "Reportes de red / socios",
      "Atención prioritaria",
    ],
    cta: "Contratar",
  },
  {
    id: "empresarial",
    name: "Plan Empresarial",
    tagline: "Despliegue a medida, integración y soporte dedicado.",
    priceLabel: "Empresarial",
    priceHint: "A medida · máximo nivel",
    highlighted: false,
    features: [
      "Todo del Plan Socios",
      "Límites altos o personalizados",
      "Integraciones y soporte dedicado",
      "Capacitación y acompañamiento",
      "Condiciones comerciales especiales",
    ],
    cta: "Contactar",
  },
];

/** Alias: el antiguo “gratis” apunta a la prueba. */
export const PLAN_ALIASES = {
  gratis: "prueba",
  free: "prueba",
  trial: "prueba",
};

export function getSystemPlanById(planId) {
  const id = PLAN_ALIASES[planId] || planId;
  return (
    SYSTEM_PLANS.find((p) => p.id === id) ||
    SYSTEM_PLANS.find((p) => p.id === DEFAULT_SYSTEM_PLAN_ID) ||
    SYSTEM_PLANS[0]
  );
}

/**
 * Resuelve el plan activo a mostrar en Info / Planes.
 * Si Subify trae un nombre de plan reconocible, lo usa; si no, el default.
 */
export function resolveActiveSystemPlan(subscription) {
  const raw =
    subscription?.subscription?.plan_name ||
    subscription?.subscription?.plan ||
    subscription?.subscription?.name ||
    subscription?.plan_name ||
    "";
  const normalized = String(raw).toLowerCase();
  if (
    normalized.includes("prueba") ||
    normalized.includes("gratis") ||
    normalized.includes("free") ||
    normalized.includes("trial")
  ) {
    return getSystemPlanById("prueba");
  }
  if (normalized.includes("basico") || normalized.includes("básico") || normalized.includes("basic")) {
    return getSystemPlanById("basico");
  }
  if (normalized.includes("medio") || normalized.includes("standard") || normalized.includes("plus")) {
    return getSystemPlanById("medio");
  }
  if (normalized.includes("socio")) {
    return getSystemPlanById("socios");
  }
  if (
    normalized.includes("empresarial") ||
    normalized.includes("enterprise") ||
    normalized.includes("corporativ")
  ) {
    return getSystemPlanById("empresarial");
  }
  if (normalized.includes("pro") || normalized.includes("premium")) {
    return getSystemPlanById("pro");
  }
  return getSystemPlanById(DEFAULT_SYSTEM_PLAN_ID);
}
