/**
 * Consulta y limpieza de logs HTTP (Admin/Programador).
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Navigate } from "react-router-dom";
import TablePro from "../components/Tables/TablePro.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import LogsForm from "../components/LogsForm.jsx";
import {
  getLogs,
  deleteLogsRequest,
  deleteLogByIdRequest,
} from "../api/comandsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDateTime } from "../helpers/functions.js";
import { displayLogAction } from "../utils/logActionCatalog.js";

const ALLOWED = new Set(["Programador", "Administrador"]);

function EllipsisCell({ text, maxWidth = 180 }) {
  const value = text == null || text === "" ? "—" : String(text);
  return (
    <Tooltip title={value === "—" ? "" : value} enterDelay={400}>
      <Typography
        component="span"
        variant="body2"
        sx={{
          display: "block",
          maxWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
}

export default function LogsPage() {
  const { user, toast } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [confirm, setConfirm] = useState(null); // { title, message, payload, mode }

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      /* carga silenciosa */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const methodCounts = useMemo(() => {
    const map = { ALL: logs.length };
    for (const row of logs) {
      const m = String(row.httpMethod || "").toUpperCase() || "OTHER";
      map[m] = (map[m] || 0) + 1;
    }
    return map;
  }, [logs]);

  const filteredRows = useMemo(() => {
    if (methodFilter === "ALL") return logs;
    return logs.filter(
      (r) => String(r.httpMethod || "").toUpperCase() === methodFilter,
    );
  }, [logs, methodFilter]);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const askDelete = (opts) => setConfirm(opts);

  const runDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await toast({
        promise: (async () => {
          if (confirm.mode === "one") {
            await deleteLogByIdRequest(confirm.id);
          } else {
            await deleteLogsRequest(confirm.payload);
          }
          await fetchLogs();
          if (selected && confirm.mode === "one" && selected.id === confirm.id) {
            setOpen(false);
            setSelected(null);
          }
        })(),
        successMessage: "Logs eliminados",
        errorMessage: "No se pudo eliminar",
      });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      id: "id",
      label: "Id",
      width: 64,
      getSortValue: (r) => r.id,
    },
    {
      id: "date",
      label: "Fecha",
      width: 150,
      getSortValue: (r) => r.date,
      render: (row) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 145 }}>
          {formatDateTime(row.date)}
        </Typography>
      ),
    },
    {
      id: "endPoint",
      label: "Ruta",
      width: 280,
      render: (row) => <EllipsisCell text={row.endPoint} maxWidth={270} />,
      getSearchValue: (r) => `${r.endPoint || ""} ${r.httpMethod || ""}`,
    },
    {
      id: "action",
      label: "Acción",
      width: 220,
      render: (row) => <EllipsisCell text={displayLogAction(row)} maxWidth={210} />,
      getSearchValue: (r) => `${displayLogAction(r)} ${r.description || ""}`,
      getSortValue: (r) => displayLogAction(r),
    },
    {
      id: "actions",
      label: "",
      width: 88,
      render: (row) => (
        <Stack direction="row" spacing={0}>
          <Tooltip title="Ver detalle">
            <IconButton
              size="small"
              onClick={() => {
                setSelected(row);
                setOpen(true);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isProgrammer && (
            <Tooltip title="Borrar este log">
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  askDelete({
                    mode: "one",
                    id: row.id,
                    title: "Borrar log",
                    message: `¿Eliminar el log #${row.id} (${row.httpMethod})?`,
                  })
                }
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const methodButtons = ["ALL", "POST", "PUT", "PATCH", "DELETE"].filter(
    (m) => m === "ALL" || methodCounts[m],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Logs del sistema
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tipo de acción (Login, Cobro en caja, Crear producto…). Logs viejos se reclasifican al
            verlos.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => void fetchLogs()}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 1.5, py: 0.75 }}>
        Solo se registran peticiones distintas de GET, OPTIONS y HEAD. El borrado masivo es solo
        para Programador.
      </Alert>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {methodButtons.map((m) => (
          <Chip
            key={m}
            clickable
            color={methodFilter === m ? "primary" : "default"}
            variant={methodFilter === m ? "filled" : "outlined"}
            label={`${m === "ALL" ? "Todos" : m} (${methodCounts[m] || 0})`}
            onClick={() => setMethodFilter(m)}
            size="small"
          />
        ))}
      </Stack>

      {isProgrammer && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteSweepIcon />}
            disabled={!methodCounts.POST}
            onClick={() =>
              askDelete({
                title: "Borrar logs POST",
                message: `¿Eliminar ${methodCounts.POST || 0} log(s) POST?`,
                payload: { method: "POST" },
              })
            }
          >
            Borrar POST
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteSweepIcon />}
            disabled={!methodCounts.PUT}
            onClick={() =>
              askDelete({
                title: "Borrar logs PUT",
                message: `¿Eliminar ${methodCounts.PUT || 0} log(s) PUT?`,
                payload: { method: "PUT" },
              })
            }
          >
            Borrar PUT
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteSweepIcon />}
            disabled={!methodCounts.DELETE}
            onClick={() =>
              askDelete({
                title: "Borrar logs DELETE",
                message: `¿Eliminar ${methodCounts.DELETE || 0} log(s) DELETE?`,
                payload: { method: "DELETE" },
              })
            }
          >
            Borrar DELETE
          </Button>
          {methodFilter !== "ALL" && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteSweepIcon />}
              disabled={!filteredRows.length}
              onClick={() =>
                askDelete({
                  title: `Borrar filtrados (${methodFilter})`,
                  message: `¿Eliminar ${filteredRows.length} log(s) ${methodFilter} visibles?`,
                  payload: { method: methodFilter },
                })
              }
            >
              Borrar filtrados
            </Button>
          )}
          <Button
            size="small"
            color="error"
            variant="contained"
            startIcon={<DeleteSweepIcon />}
            disabled={!logs.length}
            onClick={() =>
              askDelete({
                title: "Borrar TODOS los logs",
                message: `¿Eliminar los ${logs.length} logs? Esta acción no se puede deshacer.`,
                payload: { all: true },
              })
            }
          >
            Borrar todos
          </Button>
        </Stack>
      )}

      <TablePro
        title={`Registros (${filteredRows.length})`}
        rows={filteredRows}
        columns={columns}
        showSearch
        showPagination
        showIndex
        indexHeader="#"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        loading={loading}
      />

      <SimpleDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Detalle del log #${selected?.id ?? ""}`}
        maxWidth="md"
        fullWidth
        contentSx={{ minHeight: 280 }}
      >
        <LogsForm datos={selected || {}} />
        {isProgrammer && selected?.id && (
          <DialogActions sx={{ px: 0, pt: 1 }}>
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() =>
                askDelete({
                  mode: "one",
                  id: selected.id,
                  title: "Borrar log",
                  message: `¿Eliminar el log #${selected.id}?`,
                })
              }
            >
              Borrar este log
            </Button>
          </DialogActions>
        )}
      </SimpleDialog>

      <SimpleDialog
        open={Boolean(confirm)}
        onClose={() => !busy && setConfirm(null)}
        title={confirm?.title || "Confirmar"}
        maxWidth="xs"
        fullWidth
      >
        <Typography variant="body2" sx={{ mb: 2 }}>
          {confirm?.message}
        </Typography>
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button onClick={() => setConfirm(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={() => void runDelete()} disabled={busy}>
            {busy ? "Borrando…" : "Eliminar"}
          </Button>
        </Stack>
      </SimpleDialog>
    </Box>
  );
}
