# Módulo Editor (Photoshop)

Editor visual de **plantillas por capas** para banners y publicidad de productos. Permite crear y editar diseños con texto, imágenes y formas, enlazar datos del catálogo y exportar a PNG/JPG.

---

## ¿Qué hace este módulo?

1. **Editar plantillas**: canvas con capas (texto, imagen, forma), grupos, mover/redimensionar.
2. **Enlazar datos**: las capas pueden mostrar datos dinámicos (nombre de producto, precio, imagen) mediante **bind** (`textFrom`, `srcFrom`).
3. **Guardar y cargar**: las plantillas se guardan en el backend (API `/editor/templates`) y se pueden listar, importar y eliminar.
4. **Exportar**: descargar el diseño como PNG/JPG o como JSON.

---

## Estructura de carpetas

```
photoshop/
├── README.md                 ← Estás aquí
├── EditorProvider.jsx        ← Estado global (context + reducer), carga/guardado, export
├── EditorPage.jsx            ← Página principal: /editor y /editor/:id
├── EditorTemplatesView.jsx   ← Lista de plantillas: /templates
├── ProductTemplateStudio.jsx ← Vista “studio”: catálogo + preview (/publicidad)
├── editorReducer.js          ← Acciones del estado (capas, doc, selección)
├── editorActions.js          ← Helpers: IDs, capas por defecto, SCALE, path img
├── template.js               ← Plantilla local de fallback (sin backend)
│
├── bind/                     ← Resolución de datos para texto e imágenes
│   ├── resolveTemplate.js   ← resolveTemplate(doc, data), resolveLayer(doc, data, layer)
│   ├── resolveMedia.js      ← resolveValue(data, key), resolveImageUrl(value)
│   └── getByPath.js         ← (si se usa) acceso por path "product.name"
│
├── canvas/                   ← Lienzo y render
│   ├── CanvasStage.jsx      ← Contenedor, eventos mover/redimensionar (Shift = mover grupo)
│   ├── LayerRenderer.jsx    ← Dibuja cada capa según tipo (text, image, shape)
│   └── TransformBox.jsx     ← Handles de redimensionado al seleccionar capa
│
└── panels/                   ← Paneles de la UI
    ├── LayersPanel.jsx      ← Lista de capas, añadir text/image/shape, reordenar
    ├── InspectorPanel.jsx   ← Propiedades de la capa seleccionada + fondo
    └── ExportPanel.jsx      ← Guardar en BD, export PNG/JPG, import/export JSON
```

---

## Flujo de datos (resumen)

```
EditorProvider (Context)
    │
    ├── state.doc          → documento actual: canvas, backgroundSrc, groups, layers, data
    ├── state.selected     → capa o grupo seleccionado
    ├── state.action       → acción en curso (mover capa, mover grupo, resize)
    │
    ├── dispatch()         → para cambiar estado (reducer)
    └── funciones          → loadTemplateById, saveTemplateDoc, exportAsImage, etc.

doc.data = datos que “rellenan” los bind (ej. producto, badge, displayName).
resolveLayer(doc, doc.data, layer) devuelve la capa con texto/imagen ya resuelta.
```

- **Paneles y canvas** usan `useEditor()` para leer estado y disparar acciones.
- **Guardar** → `saveTemplateDoc()` → PUT `/editor/templates/:id/doc` con el `doc` completo.
- **Cargar** → `loadTemplateById(id)` → GET `/editor/templates/:id/resolved` y se hace `setDoc(resolved)`.

---

## Las 3 pantallas

| Ruta | Archivo | Uso |
|------|---------|-----|
| `/editor` y `/editor/:id` | `EditorPage.jsx` | Editar una plantilla. Si hay `id`, se carga desde el backend. Layout: canvas + export a la izquierda; inspector + capas a la derecha. |
| `/templates` | `EditorTemplatesView.jsx` | Listar plantillas, filtrar, abrir en editor, importar JSON, editar metadatos, eliminar. |
| `/publicidad` | `ProductTemplateStudio.jsx` | Selector de ítems del catálogo; al elegir uno se actualiza `doc.data` y el canvas muestra el preview con datos reales. Mismo canvas y ExportPanel. |

---

## Tipos de capa y bind

- **text**: `props` (text, fontFamily, fontSize, color, align, stroke, shadow…). **bind.textFrom**: ruta en `doc.data` (ej. `product.name`, `data.computed.priceText`).
- **image**: `props` (src, fit, borderRadius). **bind.srcFrom**: ruta para la imagen (ej. `imageUrl`, `product.primaryImageUrl`). Opcional: `srcPrefix`, `fallbackSrc`.
- **shape**: `props` (fill, borderRadius). Sin bind.

Las rutas pueden ser con punto: `product.name`, `data.badge`. En el Inspector se edita el campo “Referencia (fieldKey)” que corresponde a `textFrom` o `srcFrom`.

---

## Atajos en el canvas

- **Click** en capa → seleccionar.
- **Arrastrar** capa → mover (si no está bloqueada).
- **Handles** al seleccionar → redimensionar (Shift en imagen = mantener proporción; Alt = desde el centro).
- **Shift + arrastrar** en el área de un grupo → mover todo el grupo (UPDATE_GROUP_POS en el reducer).

---

## Cómo seguir leyendo el código

1. **EditorProvider.jsx**: empieza por el `value` del context (qué se expone) y por `loadTemplateById` / `saveTemplateDoc` / `exportAsImage`.
2. **editorReducer.js**: abre el `switch (action.type)` y revisa los casos que te interesen (UPDATE_LAYER, SET_DOC, ADD_LAYER, etc.).
3. **bind/resolveTemplate.js**: `resolveLayer(doc, docData, layer)` para ver cómo se rellenan texto e imagen desde `doc.data`.
4. **CanvasStage.jsx**: eventos de ratón y cómo se llama a `dispatch` para mover y redimensionar.

Si algo no cuadra con el backend, revisa `ANALISIS_EDITOR_BACKEND_RUTAS_REQUESTS.md` en la raíz del proyecto.
