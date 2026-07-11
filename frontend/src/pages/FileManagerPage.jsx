// src/pages/Files/FilesManagerPage.jsx
import {
    Container,
    Box,
    Typography,
    Button,
    IconButton,
    Tooltip,
    TextField,
    Stack,
    Chip,
    FormControlLabel,
    Checkbox,
  } from "@mui/material";
  import { useEffect, useMemo, useState } from "react";
  import {
    Delete,
    Refresh,
    UploadFile,
    FolderOpen,
    Download,
    DeleteForever,
    Description,
    PictureAsPdf,
    TableChart,
    Article,
    InsertDriveFile,
  } from "@mui/icons-material";
  import toast from "react-hot-toast";
  
  import SimpleDialog from "../components/Dialogs/SimpleDialog";
  import TablePro from "../components/Tables/TablePro";
  
  import { pathFiles } from "../api/axios"; // ✅ agrega esto en axios.js (similar a pathImg)
  import {
    scanFilesRequest,
    deleteFileRequest,
    downloadFilesFolderZipRequest,
    deleteFilesFolderRequest,
    downloadOneFileRequest,
    saveBlobAsFile,
  } from "../api/fileRequest";
import UploadFileForm from "../components/Forms/UploadFileForm";
import { formatDateTime } from "../helpers/functions.js";

  
  const iconByExt = (ext = "") => {
    const e = String(ext || "").toLowerCase();
    if (e === ".pdf") return <PictureAsPdf />;
    if (e === ".xls" || e === ".xlsx" || e === ".csv") return <TableChart />;
    if (e === ".doc" || e === ".docx") return <Article />;
    if (e === ".txt" || e === ".md" || e === ".json" || e === ".xml") return <Description />;
    return <InsertDriveFile />;
  };
  
  function FilesManagerPage() {
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState(null);
  
    const [folder, setFolder] = useState(""); // ej: "Orders/123"
    const [maxDepth, setMaxDepth] = useState(5);
  
    const [openUpload, setOpenUpload] = useState(false);
  
    const [openDelete, setOpenDelete] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);
  
    // ✅ borrar carpeta
    const [openDeleteFolder, setOpenDeleteFolder] = useState(false);
    const [forceDeleteFolder, setForceDeleteFolder] = useState(false);
    const [loading, setLoading] = useState(true);
  
    const handleUploadDialog = () => setOpenUpload((p) => !p);
    const handleDeleteDialog = () => setOpenDelete((p) => !p);
  
    const handleDeleteFolderDialog = () => {
      setOpenDeleteFolder((p) => !p);
      if (!openDeleteFolder) setForceDeleteFolder(false);
    };
  
    const fetchScan = async () => {
      setLoading(true);
      try {
        const { data } = await scanFilesRequest({
          folder,
          maxDepth,
          includeAll: true,
        });
  
        setRows(data?.files || []);
        setTotals(data?.totals || null);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Error al escanear archivos");
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      fetchScan();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  
    const deleteSelected = async () => {
      if (!rowToDelete?.relPath) return;
  
      toast.promise(
        deleteFileRequest(rowToDelete.relPath),
        {
          loading: "Eliminando archivo...",
          success: "Archivo eliminado",
          error: (err) => err?.response?.data?.message || "Error al eliminar archivo",
        },
        { position: "top-right", style: { fontFamily: "roboto" } }
      );
  
      // optimista
      setRows((prev) => prev.filter((x) => x.relPath !== rowToDelete.relPath));
      handleDeleteDialog();
    };
  
    const downloadZip = async () => {
      try {
        const { data } = await downloadFilesFolderZipRequest(folder);
  
        const blob = new Blob([data], { type: "application/zip" });
        const url = window.URL.createObjectURL(blob);
  
        const a = document.createElement("a");
        const safeName = (folder || "files").replace(/[\/\\]/g, "_");
        a.href = url;
        a.download = `${safeName}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
  
        window.URL.revokeObjectURL(url);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Error al descargar ZIP");
      }
    };
  
    // ✅ Descargar 1 archivo (blob)
    const downloadOne = async (row) => {
      try {
        const { data } = await downloadOneFileRequest(row?.relPath || "");
        const fallbackName = row?.name || row?.relPath?.split("/")?.pop() || "archivo";
        saveBlobAsFile(data, fallbackName);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Error al descargar archivo");
      }
    };
  
    // ✅ eliminar carpeta (vacía o recursivo)
    const deleteCurrentFolder = async () => {
      const f = String(folder || "").trim();
  
      if (!f) {
        toast.error('Escribe una carpeta en el filtro (ej: "Orders/123")');
        return;
      }
  
      try {
        await toast.promise(
          deleteFilesFolderRequest(f, { force: forceDeleteFolder }),
          {
            loading: "Eliminando carpeta...",
            success: forceDeleteFolder
              ? "Carpeta eliminada (recursivo)"
              : "Carpeta eliminada (si estaba vacía)",
            error: (err) => err?.response?.data?.message || "Error al eliminar carpeta",
          },
          { position: "top-right", style: { fontFamily: "roboto" } }
        );
  
        handleDeleteFolderDialog();
        await fetchScan();
      } catch {}
    };
  
    const columns = useMemo(
      () => [
        {
          label: "",
          id: "icon",
          width: 60,
          render: (row) => (
            <Tooltip title={row.ext || "archivo"}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {iconByExt(row.ext)}
              </Box>
            </Tooltip>
          ),
        },
        {
          label: "Ruta",
          id: "relPath",
          width: 380,
          render: (row) => (
            <Typography variant="body2" noWrap title={row.relPath}>
              {row.relPath}
            </Typography>
          ),
        },
        { label: "Nombre", id: "name", width: 220 },
        {
          label: "Ext",
          id: "ext",
          width: 80,
          render: (row) => <Chip size="small" label={row.ext || "—"} />,
        },
        {
          label: "Tamaño",
          id: "sizeHuman",
          width: 120,
          render: (row) => row.sizeHuman || "—",
        },
        {
          label: "Modificado",
          id: "mtime",
          width: 180,
          render: (row) => formatDateTime(row?.mtime),
        },
        {
          label: "Acciones",
          id: "actions",
          width: 160,
          render: (row) => (
            <>
              <Tooltip title="Descargar">
                <IconButton onClick={() => downloadOne(row)}>
                  <Download />
                </IconButton>
              </Tooltip>
  
              <Tooltip title="Eliminar">
                <IconButton
                  onClick={() => {
                    setRowToDelete(row);
                    handleDeleteDialog();
                  }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
  
              <Tooltip title="Abrir carpeta (usar como filtro)">
                <IconButton
                  onClick={() => {
                    const parts = String(row.relPath || "").split("/");
                    parts.pop();
                    setFolder(parts.join("/"));
                  }}
                >
                  <FolderOpen />
                </IconButton>
              </Tooltip>
            </>
          ),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [folder]
    );
  
    return (
      <Container>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Control de Archivos
          </Typography>
  
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Base pública: <b>{pathFiles}</b>
          </Typography>
        </Box>
  
        {/* Filtros */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 1 }}
        >
          <TextField
            label="Carpeta (folder)"
            size="small"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder='Ej: "Orders" o "Orders/123" (vacío = todo)'
            fullWidth
          />
  
          <TextField
            label="Max Depth"
            size="small"
            type="number"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value || 0))}
            sx={{ width: 140 }}
          />
  
          <Tooltip title="Escanear / Recargar">
            <IconButton onClick={fetchScan}>
              <Refresh />
            </IconButton>
          </Tooltip>
  
          <Button variant="text" startIcon={<UploadFile />} onClick={handleUploadDialog}>
            Subir archivo
          </Button>
  
          <Button variant="text" startIcon={<Download />} onClick={downloadZip}>
            Descargar carpeta
          </Button>
  
          <Button
            variant="text"
            color="error"
            startIcon={<DeleteForever />}
            onClick={handleDeleteFolderDialog}
          >
            Eliminar carpeta
          </Button>
        </Stack>
  
        {/* Totales */}
        <Box sx={{ mb: 1 }}>
          <Chip size="small" label={`Archivos: ${totals?.totalFiles ?? 0}`} sx={{ mr: 1 }} />
          <Chip size="small" label={`Peso total: ${totals?.totalSizeHuman ?? "0 B"}`} />
        </Box>
  
        {/* Tabla */}
        <TablePro
          rows={rows}
          columns={columns}
          defaultRowsPerPage={10}
          title="ARCHIVOS"
          showIndex={true}
          loading={loading}
        />
  
        {/* Dialog subir */}
        <SimpleDialog
          open={openUpload}
          onClose={handleUploadDialog}
          tittle="Subir / Reemplazar archivo"
        >
          <UploadFileForm
            onClose={handleUploadDialog}
            defaultFolder={folder}
            onUploaded={() => {
              handleUploadDialog();
              fetchScan();
            }}
          />
        </SimpleDialog>
  
        {/* Dialog eliminar archivo */}
        <SimpleDialog
          open={openDelete}
          onClose={handleDeleteDialog}
          tittle="Eliminar archivo"
          onClickAccept={deleteSelected}
        >
          ¿Seguro que deseas eliminar?
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {rowToDelete?.relPath || "—"}
            </Typography>
          </Box>
        </SimpleDialog>
  
        {/* Dialog eliminar carpeta */}
        <SimpleDialog
          open={openDeleteFolder}
          onClose={handleDeleteFolderDialog}
          tittle="Eliminar carpeta"
          onClickAccept={deleteCurrentFolder}
        >
          <Typography variant="body2">Se eliminará la carpeta:</Typography>
  
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {folder || "— (vacío)"}
            </Typography>
          </Box>
  
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={forceDeleteFolder}
                  onChange={(e) => setForceDeleteFolder(e.target.checked)}
                />
              }
              label="Borrar recursivo (⚠️ elimina todo dentro)"
            />
            <Typography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
              Si NO está marcado, solo elimina si la carpeta está vacía.
            </Typography>
          </Box>
        </SimpleDialog>
      </Container>
    );
  }
  
  export default FilesManagerPage;
  