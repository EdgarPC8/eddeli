/**
 * Diálogo para cambiar el rol activo de la sesión (varios roles en la cuenta).
 */
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useAuth } from "../context/AuthContext.jsx";

export default function CambiarRol({ onClose }) {
  const { user, changeRole } = useAuth();
  const currentRolId = user?.rolId;

  if (!user?.roles?.length) {
    return (
      <Typography color="text.secondary" textAlign="center">
        No hay roles disponibles.
      </Typography>
    );
  }

  const handleSelectRol = async (rolId) => {
    if (rolId === currentRolId) {
      onClose?.();
      return;
    }
    await changeRole(rolId);
    onClose?.();
  };

  return (
    <Stack spacing={1.5}>
      {user.roles.map((rol) => {
        const isCurrent = rol.id === currentRolId;

        return (
          <Button
            key={rol.id}
            variant={isCurrent ? "contained" : "outlined"}
            color={isCurrent ? "primary" : "inherit"}
            onClick={() => handleSelectRol(rol.id)}
            sx={{
              justifyContent: "center",
              py: 1.25,
              textTransform: "none",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75}>
              <Typography component="span" fontWeight={600}>
                {rol.name}
              </Typography>
              {isCurrent && (
                <Tooltip title="Rol activo" arrow>
                  <Box component="span" sx={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                  </Box>
                </Tooltip>
              )}
            </Stack>
          </Button>
        );
      })}
    </Stack>
  );
}
