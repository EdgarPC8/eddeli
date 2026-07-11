import { Button, Paper } from "@mui/material";
import { Box } from "@mui/system";
import { useState } from "react";
import SimpleDialog from "../components/Dialogs/SimpleDialog";
import UsersForm from "../components/Forms/UserForm";
import TablePro from "../components/Tables/TablePro";
import { useUsers } from "../hooks/useUsers";

import { addUser, updateUser } from "../api/userRequest";
import { useSnackbar } from "notistack";

export default function UsersPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { users, isLoading, fetchUsers } = useUsers();

  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState(null);
  const [userId, setUserId] = useState(null);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        const res = await updateUser(data, userId);

        enqueueSnackbar("Usuario actualizado exitosamente", {
          variant: "success",
        });
        fetchUsers();

        setForm(null);
        setIsEditing(false);
        setUserId(null);
        return;
      }

      const res = await addUser(data);
      if (res.data.success) {
        enqueueSnackbar("Usuario Agregado exitosamente", {
          variant: "success",
        });
      }
      fetchUsers();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.data.message, { variant: "error" });
    }
  };

  return (
    <Box>
      <Paper variant="panel" sx={{ p: 1, mb: 1 }}>
        <Button
          variant="contained"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          Nuevo Usuario
        </Button>
      </Paper>
      <SimpleDialog
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setIsEditing(false);
          setForm(null);
        }}
        title={isEditing ? "Editar usuario" : "Nuevo usuario"}
        fullWidth
        maxWidth="md"
      >
        <UsersForm onSubmit={onSubmit} initialData={form} />
      </SimpleDialog>

      <TablePro
        title="Usuarios del Sistema"
        rows={users}
        loading={isLoading}
        columns={[
          { id: "id", label: "ID" },
          {
            id: "name",
            label: "Cliente",
            render: (r) => <p>{r.ci}</p>,
          },

          {
            id: "Nombre",
            label: "Nombre",
            render: (r) =>
              [r.firstName, r.secondName, r.firstLastName, r.secondLastName].filter(Boolean).join(" ") || "—",
          },
          {
            id: "username",
            label: "Usuario",
            render: (r) => r.account?.username || "—",
          },
          {
            id: "roles",
            label: "Roles",
            render: (r) => (r.account?.roles || []).map((role) => role.name).join(", ") || "—",
          },

          {
            id: "acc",
            label: "",
            render: (r) => (
              <Button
                size="small"
                onClick={() => {
                  setIsOpen(true);
                  setIsEditing(true);
                  setUserId(r.id);
                  setForm({
                    firstName: r.firstName,
                    firstLastName: r.firstLastName,
                    username: r.account?.username || "",
                    ci: r.ci,
                    password: "",
                    roles: r.account?.roles?.map((role) => role.id) || [],
                  });
                }}
              >
                Editar
              </Button>
            ),
          },
        ]}
      />
    </Box>
  );
}
