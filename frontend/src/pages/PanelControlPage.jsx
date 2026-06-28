/** Panel admin: estadísticas del sistema y copia de seguridad. */
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonIcon from "@mui/icons-material/Person";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import DnsIcon from "@mui/icons-material/Dns";
import BackupIcon from "@mui/icons-material/Backup";
import { saveBackup, downloadBackup, getPanelStats } from "../api/comandsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";

const ALLOWED = new Set(["Administrador", "Programador"]);
const BANNER_MS = 10000;

const STAT_CARDS = [
  { key: "customers", label: "Clientes", icon: PeopleIcon, color: "primary" },
  { key: "suppliers", label: "Proveedores", icon: LocalShippingIcon, color: "secondary" },
  { key: "products", label: "Productos", icon: Inventory2Icon, color: "success" },
  { key: "categories", label: "Categorías", icon: CategoryIcon, color: "info" },
  { key: "subcategories", label: "Subcategorías", icon: AccountTreeIcon, color: "warning" },
  { key: "users", label: "Usuarios", icon: PersonIcon, color: "primary" },
  { key: "accounts", label: "Cuentas", icon: ManageAccountsIcon, color: "secondary" },
];

function formatFileSize(bytes) {
  const n = Number(bytes || 0);
  if (n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatBackupDate(iso) {
  if (!iso) return "Sin copias guardadas";
  try {
    return new Date(iso).toLocaleString("es-EC", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function StatCard({ label, value, icon: Icon, color, loading }) {
  const theme = useTheme();
  const paletteColor = theme.palette[color]?.main ?? theme.palette.primary.main;

  return (
    <Card
      variant="panel"
      sx={{
        height: "100%",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${paletteColor}18`,
              color: paletteColor,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            {loading ? (
              <CircularProgress size={22} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
                {Number(value ?? 0).toLocaleString("es-EC")}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PanelControlPage() {
  const { user, toast } = useAuth();
  const [stats, setStats] = useState(null);
  const [backupInfo, setBackupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRoleBanner, setShowRoleBanner] = useState(true);
  const [saving, setSaving] = useState(false);

  const isProgrammer = user?.loginRol === "Programador";
  const isAdmin = user?.loginRol === "Administrador";

  const loadPanelData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPanelStats();
      setStats(data?.stats ?? null);
      setBackupInfo(data?.backup ?? null);
    } catch {
      void toast?.({ message: "No se pudo cargar la información del panel.", variant: "error" });
      setStats(null);
      setBackupInfo(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (ALLOWED.has(user?.loginRol)) {
      void loadPanelData();
    }
  }, [user?.loginRol, loadPanelData]);

  useEffect(() => {
    if (!showRoleBanner) return undefined;
    const timer = window.setTimeout(() => setShowRoleBanner(false), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [showRoleBanner]);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const lastBackup = backupInfo?.lastBackup;
  const roleBannerText = isAdmin
    ? "Como administrador puedes hacer una copia de seguridad de la base de datos en el servidor. Solo el programador puede descargar el archivo a su equipo."
    : isProgrammer
      ? "Como programador puedes guardar una copia de seguridad de la base de datos y descargarla a tu equipo cuando lo necesites."
      : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await toast?.({
        promise: saveBackup(),
        loadingMessage: "Guardando copia de seguridad…",
        successMessage: "Copia de seguridad guardada correctamente.",
        errorMessage: "No se pudo guardar la copia de seguridad.",
      });
      await loadPanelData();
    } catch {
      /* toast maneja el error */
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      await toast?.({
        promise: downloadBackup(),
        loadingMessage: "Preparando descarga…",
        successMessage: "Descarga iniciada.",
        errorMessage: "No se pudo descargar la copia de seguridad.",
      });
      await loadPanelData();
    } catch {
      /* toast maneja el error */
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <DnsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Panel de control
        </Typography>
      </Stack>

      {showRoleBanner && roleBannerText ? (
        <Alert
          severity={isProgrammer ? "success" : "info"}
          sx={{ mb: 2 }}
          onClose={() => setShowRoleBanner(false)}
        >
          {roleBannerText}
        </Alert>
      ) : null}

      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Resumen del sistema
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <Grid item xs={6} sm={4} md={3} key={key}>
            <StatCard
              label={label}
              value={stats?.[key]}
              icon={icon}
              color={color}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      <Paper variant="panel" sx={{ p: 3, maxWidth: 720 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <BackupIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Copia de seguridad
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" paragraph>
          Guarda un respaldo de clientes, productos, pedidos, finanzas y demás datos del negocio
          en el servidor.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            bgcolor: "action.hover",
            borderStyle: "dashed",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Última copia en el servidor
          </Typography>
          {loading ? (
            <CircularProgress size={22} />
          ) : lastBackup ? (
            <Stack spacing={0.75}>
              <Typography variant="body2">
                <strong>Fecha:</strong> {formatBackupDate(lastBackup.modifiedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Tamaño:</strong> {formatFileSize(lastBackup.sizeBytes)}
              </Typography>
              {lastBackup.totalRows != null ? (
                <Typography variant="body2" color="text.secondary">
                  {Number(lastBackup.totalRows).toLocaleString("es-EC")} registros respaldados
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aún no hay ninguna copia guardada. Usa el botón de abajo para crear la primera.
            </Typography>
          )}
        </Paper>

        <Divider sx={{ mb: 2 }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Guardando…" : "Hacer copia de seguridad"}
          </Button>
          {isProgrammer && (
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={() => void handleDownload()}
            >
              Descargar copia
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
