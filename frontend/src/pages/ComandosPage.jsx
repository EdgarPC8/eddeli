/** Comandos admin: backup y recarga BD. Solo Programador. */
import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  CardActions,
  useTheme,
  Tooltip,
  Alert,
  LinearProgress,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { reloadBD, saveBackup, downloadBackup, uploadBackup } from "../api/comandsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import { getApiErrorMessage, getApiSuccessMessage } from "../utils/apiMessages.js";

const OPERATION_CONFIG = {
  upload: {
    title: "Subiendo backup.json",
    steps: [
      { until: 30, label: "Leyendo archivo seleccionado…" },
      { until: 65, label: "Enviando al servidor…" },
      { until: 90, label: "Validando JSON en el servidor…" },
    ],
    successMessage: "Backup validado y guardado en el servidor. Ejecuta «Recargar BD» para aplicarlo.",
    errorMessage:
      "No se pudo subir el archivo. Debe ser un backup EdDeli válido (objeto con Roles, Users, Account, etc.).",
  },
  download: {
    title: "Descargando backup EdDeli",
    steps: [
      { until: 35, label: "Generando respaldo desde la base de datos…" },
      { until: 70, label: "Preparando archivo para descarga…" },
      { until: 92, label: "Finalizando descarga…" },
    ],
    successMessage: "Descarga de backup-eddeli.json completada correctamente.",
    errorMessage: "No se pudo descargar el backup. Intente de nuevo.",
  },
  save: {
    title: "Guardando copia en servidor",
    steps: [
      { until: 40, label: "Leyendo datos de la base de datos…" },
      { until: 75, label: "Escribiendo backup.json…" },
      { until: 92, label: "Guardando backup.json…" },
    ],
    successMessage: "Copia de seguridad guardada en el servidor.",
    errorMessage: "No se pudo guardar la copia en el servidor.",
  },
  reload: {
    title: "Recargando base de datos",
    steps: [
      { until: 25, label: "Preparando recarga de la base de datos…" },
      { until: 50, label: "Eliminando tablas existentes…" },
      { until: 80, label: "Importando backup.json…" },
      { until: 95, label: "Insertando catálogo, clientes y pedidos…" },
    ],
    successMessage: "Base de datos recargada correctamente.",
    errorMessage:
      "No se pudo recargar la base de datos. Verifique que backup.json exista y que el servidor esté activo.",
  },
};

const INITIAL_PROGRESS_DIALOG = {
  open: false,
  title: "",
  progress: 0,
  message: "",
  loading: false,
};

function stepLabel(steps, progress) {
  const step = steps.find((s) => progress < s.until);
  return step?.label || "Finalizando…";
}

function formatBackupTablesSummary(tables) {
  if (!tables || typeof tables !== "object") return "";
  const shift = tables.CashShift ?? 0;
  const movements = tables.CashShiftMovement ?? 0;
  const orders = tables.Order ?? 0;
  return ` Turnos: ${shift}, mov. caja: ${movements}, pedidos: ${orders}.`;
}

