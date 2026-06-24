import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Edit, Delete, Category, Add } from "@mui/icons-material";
import CategoryForm from "./components/CategoryForm";
import {
  getCategories,
  deleteCategoryRequest,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { buildCategoryTreeRows, hasChildCategories } from "../../../utils/categoryUtils.js";

import DataTable from "../../../components/Tables/DataTable";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";

function CategoryPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");
  const [presetParentId, setPresetParentId] = useState(null);

  const fecthData = async () => {
    const { data: rows } = await getCategories();
    setData(rows || []);
  };

  const tableRows = useMemo(() => buildCategoryTreeRows(data), [data]);

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

  const openCreateChild = (parentRow) => {
    setIsEditing(false);
    setDatos({});
    setPresetParentId(parentRow.id);
    settitleUserDialog(`Nueva subcategoría de ${parentRow.name}`);
    setOpenDialog(true);
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteCategoryRequest(dataToDelete.id),
      reload: fecthData,
      onClose: handleDialog,
    });
  };

  const columns = [
    {
      headerName: "#",
      field: "#",
      width: 40,
      sortable: false,
      renderCell: (_params, index) => index + 1,
    },
    {
      headerName: "Nombre",
      field: "name",
      width: 260,
      renderCell: (params) => (
        <Box sx={{ pl: params.row.depth * 2.5 }}>
          <Typography variant="body2" fontWeight={params.row.isRoot ? 700 : 400}>
            {params.row.depth > 0 ? `↳ ${params.row.name}` : params.row.name}
          </Typography>
        </Box>
      ),
    },
    {
      headerName: "Tipo",
      field: "tipo",
      width: 140,
      renderCell: (params) =>
        params.row.isRoot ? (
          <Chip size="small" label="Principal" color="primary" variant="outlined" />
        ) : (
          <Chip size="small" label="Subcategoría" variant="outlined" />
        ),
    },
    {
      headerName: "Categoría padre",
      field: "parentName",
      width: 160,
      renderCell: (params) => params.row.parentName || "—",
    },
    {
      headerName: "Descripción",
      field: "description",
      width: 280,
    },
    {
      headerName: "Público?",
      field: "isPublic",
      width: 90,
      renderCell: (params) => (params.row.isPublic ? "Sí" : "No"),
    },
    {
      headerName: "Acciones",
      field: "actions",
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <>
          {params.row.isRoot ? (
            <Tooltip title="Agregar subcategoría">
              <IconButton onClick={() => openCreateChild(params.row)} size="small" color="primary">
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params.row);
                setIsEditing(true);
                setPresetParentId(params.row.parentId || null);
                settitleUserDialog(
                  params.row.parentId
                    ? `Editar subcategoría — ${params.row.name}`
                    : `Editar categoría — ${params.row.name}`,
                );
                setOpenDialog(true);
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                handleDialog();
                setDataToDelete(params.row);
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  useEffect(() => {
    fecthData();
  }, []);

  return (
    <Container>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Categoría"
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
        />
      </SimpleDialog>

      <Button variant="text" endIcon={<Category />} onClick={openCreateRoot} sx={{ mr: 1 }}>
        Nueva categoría principal
      </Button>

      <DataTable data={tableRows} columns={columns} />
    </Container>
  );
}

export default CategoryPage;
