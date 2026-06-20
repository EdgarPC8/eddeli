/** Gestión de backups JSON — solo Programador. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import StarIcon from "@mui/icons-material/Star";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Navigate, Link as RouterLink } from "react-router-dom";
import { formatDateTime } from "../helpers/functions.js";
import TablePro from "../components/Tables/TablePro";
import SimpleDialog from "../components/Dialogs/SimpleDialog";
import { useAuth } from "../context/AuthContext.jsx";
import { runMutationReload } from "../utils/mutationToast.js";
import { getApiErrorMessage } from "../utils/apiMessages.js";
import {
  getBackupsWorkbenchRequest,
  uploadBackup,
  saveBackup,
  downloadMainBackupFile,
  downloadStoredBackupFile,
  setMainBackupFromStoredRequest,
  deleteStoredBackupRequest,
  pruneStoredBackupsRequest,
} from "../api/comandsRequest.js";

function formatSize(mb, bytes) {
  if (mb > 0) return `${mb} MB`;
  if (bytes > 0) return `${(bytes / 1024).toFixed(1)} KB`;
  return "—";
}

function summaryLine(counts) {
  if (!counts || typeof counts !== "object") return "";
  const users = counts.Users ?? 0;
  const products = counts.InventoryProduct ?? 0;
  const orders = counts.Order ?? 0;
  return `${users} usuarios · ${products} productos · ${orders} pedidos`;
}

function MainBackupCard({ main, onUpload, onDownload, uploading }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <StarIcon color="warning" fontSize="small" />
            <Typography variant="h6" fontWeight={800}>
              backup.json (fijo)
            </Typography>
            <Chip size="small" color="warning" label="Activo para recargar BD" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Este archivo es el que usa <strong>Comandos → Recargar BD</strong>. Súbelo o elige una copia guardada como fija.
          </Typography>
          {main?.exists ? (
            <Stack spacing={0.5}>
              <Typography variant="body2">
                <strong>Tamaño:</strong> {formatSize(main.sizeMB, main.sizeBytes)}
              </Typography>
              <Typography variant="body2">
                <strong>Actualizado:</strong> {formatDateTime(main.modifiedAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summaryLine(main.counts)} · {main.totalRows ?? 0} filas totales
              </Typography>
            </Stack>
          ) : (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              No hay backup.json en el servidor. Sube uno para poder recargar la base de datos.
            </Alert>
          )}
        </Box>
        <BackupIcon sx={{ fontSize: 48, color: "warning.main", opacity: 0.35 }} />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={onUpload}
          disabled={uploading}
        >
          Subir / reemplazar
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
          disabled={!main?.exists}
        >
          Descargar
        </Button>
      </Stack>
    </Paper>
  );
}

export default function BackupsPage() {
  const { user, toast } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [main, setMain] = useState(null);
  const [stored, setStored] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [setMainTarget, setSetMainTarget] = useState(null);
  const [pruneOpen, setPruneOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBackupsWorkbenchRequest();
      setMain(data?.main ?? null);
      setStored(Array.isArray(data?.stored) ? data.stored : []);
    } catch (e) {
      console.error(e);
      toast({ message: "Error al cargar backups", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("backup", file);
      await runMutationReload(toast, {
        promise: uploadBackup(fd),
        reload: load,
        successMessage: "backup.json actualizado. Ve a Comandos para recargar la BD si lo necesitas.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveFromDb = async () => {
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: saveBackup(),
        reload: load,
        successMessage: "Nueva copia guardada y backup.json actualizado",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadMain = async () => {
    try {
      await downloadMainBackupFile();
      toast({ message: "Descarga de backup.json iniciada", variant: "success" });
    } catch (e) {
      toast({ message: getApiErrorMessage(e, "No se pudo descargar"), variant: "error" });
    }
  };

  const handleDownloadStored = async (filename) => {
    try {
      await downloadStoredBackupFile(filename);
      toast({ message: `Descarga de ${filename}`, variant: "success" });
    } catch (e) {
      toast({ message: getApiErrorMessage(e, "No se pudo descargar"), variant: "error" });
    }
  };

  const confirmSetMain = async () => {
    if (!setMainTarget) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: setMainBackupFromStoredRequest(setMainTarget),
        reload: load,
        onClose: () => setSetMainTarget(null),
        successMessage: "backup.json reemplazado desde la copia seleccionada",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: deleteStoredBackupRequest(deleteTarget),
        reload: load,
        onClose: () => setDeleteTarget(null),
        successMessage: "Copia eliminada",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmPruneStored = async () => {
    setSaving(true);
    try {
      await runMutationReload(toast, {
        promise: pruneStoredBackupsRequest(),
        reload: load,
        onClose: () => setPruneOpen(false),
        successMessage: "Copias limpiadas y nueva copia guardada desde la BD",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { id: "filename", label: "Archivo" },
      {
        id: "modifiedAt",
        label: "Fecha",
        render: (row) => formatDateTime(row.modifiedAt),
      },
      {
        id: "sizeMB",
        label: "Tamaño",
        render: (row) => formatSize(row.sizeMB, row.sizeBytes),
      },
      {
        id: "summary",
        label: "Contenido",
        render: (row) => (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
            {row.valid ? summaryLine(row.counts) : "JSON no válido"}
          </Typography>
        ),
      },
      {
        id: "valid",
        label: "Estado",
        render: (row) => (
          <Chip
            size="small"
            color={row.valid ? "success" : "error"}
            label={row.valid ? "Válido" : "Inválido"}
            variant="outlined"
          />
        ),
      },
      {
        id: "actions",
        label: "",
        render: (row) => (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Descargar">
              <IconButton size="small" onClick={() => handleDownloadStored(row.filename)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Usar como backup.json fijo">
              <IconButton
                size="small"
                color="warning"
                onClick={() => setSetMainTarget(row.filename)}
                disabled={!row.valid}
              >
                <StarIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar copia">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row.filename)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    []
  );

  if (user?.loginRol !== "Programador") {
    return <Navigate to="/" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleFileChange}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BackupIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Backups JSON
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Gestiona el backup fijo y las copias con fecha en el servidor.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            Actualizar lista
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveFromDb}
            disabled={saving || loading}
          >
            Guardar desde BD
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Subir o cambiar <strong>backup.json</strong> no modifica la base de datos hasta que uses{" "}
        <Button component={RouterLink} to="/comandos" size="small" sx={{ verticalAlign: "baseline" }}>
          Comandos → Recargar BD
        </Button>
        .
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <MainBackupCard
            main={main}
            onUpload={handleUploadClick}
            onDownload={handleDownloadMain}
            uploading={uploading}
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Copias guardadas ({stored.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Archivos en <code>backend/src/backups/</code> — puedes descargar, fijar como backup.json o borrar.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setPruneOpen(true)}
              disabled={saving || loading}
            >
              Limpiar copias y guardar una
            </Button>
          </Stack>
        </Box>
        <Box sx={{ px: 1, pb: 1 }}>
          <TablePro
            columns={columns}
            rows={stored}
            loading={loading}
            emptyMessage="No hay copias guardadas. Usa «Guardar desde BD» o Comandos."
            defaultRowsPerPage={10}
          />
        </Box>
      </Paper>

      <SimpleDialog
        open={Boolean(deleteTarget)}
        onClose={() => !saving && setDeleteTarget(null)}
        title="¿Eliminar esta copia?"
        message={`Se borrará permanentemente «${deleteTarget}». El backup.json fijo no se modifica.`}
        onClickAccept={confirmDelete}
      />

      <SimpleDialog
        open={Boolean(setMainTarget)}
        onClose={() => !saving && setSetMainTarget(null)}
        title="¿Usar como backup fijo?"
        message={`«${setMainTarget}» reemplazará backup.json. Luego puedes recargar la BD desde Comandos.`}
        onClickAccept={confirmSetMain}
      />

      <SimpleDialog
        open={pruneOpen}
        onClose={() => !saving && setPruneOpen(false)}
        title="¿Limpiar todas las copias guardadas?"
        message={
          stored.length > 0
            ? `Se borrarán permanentemente ${stored.length} archivo(s) en src/backups/ y se creará una sola copia nueva con fecha desde la base de datos actual (como «Guardar desde BD»). El backup.json fijo no se modifica.`
            : "No hay copias antiguas. Se creará una copia nueva con fecha desde la base de datos actual. El backup.json fijo no se modifica."
        }
        onClickAccept={confirmPruneStored}
      />
    </Container>
  );
}
