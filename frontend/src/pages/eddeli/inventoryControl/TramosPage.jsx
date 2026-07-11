import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Add, Delete, Edit, ViewModule } from "@mui/icons-material";
import TramoForm from "./components/TramoForm";
import {
  getTierGroups,
  deleteTierGroup,
  migrateTierGroupsFromCategories,
} from "../../../api/inventoryControlRequest.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { normalizePackageTiers } from "../../../utils/productLookup.js";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";

function TramosPage() {
  const { toast } = useAuth();
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState({});
  const [titleUserDialog, setTitleUserDialog] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows } = await getTierGroups();
      setData(rows || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const openCreate = () => {
    setIsEditing(false);
    setDatos({});
    setTitleUserDialog("Nuevo grupo de tramos");
    setOpenDialog(true);
  };

  const openEdit = (row) => {
    setDatos(row);
    setIsEditing(true);
    setTitleUserDialog(`Editar tramo — ${row.name}`);
    setOpenDialog(true);
  };

  const openDelete = (row) => {
    setDataToDelete(row);
    handleDialog();
  };

  const deleteData = async () => {
    await runMutationReload(toast, {
      promise: deleteTierGroup(dataToDelete.id),
      reload: fetchData,
      onClose: handleDialog,
    });
  };

  const runMigration = async () => {
    await runMutationReload(toast, {
      promise: migrateTierGroupsFromCategories(),
      successMessage: "Tramos migrados desde categorías",
      reload: fetchData,
    });
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        label: "Nombre",
        render: (row) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={600}>{row.name}</Typography>
            {row.isActive === false && (
              <Chip size="small" label="Inactivo" color="default" variant="outlined" />
            )}
          </Stack>
        ),
      },
      {
        id: "category",
        label: "Subcategoría",
        render: (row) => row.category?.name || "—",
      },
      {
        id: "products",
        label: "Productos",
        render: (row) => {
          const ids = Array.isArray(row.productIds) ? row.productIds : [];
          return ids.length ? `${ids.length} producto(s)` : "—";
        },
      },
      {
        id: "packageTiers",
        label: "Tramos",
        render: (row) => {
          const tiers = normalizePackageTiers(row.packageTiers);
          if (!tiers.length) return "—";
          return (
            <Typography variant="body2" color="text.secondary">
              {tiers.map((t) => `${t.qty}=$${Number(t.totalPrice).toFixed(2)}`).join(" · ")}
            </Typography>
          );
        },
      },
      {
        id: "actions",
        label: "Acciones",
        stopRowClick: true,
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
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
          </Stack>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar tramo"
        onClickAccept={deleteData}
      >
        ¿Eliminar el grupo «{dataToDelete.name}»? La caja dejará de aplicar estos precios.
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
        <TramoForm
          isEditing={isEditing}
          datos={datos}
          onClose={handleDialogUser}
          reload={fetchData}
        />
      </SimpleDialog>

      <Paper sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <ViewModule color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Tramos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Grupos de productos con precios por cantidad en caja (canasta surtido).
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" size="small" onClick={() => void runMigration()}>
              Migrar desde categorías
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              Nuevo grupo
            </Button>
          </Stack>
        </Stack>

        <TablePro
          columns={columns}
          rows={data}
          tableMaxHeight="calc(100vh - 220px)"
          defaultRowsPerPage={10}
          loading={loading}
        />
      </Paper>
    </Container>
  );
}

export default TramosPage;
