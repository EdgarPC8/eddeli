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
    description: "Mantenimiento del sistema, backups, logs y configuración técnica.",
  },
  {
    name: "Administrador",
    description: "Gestión completa del negocio: inventario, finanzas, ventas y administración.",
  },
  {
    name: "Empleado",
    description: "Operación diaria: caja, turno, tareas y notificaciones.",
  },
];

export const APP_MODULE_GROUPS = [
  {
    id: "acceso",
    label: "Acceso rápido",
    summary: "Vistas principales al iniciar sesión.",
    sections: [
      {
        name: "Dashboard",
        path: "/",
        roles: ["Programador", "Administrador"],
        description: "Resumen del negocio: calendario financiero, clientes, ingresos por producto y gráficos.",
        functions: [
          { name: "Tarjetas financieras", description: "KPIs de balance, ingresos, gastos, cobranzas, préstamos y margen del mes." },
          { name: "Alertas de inventario", description: "Toggles por agotarse/agotados y filtro por tipo de producto; medidores de stock." },
          { name: "Ver detalle de stock", description: "Diálogo con productos en alerta; Programador puede editar stock y mínimo inline." },
          { name: "Gráfico ingresos vs gastos", description: "Desglose por categoría de movimientos financieros." },
          { name: "Gráfico anual", description: "Navegación por año, toggle todo/solo ingresos; clic en mes lleva al calendario." },
          { name: "Estados de pedido", description: "Tarjetas clicables por estado y diálogo de detalle de pedidos." },
          { name: "Gráfico espejo de caja", description: "Granularidad día/semana/mes; clic en barra abre detalle del día." },
          { name: "Gráfico de velas", description: "Periodo configurable con paginación; selección filtra el gráfico espejo." },
          { name: "Calendario financiero", description: "Navegación mensual, toggle ingresos/todo; clic en día abre movimientos del día." },
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
    summary: "Punto de venta y trabajo diario en mostrador.",
    sections: [
      {
        name: "Caja",
        path: "/caja",
        roles: ["Programador", "Administrador", "Empleado"],
        description: "Ventas en mostrador, carrito, cobro en efectivo/transferencia y comprobantes.",
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
          { name: "Apertura de turno", description: "Efectivo total o arqueo por monedas/billetes (Programador); notas opcionales." },
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
        description: "Lista de tareas asignadas al personal.",
        functions: [
          { name: "Vista admin: planes", description: "Tabla con búsqueda y paginación de planes de tareas." },
          { name: "Nuevo plan", description: "Diálogo con título, fechas y múltiples tareas." },
          { name: "Configurar tareas", description: "Título, asignado, acción checklist o abrir caja, prioridad y vencimiento." },
          { name: "Acción abrir caja", description: "IDs de producto caja/unidad y cantidad de cajas a abrir." },
          { name: "Guardar y publicar", description: "Borrador o publicar con notificación a empleados." },
          { name: "Vista empleado", description: "Tarjetas agrupadas por plan con chips de estado." },
          { name: "Check / Quitar check", description: "Alterna tarea entre completada y pendiente." },
          { name: "Ejecutar abrir caja", description: "Botón que registra inventario open_box de la tarea." },
        ],
      },
      {
        name: "Facturación",
        path: "/facturacion",
        roles: ["Programador", "Administrador"],
        description: "Ventas de caja registradas para imprimir factura, nota de venta o comprobante.",
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
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    summary: "Pedidos institucionales y clientes mayoristas.",
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
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    summary: "Ingresos, cobros, gastos y obligaciones.",
    sections: [
      {
        name: "Finanzas",
        path: "/inventory/finance",
        roles: ["Programador", "Administrador"],
        description: "Registro de ingresos y gastos, resumen y movimientos contables.",
        functions: [
          { name: "Tarjetas resumen", description: "Balance, ingresos, gastos, margen, por cobrar y préstamos." },
          { name: "Panel cobranzas esperadas", description: "Desglose pendiente sin grupo vs grupos." },
          { name: "Registrar ingreso/gasto", description: "Formulario con categoría, monto y comprobante (gastos)." },
          { name: "Tablas ingresos y gastos", description: "Listado con editar y eliminar por fila." },
          { name: "Ir a Cobranzas", description: "Enlace directo al módulo de cobranzas." },
        ],
      },
      {
        name: "Cobranzas",
        path: "/inventory/collections",
        roles: ["Programador", "Administrador"],
        description: "Grupos de cobro, abonos parciales y saldo pendiente por cliente.",
        functions: [
          { name: "Selector de clientes", description: "Chips ordenados por deuda con monto pendiente." },
          { name: "Resumen de cuenta", description: "Reporte A4/ticket imprimible, PDF, PNG o TXT." },
          { name: "Pestañas pendientes", description: "Sin grupo, pagados sin grupo, grupos y detalle." },
          { name: "Selección múltiple", description: "Checkboxes para crear grupo de ítems." },
          { name: "Crear grupo", description: "Diálogo con concepto para agrupar ítems." },
          { name: "Abonar a grupo", description: "Monto, fecha, método y nota auto-sugerida." },
          { name: "Mover ítems", description: "Entre grupos o quitar del grupo." },
          { name: "Editar ítem (Programador)", description: "Cantidad, precio, dañado, yapa y cambiado." },
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
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    summary: "Catálogo de productos y control de stock.",
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
    ],
  },
  {
    id: "produccion",
    label: "Producción",
    summary: "Insumos, recetas y fabricación.",
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
        description: "Locales y mapa de puntos de venta.",
        functions: [
          { name: "CRUD tiendas", description: "Datos de contacto, posición y estado activo." },
          { name: "Ubicación en mapa", description: "Lat/lng manual, URL de Google Maps y preview." },
          { name: "Imagen con recorte", description: "Subida con zoom, presets y formato." },
          { name: "Productos por tienda", description: "Asignar productos y toggle visible/oculto." },
        ],
      },
      {
        name: "Productos destacados",
        path: "/inventory/productos-destacados",
        roles: ["Programador", "Administrador"],
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
    id: "publicidad",
    label: "Publicidad",
    summary: "Señalización digital en pantallas TV.",
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
    summary: "Editor gráfico para material de venta.",
    sections: [
      {
        name: "Editor de diseño",
        path: "/diseno-promocional/editor",
        roles: ["Programador", "Administrador"],
        description: "Compositor visual para piezas promocionales.",
        functions: [
          { name: "Canvas de diseño", description: "Área central con capas editables." },
          { name: "Capas", description: "Texto, imagen y forma; reordenar, visibilidad y bloqueo." },
          { name: "Inspector", description: "Fuentes, colores, posición y bindings a datos de producto." },
          { name: "Selector de productos", description: "Panel lateral con catálogo para preview real." },
          { name: "Exportar", description: "Guardar en BD, PNG/JPG, importar/exportar JSON." },
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
          { name: "Abrir en editor", description: "Navega al editor con la plantilla cargada." },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    summary: "Usuarios, permisos y panel del sistema.",
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
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    summary: "Herramientas técnicas (solo programador).",
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
          { name: "Tabla de logs HTTP", description: "Solo mutaciones POST/PUT/DELETE." },
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
      {
        name: "Configuración",
        path: "/sistema/configuracion",
        roles: ["Programador", "Administrador"],
        description: "Nombre, versión, logo y reglas operativas del negocio.",
        functions: [
          { name: "Subir / cambiar logo", description: "Imagen en carpeta de medios (logo.jpeg/png)." },
          { name: "Eliminar logo", description: "Quita archivo y vuelve al logo por defecto." },
          { name: "Datos de la app", description: "Nombre, alias, versión, descripción y autor." },
          { name: "Reglas de caja", description: "Filtro accesos rápidos y cliente mostrador." },
          { name: "Redes sociales", description: "WhatsApp, Facebook, Instagram, TikTok y email." },
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
    description: "Versión de la app y mapa de módulos (esta página).",
    functions: [
      { name: "Mapa de módulos", description: "Acordeones con secciones, roles y funciones." },
      { name: "Descargar PDF", description: "Botón flotante genera guía en PDF al llegar a módulos." },
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
    description: "Ubicación de locales en mapa.",
    functions: [
      { name: "Listado de locales", description: "Tarjetas con imagen, nombre y dirección." },
      { name: "Detalle de local", description: "Teléfono, email y mapa embebido de Google." },
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
