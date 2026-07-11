import { Container, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete } from "@mui/icons-material";
import TablePro from "../../../components/Tables/TablePro";
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
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows } = await getAllSuppliersRequest();
      setData(rows);
    } finally {
      setLoading(false);
    }
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
    { label: "Nombre", id: "name", width: 200 },
    { label: "Teléfono", id: "phone", width: 150, render: (row) => row.phone || "—" },
    { label: "Correo", id: "email", width: 200, render: (row) => row.email || "—" },
    { label: "Dirección", id: "address", width: 220, render: (row) => row.address || "—" },
    {
      label: "Descripción",
      id: "notes",
      width: 260,
      render: (row) => row.notes || "—",
    },
    {
      label: "Acciones",
      id: "actions",
      width: 120,
      stopRowClick: true,
      render: (row) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              onClick={() => {
                setDatos(row);
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
                setDataToDelete(row);
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

      <TablePro
        rows={data}
        columns={columns}
        title="PROVEEDORES"
        showIndex
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100, 200]}
        loading={loading}
      />
    </Container>
  );
}

export default SupplierPage;
