import {
  Container,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete } from "@mui/icons-material";
import TablePro from "../../../components/Tables/TablePro.jsx";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import CustomerForm from "./components/CustomerForm";
import { getAllCustomersRequest, deleteCustomerRequest } from "../../../api/inventoryControlRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

const cellText = (value) => (
  <Typography variant="body2" noWrap title={value || ""}>
    {value || "—"}
  </Typography>
);

function CustomerPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, setTitleUserDialog] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await getAllCustomersRequest();
      setData(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteCustomerRequest(dataToDelete.id),
      reload: fetchData,
      onClose: handleDialog,
    });
  };

  const openEdit = (row) => {
    setDatos(row);
    setIsEditing(true);
    setTitleUserDialog("Editar Cliente");
    handleDialogUser();
  };

  const openDelete = (row) => {
    setDataToDelete(row);
    handleDialog();
  };

  const columns = [
    { label: "Nombre", id: "name", render: (row) => cellText(row.name) },
    { label: "Cédula", id: "cedula", render: (row) => cellText(row.cedula) },
    { label: "Teléfono", id: "phone", render: (row) => cellText(row.phone) },
    { label: "Email", id: "email", render: (row) => cellText(row.email) },
    { label: "Dirección", id: "address", render: (row) => cellText(row.address) },
    {
      label: "Acciones",
      id: "actions",
      stopRowClick: true,
      getSearchValue: () => "",
      render: (row) => (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => openDelete(row)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Container>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Cliente"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este cliente?
      </SimpleDialog>

      <SimpleDialog open={openDialog} onClose={handleDialogUser} tittle={titleUserDialog}>
        <CustomerForm
          onClose={handleDialogUser}
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
          setTitleUserDialog("Agregar Cliente");
          handleDialogUser();
        }}
        sx={{ mb: 1.5 }}
      >
        Agregar Cliente
      </Button>

      <TablePro
        title="CLIENTES"
        rows={data}
        columns={columns}
        showSearch
        showPagination
        showIndex
        defaultRowsPerPage={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
      />
    </Container>
  );
}

export default CustomerPage;
