import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { TITLE_FONT_STYLES, TITLE_FONT_STYLE_LABELS } from "../constants.js";

export default function TitleFontStyleSelect({
  value,
  onChange,
  label = "Estilo de letra",
  size = "small",
  fullWidth = true,
}) {
  const v = value || TITLE_FONT_STYLES.DEFAULT;

  return (
    <FormControl fullWidth={fullWidth} size={size}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={v} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(TITLE_FONT_STYLE_LABELS).map(([key, text]) => (
          <MenuItem key={key} value={key}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
