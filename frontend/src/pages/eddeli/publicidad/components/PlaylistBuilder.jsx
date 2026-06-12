/**
 * Constructor de playlist: orden y duración.
 */
import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Slider,
  Stack,
  Typography,
  Chip,
  Alert,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import EditIcon from "@mui/icons-material/Edit";
import { buildImageUrl } from "../../../../api/axios.js";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  MAX_SLIDE_DURATION_SEC,
  MIN_SLIDE_DURATION_SEC,
  PLAYLIST_TRANSITION_TEMPLATE,
  TITLE_FONT_SIZE,
} from "../constants.js";
import ContentPickerDialog from "./ContentPickerDialog.jsx";
import MenuBoardDialog from "./MenuBoardDialog.jsx";
import TextMessageDialog from "./TextMessageDialog.jsx";
import TitleFontSizeSlider from "./TitleFontSizeSlider.jsx";
import TitleFontStyleSelect from "./TitleFontStyleSelect.jsx";

const slideUid = () => `slide_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function thumbUrl(slide) {
  if (slide?.contentType === CONTENT_TYPES.MENU) {
    const first = slide.menuItems?.find((m) => m?.mediaPath);
    if (first?.mediaPath) return buildImageUrl(first.mediaPath);
    return null;
  }
  if (!slide?.mediaPath) return null;
  if (slide.contentType === CONTENT_TYPES.VIDEO) return null;
  return buildImageUrl(slide.mediaPath);
}

export default function PlaylistBuilder({ playlist, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEditSlide, setMenuEditSlide] = useState(null);
  const [textOpen, setTextOpen] = useState(false);
  const [textEditSlide, setTextEditSlide] = useState(null);

  const sorted = [...(playlist || [])].sort((a, b) => a.order - b.order);
  const existingIds = sorted
    .filter(
      (s) =>
        s.contentType !== CONTENT_TYPES.MENU && s.contentType !== CONTENT_TYPES.TEXT,
    )
    .map((s) => `${s.contentType}:${s.contentId}`);

  const updateList = (next) => {
    onChange?.(
      next.map((item, i) => ({
        ...item,
        ...PLAYLIST_TRANSITION_TEMPLATE,
        order: i,
      })),
    );
  };

  const move = (idx, dir) => {
    const next = [...sorted];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    updateList(next);
  };

  const removeAt = (idx) => {
    updateList(sorted.filter((_, i) => i !== idx));
  };

  const patchAt = (idx, patch) => {
    updateList(sorted.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const addFromCatalog = (item) => {
    const slide = {
      id: slideUid(),
      contentType: item.type,
      contentId: item.id,
      title: item.title,
      subtitle: item.subtitle || "",
      mediaPath: item.mediaPath,
      price: item.price,
      durationSeconds: item.durationHint || 8,
      ...PLAYLIST_TRANSITION_TEMPLATE,
      order: sorted.length,
    };
    updateList([...sorted, slide]);
  };

  const openMenuDialog = (slide = null) => {
    setMenuEditSlide(slide);
    setMenuOpen(true);
  };

  const handleMenuConfirm = (menuSlide) => {
    if (menuEditSlide) {
      updateList(
        sorted.map((s) => (s.id === menuEditSlide.id ? { ...menuSlide, order: s.order } : s)),
      );
    } else {
      updateList([...sorted, { ...menuSlide, order: sorted.length }]);
    }
    setMenuEditSlide(null);
  };

  const openTextDialog = (slide = null) => {
    setTextEditSlide(slide);
    setTextOpen(true);
  };

  const handleTextConfirm = (textSlide) => {
    if (textEditSlide) {
      updateList(
        sorted.map((s) => (s.id === textEditSlide.id ? { ...textSlide, order: s.order } : s)),
      );
    } else {
      updateList([...sorted, { ...textSlide, order: sorted.length }]);
    }
    setTextEditSlide(null);
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Añade <strong>productos</strong>, <strong>tableros menú</strong>, <strong>mensajes de texto</strong>,
        imágenes o videos. El título del menú lo defines al crearlo o editándolo en la playlist.
      </Alert>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PlaylistPlayIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Lista de reproducción
          </Typography>
          <Chip size="small" label={`${sorted.length} piezas`} />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TextFieldsIcon />}
            onClick={() => openTextDialog(null)}
          >
            Mensaje texto
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewModuleIcon />}
            onClick={() => openMenuDialog(null)}
          >
            Tablero menú
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
            Añadir contenido
          </Button>
        </Stack>
      </Stack>

      {!sorted.length ? (
        <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary" gutterBottom>
            Añade productos, tableros menú, banners o videos.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<TextFieldsIcon />} onClick={() => openTextDialog(null)}>
              Mensaje de texto
            </Button>
            <Button variant="outlined" startIcon={<ViewModuleIcon />} onClick={() => openMenuDialog(null)}>
              Tablero menú
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
              Añadir contenido
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {sorted.map((slide, idx) => {
            const thumb = thumbUrl(slide);
            return (
              <Card key={slide.id} variant="outlined">
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontWeight={800} color="primary.main" sx={{ minWidth: 24 }}>
                      {idx + 1}
                    </Typography>

                    {thumb ? (
                      <Box
                        component="img"
                        src={thumb}
                        alt=""
                        sx={{
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 1,
                          bgcolor: "action.hover",
                          flexShrink: 0,
                        }}
                      />
                    ) : slide.contentType === CONTENT_TYPES.MENU ? (
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1,
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ViewModuleIcon fontSize="small" />
                      </Box>
                    ) : slide.contentType === CONTENT_TYPES.TEXT ? (
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1,
                          bgcolor: "secondary.main",
                          color: "secondary.contrastText",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <TextFieldsIcon fontSize="small" />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1,
                          bgcolor: "action.selected",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="caption">
                          {slide.contentType === CONTENT_TYPES.VIDEO ? "VID" : "—"}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={700} noWrap>
                          {slide.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={CONTENT_TYPE_LABELS[slide.contentType] || slide.contentType}
                          variant="outlined"
                        />
                        {slide.price != null && slide.contentType !== CONTENT_TYPES.MENU && (
                          <Chip size="small" label={`$${Number(slide.price).toFixed(2)}`} color="primary" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {slide.contentType === CONTENT_TYPES.MENU
                          ? `${slide.menuItems?.length || 0} productos · ${slide.durationSeconds}s`
                          : slide.contentType === CONTENT_TYPES.TEXT && slide.subtitle
                            ? `${slide.subtitle} · ${slide.durationSeconds}s`
                            : `${slide.durationSeconds}s · fundido`}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5}>
                      {slide.contentType === CONTENT_TYPES.MENU ? (
                        <IconButton size="small" onClick={() => openMenuDialog(slide)} title="Editar tablero menú">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                      {slide.contentType === CONTENT_TYPES.TEXT ? (
                        <IconButton size="small" onClick={() => openTextDialog(slide)} title="Editar mensaje">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                      <IconButton size="small" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => move(idx, 1)}
                        disabled={idx === sorted.length - 1}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeAt(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {slide.contentType === CONTENT_TYPES.MENU ? (
                    <Box sx={{ mt: 1.5, pl: { xs: 0, sm: 10 } }}>
                      <TextField
                        label="Título del tablero (cabecera en pantalla)"
                        size="small"
                        fullWidth
                        value={slide.title || ""}
                        onChange={(e) => patchAt(idx, { title: e.target.value })}
                        placeholder="Ej. Ofertas del día, Nuestro menú"
                      />
                    </Box>
                  ) : null}

                  {slide.contentType === CONTENT_TYPES.PRODUCT ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5, pl: { xs: 0, sm: 10 } }}>
                      <TitleFontStyleSelect
                        value={slide.titleFontStyle}
                        onChange={(v) => patchAt(idx, { titleFontStyle: v })}
                        label="Estilo del nombre del producto"
                      />
                      <TitleFontSizeSlider
                        value={slide.titleFontSize ?? TITLE_FONT_SIZE.PRODUCT_DEFAULT}
                        onChange={(v) => patchAt(idx, { titleFontSize: v })}
                        defaultValue={TITLE_FONT_SIZE.PRODUCT_DEFAULT}
                        label="Tamaño del nombre del producto"
                      />
                    </Stack>
                  ) : null}

                  {slide.contentType === CONTENT_TYPES.TEXT ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5, pl: { xs: 0, sm: 10 } }}>
                      <TitleFontStyleSelect
                        value={slide.titleFontStyle}
                        onChange={(v) => patchAt(idx, { titleFontStyle: v })}
                        label="Estilo del mensaje"
                      />
                      <TitleFontSizeSlider
                        value={slide.titleFontSize ?? TITLE_FONT_SIZE.TEXT_DEFAULT}
                        onChange={(v) => patchAt(idx, { titleFontSize: v })}
                        defaultValue={TITLE_FONT_SIZE.TEXT_DEFAULT}
                        label="Tamaño del mensaje principal"
                      />
                    </Stack>
                  ) : null}

                  <Box sx={{ mt: 1.5, pl: { xs: 0, sm: 10 } }}>
                    <Typography variant="caption" gutterBottom display="block">
                      Duración ({MIN_SLIDE_DURATION_SEC}–{MAX_SLIDE_DURATION_SEC} s)
                    </Typography>
                    <Slider
                      size="small"
                      min={MIN_SLIDE_DURATION_SEC}
                      max={MAX_SLIDE_DURATION_SEC}
                      value={slide.durationSeconds}
                      onChange={(_, v) => patchAt(idx, { durationSeconds: v })}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <ContentPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addFromCatalog}
        existingIds={existingIds}
      />

      <MenuBoardDialog
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          setMenuEditSlide(null);
        }}
        onConfirm={handleMenuConfirm}
        initialSlide={menuEditSlide}
      />

      <TextMessageDialog
        open={textOpen}
        onClose={() => {
          setTextOpen(false);
          setTextEditSlide(null);
        }}
        onConfirm={handleTextConfirm}
        initialSlide={textEditSlide}
      />
    </Box>
  );
}
