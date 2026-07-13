/**
 * Catálogo de módulos, secciones y funciones de EdDeli (referencia para /info).
 * Mantener alineado con el menú lateral (NavBar) cuando se agreguen rutas nuevas.
 *
 * Cada sección puede incluir `functions`: acciones concretas de la UI
 * (botones, checks, diálogos, filtros, flujos de trabajo).
 *
 * ⚠️ MANTENIMIENTO PDF:
 * Si agregas, quitas o renombras módulos/secciones/funciones aquí, revisa también
 * `frontend/src/utils/appModulesPdfExport.js` (exportación a PDF en /info).
 * Los datos salen de este archivo; el PDF debe reflejar la misma estructura.
 */

export const APP_ROLES_LEGEND = [
  {
    name: "Programador",
    description:
      "Rol técnico SoftEd (en el futuro se renombrará a Desarrollador). Herramientas de logs, backups, archivos e imágenes. No es el uso diario del negocio en producción.",
  },
  {
    name: "Administrador",
    description: "Gestión completa del negocio: inventario, finanzas, ventas y administración. Tras el login entra al Dashboard.",
  },
  {
    name: "Empleado",
    description: "Operación diaria: caja, turno, tareas y notificaciones. Tras el login entra directamente a Caja (no al Dashboard).",
  },
];

