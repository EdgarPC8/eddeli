/**
 * Diseño Promocional — listado y gestión de plantillas del editor.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import {
  getEditorTemplates,
  importEditorTemplate,
  updateEditorTemplate,
  deleteEditorTemplate,
  getEditorTemplateById,
} from "../../../api/editorRequest";

import SimpleDialog from "../../../components/Dialogs/SimpleDialog";

export default function EditorTemplatesView({
  editorBasePath = "/diseno-promocional/editor", // ruta canónica del editor
  defaultApp = "EdDeli",
  defaultFormat = "16:9",
} = {}) {
  const nav = useNavigate();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  // dialogs
  const [openImportDlg, setOpenImportDlg] = useState(false);
  const [openEditDlg, setOpenEditDlg] = useState(false);
  const [openDeleteDlg, setOpenDeleteDlg] = useState(false);
  const [openCreateDlg, setOpenCreateDlg] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [creating, setCreating] = useState(false);

  // form import
  const [importForm, setImportForm] = useState({
    name: "",
    app: defaultApp || "",
    format: defaultFormat || "",
    isDefault: false,
    isActive: true,
    templateJsonText: "",
  });

  // form edit
  const [editForm, setEditForm] = useState({
    id: null,
    name: "",
    app: "",
    format: "",
    isDefault: false,
    isActive: true,
  });

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  // create form
  const [createForm, setCreateForm] = useState({
    name: "",
    app: defaultApp || "",
    format: defaultFormat || "16:9",
    isDefault: false,
    isActive: true,
  });

  const openEditor = (id) => {
    if (!id) return;
    nav(`${editorBasePath}/${id}`);
  };

  const parseTemplatesResponse = (res) => {
    const arr = Array.isArray(res?.data?.rows)
      ? res.data.rows
      : Array.isArray(res?.data)
      ? res.data
      : [];
    return arr;
  };

  const fetchList = async (query = q) => {
    try {
      setLoading(true);
      setErr("");

      const res = await getEditorTemplates({
        q: query || undefined,
        limit: 200,
      });

      setRows(parseTemplatesResponse(res));
    } catch (e) {
      console.error(e);
      setRows([]);
      setErr("No se pudo cargar la lista de plantillas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = String(q || "").toLowerCase().trim();
    if (!s) return rows;

    return rows.filter((t) => {
      const name = String(t?.name || t?.title || t?.meta?.name || "").toLowerCase();
      const id = String(t?.id || "").toLowerCase();
      const app = String(t?.app || "").toLowerCase();
      const format = String(t?.format || "").toLowerCase();
      return (
        name.includes(s) ||
        id.includes(s) ||
        app.includes(s) ||
        format.includes(s)
      );
    });
  }, [rows, q]);

  const openDefault = async () => {
    try {
      // 1) intenta default por app+format
      const r1 = await getEditorTemplates({
        app: importForm.app || defaultApp || undefined,
        format: importForm.format || defaultFormat || undefined,
        isDefault: true,
        limit: 1,
      });
      const a1 = parseTemplatesResponse(r1);
      if (a1?.[0]?.id) return openEditor(a1[0].id);

      // 2) fallback: primera de la lista actual
      if (rows?.[0]?.id) return openEditor(rows[0].id);

      // 3) fallback final: pedir 1
      const r2 = await getEditorTemplates({ limit: 1 });
      const a2 = parseTemplatesResponse(r2);
      if (a2?.[0]?.id) return openEditor(a2[0].id);

      alert("No hay plantillas guardadas todavía.");
    } catch (e) {
      console.error(e);
      alert("No se pudo abrir la plantilla por defecto.");
    }
  };

  // =========================
  // IMPORT JSON
  // =========================
  const onPickFile = () => fileRef.current?.click();

  const tryExtractName = (jsonText) => {
    try {
      const obj = JSON.parse(jsonText);
      return obj?.name || obj?.meta?.name || "";
    } catch {
      return "";
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      setImportForm((p) => ({
        ...p,
        templateJsonText: text,
        name: p.name || tryExtractName(text) || "",
      }));
      setOpenImportDlg(true);
    } catch (error) {
      console.error(error);
      alert("No se pudo leer el archivo JSON.");
    }
  };

  const handleCreate = async () => {
    // parse JSON
    let parsed = null;
    try {
      parsed =
        typeof importForm.templateJsonText === "string"
          ? JSON.parse(importForm.templateJsonText)
          : importForm.templateJsonText;
    } catch {
      alert("El JSON no es válido.");
      return;
    }

    try {
      setSaving(true);

      const extra = {
        name:
          importForm.name ||
          parsed?.name ||
          parsed?.meta?.name ||
          "Template importado",
        app: importForm.app || parsed?.app || defaultApp || null,
        format: importForm.format || parsed?.format || defaultFormat || null,
        isDefault: !!importForm.isDefault,
        isActive: importForm.isActive !== false,
      };

      const res = await importEditorTemplate(parsed, extra);

      const createdId =
        res?.data?.id ||
        res?.data?.templateId ||
        res?.data?.template?.id ||
        null;

      setOpenImportDlg(false);
      setImportForm((p) => ({ ...p, templateJsonText: "" }));

      await fetchList(q);

      if (createdId) openEditor(createdId);
      else alert("Importado, pero el backend no devolvió el ID.");
    } catch (e) {
      console.error(e);
      alert("No se pudo importar el template.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DEFAULT
  // =========================
  const handleSetDefault = async (tpl) => {
    try {
      await updateEditorTemplate(tpl.id, { isDefault: true });
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo marcar como default.");
    }
  };

  // =========================
  // EDIT
  // =========================
  const openEdit = (tpl) => {
    if (!tpl?.id) return;
    setEditForm({
      id: tpl.id,
      name: tpl?.name || "",
      app: tpl?.app || defaultApp || "",
      format: tpl?.format || defaultFormat || "",
      isDefault: !!tpl?.isDefault,
      isActive: tpl?.isActive !== false,
    });
    setOpenEditDlg(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.id) return;

    try {
      setSaving(true);

      // manda solo lo editable
      const payload = {
        name: editForm.name,
        app: editForm.app || null,
        format: editForm.format || null,
        isDefault: !!editForm.isDefault,
        isActive: editForm.isActive !== false,
      };

      await updateEditorTemplate(editForm.id, payload);

      setOpenEditDlg(false);
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar cambios.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DUPLICATE
  // =========================
  const handleDuplicate = async (tpl) => {
    if (!tpl?.id) return;

    try {
      setDuplicating(true);

      // 1. Obtener el template completo
      const res = await getEditorTemplateById(tpl.id);
      const templateData = res?.data?.templateJson || res?.data?.doc || res?.data;

      if (!templateData) {
        alert("No se pudo obtener el template para duplicar.");
        return;
      }

      // 2. Preparar datos para la copia
      const originalName = tpl?.name || tpl?.title || tpl?.meta?.name || `Template #${tpl.id}`;
      const newName = `${originalName} - Copia`;

      const extra = {
        name: newName,
        app: tpl?.app || defaultApp || null,
        format: tpl?.format || defaultFormat || null,
        isDefault: false, // Las copias no son default por defecto
        isActive: tpl?.isActive !== false,
      };

      // 3. Importar como nuevo template
      const importRes = await importEditorTemplate(templateData, extra);

      const createdId =
        importRes?.data?.id ||
        importRes?.data?.templateId ||
        importRes?.data?.template?.id ||
        null;

      // 4. Recargar lista
      await fetchList(q);

      if (createdId) {
        alert(`✅ Plantilla duplicada: "${newName}"`);
        // Opcional: abrir el editor con la copia
        // openEditor(createdId);
      } else {
        alert("⚠️ Duplicada, pero el backend no devolvió el ID.");
      }
    } catch (e) {
      console.error(e);
      alert(`❌ No se pudo duplicar la plantilla: ${e?.message || e}`);
    } finally {
      setDuplicating(false);
    }
  };

  // =========================
  // CREATE EMPTY TEMPLATE
  // =========================
  const getCanvasSizeByFormat = (format) => {
    switch (format) {
      case "16:9":
        return { width: 1920, height: 1080 };
      case "9:16":
        return { width: 1080, height: 1920 };
      case "1:1":
        return { width: 1080, height: 1080 };
      default:
        return { width: 1920, height: 1080 };
    }
  };

  const createEmptyTemplate = (format) => {
    const canvas = getCanvasSizeByFormat(format);
    return {
      canvas,
      groups: [{ id: "group_main", x: 0, y: 0, visible: true, locked: false }],
      layers: [],
      data: {},
      meta: { name: "Nueva plantilla" },
    };
  };

  const handleCreateNew = async () => {
    if (!createForm.name?.trim()) {
      alert("Por favor ingresa un nombre para la plantilla.");
      return;
    }

    try {
      setCreating(true);

      const emptyTemplate = createEmptyTemplate(createForm.format);
      const extra = {
        name: createForm.name.trim(),
        app: createForm.app || defaultApp || null,
        format: createForm.format || null,
        isDefault: !!createForm.isDefault,
        isActive: createForm.isActive !== false,
      };

      const res = await importEditorTemplate(emptyTemplate, extra);

      const createdId =
        res?.data?.id ||
        res?.data?.templateId ||
        res?.data?.template?.id ||
        null;

      setOpenCreateDlg(false);
      setCreateForm({
        name: "",
        app: defaultApp || "",
        format: defaultFormat || "16:9",
        isDefault: false,
        isActive: true,
      });

      await fetchList(q);

      if (createdId) {
        openEditor(createdId);
      } else {
        alert("⚠️ Creada, pero el backend no devolvió el ID.");
      }
    } catch (e) {
      console.error(e);
      alert(`❌ No se pudo crear la plantilla: ${e?.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const openDelete = (tpl) => {
    setDeleteTarget(tpl || null);
    setOpenDeleteDlg(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await deleteEditorTemplate(deleteTarget.id);
      setOpenDeleteDlg(false);
      setDeleteTarget(null);
      await fetchList(q);
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la plantilla.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        p: 2,
        background: "#0b0f14",
      }}
    >
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 900, color: "#fff" }}>
            Diseño Promocional — Plantillas
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
            Abrir, importar JSON, editar y marcar una plantilla como predeterminada.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
          <Button size="small" variant="outlined" onClick={() => fetchList(q)} disabled={loading}>
            Recargar
          </Button>

          <Button size="small" variant="contained" onClick={() => setOpenCreateDlg(true)} disabled={loading}>
            Crear plantilla
          </Button>

          <Button size="small" variant="outlined" onClick={onPickFile} disabled={loading}>
            Importar JSON
          </Button>

          <Button size="small" variant="contained" onClick={openDefault} disabled={loading}>
            Abrir default
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </Stack>
      </Stack>

      <Box sx={{ height: 12 }} />

      {/* filtros */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="Buscar (nombre, id, app, format)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          fullWidth
          InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
          sx={{
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />

        <TextField
          size="small"
          label="app (para abrir default)"
          value={importForm.app}
          onChange={(e) => setImportForm((p) => ({ ...p, app: e.target.value }))}
          sx={{
            minWidth: 180,
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />

        <TextField
          size="small"
          label="format (para abrir default)"
          value={importForm.format}
          onChange={(e) => setImportForm((p) => ({ ...p, format: e.target.value }))}
          sx={{
            minWidth: 180,
            "& .MuiInputBase-root": { color: "#fff" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
          }}
        />
      </Stack>

      <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

      {/* LISTA */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#fff" }}>
            <CircularProgress size={18} />
            <Typography sx={{ color: "#fff", opacity: 0.8 }}>Cargando...</Typography>
          </Stack>
        ) : err ? (
          <Typography sx={{ color: "#ffb4b4" }}>{err}</Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ color: "rgba(255,255,255,0.75)" }}>
            No hay plantillas.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {filtered.map((t) => {
              const name = t?.name || t?.title || t?.meta?.name || `Template #${t?.id}`;
              const isDefault = !!t?.isDefault;
              const isActive = t?.isActive !== false;
              const updated = t?.updatedAt || t?.updated_at || "";
              const app = t?.app || "";
              const format = t?.format || "";

              return (
                <Box
                  key={t.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                        <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>
                          {name}
                        </Typography>

                        {isDefault && <Chip size="small" label="DEFAULT" />}
                        {!isActive && <Chip size="small" label="INACTIVO" />}

                        <Chip size="small" label={`id: ${t.id}`} />
                        {!!app && <Chip size="small" label={`app: ${app}`} />}
                        {!!format && <Chip size="small" label={`format: ${format}`} />}
                      </Stack>

                      {!!updated && (
                        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                          updatedAt: {String(updated)}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                      {!isDefault && (
                        <Button size="small" variant="outlined" onClick={() => handleSetDefault(t)}>
                          Hacer default
                        </Button>
                      )}

                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => handleDuplicate(t)}
                        disabled={duplicating}
                        sx={{
                          borderColor: "rgba(0, 229, 255, 0.3)",
                          color: "#00E5FF",
                          "&:hover": {
                            borderColor: "rgba(0, 229, 255, 0.5)",
                            background: "rgba(0, 229, 255, 0.1)",
                          },
                        }}
                      >
                        {duplicating ? "Duplicando..." : "Duplicar"}
                      </Button>

                      <Button size="small" variant="outlined" onClick={() => openEdit(t)}>
                        Editar
                      </Button>

                      <Button size="small" color="error" variant="outlined" onClick={() => openDelete(t)}>
                        Eliminar
                      </Button>

                      <Button size="small" variant="contained" onClick={() => openEditor(t.id)}>
                        Usar
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* =========================
          DIALOG: IMPORT JSON
         ========================= */}
      <SimpleDialog
        open={openImportDlg}
        title="Importar plantilla (JSON)"
        handleClose={() => !saving && setOpenImportDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={importForm.name}
              onChange={(e) => setImportForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="App"
              value={importForm.app}
              onChange={(e) => setImportForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
              placeholder="EdDeli / SoftEd / ..."
            />

            <TextField
              label="Formato"
              value={importForm.format}
              onChange={(e) => setImportForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
              placeholder="16:9 / 1:1 / 9:16 / ..."
            />

            <TextField
              select
              label="¿Marcar como default?"
              value={importForm.isDefault ? "yes" : "no"}
              onChange={(e) => setImportForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={importForm.isActive ? "yes" : "no"}
              onChange={(e) => setImportForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <TextField
              label="JSON (solo lectura)"
              value={importForm.templateJsonText ? "✔ JSON cargado" : ""}
              fullWidth
              size="small"
              disabled
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenImportDlg(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleCreate} disabled={saving || !importForm.templateJsonText}>
                {saving ? "Importando..." : "Importar"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              Si marcas como <b>default</b>, el backend debe dejar solo una plantilla default por <b>app + format</b>.
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: CREATE NEW TEMPLATE
         ========================= */}
      <SimpleDialog
        open={openCreateDlg}
        title="Crear nueva plantilla"
        handleClose={() => !creating && setOpenCreateDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Ej: Banner Principal 16:9"
              required
            />

            <TextField
              label="App"
              value={createForm.app}
              onChange={(e) => setCreateForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
              placeholder="EdDeli / SoftEd / ..."
            />

            <TextField
              select
              label="Formato"
              value={createForm.format}
              onChange={(e) => setCreateForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
            >
              <MenuItem value="16:9">16:9 (1920×1080) - Horizontal</MenuItem>
              <MenuItem value="9:16">9:16 (1080×1920) - Vertical/Stories</MenuItem>
              <MenuItem value="1:1">1:1 (1080×1080) - Cuadrado</MenuItem>
            </TextField>

            <TextField
              select
              label="¿Marcar como default?"
              value={createForm.isDefault ? "yes" : "no"}
              onChange={(e) => setCreateForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={createForm.isActive ? "yes" : "no"}
              onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenCreateDlg(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleCreateNew} disabled={creating || !createForm.name?.trim()}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              Se creará una plantilla vacía con el formato seleccionado. Podrás añadir capas después en el editor.
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: EDIT
         ========================= */}
      <SimpleDialog
        open={openEditDlg}
        title={`Editar plantilla${editForm?.id ? ` #${editForm.id}` : ""}`}
        handleClose={() => !saving && setOpenEditDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Stack spacing={1.5}>
            <TextField
              label="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="App"
              value={editForm.app}
              onChange={(e) => setEditForm((p) => ({ ...p, app: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="Formato"
              value={editForm.format}
              onChange={(e) => setEditForm((p) => ({ ...p, format: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              select
              label="¿Default?"
              value={editForm.isDefault ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, isDefault: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
            </TextField>

            <TextField
              select
              label="Activo"
              value={editForm.isActive ? "yes" : "no"}
              onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === "yes" }))}
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => setOpenEditDlg(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleSaveEdit} disabled={saving || !editForm.id}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </Stack>

            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              Si marcas como <b>default</b>, el backend debería desmarcar los demás (por app+format).
            </Typography>
          </Stack>
        </Box>
      </SimpleDialog>

      {/* =========================
          DIALOG: DELETE CONFIRM
         ========================= */}
      <SimpleDialog
        open={openDeleteDlg}
        title="Eliminar plantilla"
        handleClose={() => !deleting && setOpenDeleteDlg(false)}
      >
        <Box sx={{ p: 1 }}>
          <Typography sx={{ color: "#fff", mb: 1 }}>
            ¿Seguro que deseas eliminar esta plantilla?
          </Typography>

          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              mb: 2,
            }}
          >
            <Typography sx={{ color: "#fff", fontWeight: 900 }}>
              {deleteTarget?.name || `Template #${deleteTarget?.id || ""}`}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              id: {deleteTarget?.id} {deleteTarget?.isDefault ? "— (DEFAULT)" : ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => setOpenDeleteDlg(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting || !deleteTarget?.id}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </Stack>

          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, mt: 1 }}>
            Esto eliminará la plantilla (y sus grupos/capas/props si tienes CASCADE).
          </Typography>
        </Box>
      </SimpleDialog>
    </Box>
  );
}
