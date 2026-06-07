/** Formulario subir archivo al servidor /files. */
import { useEffect, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { uploadFileRequest } from "../../api/fileRequest.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function UploadFileForm({ onClose, defaultFolder = "", onUploaded }) {
  const { toast } = useAuth();
  const [folder, setFolder] = useState(defaultFolder);
  const [name, setName] = useState("");
  const [replace, setReplace] = useState(true);
  const [file, setFile] = useState(null);

  useEffect(() => setFolder(defaultFolder || ""), [defaultFolder]);

  const submit = async () => {
    if (!file) {
      toast({ message: "Selecciona un archivo", variant: "warning" });
      return;
    }
    try {
      await toast({
        promise: uploadFileRequest({ file, folder: folder.trim(), name: name.trim(), replace }),
      });
      setFile(null);
      setName("");
      onUploaded?.();
      onClose?.();
    } catch {
      /* toast */
    }
  };

  return (
    <Box sx={{ pt: 1 }}>
      <Stack spacing={2}>
        <TextField label="Carpeta" value={folder} onChange={(e) => setFolder(e.target.value)} fullWidth size="small" />
        <TextField label="Nombre (opcional)" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
        <FormControlLabel
          control={<Checkbox checked={replace} onChange={(e) => setReplace(e.target.checked)} />}
          label="Reemplazar si existe"
        />
        <Button variant="outlined" component="label" fullWidth>
          Elegir archivo
          <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Button>
        {file && (
          <Typography variant="body2" color="text.secondary">
            {file.name} ({Math.round(file.size / 1024)} KB)
          </Typography>
        )}
        <Button variant="contained" onClick={submit}>
          Subir archivo
        </Button>
      </Stack>
    </Box>
  );
}
