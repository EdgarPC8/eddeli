/**
 * Panel embebible: datos fiscales SRI + firma .p12.
 * Siempre editable (no solo cuando falta configurar).
 */
import { useEffect, useRef, useState } from "react";
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
import SaveIcon from "@mui/icons-material/Save";
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

export default function SriBillingSettingsPanel() {
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

  if (!form) return <PageSkeleton />;

  const onChange = (key) => (e) => {
    const val = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const onSave = async () => {
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
        emisor y la firma <strong>.p12</strong> para cuando se emitan facturas al SRI. Esta
        sección siempre se puede editar (no desaparece al completar).
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
        <SectionTitle hint="Identificación del negocio ante el SRI">Datos del emisor</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Ambiente SRI"
              value={form.environment}
              onChange={onChange("environment")}
            >
              <MenuItem value="pruebas">Pruebas</MenuItem>
              <MenuItem value="produccion">Producción</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="RUC"
              value={form.ruc}
              onChange={onChange("ruc")}
              inputProps={{ maxLength: 13, inputMode: "numeric" }}
              helperText="13 dígitos"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Régimen"
              value={form.taxRegime}
              onChange={onChange("taxRegime")}
              placeholder="Ej. RIMPE, General"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Razón social"
              value={form.legalName}
              onChange={onChange("legalName")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nombre comercial"
              value={form.tradeName}
              onChange={onChange("tradeName")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección matriz"
              value={form.matrixAddress}
              onChange={onChange("matrixAddress")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección establecimiento"
              value={form.establishmentAddress}
              onChange={onChange("establishmentAddress")}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              fullWidth
              label="Establecimiento"
              value={form.establishmentCode}
              onChange={onChange("establishmentCode")}
              inputProps={{ maxLength: 3 }}
              helperText="Ej. 001"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              fullWidth
              label="Punto de emisión"
              value={form.emissionPointCode}
              onChange={onChange("emissionPointCode")}
              inputProps={{ maxLength: 3 }}
              helperText="Ej. 001"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              label="Próximo secuencial"
              value={form.nextInvoiceSequential}
              onChange={onChange("nextInvoiceSequential")}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Resolución contrib. especial"
              value={form.specialTaxpayerResolution}
              onChange={onChange("specialTaxpayerResolution")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Teléfono fiscal" value={form.phone} onChange={onChange("phone")} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="email"
              label="Email fiscal"
              value={form.email}
              onChange={onChange("email")}
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
        <SectionTitle hint="Archivo privado en el servidor; la contraseña se cifra y no se vuelve a mostrar">
          Firma electrónica
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
                <strong>{form.certificateFileName}</strong>
                {form.certificateUploadedAt
                  ? ` · ${new Date(form.certificateUploadedAt).toLocaleString("es-EC")}`
                  : ""}
                {form.hasCertificatePassword ? " · contraseña OK" : " · falta contraseña"}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ py: 0.75 }}>
                Sin certificado subido
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
            startIcon={<UploadFileIcon />}
            onClick={() => fileRef.current?.click()}
            disabled={certBusy}
          >
            Subir .p12 / .pfx
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

        <TextField
          fullWidth
          type="password"
          label={
            form.hasCertificatePassword
              ? "Nueva contraseña del certificado (opcional)"
              : "Contraseña del certificado"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="Escríbela y guarda, o súbela junto con el archivo."
          sx={{ mb: 2 }}
          autoComplete="new-password"
        />

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Notas internas"
          value={form.notes}
          onChange={onChange("notes")}
        />
      </Box>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar facturación SRI"}
        </Button>
      </Stack>
    </Stack>
  );
}
