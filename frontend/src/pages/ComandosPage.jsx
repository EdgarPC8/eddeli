/** Comandos admin: backup y recarga BD; mensajes desde tiendaapi. Solo Programador. */
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
import { getApiSuccessMessage } from "../utils/apiMessages.js";

const RELOAD_STEPS = [
  { until: 25, label: "Preparando recarga de la base de datos…" },
  { until: 50, label: "Eliminando tablas existentes…" },
  { until: 80, label: "Importando backup.json…" },
  { until: 95, label: "Insertando catálogo, clientes y pedidos…" },
];

function reloadStepLabel(progress) {
  const step = RELOAD_STEPS.find((s) => progress < s.until);
  return step?.label || "Finalizando…";
}

export default function ComandosPage() {
  const theme = useTheme();
  const { user, toast } = useAuth();
  const progressTimer = useRef(null);
  const [reloadDialog, setReloadDialog] = useState({
    open: false,
    progress: 0,
    message: RELOAD_STEPS[0].label,
    loading: false,
  });

  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    []
  );

  const startProgressAnimation = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setReloadDialog((prev) => {
        if (!prev.loading || prev.progress >= 92) return prev;
        const next = Math.min(prev.progress + 4, 92);
        return { ...prev, progress: next, message: reloadStepLabel(next) };
      });
    }, 350);
  };

  const stopProgressAnimation = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const handleReloadBD = async () => {
    if (
      !window.confirm(
        "¿Recargar la base de datos desde backup.json? Se borrarán todos los datos actuales."
      )
    ) {
      return;
    }

    setReloadDialog({
      open: true,
      progress: 8,
      message: RELOAD_STEPS[0].label,
      loading: true,
    });
    startProgressAnimation();

    try {
      const res = await reloadBD();
      stopProgressAnimation();
      setReloadDialog({
        open: true,
        progress: 100,
        message: "Base de datos recargada correctamente.",
        loading: false,
      });
      toast({
        message: getApiSuccessMessage(res, "Base de datos recargada correctamente."),
        variant: "success",
      });
      setTimeout(() => {
        setReloadDialog({ open: false, progress: 0, message: "", loading: false });
      }, 900);
    } catch (error) {
      stopProgressAnimation();
      setReloadDialog({ open: false, progress: 0, message: "", loading: false });
      toast({
        message: error?.response?.data?.message || "Error al recargar la base de datos.",
        variant: "error",
      });
    }
  };

  const COMMANDS = [
    {
      key: "upload",
      name: "Subir backup.json",
      info: "Reemplaza backup.json en el servidor (luego usa Recargar BD)",
      icon: UploadFileIcon,
      run: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append("backup", file);
          toast({ promise: uploadBackup(fd) });
        };
        input.click();
      },
    },
    {
      key: "download",
      name: "Descargar backup.json",
      info: "Descarga el estado actual de la base en JSON",
      icon: BackupIcon,
      run: () => toast({ promise: downloadBackup() }),
    },
    {
      key: "reload",
      name: "Recargar BD",
      info: "Borra y vuelve a crear tablas desde backup.json",
      icon: RefreshIcon,
      run: handleReloadBD,
    },
    {
      key: "save",
      name: "Guardar copia en servidor",
      info: "Guarda backup.json y copia con fecha en /backups",
      icon: SaveIcon,
      run: () => toast({ promise: saveBackup() }),
    },
  ];

  if (user?.loginRol !== "Programador") {
    return <Navigate to="/" replace />;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Comandos — Programador
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Recargar BD elimina todos los datos actuales y los restaura desde <strong>backup.json</strong>.
        Úsalo con precaución.
      </Alert>

      <SimpleDialog
        open={reloadDialog.open}
        onClose={() => {
          if (!reloadDialog.loading) {
            setReloadDialog({ open: false, progress: 0, message: "", loading: false });
          }
        }}
        title="Recargando base de datos"
        maxWidth="sm"
        fullWidth
        hideClose={reloadDialog.loading}
        disableClose={reloadDialog.loading}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {reloadDialog.message}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={reloadDialog.progress}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "right" }}>
          {reloadDialog.progress}%
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
                    <Button fullWidth variant="contained" onClick={() => cmd.run()} disabled={reloadDialog.loading}>
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
