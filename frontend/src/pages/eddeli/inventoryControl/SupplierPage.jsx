import { Container, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete } from "@mui/icons-material";
import DataTable from "../../../components/Tables/DataTable";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import SupplierForm from "./components/SupplierForm";
import {
  getAllSuppliersRequest,
  deleteSupplierRequest,
} from "../../../api/inventoryControlRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

function SupplierPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleDialog, setTitleDialog] = useState("");

  const fetchData = async () => {
    const { data: rows } = await getAllSuppliersRequest();
    setData(rows);
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogForm = () => setOpenDialog(!openDialog);

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteSupplierRequest(dataToDelete.id),
      reload: fetchData,
      onClose: handleDialog,
    });
  };

  const columns = [
    { headerName: "#", field: "#", width: 40, renderCell: (_, i) => i + 1 },
    { headerName: "Nombre", field: "name", width: 200 },
    { headerName: "Teléfono", field: "phone", width: 150 },
    { headerName: "Correo", field: "email", width: 200 },
    { headerName: "Dirección", field: "address", width: 220 },
    {
      headerName: "Descripción",
      field: "notes",
      width: 260,
      renderCell: (params) => params.row.notes || "—",
    },
    {
      headerName: "Acciones",
      field: "actions",
      width: 120,
      renderCell: (params) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(params.row);
                setIsEditing(true);
                setTitleDialog("Editar proveedor");
                handleDialogForm();
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              onClick={() => {
                setDataToDelete(params.row);
                handleDialog();
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
    void fetchData();
  }, []);

  return (
    <Container>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Proveedores
      </Typography>

      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar proveedor"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este proveedor?
      </SimpleDialog>

      <SimpleDialog open={openDialog} onClose={handleDialogForm} tittle={titleDialog}>
        <SupplierForm
          onClose={handleDialogForm}
          isEditing={isEditing}
          datos={datos}
          reload={fetchData}
        />
      </SimpleDialog>

      <Button
        variant="contained"
        onClick={() => {
          setIsEditing(false);
          setDatos([]);
          setTitleDialog("Agregar proveedor");
          handleDialogForm();
        }}
        sx={{ mb: 2 }}
      >
        Agregar proveedor
      </Button>

      <DataTable data={data} columns={columns} />
    </Container>
  );
}

export default SupplierPage;
