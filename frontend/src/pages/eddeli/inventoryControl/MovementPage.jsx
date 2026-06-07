import {
  Container,
  Button,
  Stack,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import MovementForm from "./components/MovementForm";
import MovementsListPanel from "./components/MovementsListPanel";
import { useAuth } from "../../../context/AuthContext";

import {
  getAllProducts,
  getAllMovements,
  deleteMovement,
  updateMovementsDateBatch,
} from "../../../api/inventoryControlRequest";

function MovementPage() {
  const { user, toast: toastAuth } = useAuth();
  const isProgrammer = user?.loginRol === "Programador";

  const [openDialog, setOpenDialog] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);

  const handleDialog = () => {
    setEditingMovement(null);
    setOpenDialog(!openDialog);
  };

  const openEdit = (row) => {
    setEditingMovement(row);
    setOpenDialog(true);
  };

  const fetchProducts = async () => {
    const { data } = await getAllProducts();
    setProducts(data);
  };

  const fetchMovements = async () => {
    const { data } = await getAllMovements();
    setMovements(data);
  };

  const handleDelete = async (row) => {
    if (!isProgrammer || !row?.id) return;
    if (!window.confirm(`¿Eliminar movimiento #${row.id}? Se recalcula el stock del producto.`)) {
      return;
    }
    await toastAuth({
      promise: deleteMovement(row.id),
      onSuccess: async () => {
        await fetchMovements();
        await fetchProducts();
        return { title: "Movimiento", description: "Eliminado" };
      },
      onError: (res) => ({
        title: "Movimiento",
        description: res?.response?.data?.message || "No se pudo eliminar",
      }),
    });
  };

  const onBatchDateWithToast = async (payload) => {
    const result = await toastAuth({
      promise: updateMovementsDateBatch(payload),
      onSuccess: async () => {
        await fetchMovements();
        return { title: "Producción", description: "Fecha aplicada a todos los movimientos del grupo" };
      },
      onError: (res) => ({
        title: "Fecha grupal",
        description: res?.response?.data?.message || "No se pudo actualizar",
      }),
    });
    return result !== undefined;
  };

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  return (
    <Container>
      {isProgrammer && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Modo <b>Programador</b>: las producciones aparecen agrupadas por operación (misma OP).
          Puedes cambiar la <b>fecha grupal</b> de todos los insumos/entradas de una producción, o
          editar cada movimiento por separado.
        </Alert>
      )}

      <SimpleDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingMovement(null);
        }}
        tittle={editingMovement ? `Editar movimiento #${editingMovement.id}` : "Registrar Movimiento"}
      >
        <MovementForm
          productOptions={products}
          movementToEdit={editingMovement}
          onClose={() => {
            setOpenDialog(false);
            setEditingMovement(null);
          }}
          onSaved={() => {
            fetchMovements();
            fetchProducts();
          }}
        />
      </SimpleDialog>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="text" endIcon={<AddCircleOutlineIcon />} onClick={handleDialog}>
          Registrar Movimiento
        </Button>
      </Stack>

      <MovementsListPanel
        movements={movements}
        isProgrammer={isProgrammer}
        onEdit={openEdit}
        onDelete={handleDelete}
        onBatchDate={onBatchDateWithToast}
        onBatchDateSaved={fetchMovements}
      />
    </Container>
  );
}

export default MovementPage;
