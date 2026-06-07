/**
 * Administración de cuentas de acceso (login + roles). Solo Administrador y Programador.
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import TablePro from "../components/Tables/TablePro.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import AccountForm from "../components/Forms/AccountForm.jsx";
import {
  deleteAccountRequest,
  getAccountsRequest,
  resetPasswordRequest,
} from "../api/accountRequest.js";
import { useAuth } from "../context/AuthContext.jsx";

const ALLOWED = new Set(["Programador", "Administrador"]);

const personName = (row) => {
  const u = row.user || {};
  return [u.firstName, u.secondName, u.firstLastName, u.secondLastName].filter(Boolean).join(" ") || "—";
};

export default function CuentasPage() {
  const { user, toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [target, setTarget] = useState(null);

  const load = async () => {
    const { data } = await getAccountsRequest();
    setRows(data || []);
  };

  useEffect(() => {
    if (ALLOWED.has(user?.loginRol)) load();
  }, [user?.loginRol]);

  if (!ALLOWED.has(user?.loginRol)) {
    return <Navigate to="/" replace />;
  }

  const confirmDelete = async () => {
    if (!target?.id) return;
    try {
      await toast({ promise: deleteAccountRequest(target.id) });
      setDeleteOpen(false);
      setTarget(null);
      await load();
    } catch {
      /* toast */
    }
  };

  const confirmReset = async () => {
    if (!target?.id) return;
    try {
      await toast({ promise: resetPasswordRequest(target.id) });
      setResetOpen(false);
      setTarget(null);
    } catch {
      /* toast */
    }
  };

  const columns = [
    { id: "id", label: "Id", getSortValue: (r) => r.id },
    {
      id: "persona",
      label: "Persona",
      getSearchValue: personName,
      render: (row) => personName(row),
    },
    { id: "username", label: "Usuario (login)" },
    {
      id: "roles",
      label: "Roles",
      getSearchValue: (r) => (r.roles || []).map((x) => x.name).join(" "),
      render: (row) => (row.roles || []).map((x) => x.name).join(", ") || "—",
    },
    {
      id: "actions",
      label: "Acciones",
      render: (row) => (
        <>
          <Tooltip title="Editar cuenta">
            <IconButton
              size="small"
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Resetear contraseña a 12345678">
            <IconButton
              size="small"
              onClick={() => {
                setTarget(row);
                setResetOpen(true);
              }}
            >
              <LockResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar cuenta">
            <IconButton
              size="small"
              onClick={() => {
                setTarget(row);
                setDeleteOpen(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Button
        variant="contained"
        startIcon={<ManageAccountsIcon />}
        sx={{ mb: 2 }}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        Añadir cuenta
      </Button>

      <TablePro
        title="Cuentas de acceso"
        rows={rows}
        columns={columns}
        showSearch
        showPagination
        showIndex
        defaultRowsPerPage={10}
        tableMaxHeight={480}
      />

      <SimpleDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar cuenta" : "Nueva cuenta"}
        maxWidth="md"
        fullWidth
      >
        <AccountForm
          isEditing={Boolean(editing)}
          datos={editing}
          onClose={() => setFormOpen(false)}
          reload={load}
        />
      </SimpleDialog>

      <SimpleDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar cuenta"
        message="¿Eliminar esta cuenta de acceso?"
        onClickAccept={confirmDelete}
      />

      <SimpleDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Resetear contraseña"
        message="La contraseña quedará en 12345678. ¿Continuar?"
        onClickAccept={confirmReset}
      />
    </Box>
  );
}
