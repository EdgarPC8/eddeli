/** Configuración de la app — módulo Sistema. */
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  CircularProgress,
  Divider,
  Avatar,
  MenuItem,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppSettings } from "../context/AppSettingsContext.jsx";
import { updateAppSettings } from "../api/appSettingsRequest.js";
import { uploadImageRequest, deleteImageRequest } from "../api/imgRequest.js";
import { buildImageUrl } from "../api/axios.js";
import AppTimeClockPanel from "../components/AppTimeClockPanel.jsx";
import { APP_TIMEZONE_OPTIONS } from "../utils/appDateTime.js";

const ALLOWED = new Set(["Administrador", "Programador"]);

export default function AppSettingsPage() {
  const { user, toast } = useAuth();
  const { settings, activeApp, loading, reload, setSettings } = useAppSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        alias: settings.alias || "",
        version: settings.version || "",
        description: settings.description || "",
        author: settings.author || "",
        logoPath: settings.logoPath || "",
        phone: settings.phone || "",
        socialWhatsapp: settings.socials?.whatsapp || "",
        socialFacebook: settings.socials?.facebook || "",
        socialInstagram: settings.socials?.instagram || "",
        socialTiktok: settings.socials?.tiktok || "",
        socialEmail: settings.socials?.email || "",
        mediaFolderPrefix: settings.mediaFolderPrefix || "sistema",
        cajaQuickCategoryMatch: settings.cajaQuickCategoryMatch || "",
        walkInCustomerLabel: settings.walkInCustomerLabel || "Consumidor Final",
        timezone: settings.timezone || "America/Guayaquil",
      });
    }
  }, [settings]);

  if (!ALLOWED.has(user?.loginRol)) return <Navigate to="/" replace />;

  const onChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const persistSettings = async (patch, successMsg = "Configuración guardada") => {
    const payload = { ...form, ...patch };
    await toast({
      promise: (async () => {
        const { settings: next } = await updateAppSettings(payload);
        setForm((f) => ({
          ...f,
          ...patch,
          logoPath: next.logoPath ?? patch.logoPath ?? f.logoPath,
        }));
        setSettings(next);
        await reload();
      })(),
      successMessage: successMsg,
      errorMessage: "No se pudo guardar la configuración",
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await persistSettings({});
    } finally {
      setSaving(false);
    }
  };

  const onPickLogo = () => fileRef.current?.click();

  const onLogoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;

    setLogoBusy(true);
    try {
      const prefix = String(form.mediaFolderPrefix || "sistema").trim() || "sistema";
      const res = await toast({
        promise: uploadImageRequest({
          file,
          folder: `${prefix}/logos`,
          name: "logo",
          replace: true,
        }),
        successMessage: "Imagen subida",
        errorMessage: "No se pudo subir el logo",
      });
      const relPath = res?.data?.data?.relativePath;
      if (!relPath) throw new Error("Ruta de logo inválida");

      const oldPath = form.logoPath?.trim();
      if (oldPath && oldPath !== relPath) {
        try {
          await deleteImageRequest(oldPath);
        } catch {
          /* opcional */
        }
      }

      await persistSettings({ logoPath: relPath }, "Logo actualizado");
    } catch {
      /* toast ya mostrado */
    } finally {
      setLogoBusy(false);
    }
  };

  const onDeleteLogo = async () => {
    if (!form?.logoPath) return;
    if (!window.confirm("¿Eliminar el logo actual?")) return;

    setLogoBusy(true);
    try {
      try {
        await deleteImageRequest(form.logoPath);
      } catch {
        /* puede no existir */
      }
      await persistSettings({ logoPath: "" }, "Logo eliminado");
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading || !form) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  const logoPreview = form.logoPath ? buildImageUrl(form.logoPath) : activeApp.logoUrl;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 3, px: 2 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Configuración
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Nombre, versión, logo y reglas del negocio. Los cambios aplican en login, menú y comprobantes.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={700}>
            Logo de la app
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Avatar
              src={logoPreview}
              alt={form.alias || "Logo"}
              variant="rounded"
              sx={{ width: 88, height: 88, border: 1, borderColor: "divider" }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={onPickLogo}
                disabled={logoBusy}
              >
                {logoBusy ? "Procesando…" : form.logoPath ? "Cambiar logo" : "Subir logo"}
              </Button>
              {form.logoPath ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={onDeleteLogo}
                  disabled={logoBusy}
                >
                  Eliminar
                </Button>
              ) : null}
            </Stack>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={onLogoSelected}
            />
          </Stack>
          {form.logoPath ? (
            <Typography variant="caption" color="text.secondary">
              Ruta en servidor: {form.logoPath} · Carpeta QR: {settings?.qrFolder || `${form.mediaFolderPrefix}/qr`}
            </Typography>
          ) : null}

          <Divider />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField label="Nombre completo" fullWidth value={form.name} onChange={onChange("name")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Alias corto" fullWidth value={form.alias} onChange={onChange("alias")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Versión" fullWidth value={form.version} onChange={onChange("version")} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField label="Autor / desarrollador" fullWidth value={form.author} onChange={onChange("author")} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descripción"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={onChange("description")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Teléfono" fullWidth value={form.phone} onChange={onChange("phone")} />
            </Grid>
          </Grid>

          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>
            Hora y zona horaria
          </Typography>
          <Alert severity="info" sx={{ py: 0.75 }}>
            Todas las fechas del sistema (ingresos, gastos, pedidos pagados, etc.) se guardan con
            fecha y hora usando esta zona. Si solo eliges un día, se completa con la hora actual.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Zona horaria (IANA)"
                fullWidth
                value={form.timezone}
                onChange={onChange("timezone")}
                helperText="Ej. America/Guayaquil para Ecuador"
              >
                {APP_TIMEZONE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <AppTimeClockPanel timezone={form.timezone} />
          </Paper>

          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>
            Operación
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carpeta de medios"
                fullWidth
                value={form.mediaFolderPrefix}
                onChange={onChange("mediaFolderPrefix")}
                helperText="Prefijo en src/img. Crea {prefijo}/logos y {prefijo}/qr"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Filtro accesos rápidos caja"
                fullWidth
                value={form.cajaQuickCategoryMatch}
                onChange={onChange("cajaQuickCategoryMatch")}
                helperText="Subcadena de categoría. Vacío = todos"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cliente mostrador"
                fullWidth
                value={form.walkInCustomerLabel}
                onChange={onChange("walkInCustomerLabel")}
              />
            </Grid>
          </Grid>

          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>
            Redes
          </Typography>
          <Grid container spacing={2}>
            {[
              ["socialWhatsapp", "WhatsApp URL"],
              ["socialFacebook", "Facebook URL"],
              ["socialInstagram", "Instagram URL"],
              ["socialTiktok", "TikTok URL"],
              ["socialEmail", "Email"],
            ].map(([key, label]) => (
              <Grid item xs={12} key={key}>
                <TextField label={label} fullWidth value={form[key]} onChange={onChange(key)} />
              </Grid>
            ))}
          </Grid>

          <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
