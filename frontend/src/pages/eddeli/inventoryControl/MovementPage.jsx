import {
  Container,
  Button,
  Stack,
  Tooltip,
  IconButton,
  TablePagination,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useEffect, useState } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import MovementForm from "./components/MovementForm";
import MovementsListPanel from "./components/MovementsListPanel";
import { useAuth } from "../../../context/AuthContext";

import {
  getAllProductsAll,
  getAllMovements,
  unwrapListResponse,
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleDialog = () => {
    setEditingMovement(null);
    setOpenDialog(!openDialog);
  };

  const openEdit = (row) => {
    setEditingMovement(row);
    setOpenDialog(true);
  };

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();
    setProducts(Array.isArray(data) ? data : unwrapListResponse(data));
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data } = await getAllMovements({ page: page + 1, pageSize });
      setMovements(unwrapListResponse(data));
      setTotal(data?.total ?? unwrapListResponse(data).length);
    } finally {
      setLoading(false);
    }
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
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [page, pageSize]);

  return (
    <Container>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button variant="text" endIcon={<AddCircleOutlineIcon />} onClick={handleDialog}>
          Registrar Movimiento
        </Button>
        {isProgrammer && (
          <Tooltip
            title="Modo Programador: producciones agrupadas por OP; puedes cambiar fecha grupal o editar cada movimiento."
            arrow
          >
            <IconButton size="small" color="info" aria-label="Ayuda modo programador">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <SimpleDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingMovement(null);
        }}
        tittle={editingMovement ? `Editar movimiento #${editingMovement.id}` : "Registrar movimiento"}
        maxWidth="md"
        fullWidth
        contentSx={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          p: 2,
          pt: 1,
          pb: 0,
          maxHeight: "min(78vh, 720px)",
        }}
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

      <MovementsListPanel
        movements={movements}
        loading={loading}
        isProgrammer={isProgrammer}
        onEdit={openEdit}
        onDelete={handleDelete}
        onBatchDate={onBatchDateWithToast}
        onBatchDateSaved={fetchMovements}
      />

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          setPageSize(Number.parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Por página"
      />
    </Container>
  );
}

export default MovementPage;
