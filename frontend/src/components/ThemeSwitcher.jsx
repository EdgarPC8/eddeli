/** Selector de tema claro/oscuro/sistema en menú. */
import { useState } from "react";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import FlareIcon from "@mui/icons-material/Flare";
import CheckIcon from "@mui/icons-material/Check";
import { useThemeMode } from "../theme/ThemeModeProvider.jsx";

const OPTIONS = [
  { value: "light", label: "Claro", icon: <LightModeIcon fontSize="small" /> },
  { value: "dark", label: "Oscuro", icon: <DarkModeIcon fontSize="small" /> },
  { value: "neon", label: "Neón", icon: <FlareIcon fontSize="small" /> },
];

export default function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <>
      <Tooltip title="Tema">
        <IconButton size="small" color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <SettingsBrightnessIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        disableScrollLock
        disableAutoFocusItem
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            onClick={() => {
              setMode(opt.value);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText>{opt.label}</ListItemText>
            {mode === opt.value && (
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
