/**
 * Consulta de logs HTTP del servidor (solo Admin/Programador).
 */
import { useEffect, useState, useCallback } from "react";
import { Box, IconButton, Tooltip, Alert, Chip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Navigate } from "react-router-dom";
import TablePro from "../components/Tables/TablePro.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import LogsForm from "../components/LogsForm.jsx";
import { getLogs } from "../api/comandsRequest.js";
import { useAuth } from "../context/AuthContext.jsx";

const ALLOWED = new Set(["Programador", "Administrador"]);

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await getLogs();
      setLogs(data || []);
    } catch {
      /* sin toast: solo carga de tabla */
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const columns = [
    { id: "id", label: "Id", getSortValue: (r) => r.id },
    {
      id: "httpMethod",
      label: "Método",
      render: (row) => (
        <Chip size="small" label={row.httpMethod} color="primary" variant="outlined" />
      ),
    },
    { id: "action", label: "Acción" },
    { id: "description", label: "Descripción" },
    { id: "endPoint", label: "URL" },
    { id: "system", label: "Sistema" },
    {
      id: "date",
      label: "Fecha",
      getSortValue: (r) => r.date,
      render: (row) => formatDate(row.date),
    },
    {
      id: "actions",
      label: "Ver",
      render: (row) => (
        <Tooltip title="Detalle">
          <IconButton
            size="small"
            onClick={() => {
              setSelected(row);
              setOpen(true);
            }}
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Solo se registran peticiones distintas de GET, OPTIONS y HEAD (POST, PUT, DELETE, etc.).
      </Alert>

      <TablePro
        title="Logs del sistema"
        rows={logs}
        columns={columns}
        showSearch
        showPagination
        showIndex
        indexHeader="#"
        rowsPerPageOptions={[10, 25, 50]}
        defaultRowsPerPage={10}
        tableMaxHeight={520}
      />

      <SimpleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Detalle del log"
        maxWidth="md"
        fullWidth
      >
        <LogsForm datos={selected || {}} />
      </SimpleDialog>
    </Box>
  );
}
