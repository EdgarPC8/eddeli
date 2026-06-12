import { Slider, Stack, Typography } from "@mui/material";
import { TITLE_FONT_SIZE } from "../constants.js";
import { normalizeTitleFontSize } from "../utils/titleFontSize.js";

export default function TitleFontSizeSlider({
  value,
  onChange,
  defaultValue = TITLE_FONT_SIZE.PRODUCT_DEFAULT,
  label = "Tamaño de letra",
}) {
  const px = normalizeTitleFontSize(value, defaultValue);

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}: {px}px
      </Typography>
      <Slider
        size="small"
        min={TITLE_FONT_SIZE.MIN}
        max={TITLE_FONT_SIZE.MAX}
        step={2}
        value={px}
        onChange={(_, v) => onChange(v)}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}px`}
      />
    </Stack>
  );
}
