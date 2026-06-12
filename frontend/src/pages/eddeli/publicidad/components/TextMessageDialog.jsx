/**
 * Crear o editar diapositiva de mensaje de texto grande.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../../../../context/AuthContext.jsx";
import {
  CONTENT_TYPES,
  DEFAULT_SLIDE_DURATION_SEC,
  PLAYLIST_TRANSITION_TEMPLATE,
  TITLE_FONT_SIZE,
  TITLE_FONT_STYLES,
} from "../constants.js";
import TitleFontSizeSlider from "./TitleFontSizeSlider.jsx";
import TitleFontStyleSelect from "./TitleFontStyleSelect.jsx";

const slideUid = () => `slide_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default function TextMessageDialog({ open, onClose, onConfirm, initialSlide = null }) {
  const { toast } = useAuth();
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [duration, setDuration] = useState(DEFAULT_SLIDE_DURATION_SEC);
  const [titleFontSize, setTitleFontSize] = useState(TITLE_FONT_SIZE.TEXT_DEFAULT);
  const [titleFontStyle, setTitleFontStyle] = useState(TITLE_FONT_STYLES.DEFAULT);

  useEffect(() => {
    if (!open) return;
    setHeadline(initialSlide?.title || "");
    setSubline(initialSlide?.subtitle || "");
    setDuration(initialSlide?.durationSeconds || DEFAULT_SLIDE_DURATION_SEC);
    setTitleFontSize(initialSlide?.titleFontSize ?? TITLE_FONT_SIZE.TEXT_DEFAULT);
    setTitleFontStyle(initialSlide?.titleFontStyle || TITLE_FONT_STYLES.DEFAULT);
  }, [open, initialSlide]);

  const handleConfirm = () => {
    const title = headline.trim();
    if (!title) {
      toast?.({ message: "Escribe el mensaje principal", variant: "warning" });
      return;
    }
    onConfirm?.({
      id: initialSlide?.id || slideUid(),
      contentType: CONTENT_TYPES.TEXT,
      contentId: initialSlide?.contentId || `text-${slideUid()}`,
      title,
      subtitle: subline.trim(),
      mediaPath: null,
      price: null,
      durationSeconds: duration,
      titleFontSize,
      titleFontStyle: titleFontStyle === TITLE_FONT_STYLES.DEFAULT ? null : titleFontStyle,
      ...PLAYLIST_TRANSITION_TEMPLATE,
    });
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialSlide ? "Editar mensaje" : "Añadir mensaje de texto"}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Texto grande para pantalla TV: promociones, avisos o mensajes temporales.
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Mensaje principal"
            required
            fullWidth
            multiline
            minRows={2}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="8 panes por un dólar"
            helperText="Se muestra en grande, centrado"
          />
          <TextField
            label="Línea secundaria (opcional)"
            fullWidth
            multiline
            minRows={1}
            value={subline}
            onChange={(e) => setSubline(e.target.value)}
            placeholder="Pasteles próximamente"
          />
          <TitleFontStyleSelect
            value={titleFontStyle}
            onChange={setTitleFontStyle}
            label="Estilo de letra"
          />
          <TitleFontSizeSlider
            value={titleFontSize}
            onChange={setTitleFontSize}
            defaultValue={TITLE_FONT_SIZE.TEXT_DEFAULT}
            label="Tamaño del mensaje principal"
          />
          <TextField
            label="Duración en pantalla (segundos)"
            type="number"
            fullWidth
            inputProps={{ min: 3, max: 120 }}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 8)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {initialSlide ? "Guardar mensaje" : "Añadir a la playlist"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
