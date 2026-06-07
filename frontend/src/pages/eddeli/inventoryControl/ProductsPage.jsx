import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableRowsIcon from "@mui/icons-material/TableRows";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "react";

import { Edit, Delete, Inventory } from "@mui/icons-material";
import toast from "react-hot-toast";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import ProductForm from "./components/ProductForm";
import ProductsGridView from "./components/ProductsGridView";
import {
  getAllProducts,
  deleteProduct,
} from "../../../api/inventoryControlRequest";
import { pathImg } from "../../../api/axios";
import TablePro from "../../../components/Tables/TablePro";

function ProductsPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [cardSearch, setCardSearch] = useState("");

  const fecthData = async () => {
    const { data } = await getAllProducts();
    setData(data || []);
  };

  const handleDialog = () => setOpen(!open);
  const handleDialogUser = () => setOpenDialog(!openDialog);

  const deleteData = async () => {
    toast.promise(
      deleteProduct(dataToDelete.id),
      {
        loading: "Eliminando...",
        success: "Producto eliminado con éxito",
        error: "Ocurrió un error",
      },
      { position: "top-right", style: { fontFamily: "roboto" } }
    );
    setData((prev) => prev.filter((item) => item.id !== dataToDelete.id));
    handleDialog();
  };

  const openEditProduct = (product) => {
    setDatos(product);
    setIsEditing(true);
    settitleUserDialog("Editar Producto");
    handleDialogUser();
  };

  const columns = [
    {
      label: "Imagen",
      id: "primaryImageUrl",
      width: 90,
      render: (row) => {
        const filename = row?.primaryImageUrl;
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
    {
      label: "Nombre",
      id: "name",
      width: 180,
    },
    {
      label: "Tipo",
      id: "type",
      width: 100,
      render: (params) => {
        const type = params.type;
        return type === "raw"
          ? "Materia Prima"
          : type === "intermediate"
          ? "Producto Intermedio"
          : "Producto Final";
      },
    },
    {
      label: "Categoría",
      id: "category",
      width: 100,
      render: (params) => params.ERP_inventory_category?.name,
    },
    {
      label: "Precio",
      id: "price",
      width: 50,
    },
    {
      label: "Stock",
      id: "stock",
      width: 90,
    },
    {
      label: "Acciones",
      id: "actions",
      width: 150,
      render: (params) => (
        <>
          <Tooltip title="Editar Producto">
            <IconButton onClick={() => openEditProduct(params)}>
              <Edit />
            </IconButton>
          </Tooltip>

          <Tooltip title="Eliminar Producto">
            <IconButton
              onClick={() => {
                handleDialog();
                setDataToDelete(params);
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
        tittle="Eliminar Producto"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar el producto?
      </SimpleDialog>

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
        <ProductForm
          onClose={handleDialogUser}
          isEditing={isEditing}
          datos={datos}
          reload={fecthData}
        />
      </SimpleDialog>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          mt: 1,
          borderRadius: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Button
          variant="text"
          endIcon={<Inventory />}
          onClick={() => {
            setIsEditing(false);
            setDatos({});
            settitleUserDialog("Agregar Producto");
            handleDialogUser();
          }}
        >
          Crear Producto
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          aria-label="vista de productos"
        >
          <ToggleButton value="cards" aria-label="tarjetas">
            <ViewModuleIcon sx={{ mr: 0.5 }} fontSize="small" />
            Tarjetas
          </ToggleButton>
          <ToggleButton value="table" aria-label="tabla">
            <TableRowsIcon sx={{ mr: 0.5 }} fontSize="small" />
            Tabla
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {viewMode === "cards" ? (
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Catálogo
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar por nombre, categoría o tipo…"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              sx={{ minWidth: 260, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <ProductsGridView
            products={data}
            search={cardSearch}
            onEdit={openEditProduct}
            onReload={fecthData}
          />
        </Paper>
      ) : (
        <TablePro
          rows={data}
          columns={columns}
          defaultRowsPerPage={10}
          title="PRODUCTOS"
          tableMaxHeight={380}
          showIndex={true}
        />
      )}
    </Container>
  );
}

export default ProductsPage;
