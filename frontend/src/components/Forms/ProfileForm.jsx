/**
 * Editar contraseña de la cuenta del usuario autenticado.
 */
import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { updateAccountUser } from "../../api/accountRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProfileForm({ datos, onClose }) {
  const { toast, loadUserProfile } = useAuth();
  const [passwordChange, setPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!passwordChange) return;

    if (!oldPassword || !newPassword || newPassword !== confirmPassword) {
      toast({ message: "Revise las contraseñas; deben coincidir.", variant: "warning" });
      return;
    }

    try {
      await toast({
        promise: updateAccountUser(datos.accountId, datos.userId, datos.rolId, {
          oldPassword,
          newPassword,
        }),
      });
      await loadUserProfile();
      onClose?.();
    } catch {
      /* toast */
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField label="Usuario (login)" fullWidth disabled value={datos?.username || ""} />
        </Grid>

        {!passwordChange ? (
          <Grid item xs={12}>
            <Button variant="outlined" onClick={() => setPasswordChange(true)}>
              Cambiar contraseña
            </Button>
          </Grid>
        ) : (
          <>
            <Grid item xs={12}>
              <TextField
                label="Contraseña anterior"
                type={showOld ? "text" : "password"}
                fullWidth
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowOld((v) => !v)} edge="end">
                        {showOld ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nueva contraseña"
                type={showNew ? "text" : "password"}
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNew((v) => !v)} edge="end">
                        {showNew ? <VisibilityOff /> : <Visibility />}
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
            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth>
                Guardar contraseña
              </Button>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}
