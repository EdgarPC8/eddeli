/**
 * Formulario crear/editar cuenta de acceso (username, roles, contraseña).
 */
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import {
  addAccountRequest,
  updateAccountRequest,
} from "../../api/accountRequest.js";
import { getUsersRequest } from "../../api/userRequest.js";
import SelectDataRoles from "../Selects/SelectDataRoles.jsx";
import TablePro from "../Tables/TablePro.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AccountForm({ isEditing = false, datos = null, onClose, reload }) {
  const { toast } = useAuth();
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [pickedUser, setPickedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [passwordChange, setPasswordChange] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getUsersRequest()
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!isEditing || !datos) return;
    setUsername(datos.username || "");
    setSelectedRoles((datos.roles || []).map((r) => (typeof r === "object" ? r.id : r)));
  }, [isEditing, datos]);

  const fullName = (r) =>
    [r.firstName, r.secondName, r.firstLastName, r.secondLastName].filter(Boolean).join(" ") || "—";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ message: "El nombre de usuario es obligatorio.", variant: "warning" });
      return;
    }
    if (!isEditing && !pickedUser) {
      toast({ message: "Seleccione una persona (usuario) para la cuenta.", variant: "warning" });
      return;
    }
    if (!isEditing && pickedUser?.account?.id) {
      toast({
        message: "Esa persona ya tiene una cuenta. Solo puede existir una cuenta por usuario.",
        variant: "warning",
      });
      return;
    }
    if (!selectedRoles.length) {
      toast({ message: "Seleccione al menos un rol.", variant: "warning" });
      return;
    }
    if (!isEditing || passwordChange) {
      if (!newPassword || newPassword !== confirmPassword) {
        toast({ message: "Las contraseñas deben coincidir.", variant: "warning" });
        return;
      }
    }

    const body = {
      username: username.trim(),
      roles: selectedRoles,
      userId: isEditing ? datos.userId : pickedUser.id,
      ...(newPassword ? { newPassword, confirmPassword } : {}),
    };

    try {
      await toast({
        promise: isEditing
          ? updateAccountRequest(datos.id, body)
          : addAccountRequest(body),
      });
      if (reload) await reload();
      if (onClose) onClose();
    } catch {
      /* toast */
    }
  };

  const usersWithoutAccount = users.filter((u) => !u.account?.id);

  const userColumns = [
    { id: "ci", label: "Cédula" },
    {
      id: "nombre",
      label: "Nombre",
      getSearchValue: fullName,
      render: (row) => fullName(row),
    },
    {
      id: "pick",
      label: "Elegir",
      render: (row) => (
        <IconButton size="small" onClick={() => setPickedUser(row)} title="Asignar a esta cuenta">
          <ArrowCircleUpIcon color={pickedUser?.id === row.id ? "primary" : "inherit"} />
        </IconButton>
      ),
    },
  ];

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Usuario (login)"
            fullWidth
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <SelectDataRoles value={selectedRoles} onChange={setSelectedRoles} />
        </Grid>

        {isEditing && !passwordChange && (
          <Grid item xs={12}>
            <Button variant="outlined" size="small" onClick={() => setPasswordChange(true)}>
              Cambiar contraseña
            </Button>
          </Grid>
        )}

        {(!isEditing || passwordChange) && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label={isEditing ? "Nueva contraseña" : "Contraseña"}
                type={showPass ? "text" : "password"}
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass((v) => !v)} edge="end">
                        {showPass ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirmar contraseña"
                type={showConfirm ? "text" : "password"}
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end">
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </>
        )}

        {!isEditing && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {pickedUser
                ? `Persona seleccionada: ${fullName(pickedUser)}`
                : "Seleccione una persona que aún no tenga cuenta de acceso (una sola cuenta por usuario):"}
            </Typography>
            {usersWithoutAccount.length === 0 ? (
              <Alert severity="info">
                Todas las personas registradas ya tienen cuenta. Cree una nueva persona en Usuarios o elimine
                una cuenta existente para reasignar.
              </Alert>
            ) : (
              <TablePro
                title="Personas sin cuenta"
                rows={usersWithoutAccount}
                columns={userColumns}
                showSearch
                showPagination
                defaultRowsPerPage={5}
                tableMaxHeight="calc(50vh - 80px)"
              />
            )}
          </Grid>
        )}

        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth>
            {isEditing ? "Guardar cuenta" : "Crear cuenta"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