export default function ComandosPage() {
  const theme = useTheme();
  const { user, toast } = useAuth();
  const progressTimer = useRef(null);
  const activeStepsRef = useRef([]);
  const [confirmReloadOpen, setConfirmReloadOpen] = useState(false);
  const [progressDialog, setProgressDialog] = useState(INITIAL_PROGRESS_DIALOG);

  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    []
  );

  const stopProgressAnimation = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const startProgressAnimation = (steps) => {
    activeStepsRef.current = steps;
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgressDialog((prev) => {
        if (!prev.loading || prev.progress >= 92) return prev;
        const next = Math.min(prev.progress + 4, 92);
        return {
          ...prev,
          progress: next,
          message: stepLabel(activeStepsRef.current, next),
        };
      });
    }, 350);
  };

  const runWithProgress = async (operationKey, task) => {
    const config = OPERATION_CONFIG[operationKey];
    const firstMessage = config.steps[0]?.label || "Procesando…";

    setProgressDialog({
      open: true,
      title: config.title,
      progress: 8,
      message: firstMessage,
      loading: true,
    });
    startProgressAnimation(config.steps);

    try {
      const res = await task();
      stopProgressAnimation();
      setProgressDialog({
        open: true,
        title: config.title,
        progress: 100,
        message: config.successMessage,
        loading: false,
      });
      const baseMessage = getApiSuccessMessage(res, config.successMessage);
      const tablesSummary =
        operationKey === "save" || operationKey === "upload" || operationKey === "reload"
          ? formatBackupTablesSummary(res?.data?.tables)
          : "";
      toast({
        message: `${baseMessage}${tablesSummary}`,
        variant: "success",
      });
      setTimeout(() => {
        setProgressDialog(INITIAL_PROGRESS_DIALOG);
      }, 900);
    } catch (error) {
      stopProgressAnimation();
      setProgressDialog(INITIAL_PROGRESS_DIALOG);
      toast({
        message: getApiErrorMessage(error, config.errorMessage),
        variant: "error",
      });
    }
  };

  const executeReloadBD = () => runWithProgress("reload", reloadBD);

  const executeDownloadBackup = () => runWithProgress("download", downloadBackup);

  const executeSaveBackup = () => runWithProgress("save", saveBackup);

  const executeUploadBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("backup", file);
      void runWithProgress("upload", () => uploadBackup(fd));
    };
    input.click();
  };

  const COMMANDS = [
    {
      key: "upload",
      name: "Subir backup.json",
      info: "Valida el JSON, lo guarda en backup.json y luego debes usar Recargar BD",
      icon: UploadFileIcon,
      run: executeUploadBackup,
    },
    {
      key: "download",
      name: "Descargar backup EdDeli",
      info: "Descarga el estado actual de la base como backup-eddeli.json",
      icon: BackupIcon,
      run: executeDownloadBackup,
    },
    {
      key: "reload",
      name: "Recargar BD",
      info: "Borra y vuelve a crear tablas desde backup.json",
      icon: RefreshIcon,
      run: () => setConfirmReloadOpen(true),
    },
    {
      key: "save",
      name: "Guardar copia en servidor",
      info: "Exporta la base de datos actual a backup.json",
      icon: SaveIcon,
      run: executeSaveBackup,
    },
  ];

  if (user?.loginRol !== "Programador") {
    return <Navigate to="/" replace />;
  }

  const isBusy = progressDialog.loading;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Comandos — Programador
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Recargar BD elimina todos los datos actuales y los restaura desde <strong>backup.json</strong>.
        El backup incluye inventario, pedidos, finanzas, turnos de caja y movimientos. Úsalo con precaución.
      </Alert>

      <SimpleDialog
        open={confirmReloadOpen}
        onClose={() => setConfirmReloadOpen(false)}
        title="¿Recargar la base de datos?"
        message="Se borrarán todos los datos actuales y se restaurarán desde backup.json. Esta acción no se puede deshacer."
        onClickAccept={() => {
          setConfirmReloadOpen(false);
          void executeReloadBD();
        }}
      />

      <SimpleDialog
        open={progressDialog.open}
        onClose={() => {
          if (!progressDialog.loading) {
            setProgressDialog(INITIAL_PROGRESS_DIALOG);
          }
        }}
        title={progressDialog.title}
        maxWidth="sm"
        fullWidth
        hideClose={progressDialog.loading}
        disableClose={progressDialog.loading}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {progressDialog.message}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progressDialog.progress}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "right" }}>
          {progressDialog.progress}%
        </Typography>
      </SimpleDialog>

      <Grid container spacing={2}>
        {COMMANDS.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={cmd.key}>
              <Card
                variant="panel"
                sx={{
                  height: "100%",
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent>
                  <Box sx={{ color: "primary.main", mb: 1 }}>
                    <Icon sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {cmd.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cmd.info}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Tooltip title={cmd.info}>
                    <Button fullWidth variant="contained" onClick={() => cmd.run()} disabled={isBusy}>
                      Ejecutar
                    </Button>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
