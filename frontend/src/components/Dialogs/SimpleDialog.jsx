/**
 * Diálogo modal genérico con título, contenido y acciones.
 */
import { useId } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Box,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

function SimpleDialog({
  onClickAccept,
  message,
  title,
  open,
  onClose,
  children,
  maxWidth = "sm",
  fullWidth = false,
  hideClose = false,
  disableClose = false,
}) {
  const titleId = useId();
  const descId = useId();

  const handleClose = (event, reason) => {
    if (
      disableClose &&
      (reason === "backdropClick" || reason === "escapeKeyDown")
    )
      return;
    onClose?.(event, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableEscapeKeyDown={disableClose}
      aria-labelledby={titleId}
      aria-describedby={!children ? descId : undefined}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <DialogTitle id={titleId} sx={{ flexGrow: 1 }}>
          {title}
        </DialogTitle>
        {!hideClose && (
          <IconButton
            aria-label="close"
            onClick={() => onClose?.()}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <DialogContent>
        {children ? (
          children
        ) : (
          <DialogContentText id={descId}>{message}</DialogContentText>
        )}
      </DialogContent>

      {onClickAccept && (
        <DialogActions>
          <Button onClick={() => onClose?.()}>Cancelar</Button>
          <Button onClick={onClickAccept} autoFocus>
            Aceptar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default SimpleDialog;
