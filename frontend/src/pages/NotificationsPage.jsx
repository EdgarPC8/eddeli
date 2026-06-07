/**
 * Bandeja de notificaciones del usuario y pestaña de programadas (admin).
 */
import { useState } from "react";
import { Box, Paper, Tabs, Tab, Typography } from "@mui/material";
import NotificationList from "../components/NotificationList.jsx";
import NotificationProgramsPage from "./NotificationProgramsPage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CAN_PROGRAM = new Set(["Programador", "Administrador"]);

export default function NotificationsPage() {
  const { user } = useAuth();
  const canProgram = CAN_PROGRAM.has(user?.loginRol);
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: canProgram ? 900 : 520, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Notificaciones
      </Typography>

      {canProgram && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2 }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Mis notificaciones" />
          <Tab label="Programar saludos y avisos" />
        </Tabs>
      )}

      {(!canProgram || tab === 0) && (
        <Paper variant="panel" sx={{ p: 1 }}>
          <NotificationList />
        </Paper>
      )}

      {canProgram && tab === 1 && <NotificationProgramsPage />}
    </Box>
  );
}
