import { Container, IconButton, Button, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Edit, Delete, Straighten } from "@mui/icons-material";
import UnitForm from "./components/UnitForm.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import { getUnits, deleteUnitRequest } from "../../../api/inventoryControlRequest";

function UnitPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");
  const [loading, setLoading] = useState(true);

  const fecthData = async () => {
    setLoading(true);
    try {
      const { data: rows } = await getUnits();
      setData(rows || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteUnitRequest(dataToDelete.id),
      reload: fecthData,
      onClose: handleDialog,
    });
  };

  const columns = [
    { label: "Nombre", id: "name" },
    { label: "Abreviatura", id: "abbreviation" },
    {
      label: "Descripción",
      id: "description",
      render: (row) => row.description || "—",
    },
    {
      label: "Acciones",
      id: "actions",
      stopRowClick: true,
      getSearchValue: () => "",
      render: (row) => (
        <>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => {
                setDatos(row);
                setIsEditing(true);
                settitleUserDialog("Editar Unidad");
                handleDialogUser();
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                handleDialog();
                setDataToDelete(row);
              }}
            >
              <Delete fontSize="small" />
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
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Unidades
      </Typography>

      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Unidad"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar esta unidad?
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
        <UnitForm
          onClose={handleDialogUser}
          isEditing={isEditing}
          datos={datos}
          reload={fecthData}
        />
      </SimpleDialog>

      <Button
        variant="contained"
        endIcon={<Straighten />}
        onClick={() => {
          setIsEditing(false);
          setDatos([]);
          settitleUserDialog("Agregar Unidad");
          handleDialogUser();
        }}
        sx={{ mb: 2 }}
      >
        Crear Unidad
      </Button>

      <TablePro
        rows={data}
        columns={columns}
        title="UNIDADES"
        showIndex
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100]}
        loading={loading}
      />
    </Container>
  );
}

export default UnitPage;