export const APP_MODULE_GROUPS = [
  {
    id: "acceso",
    label: "Acceso rápido",
    summary: "Vistas principales al iniciar sesión (Admin/Programador → Dashboard; Empleado → Caja).",
    sections: [
      {
        name: "Dashboard",
        path: "/",
        roles: ["Programador", "Administrador"],
        description: "Resumen del negocio: calendario financiero, clientes, ingresos por producto y gráficos. El rol Empleado no usa esta vista; se redirige a Caja.",
        functions: [
          { name: "Tarjetas financieras", description: "KPIs de balance, ingresos, gastos, cobranzas, préstamos y margen del mes." },
          { name: "Alertas de inventario", description: "Toggles por agotarse/agotados y filtro por tipo de producto; medidores de stock." },
          { name: "Ver detalle de stock", description: "Diálogo con productos en alerta; Programador puede editar stock y mínimo inline." },
          { name: "Gráfico ingresos vs gastos", description: "Desglose por categoría de movimientos financieros." },
          { name: "Gráfico anual", description: "Navegación por año, toggle todo/solo ingresos; clic en mes lleva al calendario." },
          { name: "Estados de pedido", description: "Tarjetas clicables por estado y diálogo de detalle de pedidos." },
          { name: "Gráfico espejo de caja", description: "Granularidad día/semana/mes; clic en barra abre detalle del día." },
          { name: "Gráfico de velas", description: "Periodo configurable con paginación; selección filtra el gráfico espejo." },
          { name: "Calendario financiero", description: "Navegación mensual; vista Todo (pedidos/caja operativa/cobros/gastos) o Ingresos (caja + cobros por fecha de entrada del dinero)." },
          { name: "Detalle del día", description: "Modal con chips de caja (entrada $) y cobros; pestañas por origen del ingreso." },
          { name: "Ingresos por producto", description: "Selector de rango top N y periodo semana/mes/año." },
          { name: "Tabla de clientes", description: "Acordeón por cliente con estadísticas; diálogo de detalle completo." },
        ],
      },
      {
        name: "Notificaciones",
        path: "/notifications",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Avisos del sistema y mensajes para el equipo.",
        functions: [
          { name: "Pestañas admin", description: "Mis notificaciones y programar saludos/avisos (Admin/Programador)." },
          { name: "Filtro leídas", description: "Tabs Todas / No leídas en la bandeja." },
          { name: "Menú por notificación", description: "Marcar como leída o eliminar desde menú contextual." },
          { name: "Marcar todas leídas", description: "Acción masiva desde menú del encabezado." },
          { name: "Navegación por enlace", description: "Clic en notificación con link; actualización en tiempo real vía socket." },
          { name: "CRUD plantillas", description: "Crear, editar y eliminar plantillas de notificación programada." },
          { name: "Programación de envío", description: "Manual, diario (hora fija) o intervalo; switch activa/desactiva." },
          { name: "Destinatarios", description: "Todos los usuarios o filtro por rol(es)." },
          { name: "Enviar ahora", description: "Disparo manual inmediato de una plantilla." },
        ],
      },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    summary: "Punto de venta y trabajo diario en mostrador. (Próx.) multi-caja por local.",
    sections: [
      {
        name: "Caja",
        path: "/caja",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Ventas en mostrador, carrito, cobro en efectivo/transferencia y comprobantes. Pantalla de inicio del rol Empleado.",
        functions: [
          { name: "Escáner de código de barras", description: "Agrega productos al carrito al escanear; se pausa con diálogos abiertos." },
          { name: "Checkbox «Mostrar stock»", description: "Muestra u oculta la columna de stock en la tabla del carrito." },
          { name: "Buscador de productos", description: "Select por nombre, código o SKU; Enter agrega con precios por tramos." },
          { name: "Accesos rápidos", description: "Grid de panadería con botones 1–9, surtidos por tier y canastas agrupadas." },
          { name: "Edición del carrito", description: "Cantidad y precio por fila; eliminar línea o canasta; vaciar listado." },
          { name: "Panel de cobro", description: "Tipo documento, contado/crédito, método de pago, monto recibido y vuelto." },
          { name: "Registrar datos del cliente", description: "Checkbox activa selector; en factura es obligatorio; crear cliente en diálogo." },
          { name: "Realizar venta / Cobrar", description: "Registra venta POS; requiere turno abierto y valida stock y efectivo." },
          { name: "Ajuste de stock", description: "Si falta stock, permite registrar entradas y luego cobrar." },
          { name: "Bajar stock en sistema", description: "Salida rápida (merma, error) sin venta asociada." },
          { name: "Impresión de comprobante", description: "Tras cobrar o reimprimir última venta; formatos A4, ticket 80/55 mm, PDF/PNG." },
          { name: "Indicador de turno", description: "Estado abierto/cerrado, enlace a turno y abrir otra caja en pestaña nueva." },
        ],
      },
      {
        name: "Turno",
        path: "/turno",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Apertura y cierre de turno, capital en caja y movimientos de efectivo.",
        functions: [
          { name: "Apertura de turno", description: "Arqueo por monedas/billetes (Admin/Programador) o total en efectivo (Empleado); notas opcionales." },
          { name: "Movimientos de caja", description: "Toggle salida/entrada, categoría, monto, concepto y registrar." },
          { name: "Compra de mercancía", description: "Vincula producto, cantidad y notas cuando la categoría es compra_mercancia." },
          { name: "Tabla de movimientos", description: "Lista en tiempo real del turno activo." },
          { name: "Cierre con arqueo", description: "Resumen de ventas, gastos, esperado y diferencia en vivo." },
          { name: "Cerrar turno", description: "Cierra turno y muestra cuadre perfecto o diferencia." },
          { name: "Historial de turnos", description: "Turnos recientes; Programador puede editar al hacer clic." },
          { name: "Edición programador", description: "Diálogo para corregir arqueo, fechas y gastos de turnos pasados." },
          { name: "Supervisión por fecha", description: "Enlace a supervisión (Admin/Programador)." },
        ],
      },
      {
        name: "Tareas",
        path: "/tareas",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Planes de trabajo para el personal: crear, editar borradores, publicar y checklist del empleado.",
        functions: [
          { name: "Vista admin: planes", description: "Tabla con búsqueda y paginación de planes de tareas." },
          { name: "Nuevo plan", description: "Diálogo con título, fechas y múltiples tareas." },
          { name: "Editar borrador", description: "Icono editar en planes en borrador; actualiza título, fechas e ítems." },
          { name: "Eliminar borrador", description: "Icono eliminar en planes en borrador (con confirmación)." },
          { name: "Configurar tareas", description: "Título, asignado, acción checklist o abrir caja, prioridad y vencimiento." },
          { name: "Acción abrir caja", description: "IDs de producto caja/unidad y cantidad de cajas a abrir." },
          { name: "Guardar y publicar", description: "Borrador o publicar con notificación a empleados." },
          { name: "Vista empleado", description: "Tarjetas agrupadas por plan con chips de estado." },
          { name: "Check / Quitar check", description: "Alterna tarea entre completada y pendiente." },
          { name: "Ejecutar abrir caja", description: "Botón que registra inventario open_box de la tarea." },
        ],
      },
      {
        name: "Comprobantes POS",
        path: "/facturacion",
        roles: ["Programador", "Administrador"],
        description: "Antes llamada «Facturación». Reimpresión de ventas de caja (factura, nota de venta, comprobante). No es facturación electrónica SRI. La config SRI está en Sistema → Configuración → Facturación electrónica.",
        functions: [
          { name: "Historial de ventas POS", description: "Hasta 300 ventas con documento, cliente, pago y total." },
          { name: "Búsqueda y paginación", description: "Filtro de texto e índice de filas en tabla." },
          { name: "Imprimir por venta", description: "Icono de impresora abre vista previa del comprobante." },
          { name: "Formato de impresión", description: "A4, ticket 80/55 mm, notas opcionales, PDF o PNG." },
        ],
      },
      {
        name: "Supervisión caja",
        path: "/turno/supervision",
        roles: ["Programador", "Administrador"],
        description: "Revisión de turnos cerrados, diferencias y movimientos por fecha.",
        functions: [
          { name: "Navegación semanal", description: "Flechas anterior/siguiente para cambiar semana." },
          { name: "Resumen semanal", description: "Por día: inicial, ventas, gastos, cierre y total semana." },
          { name: "Selección de día", description: "Clic en fila carga panel de detalle inferior." },
          { name: "Pestañas Gastos / Ventas", description: "Alterna salidas de efectivo y ventas del día." },
          { name: "Acordeones de ventas", description: "Cada venta expandible con líneas de producto." },
          { name: "Turnos del día", description: "Operador, estado, montos y cierre por turno." },
        ],
      },
      {
        name: "Apertura multi-caja por local",
        path: "/turno/multi-caja",
        roles: ["Programador", "Administrador", "Empleado"],
        status: "planned",
        description:
          "Próximamente: abrir y operar varias cajas al mismo tiempo en un mismo local/sucursal, con turnos e indicadores independientes por caja.",
        functions: [
          { name: "Seleccionar caja del local", description: "Elegir qué caja abrir o continuar en el punto de venta." },
          { name: "Turnos paralelos", description: "Varios turnos activos en el mismo local sin mezclar arqueos." },
          { name: "Indicador multi-caja", description: "Estado abierto/cerrado y enlace rápido a cada caja." },
          { name: "Supervisión por caja", description: "Filtrar ventas y movimientos por caja del local." },
        ],
      },
    ],
  },
  {
    id: "comprobantes-sri",
    label: "Comprobantes electrónicos",
    summary: "Documentos tributarios SRI: facturas, notas, retenciones y guías.",
    status: "development",
    sections: [
      {
        name: "Inicio SRI",
        path: "/comprobantes-electronicos",
        roles: ["Programador", "Administrador"],
        description:
          "Módulo de comprobantes electrónicos. Emisión al SRI en desarrollo; estructura de secciones lista.",
        status: "development",
        functions: [
          { name: "Panel de secciones", description: "Acceso a facturas, notas, retenciones, guías, etc." },
          { name: "Atajos", description: "Config SRI, comprobantes POS y sucursales." },
        ],
      },
      {
        name: "Facturas",
        path: "/comprobantes-electronicos/facturas",
        roles: ["Programador", "Administrador"],
        description: "Factura electrónica (código SRI 01).",
        functions: [{ name: "Bandeja (próx.)", description: "Emitir, autorizar y consultar facturas." }],
      },
      {
        name: "Notas de venta",
        path: "/comprobantes-electronicos/notas-venta",
        roles: ["Programador", "Administrador"],
        description: "Notas de venta operativas / electrónicas según flujo del negocio.",
        functions: [{ name: "Bandeja (próx.)", description: "Listado y emisión." }],
      },
      {
        name: "Notas de crédito / débito",
        path: "/comprobantes-electronicos/notas-credito",
        roles: ["Programador", "Administrador"],
        description: "NC (04) y ND (05) vinculadas a facturas.",
        functions: [
          { name: "Notas de crédito", description: "/comprobantes-electronicos/notas-credito" },
          { name: "Notas de débito", description: "/comprobantes-electronicos/notas-debito" },
        ],
      },
      {
        name: "Retenciones",
        path: "/comprobantes-electronicos/retenciones",
        roles: ["Programador", "Administrador"],
        description: "Comprobante de retención (07).",
        functions: [{ name: "Bandeja (próx.)", description: "Emitir y autorizar retenciones." }],
      },
      {
        name: "Guías de remisión",
        path: "/comprobantes-electronicos/guias-remision",
        roles: ["Programador", "Administrador"],
        description: "Guía de remisión (06) para traslados.",
        functions: [{ name: "Bandeja (próx.)", description: "Emitir guías." }],
      },
      {
        name: "Liquidación de compras",
        path: "/comprobantes-electronicos/liquidacion-compras",
        roles: ["Programador", "Administrador"],
        description: "Liquidación de compra (03).",
        functions: [{ name: "Bandeja (próx.)", description: "Emitir liquidaciones." }],
      },
      {
        name: "Documentos emitidos",
        path: "/comprobantes-electronicos/emitidos",
        roles: ["Programador", "Administrador"],
        description: "Bandeja unificada: autorizados, rechazados, XML y RIDE.",
        functions: [{ name: "Bandeja (próx.)", description: "Consulta por estado y tipo." }],
      },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    summary: "Pedidos institucionales, clientes mayoristas y (próx.) clientes con cuenta.",
    sections: [
      {
        name: "Pedidos",
        path: "/inventory/orders",
        roles: ["Programador", "Administrador"],
        description: "Creación y seguimiento de pedidos: entrega, pago por ítem y estados.",
        functions: [
          { name: "Crear pedido cliente", description: "Diálogo con productos, precios distribuidor y fecha." },
          { name: "Pedido a proveedor", description: "Formulario de compra con IVA, barcode y comprobante." },
          { name: "Calendario mensual", description: "Navegación por mes con pedidos cliente y proveedor." },
          { name: "Filtro por tipo", description: "Toggle Todos / Clientes / Proveedores." },
          { name: "Detalle por día", description: "Clic en día expande pedidos; colores según pago/entrega." },
          { name: "Marcar pagado/entregado", description: "Acciones rápidas por ítem de pedido cliente." },
          { name: "Editar/eliminar ítem", description: "Cantidad, precio, fechas; confirmación al eliminar." },
          { name: "Recibo firmado", description: "Subir documento adjunto por pedido." },
          { name: "Proveedor: recibido/pagado", description: "Marcar estado con método de pago en acordeón del día." },
        ],
      },
      {
        name: "Clientes",
        path: "/inventory/customers",
        roles: ["Programador", "Administrador"],
        description: "Directorio de clientes con datos de contacto y facturación.",
        functions: [
          { name: "Agregar cliente", description: "Diálogo con formulario vacío." },
          { name: "Tabla con búsqueda", description: "Columnas de contacto con paginación configurable." },
          { name: "Editar cliente", description: "Precarga datos en diálogo." },
          { name: "Eliminar cliente", description: "Confirmación antes de borrar." },
        ],
      },
      {
        name: "Clientes con cuenta",
        path: "/inventory/customers/cuentas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: acceso de clientes al sistema (cuenta de login vinculada al cliente mayorista) para consultar pedidos, saldos o catálogo según permisos.",
        functions: [
          { name: "Vincular cuenta", description: "Asociar un usuario/login a un cliente del directorio." },
          { name: "Permisos de cliente", description: "Qué puede ver o pedir desde su cuenta." },
          { name: "Portal / vistas cliente", description: "Pedidos, estado de cuenta y datos básicos." },
        ],
      },
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    summary: "Ingresos, cobros, gastos y cuentas por pagar a proveedores.",
    sections: [
      {
        name: "Finanzas",
        path: "/inventory/finance",
        roles: ["Programador", "Administrador"],
        description: "Registro de ingresos y gastos, resumen y movimientos contables.",
        functions: [
          { name: "Tarjetas resumen", description: "Balance, ingresos, gastos, margen y totales." },
          { name: "Tabla unificada", description: "Ingresos y gastos en una sola tabla con filtros." },
          { name: "Filtro por tipo", description: "Ver todos, solo ingresos o solo gastos." },
          { name: "Filtro por categoría", description: "Acotar movimientos por categoría." },
          { name: "Registrar ingreso/gasto", description: "Formulario con categoría, monto y comprobante (gastos)." },
          { name: "Ir a Cobranzas", description: "El detalle de cobros se gestiona en el módulo Cobranzas." },
        ],
      },
      {
        name: "Cobranzas",
        path: "/inventory/collections",
        roles: ["Programador", "Administrador"],
        description:
          "Cobros a clientes y pagos a proveedores: abonos parciales vinculados a pedidos.",
        functions: [
          { name: "Modo Clientes / Proveedores", description: "Alternar cuentas por cobrar y por pagar." },
          { name: "Abonar pedido de cliente", description: "Desde el resumen por pedidos: agrupa ítems y registra abono." },
          { name: "Abonar pedido de proveedor", description: "Pago parcial o total; genera gasto en Finanzas." },
          { name: "Selector por deuda", description: "Chips ordenados por saldo pendiente." },
          { name: "Grupos y abonos (clientes)", description: "Crear grupos, abonar, mover ítems e historial." },
          { name: "Resumen de cuenta", description: "Reporte A4/ticket imprimible, PDF, PNG o TXT." },
        ],
      },
      {
        name: "Préstamos y deudas",
        path: "/inventory/prestamos-deudas",
        roles: ["Programador", "Administrador"],
        description: "Préstamos, deudas y pagos sin pedido asociado.",
        functions: [
          { name: "Nuevo préstamo/deuda", description: "Obligación por cobrar o por pagar con movimiento en finanzas." },
          { name: "Filtros", description: "Tipo, estado (abiertas/saldadas/anuladas) y búsqueda por persona." },
          { name: "Ver detalle", description: "Historial de abonos vinculados a finanzas." },
          { name: "Registrar cobro/pago", description: "Abono con monto, fecha y método." },
          { name: "Anular obligación", description: "Solo sin abonos; revierte movimiento original." },
        ],
      },
      {
        name: "Gastos recurrentes",
        path: "/inventory/gastos-recurrentes",
        roles: ["Programador", "Administrador"],
        status: "maintenance",
        description: "Plantillas de arriendo, servicios y cuotas periódicas.",
        functions: [
          { name: "Generar cuotas", description: "Crea ocurrencias desde plantillas activas." },
          { name: "Nueva plantilla", description: "Local, categoría, monto fijo/variable, frecuencia y vencimiento." },
          { name: "Cuotas del mes", description: "Tabla con selector de mes." },
          { name: "Ajustar monto variable", description: "Monto real de factura antes de pagar." },
          { name: "Registrar pago", description: "Crea gasto en Finanzas." },
          { name: "Omitir período", description: "Marca cuota omitida sin pago." },
        ],
      },
      {
        name: "Cuentas por pagar a proveedores",
        path: "/inventory/collections",
        roles: ["Programador", "Administrador"],
        description:
          "Integrado en Cobranzas → Proveedores: deudas por pedido, abonos parciales y saldos.",
        functions: [
          { name: "Saldo por proveedor", description: "Chips ordenados por lo que debes." },
          { name: "Abonos por pedido", description: "Pagar parcial o liquidar un pedido de compra." },
          { name: "Historial de abonos", description: "Ver y eliminar abonos (revierte el gasto)." },
        ],
      },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    summary: "Catálogo, stock, (próx.) bodegas y lotes/vencimientos.",
    sections: [
      {
        name: "Productos",
        path: "/inventory/products",
        roles: ["Programador", "Administrador"],
        description: "Productos finales, precios, stock, códigos de barras e imágenes.",
        functions: [
          { name: "Vista tarjetas / tabla", description: "Alternar grid de cards o tabla paginada." },
          { name: "Búsqueda y escaneo", description: "Texto o lector de código de barras busca o abre edición." },
          { name: "Crear/editar producto", description: "Formulario completo con imagen, precios, IVA y tramos." },
          { name: "Ajuste rápido de stock", description: "En vista tarjetas: editar stock inline y registrar movimiento." },
          { name: "Duplicar producto", description: "Copiar con nuevo nombre desde cards." },
        ],
      },
      {
        name: "Movimientos",
        path: "/inventory/movement",
        roles: ["Programador", "Administrador"],
        description: "Entradas, salidas, ajustes y auditoría de inventario.",
        functions: [
          { name: "Registrar movimiento", description: "Entrada, salida, ajuste, producción o apertura de presentación." },
          { name: "Carrito multi-línea", description: "Varias líneas en un solo registro." },
          { name: "Producción integrada", description: "Simulación y registro de producción desde el formulario." },
          { name: "Comprobante adjunto", description: "Subir voucher del movimiento." },
          { name: "Editar/eliminar (Programador)", description: "Corregir o borrar movimiento; recalcula stock." },
          { name: "Historial agrupado", description: "Producciones por OP en acordeones; búsqueda y paginación." },
        ],
      },
      {
        name: "Categorías",
        path: "/inventory/categories",
        roles: ["Programador", "Administrador"],
        description: "Jerarquía de categorías y reglas de surtido o tramos en caja.",
        functions: [
          { name: "Panel maestro-detalle", description: "Categorías principales y subcategorías." },
          { name: "Búsqueda", description: "Encuentra y selecciona categoría o subcategoría." },
          { name: "CRUD categorías", description: "Crear, editar y eliminar en ambos niveles." },
          { name: "Visibilidad pública", description: "Campo isPublic para catálogo web." },
        ],
      },
      {
        name: "Tramos",
        path: "/inventory/tramos",
        roles: ["Programador", "Administrador"],
        description: "Grupos de precio por cantidad (ej. paquetes de panes).",
        functions: [
          { name: "Grupos de tramos", description: "Precios por cantidad para canasta surtido en caja." },
          { name: "Crear/editar grupo", description: "Subcategoría, tramos qty/precio y selección de productos." },
          { name: "Migrar desde categorías", description: "Bootstrap de grupos desde categorías existentes." },
          { name: "Estado activo/inactivo", description: "Chip inactivo en listado." },
        ],
      },
      {
        name: "Unidades",
        path: "/inventory/units",
        roles: ["Programador", "Administrador"],
        description: "Unidades de medida: unidad, kg, quintal, etc.",
        functions: [
          { name: "CRUD de unidades", description: "Nombre, abreviatura y descripción." },
          { name: "Tabla de unidades", description: "Listado con índice y acciones." },
        ],
      },
      {
        name: "Bodegas",
        path: "/inventory/bodegas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: locales usados como bodegas. Se crea una bodega con ubicación y mantiene su propio inventario (stock por bodega, distinto de la vitrina o sucursal de venta).",
        functions: [
          { name: "Crear bodega", description: "Nombre, ubicación/dirección y datos de contacto." },
          { name: "Inventario por bodega", description: "Stock independiente por producto en cada bodega." },
          { name: "Transferencias", description: "Mover mercadería entre bodegas o hacia sucursales (futuro)." },
          { name: "Movimientos de bodega", description: "Entradas, salidas y ajustes asociados a la bodega." },
        ],
      },
      {
        name: "Lotes y vencimientos",
        path: "/inventory/lotes",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: control de lotes por producto (harinas, lácteos, etc.) con fechas de vencimiento, alertas y consumo preferente FEFO/FIFO.",
        functions: [
          { name: "Registrar lote", description: "Código de lote, producto, cantidad y fecha de vencimiento." },
          { name: "Stock por lote", description: "Disponible por lote además del stock total." },
          { name: "Alertas de vencimiento", description: "Avisos de productos próximos a vencer o vencidos." },
          { name: "Salida por FEFO/FIFO", description: "Priorizar lotes al vender o consumir en producción." },
        ],
      },
    ],
  },
  {
    id: "produccion",
    label: "Producción",
    summary: "Insumos, recetas, fabricación y (próx.) proveedores con cuenta.",
    sections: [
      {
        name: "Insumos y marcas",
        path: "/inventory/insumos",
        roles: ["Programador", "Administrador"],
        description: "Materias primas, presentaciones y marcas de compra.",
        functions: [
          { name: "Panel de insumos genéricos", description: "Lista con stock total y presentaciones." },
          { name: "Crear presentación", description: "Formato de compra con stock y precio ref." },
          { name: "Enlazar producto", description: "Vincular materia prima existente a insumo genérico." },
          { name: "Bootstrap frecuentes", description: "Crear presentaciones típicas (azúcar, harina, aceite)." },
          { name: "Materia prima sin enlazar", description: "Chips de productos huérfanos clicables." },
        ],
      },
      {
        name: "Recetas",
        path: "/inventory/recipes",
        roles: ["Programador", "Administrador"],
        description: "Composición de productos finales a partir de insumos.",
        functions: [
          { name: "Selector de producto", description: "Finales e intermedios con chips de tipo y precios." },
          { name: "Gestión de componentes", description: "Agregar, editar y eliminar líneas de receta." },
          { name: "Parámetros de costeo", description: "Extras %, mano de obra % y cantidad de lote." },
          { name: "Resumen de costo", description: "Insumos, materiales, total, costo unitario y gramos." },
          { name: "Rentabilidad", description: "Costo vs precio venta/distribuidor y margen %." },
          { name: "Árbol de costos", description: "Desglose expandible por componente." },
        ],
      },
      {
        name: "Producción",
        path: "/inventory/production",
        roles: ["Programador", "Administrador"],
        description: "Órdenes de producción y consumo de insumos.",
        functions: [
          { name: "Ajuste de stock inline", description: "Campo de stock absoluto genera movimiento de ajuste." },
          { name: "Producir producto final", description: "Simulación de árbol de receta y registro de producción." },
          { name: "Producir intermedio", description: "Simulación masa/derivados con carrito de finales." },
          { name: "Fecha personalizada", description: "Programador puede fijar fecha del ajuste." },
        ],
      },
      {
        name: "Proveedores",
        path: "/inventory/suppliers",
        roles: ["Programador", "Administrador"],
        description: "Proveedores y pedidos de compra.",
        functions: [
          { name: "CRUD proveedores", description: "Nombre, teléfono, correo, dirección y notas." },
          { name: "Tabla paginada", description: "Listado con búsqueda e índice." },
        ],
      },
      {
        name: "Proveedores con cuenta",
        path: "/inventory/suppliers/cuentas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: acceso de proveedores al sistema (cuenta vinculada al proveedor) para pedidos de compra, estados de entrega o catálogo de insumos según permisos.",
        functions: [
          { name: "Vincular cuenta", description: "Asociar un usuario/login a un proveedor." },
          { name: "Permisos de proveedor", description: "Qué puede consultar o confirmar desde su cuenta." },
          { name: "Portal / vistas proveedor", description: "Órdenes de compra, recepciones y datos de contacto." },
        ],
      },
    ],
  },
  {
    id: "canal",
    label: "Canal digital",
    summary: "Catálogo web y vitrina pública.",
    sections: [
      {
        name: "Catálogo config",
        path: "/catalog_manager",
        roles: ["Programador", "Administrador"],
        description: "Configuración del catálogo público y orden de productos.",
        functions: [
          { name: "Entradas por sección", description: "Portada, ofertas, recomendados, novedades, etc." },
          { name: "Crear/editar entrada", description: "Producto, badge, posición, precio override y fechas." },
          { name: "Reglas mayoristas", description: "Tramos minQty/descuento; copiar desde producto." },
          { name: "AutoCatalogLab", description: "Sugerencias por métricas, selección masiva y publicación." },
        ],
      },
      {
        name: "Puntos de venta",
        path: "/inventory/puntos-venta",
        roles: ["Programador", "Administrador"],
        description:
          "Sucursales propias (caja + SRI) y vitrinas (entrega para que vendan). Filtro por tipo y mapa.",
        functions: [
          { name: "CRUD tiendas", description: "Datos de contacto, posición, tipo propia/vitrina y estado activo." },
          { name: "Filtro por tipo", description: "Todos / Sucursales propias / Vitrinas." },
          { name: "Códigos SRI", description: "Establecimiento y punto de emisión solo en sucursales propias." },
          { name: "Ubicación en mapa", description: "Lat/lng manual, URL de Google Maps y preview." },
          { name: "Imagen con recorte", description: "Subida con zoom, presets y formato." },
          { name: "Productos por tienda", description: "Asignar productos y toggle visible/oculto." },
        ],
      },
      {
        name: "Productos destacados",
        path: "/inventory/productos-destacados",
        roles: ["Programador", "Administrador"],
        status: "maintenance",
        description: "Productos en portada y carrusel del sitio.",
        functions: [
          { name: "CRUD destacados", description: "Nombre, sección, badge, posición y precio override." },
          { name: "Imagen con cropper", description: "Relación de aspecto y presets de tamaño." },
          { name: "Vincular producto", description: "Producto de catálogo opcional para datos." },
        ],
      },
      {
        name: "Grupos comparativos",
        path: "/compare_groups",
        roles: ["Programador", "Administrador"],
        status: "maintenance",
        description: "Comparación de productos para la vitrina.",
        functions: [
          { name: "Matriz de celdas", description: "Producto + variante + fila/columna + porciones." },
          { name: "Rellenos con colores", description: "Lista de rellenos configurables." },
          { name: "Vista previa en vivo", description: "Tabla comparativa dentro del formulario." },
          { name: "Bootstrap Pasteles", description: "Crear grupo de ejemplo preconfigurado." },
        ],
      },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    summary:
      "Plantillas, contratos, firmas y archivo documental. Próximamente: aún no hay pantallas activas.",
    status: "planned",
    sections: [
      {
        name: "Plantillas",
        path: "/documentos/plantillas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: plantillas reutilizables de documentos (cartas, acuerdos, formatos internos) con campos dinámicos.",
        functions: [
          { name: "CRUD plantillas", description: "Nombre, tipo, cuerpo y variables." },
          { name: "Variables", description: "Insertar datos de cliente, pedido, empresa, etc." },
          { name: "Vista previa", description: "Previsualizar antes de generar un documento." },
        ],
      },
      {
        name: "Contratos",
        path: "/documentos/contratos",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: generar y gestionar contratos a partir de plantillas (vigencia, partes y estado).",
        functions: [
          { name: "Crear contrato", description: "Desde plantilla + datos de las partes." },
          { name: "Estados", description: "Borrador, enviado, firmado, vencido o anulado." },
          { name: "Vencimientos", description: "Alertas de renovación o caducidad." },
        ],
      },
      {
        name: "Firmas",
        path: "/documentos/firmas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: captura o solicitud de firmas (manual/digital) vinculadas a un documento.",
        functions: [
          { name: "Solicitar firma", description: "Enviar documento a firmante(s)." },
          { name: "Firmar", description: "Firma en pantalla o carga de evidencia." },
          { name: "Historial de firmas", description: "Quién firmó, cuándo y desde dónde." },
        ],
      },
      {
        name: "Archivo",
        path: "/documentos/archivo",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: repositorio de documentos generados o subidos (búsqueda, carpetas y permisos).",
        functions: [
          { name: "Explorar archivo", description: "Listado por tipo, fecha o etiqueta." },
          { name: "Subir documento", description: "PDF/imagen u otro archivo adjunto." },
          { name: "Descargar / compartir", description: "Acceso controlado al documento." },
        ],
      },
    ],
  },
  {
    id: "logistica",
    label: "Logística",
    summary:
      "Rutas, transportistas, entregas y tracking. Próximamente: aún no hay pantallas activas.",
    status: "planned",
    sections: [
      {
        name: "Rutas",
        path: "/logistica/rutas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: definir y gestionar rutas de despacho (zonas, orden de paradas, días de recorrido).",
        functions: [
          { name: "CRUD de rutas", description: "Nombre, zona, local de origen y estado activo." },
          { name: "Paradas", description: "Ordenar puntos de entrega o clientes en la ruta." },
          { name: "Asignar transportista", description: "Vincular ruta a un transportista o vehículo." },
        ],
      },
      {
        name: "Transportistas",
        path: "/logistica/transportistas",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: directorio de transportistas (datos, vehículo, y en el futuro cuenta/rol de acceso).",
        functions: [
          { name: "CRUD transportistas", description: "Nombre, contacto, placa y notas." },
          { name: "Disponibilidad", description: "Activo/inactivo y carga asignada." },
          { name: "Vínculo con cuenta", description: "Asociar login/rol Transportista (futuro)." },
        ],
      },
      {
        name: "Entregas",
        path: "/logistica/entregas",
        roles: ["Programador", "Administrador", "Empleado"],
        status: "planned",
        description:
          "Próximamente: bandeja de entregas del día (pendiente, en ruta, entregado, fallido) vinculadas a pedidos o despachos.",
        functions: [
          { name: "Crear entrega", description: "Desde pedido o despacho manual." },
          { name: "Estados de entrega", description: "Pendiente → en ruta → entregado / fallido." },
          { name: "Evidencia", description: "Foto, firma o nota al cerrar la entrega." },
        ],
      },
      {
        name: "Tracking",
        path: "/logistica/tracking",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: seguimiento en vivo o por historial de entregas y ubicación del transportista.",
        functions: [
          { name: "Mapa / estado en ruta", description: "Ver entregas activas y avance." },
          { name: "Historial", description: "Consulta por fecha, ruta o transportista." },
          { name: "Alertas", description: "Retrasos o entregas fallidas." },
        ],
      },
    ],
  },
  {
    id: "comunidad",
    label: "Comunidad",
    summary:
      "Encuestas, quejas y resultados de participación. Próximamente: aún no hay pantallas activas.",
    status: "planned",
    sections: [
      {
        name: "Encuestas",
        path: "/comunidad/encuestas",
        roles: ["Programador", "Administrador", "Empleado"],
        status: "planned",
        description:
          "Próximamente: crear y responder encuestas (preguntas abiertas u opciones). Puede incluir una encuesta de mejoras del sistema/negocio.",
        functions: [
          { name: "Crear encuesta", description: "Título, preguntas y periodo de vigencia." },
          { name: "Responder encuesta", description: "Formulario para usuarios o público según configuración." },
          { name: "Encuesta de mejoras", description: "Plantilla fija para sugerencias de mejora." },
        ],
      },
      {
        name: "Quejas",
        path: "/comunidad/quejas",
        roles: ["Programador", "Administrador", "Empleado"],
        status: "planned",
        description:
          "Próximamente: buzón de quejas o reclamos con seguimiento (recibida, en revisión, resuelta).",
        functions: [
          { name: "Registrar queja", description: "Motivo, detalle y datos de contacto opcionales." },
          { name: "Bandeja admin", description: "Listado y estados de atención." },
          { name: "Respuesta / cierre", description: "Marcar resuelta con nota interna." },
        ],
      },
      {
        name: "Resultados",
        path: "/comunidad/resultados",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: ver respuestas de encuestas y resumen de quejas (solo Admin/Programador).",
        functions: [
          { name: "Resumen de encuestas", description: "Totales y desglose por pregunta." },
          { name: "Exportar", description: "Descargar respuestas para análisis." },
          { name: "Filtros", description: "Por encuesta, fecha y estado." },
        ],
      },
    ],
  },
  {
    id: "publicidad",
    label: "Publicidad",
    summary: "Señalización digital en pantallas TV. En mantenimiento: no se usa en producción y requiere mejora.",
    status: "maintenance",
    sections: [
      {
        name: "Campañas",
        path: "/publicidad",
        roles: ["Programador", "Administrador"],
        description: "Listado y edición de campañas publicitarias.",
        functions: [
          { name: "Listado de campañas", description: "Estado, piezas en playlist y dispositivos asignados." },
          { name: "Nueva/editar campaña", description: "Navega al editor de campaña." },
          { name: "Vista previa reproductor", description: "Abre reproductor de la campaña." },
          { name: "Eliminar campaña", description: "Confirmación y borrado vía API." },
        ],
      },
      {
        name: "Dispositivos TV",
        path: "/publicidad/dispositivos",
        roles: ["Programador", "Administrador"],
        description: "Registro de pantallas o boxes conectados.",
        functions: [
          { name: "Aprobación de dispositivos", description: "Estados pendiente, aprobado, rechazado o deshabilitado." },
          { name: "Asignar campaña", description: "Selector por dispositivo (campaña activa)." },
          { name: "Abrir reproductor TV", description: "Nueva pestaña /tv/device/:deviceId." },
          { name: "Eliminar registro", description: "Quita dispositivo del sistema." },
        ],
      },
      {
        name: "Reproductor",
        path: "/publicidad/reproductor",
        roles: ["Programador", "Administrador"],
        description: "Vista previa y control del reproductor de campañas.",
        functions: [
          { name: "Reproducción fullscreen", description: "Play/pausa, anterior/siguiente y barra de progreso." },
          { name: "Sync en tiempo real", description: "WebSocket + polling para actualizar playlist." },
          { name: "Modo offline", description: "Pantalla fija si el backend no responde." },
          { name: "Música de fondo", description: "Según configuración de campaña." },
        ],
      },
    ],
  },
  {
    id: "diseno",
    label: "Diseño promocional",
    summary:
      "Editor gráfico del sistema. En mantenimiento: no se usa en producción y requiere mejora.",
    status: "maintenance",
    sections: [
      {
        name: "Editor de diseño",
        path: "/diseno-promocional/editor",
        roles: ["Programador", "Administrador"],
        description: "Compositor visual para piezas promocionales. Es el único editor activo; rutas legacy (/publicity_edit, /editorDefault) redirigen aquí.",
        functions: [
          { name: "Canvas de diseño", description: "Área central con capas editables." },
          { name: "Capas", description: "Texto, imagen y forma; reordenar, visibilidad y bloqueo." },
          { name: "Inspector", description: "Fuentes, colores, posición y bindings a datos de producto." },
          { name: "Selector de productos", description: "Panel lateral con catálogo para preview real." },
          { name: "Exportar", description: "Guardar en BD, PNG/JPG, importar/exportar JSON." },
          { name: "Abrir plantilla por ID", description: "Ruta /diseno-promocional/editor/:id carga la plantilla desde el backend." },
        ],
      },
      {
        name: "Vista con productos",
        path: "/diseno-promocional/vista",
        roles: ["Programador", "Administrador"],
        description: "Previsualización de diseños con datos de productos.",
        functions: [
          { name: "Estudio de producto", description: "Selector de productos con auto-selección del primero." },
          { name: "Canvas en vivo", description: "Preview de plantilla con datos reales del producto." },
          { name: "Toolbar", description: "Acciones de guardado y exportación del diseño." },
        ],
      },
      {
        name: "Plantillas",
        path: "/diseno-promocional/plantillas",
        roles: ["Programador", "Administrador"],
        description: "Plantillas reutilizables del editor.",
        functions: [
          { name: "Listado de plantillas", description: "Búsqueda por nombre, app y formato." },
          { name: "Crear plantilla", description: "Nueva plantilla con formato 16:9 u otro." },
          { name: "Importar/exportar", description: "JSON de plantilla desde archivo." },
          { name: "Duplicar y eliminar", description: "Copiar plantilla o borrar con confirmación." },
          { name: "Abrir en editor", description: "Navega a /diseno-promocional/editor/:id con la plantilla cargada." },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    summary: "Usuarios, permisos, panel y (próx.) asistencia / horarios del personal.",
    sections: [
      {
        name: "Usuarios",
        path: "/users",
        roles: ["Programador", "Administrador"],
        description: "Datos personales de las personas del negocio.",
        functions: [
          { name: "Listado de usuarios", description: "ID, CI, nombre, username y roles." },
          { name: "Crear usuario", description: "Diálogo con datos personales, contraseña y roles." },
          { name: "Editar usuario", description: "Precarga y actualiza vía formulario." },
        ],
      },
      {
        name: "Cuentas",
        path: "/cuentas",
        roles: ["Programador", "Administrador"],
        description: "Usuarios de acceso (login) y asignación de roles.",
        functions: [
          { name: "Listado de cuentas", description: "Persona vinculada, login y roles." },
          { name: "Crear/editar cuenta", description: "Formulario de acceso y asignación de roles." },
          { name: "Resetear contraseña", description: "Vuelve al valor por defecto 12345678." },
          { name: "Eliminar cuenta", description: "Confirmación antes de borrar." },
        ],
      },
      {
        name: "Roles",
        path: "/roles",
        roles: ["Programador", "Administrador"],
        description: "Catálogo de roles del sistema.",
        functions: [
          { name: "Crear rol", description: "Campo inline con envío rápido." },
          { name: "Editar rol", description: "Carga nombre en formulario." },
          { name: "Eliminar rol", description: "Diálogo de confirmación." },
        ],
      },
      {
        name: "Panel de control",
        path: "/panel_control",
        roles: ["Programador", "Administrador"],
        description: "Estadísticas generales y copias de seguridad JSON.",
        functions: [
          { name: "Estadísticas del sistema", description: "Contadores de clientes, productos, usuarios, etc." },
          { name: "Info último backup", description: "Fecha, tamaño y registros respaldados." },
          { name: "Guardar copia en servidor", description: "Disponible Admin y Programador." },
          { name: "Descargar copia", description: "Solo Programador." },
        ],
      },
      {
        name: "Programas de notificación",
        path: "/notification-programs",
        roles: ["Programador", "Administrador"],
        description: "Envíos programados de avisos por rol o audiencia.",
        functions: [
          { name: "CRUD plantillas", description: "Código, título, mensaje y enlace opcional." },
          { name: "Programación", description: "Manual, diaria o por intervalo." },
          { name: "Destinatarios por rol", description: "Todos o roles específicos." },
          { name: "Enviar ahora", description: "Disparo manual inmediato." },
        ],
      },
      {
        name: "Asistencia / horarios del personal",
        path: "/admin/asistencia",
        roles: ["Programador", "Administrador"],
        status: "planned",
        description:
          "Próximamente: control de asistencia y horarios del personal (entrada/salida, turnos laborales y reportes).",
        functions: [
          { name: "Marcar asistencia", description: "Registro de entrada y salida por empleado." },
          { name: "Horarios / turnos laborales", description: "Definir jornadas por persona o rol." },
          { name: "Historial y reportes", description: "Días trabajados, tardanzas y ausencias." },
          { name: "Vinculo con usuarios", description: "Asistencia ligada a las cuentas del personal." },
        ],
      },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    summary:
      "Configuración del negocio, planes, mapa de módulos, perfil y donaciones.",
    sections: [
      {
        name: "Configuración",
        path: "/sistema/configuracion",
        roles: ["Programador", "Administrador"],
        description:
          "Negocio/app (logo, zona horaria, operación) y preparación de facturación electrónica SRI (RUC, firma .p12). También accesible desde el menú del avatar.",
        functions: [
          { name: "Pestaña Negocio y app", description: "Logo, nombre, zona horaria, reglas de caja y redes." },
          { name: "Pestaña Facturación electrónica", description: "Datos fiscales, ambiente, secuencial y certificado .p12 (siempre editable)." },
          { name: "Subir / cambiar logo", description: "Imagen en carpeta de medios (sistema/logos/)." },
          { name: "Zona horaria", description: "IANA (ej. America/Guayaquil) para fechas del sistema." },
          { name: "Firma SRI", description: "Archivo .p12/.pfx privado + contraseña cifrada." },
        ],
      },
      {
        name: "Planes",
        path: "/sistema/planes",
        roles: ["Programador", "Administrador"],
        description:
          "Planes comerciales: Prueba, Básico, Medio, Pro, Socios y Empresarial.",
        status: "active",
        functions: [
          { name: "Plan Prueba", description: "Muchas funciones con límites de uso/tiempo; no es gratis permanente." },
          { name: "Plan Básico", description: "Operación de mostrador: caja, turno, tareas y POS." },
          { name: "Plan Medio", description: "Inventario, ventas, finanzas y producción." },
          { name: "Plan Pro", description: "SRI, catálogo web, publicidad TV y diseño." },
          { name: "Plan Socios", description: "Multi-local, más usuarios y prioridad para redes/aliados." },
          { name: "Plan Empresarial", description: "A medida: límites altos, integraciones y soporte dedicado." },
          { name: "Comparar planes", description: "Tarjetas lado a lado con beneficios y CTA." },
        ],
      },
      {
        name: "Módulos",
        path: "/sistema/modulos",
        roles: ["Programador", "Administrador"],
        description:
          "Catálogo de módulos del menú (no secciones): en uso, en desarrollo, mantenimiento o solo desarrollador.",
        status: "active",
        functions: [
          { name: "Tarjetas por módulo", description: "Una card por grupo del menú (Operación, Comprobantes, etc.)." },
          { name: "Filtro por estado", description: "Todos / En uso / En desarrollo / Mantenimiento / Solo desarrollador / Planificado." },
          { name: "Ir al módulo", description: "Abre Info → Módulos con ese módulo seleccionado para ver secciones y funciones." },
        ],
      },
      {
        name: "Perfil",
        path: "/perfil",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Datos y foto del usuario conectado. También en el menú del avatar.",
        functions: [
          { name: "Editar datos personales", description: "Nombre, contacto y foto de perfil." },
          { name: "Cambiar contraseña", description: "Actualización de credenciales de acceso." },
        ],
      },
      {
        name: "Donaciones",
        path: "/donaciones",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Información de apoyo al proyecto SoftEd. También en el menú del avatar.",
        functions: [
          { name: "Información de apoyo", description: "Datos para contribuir al desarrollo del proyecto." },
        ],
      },
      {
        name: "Facturación electrónica",
        path: "/sistema/configuracion?tab=sri",
        roles: ["Programador", "Administrador"],
        description:
          "Atajo a la pestaña SRI dentro de Configuración. No emite facturas aún; el POS sigue con consumidor final / comprobantes.",
        functions: [
          { name: "Datos fiscales", description: "RUC, razón social, direcciones, régimen, secuencial." },
          { name: "Ambiente", description: "Pruebas o producción." },
          { name: "Subir firma", description: "Archivo .p12/.pfx en carpeta privada del servidor." },
          { name: "Contraseña cifrada", description: "Se guarda cifrada; no se vuelve a mostrar." },
        ],
      },
    ],
  },
  {
    id: "desarrollador",
    label: "Desarrollador",
    summary:
      "Herramientas técnicas del rol Programador (futuro: Desarrollador). El cliente debe saber que existe; en producción del negocio no forma parte del uso diario.",
    status: "developer",
    sections: [
      {
        name: "Imágenes",
        path: "/img",
        roles: ["Programador"],
        description: "Gestor de archivos de imagen del servidor.",
        functions: [
          { name: "Escaneo de carpeta", description: "Filtro por carpeta y profundidad en /img." },
          { name: "Subir/eliminar imagen", description: "Formulario con carpeta destino." },
          { name: "Descargar ZIP", description: "De la carpeta filtrada." },
        ],
      },
      {
        name: "Archivos",
        path: "/file",
        roles: ["Programador"],
        description: "Explorador de archivos subidos.",
        functions: [
          { name: "Explorar archivos", description: "Por carpeta y profundidad configurable." },
          { name: "Subir/reemplazar", description: "Formulario de carga de archivos." },
          { name: "Descargar ZIP de carpeta", description: "Del filtro actual." },
          { name: "Eliminar carpeta", description: "Vacía o recursiva con checkbox force." },
        ],
      },
      {
        name: "Logs",
        path: "/logs",
        roles: ["Programador"],
        description: "Registro de actividad y errores.",
        functions: [
          { name: "Tabla de logs HTTP", description: "Solo mutaciones POST/PUT/DELETE; texto truncado con …" },
          { name: "Detalle ampliado", description: "Modal grande con URL, descripción y user-agent." },
          { name: "Filtro por método", description: "Chips Todos / POST / PUT / DELETE." },
          { name: "Borrar logs", description: "Por método, filtrados, uno a uno o todos (Programador)." },
          { name: "Detalle de log", description: "Diálogo con formulario al ver fila." },
          { name: "Búsqueda y paginación", description: "Filtro en tabla." },
        ],
      },
      {
        name: "Backups JSON",
        path: "/backups",
        roles: ["Programador"],
        description: "Copias de seguridad y restauración de datos.",
        functions: [
          { name: "backup.json fijo", description: "Ver, subir, reemplazar y descargar." },
          { name: "Copias guardadas", description: "Tabla de archivos en backend/src/backups/." },
          { name: "Fijar como backup.json", description: "Promueve copia almacenada al activo." },
          { name: "Limpiar copias", description: "Borra guardadas y crea nueva desde BD." },
        ],
      },
      {
        name: "Comandos",
        path: "/comandos",
        roles: ["Programador"],
        description: "Comandos de mantenimiento y sincronización.",
        functions: [
          { name: "Subir backup.json", description: "Valida JSON EdDeli y guarda en servidor." },
          { name: "Descargar backup", description: "Exporta estado actual de la BD." },
          { name: "Recargar BD", description: "Restaura desde backup.json con confirmación." },
          { name: "Progreso visual", description: "Diálogo con pasos y barra por operación." },
        ],
      },
    ],
  },
];

export const APP_ACCOUNT_SECTIONS = [
  {
    name: "Perfil",
    path: "/perfil",
    roles: ["Programador", "Administrador", "Empleado"],
    description: "Datos y foto del usuario conectado.",
    functions: [
      { name: "Editar datos personales", description: "Nombre, contacto y foto de perfil." },
      { name: "Cambiar contraseña", description: "Actualización de credenciales de acceso." },
    ],
  },
  {
    name: "Información",
    path: "/info",
    roles: ["Programador", "Administrador", "Empleado"],
    description: "Versión de la app, plan en uso y mapa de módulos por sección (esta página). El PDF exporta el mismo catálogo.",
    functions: [
      { name: "Pestaña La app", description: "Logo, nombre, versión, descripción y plan comercial activo." },
      { name: "Pestaña Módulos", description: "Tarjetas por módulo; al hacer clic se listan secciones con conteo de funciones." },
      { name: "Detalle de sección", description: "Expandir sección para ver cada función." },
      { name: "Descargar PDF", description: "Botón genera guía en PDF del catálogo completo." },
    ],
  },
  {
    name: "Donaciones",
    path: "/donaciones",
    roles: ["Programador", "Administrador", "Empleado"],
    description: "Información de apoyo al proyecto SoftEd.",
    functions: [
      { name: "Información de apoyo", description: "Datos para contribuir al desarrollo del proyecto." },
    ],
  },
];

export const APP_PUBLIC_SECTIONS = [
  {
    name: "Catálogo público",
    path: "/catalogo",
    roles: ["Público"],
    description: "Vitrina de productos sin iniciar sesión.",
    functions: [
      { name: "Secciones de catálogo", description: "Inicio, ofertas, recomendados, novedades, etc." },
      { name: "Búsqueda y filtros", description: "Por nombre, categoría y ordenamiento de precio." },
      { name: "Grupos comparativos", description: "Tablas de precios por variante y tamaño." },
      { name: "Vista previa modal", description: "Detalle ampliado de producto o grupo." },
    ],
  },
  {
    name: "Puntos de venta",
    path: "/punto_venta",
    roles: ["Público"],
    description: "Ubicación de locales en mapa: puntos de venta propios y vitrinas.",
    functions: [
      { name: "Filtro por tipo", description: "Todos / Punto de venta / Vitrina." },
      { name: "Listado de locales", description: "Tarjetas con imagen, nombre, dirección y tipo." },
      { name: "Detalle de local", description: "Teléfono, email, mapa y explicación del tipo." },
      { name: "Productos del local", description: "Catálogo público filtrado por punto de venta." },
    ],
  },
  {
    name: "Reproductor TV",
    path: "/tv/:campaignId",
    roles: ["Público"],
    description: "Pantalla de campaña publicitaria para dispositivos.",
    functions: [
      { name: "Kiosco pantalla completa", description: "Reproducción automática en bucle sin controles." },
      { name: "Sync remota", description: "WebSocket actualiza playlist y comandos play/pause." },
      { name: "Fallback offline", description: "Comunicados fijos si no hay conexión al API." },
    ],
  },
];

/** Estados de módulo para /sistema/modulos */
export const MODULE_STATUS_META = {
  active: {
    id: "active",
    label: "En uso",
    color: "success",
    description: "Disponible y operativo en el día a día.",
  },
  development: {
    id: "development",
    label: "En desarrollo",
    color: "warning",
    description: "Estructura o pantallas listas; falta completar la función principal.",
  },
  maintenance: {
    id: "maintenance",
    label: "Mantenimiento",
    color: "error",
    description: "Fuera de uso operativo; pendiente de mejora o estabilización.",
  },
  developer: {
    id: "developer",
    label: "Solo desarrollador",
    color: "info",
    description:
      "Herramientas del rol Programador/Desarrollador. Existe para que el cliente lo conozca; no es uso diario del negocio en producción.",
  },
  planned: {
    id: "planned",
    label: "Planificado",
    color: "default",
    description: "Previsto a futuro; aún no hay pantallas útiles.",
  },
};

/** Prefijos de ruta cuyo estado por defecto es «en desarrollo». */
const DEVELOPMENT_PATH_PREFIXES = ["/comprobantes-electronicos"];

/** Rutas exactas planificadas (opcional). */
const PLANNED_PATHS = new Set([]);

/**
 * Resuelve el estado de una sección del catálogo.
 * Prioridad: `section.status` → reglas de path → active.
 */
export function resolveModuleStatus(section) {
  if (section?.status && MODULE_STATUS_META[section.status]) {
    return section.status;
  }
  const path = String(section?.path || "").split("?")[0];
  if (PLANNED_PATHS.has(path)) return "planned";
  if (
    DEVELOPMENT_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return "development";
  }
  return "active";
}

/**
 * Estado del módulo (grupo del menú), no de cada sección.
 * Prioridad: `group.status` → secciones operativas (ignora «planned», que son avisos futuros).
 */
export function resolveGroupModuleStatus(group) {
  if (group?.status && MODULE_STATUS_META[group.status]) {
    return group.status;
  }
  const sections = group?.sections || [];
  if (sections.length === 0) return "planned";
  const operational = sections
    .map(resolveModuleStatus)
    .filter((s) => s !== "planned");
  if (operational.length === 0) return "planned";
  // Si hay secciones en uso, el módulo sigue «en uso» (el mantenimiento es por sección).
  if (operational.some((s) => s === "active")) return "active";
  if (operational.some((s) => s === "development")) return "development";
  if (operational.some((s) => s === "maintenance")) return "maintenance";
  if (operational.some((s) => s === "developer")) return "developer";
  return "active";
}

/** Lista de módulos (grupos del menú) con estado resuelto — para /sistema/modulos. */
export function listCatalogModuleGroupsWithStatus() {
  return APP_MODULE_GROUPS.map((group) => {
    const sections = group.sections || [];
    const status = resolveGroupModuleStatus(group);
    const hubPath =
      sections.find(
        (s) =>
          s.path &&
          !String(s.path).includes(":") &&
          resolveModuleStatus(s) !== "planned",
      )?.path ||
      sections.find((s) => s.path && !String(s.path).includes(":"))?.path ||
      null;
    const sectionRows = sections.map((s) => ({
      name: s.name,
      path: s.path,
      status: resolveModuleStatus(s),
    }));
    return {
      id: group.id,
      name: group.label,
      description: group.summary,
      path: hubPath,
      sectionCount: sections.length,
      plannedSectionCount: sectionRows.filter((s) => s.status === "planned").length,
      maintenanceSectionCount: sectionRows.filter((s) => s.status === "maintenance").length,
      sectionItems: sectionRows,
      sections: sectionRows.map((s) =>
        s.status === "planned"
          ? `${s.name} (próx.)`
          : s.status === "maintenance"
            ? `${s.name} (mant.)`
            : s.name,
      ),
      status,
      statusMeta: MODULE_STATUS_META[status],
    };
  });
}

/** @deprecated Preferir listCatalogModuleGroupsWithStatus (módulos ≠ secciones). */
export function listCatalogModulesWithStatus() {
  return listCatalogModuleGroupsWithStatus();
}
