/**
 * Panel embebible: datos fiscales SRI + firma .p12.
 * Siempre editable (no solo cuando falta configurar).
 */
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useAuth } from "../context/AuthContext.jsx";
import { PageSkeleton } from "./ContentSkeleton.jsx";
import {
  fetchSriBillingSettings,
  updateSriBillingSettings,
  uploadSriCertificate,
  deleteSriCertificate,
} from "../api/sriBillingRequest.js";

const EMPTY = {
  enabled: false,
  environment: "pruebas",
  ruc: "",
  legalName: "",
  tradeName: "",
  matrixAddress: "",
  establishmentAddress: "",
  establishmentCode: "001",
  emissionPointCode: "001",
  phone: "",
  email: "",
  accountingRequired: false,
  specialTaxpayerResolution: "",
  taxRegime: "",
  nextInvoiceSequential: 1,
  notes: "",
  hasCertificate: false,
  hasCertificatePassword: false,
  certificateFileName: null,
  certificateUploadedAt: null,
  readyForInvoicing: false,
};

function SectionTitle({ children, hint }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle1" fontWeight={800}>
        {children}
      </Typography>
      {hint ? (
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Verde OK · Rojo falta (obligatorio) · Amarillo opcional (vacío) / verde si ya tiene valor */
function fieldTone({ required, ok, filled }) {
  if (required) {
    return ok
      ? {
          color: "success",
          focused: true,
          helperPrefix: "✓ OK · ",
        }
      : {
          color: "error",
          error: true,
          focused: true,
          helperPrefix: "✗ Falta · ",
        };
  }
  if (filled) {
    return {
      color: "success",
      focused: true,
      helperPrefix: "✓ OK · ",
    };
  }
  return {
    color: "warning",
    focused: true,
    helperPrefix: "○ Opcional · ",
  };
}

function StatusTextField({
  required = false,
  ok,
  value,
  helperText = "",
  label,
  ...rest
}) {
  const filled = String(value ?? "").trim().length > 0;
  const isOk = ok != null ? Boolean(ok) : filled;
  const tone = fieldTone({ required, ok: isOk, filled });
  return (
    <TextField
      {...rest}
      required={required}
      value={value}
      label={label}
      color={tone.color}
      error={Boolean(tone.error)}
      focused={tone.focused}
      helperText={`${tone.helperPrefix}${helperText}`}
      FormHelperTextProps={{
        sx: {
          color:
            tone.color === "success"
              ? "success.main"
              : tone.color === "error"
                ? "error.main"
                : "warning.main",
          fontWeight: 600,
        },
      }}
    />
  );
}

const SriBillingSettingsPanel = forwardRef(function SriBillingSettingsPanel(_props, ref) {
  const { toast } = useAuth();
  const [form, setForm] = useState(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchSriBillingSettings()
      .then((data) => setForm({ ...EMPTY, ...data }))
      .catch((e) => {
        void toast?.({
          message: e?.response?.data?.message || "No se pudo cargar la config SRI",
          variant: "error",
        });
        setForm({ ...EMPTY });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (key) => (e) => {
    const val = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const onSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await toast({
        promise: (async () => {
          const payload = {
            enabled: form.enabled,
            environment: form.environment,
            ruc: form.ruc,
            legalName: form.legalName,
            tradeName: form.tradeName,
            matrixAddress: form.matrixAddress,
            establishmentAddress: form.establishmentAddress,
            establishmentCode: form.establishmentCode,
            emissionPointCode: form.emissionPointCode,
            phone: form.phone,
            email: form.email,
            accountingRequired: form.accountingRequired,
            specialTaxpayerResolution: form.specialTaxpayerResolution,
            taxRegime: form.taxRegime,
            nextInvoiceSequential: Number(form.nextInvoiceSequential) || 1,
            notes: form.notes,
          };
          if (password.trim()) payload.certificatePassword = password.trim();
          const res = await updateSriBillingSettings(payload);
          setForm({ ...EMPTY, ...res.settings });
          setPassword("");
        })(),
        successMessage: "Configuración SRI guardada",
        errorMessage: "No se pudo guardar",
      });
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      save: onSave,
      get saving() {
        return saving;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, password, saving],
  );

  if (!form) return <PageSkeleton />;

  const onCertSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCertBusy(true);
    try {
      await toast({
        promise: (async () => {
          const res = await uploadSriCertificate({
            file,
            certificatePassword: password.trim() || undefined,
          });
          setForm({ ...EMPTY, ...res.settings });
          if (password.trim()) setPassword("");
        })(),
        successMessage: "Certificado subido",
        errorMessage: "No se pudo subir el certificado",
      });
    } finally {
      setCertBusy(false);
    }
  };

  const onDeleteCert = async () => {
    if (!window.confirm("¿Eliminar el certificado y su contraseña guardada?")) return;
    setCertBusy(true);
    try {
      await toast({
        promise: (async () => {
          const res = await deleteSriCertificate();
          setForm({ ...EMPTY, ...res.settings });
          setPassword("");
        })(),
        successMessage: "Certificado eliminado",
        errorMessage: "No se pudo eliminar",
      });
    } finally {
      setCertBusy(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        {form.readyForInvoicing ? (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleOutlineIcon />}
            label="Datos listos para emitir"
          />
        ) : (
          <Chip
            size="small"
            color="warning"
            icon={<WarningAmberIcon />}
            label="Faltan datos o firma"
          />
        )}
        <Chip
          size="small"
          variant="outlined"
          label={form.environment === "produccion" ? "Producción" : "Pruebas"}
        />
        {form.enabled ? (
          <Chip size="small" color="primary" variant="outlined" label="Módulo activado" />
        ) : (
          <Chip size="small" variant="outlined" label="Módulo en espera" />
        )}
      </Stack>

      <Alert severity="info" sx={{ py: 1 }}>
        El POS sigue con consumidor final y comprobantes. Aquí solo se preparan RUC, datos del
        emisor y la firma <strong>.p12</strong>. Colores:{" "}
        <strong style={{ color: "#2e7d32" }}>verde</strong> = bien,{" "}
        <strong style={{ color: "#d32f2f" }}>rojo</strong> = falta obligatorio,{" "}
        <strong style={{ color: "#ed6c02" }}>amarillo</strong> = opcional. El texto gris del
        campo es un <strong>placeholder</strong> (ejemplo).
      </Alert>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <FormControlLabel
          sx={{ m: 0, width: "100%", justifyContent: "space-between" }}
          labelPlacement="start"
          control={<Switch checked={Boolean(form.enabled)} onChange={onChange("enabled")} />}
          label={
            <Box>
              <Typography fontWeight={700}>Activar facturación electrónica</Typography>
              <Typography variant="caption" color="text.secondary">
                Flag para cuando exista emisión al SRI. No cambia el cobro actual de caja.
              </Typography>
            </Box>
          }
        />
      </Box>

      <Box>
        <SectionTitle hint="Identificación del negocio ante el SRI. * = obligatorio para quedar listo.">
          Datos del emisor
        </SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <StatusTextField
              select
              required
              fullWidth
              label="Ambiente SRI *"
              value={form.environment}
              onChange={onChange("environment")}
              ok={form.environment === "pruebas" || form.environment === "produccion"}
              helperText="Pruebas = certificado/ambiente de prueba"
            >
              <MenuItem value="pruebas">Pruebas</MenuItem>
              <MenuItem value="produccion">Producción</MenuItem>
            </StatusTextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatusTextField
              required
              fullWidth
              label="RUC *"
              value={form.ruc}
              onChange={onChange("ruc")}
              placeholder="1790012345001"
              inputProps={{ maxLength: 13, inputMode: "numeric" }}
              ok={String(form.ruc || "").trim().length === 13}
              helperText="13 dígitos, ej. 1790012345001"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatusTextField
              fullWidth
              label="Régimen"
              value={form.taxRegime}
              onChange={onChange("taxRegime")}
              placeholder="RIMPE / Régimen general"
              helperText="ej. RIMPE, General"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatusTextField
              required
              fullWidth
              label="Razón social *"
              value={form.legalName}
              onChange={onChange("legalName")}
              placeholder="PANADERIA EJEMPLO S.A."
              ok={String(form.legalName || "").trim().length > 0}
              helperText="como aparece en el RUC"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatusTextField
              fullWidth
              label="Nombre comercial"
              value={form.tradeName}
              onChange={onChange("tradeName")}
              placeholder="EdDeli Panadería"
              helperText="nombre de fantasía del negocio"
            />
          </Grid>
          <Grid item xs={12}>
            <StatusTextField
              fullWidth
              label="Dirección matriz"
              value={form.matrixAddress}
              onChange={onChange("matrixAddress")}
              placeholder="Av. Principal 123 y Calle Secundaria, Loja"
              helperText="dirección del RUC / matriz"
            />
          </Grid>
          <Grid item xs={12}>
            <StatusTextField
              fullWidth
              label="Dirección establecimiento"
              value={form.establishmentAddress}
              onChange={onChange("establishmentAddress")}
              placeholder="Calle del local 45, Barrio Centro"
              helperText="dirección del punto de venta"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatusTextField
              required
              fullWidth
              label="Establecimiento *"
              value={form.establishmentCode}
              onChange={onChange("establishmentCode")}
              placeholder="001"
              inputProps={{ maxLength: 3 }}
              ok={String(form.establishmentCode || "").trim().length === 3}
              helperText="3 dígitos, ej. 001"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatusTextField
              required
              fullWidth
              label="Punto de emisión *"
              value={form.emissionPointCode}
              onChange={onChange("emissionPointCode")}
              placeholder="001"
              inputProps={{ maxLength: 3 }}
              ok={String(form.emissionPointCode || "").trim().length === 3}
              helperText="3 dígitos, ej. 001"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <StatusTextField
              fullWidth
              type="number"
              label="Próximo secuencial"
              value={form.nextInvoiceSequential}
              onChange={onChange("nextInvoiceSequential")}
              placeholder="1"
              inputProps={{ min: 1 }}
              ok={Number(form.nextInvoiceSequential) >= 1}
              helperText="normalmente empieza en 1"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <StatusTextField
              fullWidth
              label="Resolución contrib. especial"
              value={form.specialTaxpayerResolution}
              onChange={onChange("specialTaxpayerResolution")}
              placeholder="N/A o número de resolución"
              helperText="solo si aplica"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatusTextField
              fullWidth
              label="Teléfono fiscal"
              value={form.phone}
              onChange={onChange("phone")}
              placeholder="0987654321"
              helperText="contacto fiscal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatusTextField
              fullWidth
              type="email"
              label="Email fiscal"
              value={form.email}
              onChange={onChange("email")}
              placeholder="facturacion@tunegocio.com"
              helperText="correo fiscal"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.accountingRequired)}
                  onChange={onChange("accountingRequired")}
                />
              }
              label="Obligado a llevar contabilidad"
            />
          </Grid>
        </Grid>
      </Box>

      <Divider />

      <Box>
        <SectionTitle hint="Obligatorios para quedar listo: archivo .p12/.pfx + contraseña. La clave se cifra y no se vuelve a mostrar.">
          Firma electrónica *
        </SectionTitle>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ sm: "center" }}
          sx={{ mb: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {form.hasCertificate ? (
              <Alert severity="success" sx={{ py: 0.75 }}>
                ✓ OK · <strong>{form.certificateFileName}</strong>
                {form.certificateUploadedAt
                  ? ` · ${new Date(form.certificateUploadedAt).toLocaleString("es-EC")}`
                  : ""}
                {form.hasCertificatePassword ? " · contraseña OK" : " · falta contraseña"}
              </Alert>
            ) : (
              <Alert severity="error" sx={{ py: 0.75 }}>
                ✗ Falta · Sin certificado subido (ej. firma_sri_pruebas.p12)
              </Alert>
            )}
          </Box>
          <input
            ref={fileRef}
            type="file"
            accept=".p12,.pfx,application/x-pkcs12"
            hidden
            onChange={onCertSelected}
          />
          <Button
            variant="outlined"
            color={form.hasCertificate ? "success" : "error"}
            startIcon={<UploadFileIcon />}
            onClick={() => fileRef.current?.click()}
            disabled={certBusy}
          >
            Subir .p12 / .pfx *
          </Button>
          {form.hasCertificate ? (
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={onDeleteCert}
              disabled={certBusy}
            >
              Quitar
            </Button>
          ) : null}
        </Stack>

        <StatusTextField
          required={!form.hasCertificatePassword}
          fullWidth
          type="password"
          label={
            form.hasCertificatePassword
              ? "Nueva contraseña del certificado"
              : "Contraseña del certificado *"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          ok={form.hasCertificatePassword || Boolean(password.trim())}
          helperText={
            form.hasCertificatePassword
              ? "solo si quieres cambiar la contraseña guardada"
              : "la del .p12; guárdala o súbela junto con el archivo"
          }
          sx={{ mb: 2 }}
          autoComplete="new-password"
        />

        <StatusTextField
          fullWidth
          multiline
          minRows={2}
          label="Notas internas"
          value={form.notes}
          onChange={onChange("notes")}
          placeholder="Ej. Certificado de pruebas vigente hasta dic 2026"
          helperText="solo para ti / el equipo"
        />
      </Box>
    </Stack>
  );
});

export default SriBillingSettingsPanel;
