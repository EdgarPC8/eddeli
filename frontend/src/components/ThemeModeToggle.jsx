/** Botones compactos para alternar modo claro/oscuro. */
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import FlareIcon from "@mui/icons-material/Flare";
import { useThemeMode } from "../theme/ThemeModeProvider.jsx";

export default function ThemeModeToggle() {
  const { mode, setMode } = useThemeMode();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      onChange={(_, v) => v && setMode(v)}
      sx={{ bgcolor: "rgba(255,255,255,0.12)" }}
    >
      <ToggleButton value="light">
        <Tooltip title="Claro">
          <LightModeIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="dark">
        <Tooltip title="Oscuro">
          <DarkModeIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="neon">
        <Tooltip title="Neón">
          <FlareIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
