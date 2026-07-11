import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Edit, Delete, Category, Add, SubdirectoryArrowRight } from "@mui/icons-material";
import CategoryForm from "./components/CategoryForm";
import {
  getCategories,
  deleteCategoryRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import {
  getRootCategories,
  getChildCategories,
  hasChildCategories,
} from "../../../utils/categoryUtils.js";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";

const TABLE_HEIGHT = "calc(100vh - 240px)";

function CategoryPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState({});
  const [titleUserDialog, settitleUserDialog] = useState("");
  const [presetParentId, setPresetParentId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fecthData = async () => {
    setLoading(true);
    try {
      const { data: rows } = await getCategories();
      const list = rows || [];
      setData(list);
      setSelectedRootId((prev) => {
        const roots = getRootCategories(list);
        if (prev && roots.some((r) => Number(r.id) === Number(prev))) return prev;
        return roots[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  };

  const rootCategories = useMemo(
    () =>
      getRootCategories(data).sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "es"),
      ),
    [data],
  );

  const selectedRoot = useMemo(
    () => rootCategories.find((c) => Number(c.id) === Number(selectedRootId)) ?? null,
    [rootCategories, selectedRootId],
  );

  const childCategories = useMemo(() => {
    if (!selectedRootId) return [];
    const children = getChildCategories(data, selectedRootId).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "es"),
    );
    const q = search.trim().toLowerCase();
    if (!q) return children;
    return children.filter((c) => String(c.name).toLowerCase().includes(q));
  }, [data, selectedRootId, search]);

  const filteredRootCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rootCategories;
    return rootCategories.filter((root) => {
      if (String(root.name).toLowerCase().includes(q)) return true;
      return getChildCategories(data, root.id).some((c) =>
        String(c.name).toLowerCase().includes(q),
      );
    });
  }, [rootCategories, data, search]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data.length) return;
    const match =
      data.find((c) => String(c.name).toLowerCase().includes(q)) ?? null;
    if (!match) return;
    if (match.parentId) setSelectedRootId(match.parentId);
    else setSelectedRootId(match.id);
  }, [search, data]);

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => {
    setOpenDialog(!openDialog);
    if (openDialog) setPresetParentId(null);
  };

  const openCreateRoot = () => {
    setIsEditing(false);
    setDatos({});
    setPresetParentId(null);
    settitleUserDialog("Nueva categoría principal");
    setOpenDialog(true);
  };

  const openCreateChild = () => {
    if (!selectedRoot) return;
    setIsEditing(false);
    setDatos({});
    setPresetParentId(selectedRoot.id);
    settitleUserDialog(`Nueva subcategoría de ${selectedRoot.name}`);
    setOpenDialog(true);
  };

  const openEdit = (row, isRoot) => {
    setDatos(row);
    setIsEditing(true);
    setPresetParentId(row.parentId || null);
    settitleUserDialog(
      isRoot
        ? `Editar categoría — ${row.name}`
        : `Editar subcategoría — ${row.name}`,
    );
    setOpenDialog(true);
  };

  const openDelete = (row) => {
    setDataToDelete(row);
    handleDialog();
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteCategoryRequest(dataToDelete.id),
      reload: fecthData,
      onClose: handleDialog,
    });
  };

  const renderActions = (row, isRoot) => (
    <Stack direction="row" spacing={0.25} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Editar">
        <IconButton size="small" onClick={() => openEdit(row, isRoot)}>
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar">
        <IconButton size="small" color="error" onClick={() => openDelete(row)}>
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const rootColumns = [
    {
      id: "name",
      label: "Nombre",
      render: (row) => (
        <Typography variant="body2" fontWeight={700}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: "childCount",
      label: "Subcategorías",
      getSortValue: (row) => getChildCategories(data, row.id).length,
      render: (row) => {
        const count = getChildCategories(data, row.id).length;
        return (
          <Chip
            size="small"
            label={count}
            color={count > 0 ? "primary" : "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      id: "description",
      label: "Descripción",
      render: (row) => row.description || "—",
    },
    {
      id: "isPublic",
      label: "Público",
      render: (row) => (row.isPublic ? "Sí" : "No"),
    },
    {
      id: "actions",
      label: "Acciones",
      stopRowClick: true,
      render: (row) => renderActions(row, true),
    },
  ];

  const childColumns = [
    {
      id: "name",
      label: "Nombre",
      render: (row) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <SubdirectoryArrowRight fontSize="small" color="action" />
          <Typography variant="body2">{row.name}</Typography>
        </Stack>
      ),
    },
    {
      id: "description",
      label: "Descripción",
      render: (row) => row.description || "—",
    },
    {
      id: "isPublic",
      label: "Público",
      render: (row) => (row.isPublic ? "Sí" : "No"),
    },
    {
      id: "actions",
      label: "Acciones",
      stopRowClick: true,
      render: (row) => renderActions(row, false),
    },
  ];

  useEffect(() => {
    fecthData();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar categoría"
        onClickAccept={deleteData}
      >
        {hasChildCategories(data, dataToDelete.id)
          ? "Esta categoría tiene subcategorías. Elimínalas primero."
          : "¿Está seguro de eliminar esta categoría?"}
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
        <CategoryForm
          onClose={handleDialogUser}
          isEditing={isEditing}
          datos={datos}
          reload={fecthData}
          allCategories={data}
          presetParentId={presetParentId}
          onSaved={({ parentId }) => {
            if (parentId) setSelectedRootId(parentId);
          }}
        />
      </SimpleDialog>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.5}
        mb={2}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
            <Category color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Categorías y subcategorías
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Selecciona una categoría principal a la izquierda para ver y editar sus
            subcategorías a la derecha. Usa el buscador para encontrar por nombre.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Buscar categoría o subcategoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { sm: 280 } }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              Categorías principales
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={openCreateRoot}
            >
              Nueva categoría
            </Button>
          </Stack>
          <TablePro
            columns={rootColumns}
            rows={filteredRootCategories}
            showIndex
            defaultRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            tableMaxHeight={TABLE_HEIGHT}
            onRowClick={(row) => setSelectedRootId(row.id)}
            selectedRowId={selectedRootId}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} lg={7}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Subcategorías
              </Typography>
              {selectedRoot ? (
                <Typography variant="caption" color="text.secondary">
                  de {selectedRoot.name} · {childCategories.length} registrada(s)
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Selecciona una categoría principal
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={openCreateChild}
              disabled={!selectedRoot}
            >
              Nueva subcategoría
            </Button>
          </Stack>

          {selectedRoot ? (
            <TablePro
              columns={childColumns}
              rows={childCategories}
              showIndex
              defaultRowsPerPage={10}
              rowsPerPageOptions={[5, 10, 25, 50]}
              tableMaxHeight={TABLE_HEIGHT}
              loading={loading}
            />
          ) : (
            <Paper
              sx={{
                height: TABLE_HEIGHT,
                minHeight: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                borderRadius: 2,
                border: "1px dashed",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {rootCategories.length === 0
                  ? "Crea una categoría principal para empezar."
                  : "Haz clic en una categoría de la izquierda para ver sus subcategorías."}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default CategoryPage;
