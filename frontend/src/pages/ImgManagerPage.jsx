/**
 * Control de imágenes del servidor (/img). Solo Programador.
 */
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import TablePro from "../components/Tables/TablePro.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import UploadImageForm from "../components/Forms/UploadImageForm.jsx";
import {
  deleteImageRequest,
  downloadFolderZipRequest,
  scanImagesRequest,
} from "../api/imgRequest.js";
import { pathImg } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ImgManagerPage() {
  const { user, toast } = useAuth();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [folder, setFolder] = useState("");
  const [maxDepth, setMaxDepth] = useState(5);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchScan = async () => {
    setLoading(true);
    try {
      const { data } = await scanImagesRequest({ folder, maxDepth });
      setRows(data?.files || []);
      setTotals(data?.totals || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.loginRol === "Programador") fetchScan().catch(() => {});
  }, [user?.loginRol]);

  if (user?.loginRol !== "Programador") return <Navigate to="/" replace />;

  const confirmDelete = async () => {
    if (!rowToDelete?.relPath) return;
    try {
      await toast({ promise: deleteImageRequest(rowToDelete.relPath) });
      setOpenDelete(false);
      setRowToDelete(null);
      await fetchScan();
    } catch {
      /* toast */
    }
  };

  const downloadZip = async () => {
    try {
      const { data } = await downloadFolderZipRequest(folder);
      const blob = new Blob([data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(folder || "img").replace(/[/\\]/g, "_")}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        message: error?.response?.data?.message || "Error al descargar ZIP",
        variant: "error",
      });
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "preview",
        label: "Vista",
        render: (row) => (
          <Box
            component="img"
            src={`${pathImg}${row.relPath}`}
            alt={row.name}
            sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1 }}
          />
        ),
      },
      { id: "relPath", label: "Ruta", getSearchValue: (r) => r.relPath },
      { id: "name", label: "Nombre" },
      { id: "sizeHuman", label: "Tamaño" },
      {
        id: "actions",
        label: "Acciones",
        render: (row) => (
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              onClick={() => {
                setRowToDelete(row);
                setOpenDelete(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Control de imágenes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Base: <strong>{pathImg}</strong>
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small"
          label="Carpeta"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="products, branding…"
          fullWidth
        />
        <TextField
          size="small"
          label="Profundidad"
          type="number"
          value={maxDepth}
          onChange={(e) => setMaxDepth(Number(e.target.value || 5))}
          sx={{ width: 120 }}
        />
        <Tooltip title="Escanear">
          <IconButton onClick={() => fetchScan()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button startIcon={<UploadFileIcon />} onClick={() => setOpenUpload(true)}>
          Subir
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={downloadZip}>
          ZIP
        </Button>
      </Stack>

      <Chip size="small" label={`Archivos: ${totals?.totalFiles ?? 0}`} sx={{ mb: 1 }} />
      <Chip size="small" label={`Tamaño: ${totals?.totalSizeHuman ?? "0 B"}`} sx={{ mb: 2, ml: 1 }} />

      <TablePro title="Imágenes" rows={rows} columns={columns} showSearch showPagination defaultRowsPerPage={10} loading={loading} />

      <SimpleDialog open={openUpload} onClose={() => setOpenUpload(false)} title="Subir imagen" maxWidth="sm" fullWidth>
        <UploadImageForm
          defaultFolder={folder}
          onClose={() => setOpenUpload(false)}
          onUploaded={() => {
            setOpenUpload(false);
            fetchScan();
          }}
        />
      </SimpleDialog>

      <SimpleDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Eliminar imagen"
        message={`¿Eliminar ${rowToDelete?.relPath}?`}
        onClickAccept={confirmDelete}
      />
    </Box>
  );
}
