/**
 * @deprecated Duplicado de StoresManagerPage.jsx (ruta activa: /stores_manager).
 * No está enlazado en el router. Usar StoresManagerPage o borrar este archivo.
 */
import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { Edit, Delete, Storefront } from "@mui/icons-material";

import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import TablePro from "../../../components/Tables/TablePro";

import StoreForm from "./components/StoreForm";
import {
  getStoresRequest,
  deleteStoreRequest,
} from "../../../api/inventoryControlRequest";

import { pathImg } from "../../../api/axios";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

function StoresPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState({});
  const [titleDialog, setTitleDialog] = useState("");

  const fetchData = async () => {
    const { data } = await getStoresRequest();
    setData(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteDialog = () => setOpenDelete((v) => !v);
  const handleFormDialog = () => setOpenDialog((v) => !v);

  const confirmDelete = async () => {
    if (!toDelete?.id) return;
    await runMutationReload(toast, {
      promise: deleteStoreRequest(toDelete.id),
      reload: fetchData,
      onClose: handleDeleteDialog,
    });
  };

  const columns = [
    {
      label: "Imagen",
      id: "imageUrl",
      width: 90,
      render: (row) => {
        const filename = row?.imageUrl;
        const src = filename ? `${pathImg}${filename}` : null;

        return src ? (
          <img
            src={src}
            alt={row?.name || "img"}
            style={{
              width: 60,
              height: 60,
              objectFit: "cover",
              borderRadius: 8,
              display: "block",
            }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 1,
              bgcolor: "action.hover",
            }}
          />
        );
      },
    },
    { label: "Nombre", id: "name", width: 200 },
    {
      label: "Dirección",
      id: "address",
      width: 240,
      render: (row) => (
        <Typography variant="body2" noWrap title={row?.address || ""}>
          {row?.address || "—"}
        </Typography>
      ),
    },
    { label: "Ciudad", id: "city", width: 120 },
    { label: "Provincia", id: "province", width: 120 },
    { label: "Teléfono", id: "phone", width: 140 },
    {
      label: "Activo",
      id: "isActive",
      width: 80,
      render: (row) => (row?.isActive ? "Sí" : "No"),
    },
    {
      label: "Acciones",
      id: "actions",
      width: 150,
      render: (row) => (
        <>
          <Tooltip title="Editar punto de venta">
            <IconButton
              onClick={() => {
                setDatos(row);
                setIsEditing(true);
                setTitleDialog("Editar punto de venta");
                handleFormDialog();
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eliminar punto de venta">
            <IconButton
              onClick={() => {
                setToDelete(row);
                handleDeleteDialog();
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Container>
      {/* Dialog eliminar */}
      <SimpleDialog
        open={openDelete}
        onClose={handleDeleteDialog}
        tittle="Eliminar punto de venta"
        onClickAccept={confirmDelete}
      >
        ¿Está seguro de eliminar el punto de venta?
      </SimpleDialog>

      {/* Dialog crear o editar */}
      <SimpleDialog
        open={openDialog}
        onClose={handleFormDialog}
        tittle={titleDialog}
      >
        <StoreForm
          onClose={handleFormDialog}
          isEditing={isEditing}
          datos={datos}
          reload={fetchData}
        />
      </SimpleDialog>

      <Button
        variant="text"
        endIcon={<Storefront />}
        onClick={() => {
          setIsEditing(false);
          setDatos({});
          setTitleDialog("Agregar punto de venta");
          handleFormDialog();
        }}
        sx={{ mb: 1 }}
      >
        Crear punto de venta
      </Button>

      <TablePro
        rows={data}
        columns={columns}
        defaultRowsPerPage={10}
        title="PUNTOS DE VENTA"
        showIndex={true}
      />
    </Container>
  );
}

export default StoresPage;
