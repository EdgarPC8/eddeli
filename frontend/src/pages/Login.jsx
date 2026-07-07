/**
 * Inicio de sesión y selección de rol cuando la cuenta tiene varios roles.
 */
import { useState, useEffect } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppSettings } from "../context/AppSettingsContext.jsx";

export default function Login() {
  const { activeApp } = useAppSettings();
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectingRole, setSelectingRole] = useState(false);
  const [roles, setRoles] = useState([]);

  const { signin, isAuthenticated, errors } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signin({ username, password });
    if (result?.selectRole) {
      setSelectingRole(true);
      setRoles(result.roles);
    } else if (result?.success) navigate("/", { replace: true });
  };

  const handleRoleSelect = async (roleId) => {
    const result = await signin({ username, password, selectedRoleId: roleId });
    if (result?.success) navigate("/", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Panel izquierdo — marca */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          background: `linear-gradient(160deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${alpha(theme.palette.secondary.main, 0.85)} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            bgcolor: alpha("#fff", 0.06),
            top: -100,
            right: -100,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.secondary.main, 0.15),
            bottom: -80,
            left: -60,
          }}
        />
        <Box
          sx={{
            position: "relative",
            p: 3,
            borderRadius: "50%",
            bgcolor: alpha("#fff", 0.12),
            boxShadow: `0 16px 48px ${alpha("#000", 0.25)}, 0 0 60px ${alpha(theme.palette.secondary.main, 0.35)}`,
            mb: 3,
          }}
        >
          <Box
            component="img"
            src={activeApp.logoUrl}
            alt={activeApp.name}
            sx={{
              width: 280,
              height: 280,
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
            }}
          />
        </Box>
        <Typography variant="h4" fontWeight={800} color="#fff" textAlign="center" gutterBottom>
          {activeApp.name}
        </Typography>
        <Typography variant="body1" sx={{ color: alpha("#fff", 0.9), textAlign: "center", maxWidth: 320 }}>
          {activeApp.description}
        </Typography>
      </Box>

      {/* Panel derecho — formulario */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 440px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 4 },
          bgcolor: "background.paper",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 380,
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: { md: "none" }, textAlign: "center", mb: 3 }}>
            <Box
              component="img"
              src={activeApp.logoUrl}
              alt={activeApp.name}
              sx={{
                width: 150,
                height: 150,
                borderRadius: "50%",
                objectFit: "cover",
                mb: 1,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
              }}
            />
            <Typography variant="h6" fontWeight={800} color="primary">
              {activeApp.alias}
            </Typography>
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            {selectingRole ? "Elige tu rol" : "Bienvenido"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectingRole ? "Tu cuenta tiene varios roles asignados." : "Ingresa con tu usuario del sistema."}
          </Typography>

          {!selectingRole ? (
            <>
              {errors?.message && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {errors.message}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Usuario"
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Contraseña"
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 3,
                    py: 1.4,
                    fontWeight: 700,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  }}
                >
                  Iniciar sesión
                </Button>
              </Box>
              <Button component={RouterLink} to="/home" fullWidth sx={{ mt: 2 }} color="inherit">
                Volver al inicio
              </Button>
            </>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  onClick={() => handleRoleSelect(role.id)}
                  sx={{ fontWeight: 700 }}
                >
                  {role.name}
                </Button>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
