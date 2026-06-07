import {
  Container,
  IconButton,
  Button,
  Tooltip,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete, Category } from "@mui/icons-material";
import toast from "react-hot-toast";
import CategoryForm from "./components/CategoryForm";
import {
  getCategories,
  deleteCategoryRequest,
} from "../../../api/inventoryControlRequest.js";

import DataTable from "../../../components/Tables/DataTable";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";

function CategoryPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");

  const fecthData = async () => {
    const { data } = await getCategories();
    setData(data);
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const deleteData = async () => {
    toast.promise(
      deleteCategoryRequest(dataToDelete.id),
      {
        loading: "Eliminando...",
        success: "Categoría eliminada con éxito",
        error: "Ocurrió un error",
      },
      {
        position: "top-right",
        style: { fontFamily: "roboto" },
      }
    );
    setData(data.filter((item) => item.id !== dataToDelete.id));
    handleDialog();
  };

  const columns = [
    {
      headerName: "#",
      field: "#",
      width: 40,
      sortable: false,
      renderCell: (params, index) => index,
    },
    {
      headerName: "Nombre",
      field: "name",
      width: 200,
    },
    {
      headerName: "Descripción",
      field: "description",
      width: 300,
    },
       {
      headerName: "Publico?",
      field: "isPublic",
      width: 200,
      renderCell: (params) => {
        return params.row.isPublic?"Si":"No"
      }
    },
    {
      headerName: "Acciones",
      field: "actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params.row);
                setIsEditing(true);
                settitleUserDialog("Editar Categoría");
                handleDialogUser();
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
        ¿Está seguro de eliminar esta categoría?
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
        />
      </SimpleDialog>

      <Button
        variant="text"
        endIcon={<Category />}
        onClick={() => {
          setIsEditing(false);
          settitleUserDialog("Agregar Categoría");
          handleDialogUser();
        }}
      >
        Crear Categoría
      </Button>

      <DataTable data={data} columns={columns} />
    </Container>
  );
}

export default CategoryPage;
