import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Edit, Delete, Inventory } from "@mui/icons-material";
import toast from "react-hot-toast";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import ProductForm from "./components/ProductForm";
import ProductsGridView from "./components/ProductsGridView";
import {
  getAllProducts,
  deleteProduct,
} from "../../../api/inventoryControlRequest";
import { pathImg } from "../../../api/axios"; // 👈 importa el path base de imágenes
import TablePro from "../../../components/Tables/TablePro";

function ProductsPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState([]);
  const [titleUserDialog, settitleUserDialog] = useState("");

  const navigate = useNavigate();

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

  const columns = [
    // 👇 NUEVA COLUMNA: Imagen principal del producto
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
      label: "Descripción",
      id: "desc",
      width: 220,
      render: (row) => (
        <Typography variant="body2" noWrap title={row?.desc || ""}>
          {row?.desc || "—"}
        </Typography>
      ),
    },
    // {
    //   label: "Unidad",
    //   id: "inventory_unit.name",
    //   width: 100,
    //   render: (params) => params.ERP_inventory_unit?.name,
    // },
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
    // {
    //   label: "Peso Neto",
    //   id: "netWeight",
    //   width: 50,
    // },
    {
      label: "Stock",
      id: "stock",
      width: 90,
    },
    // {
    //   label: "Stock Mínimo",
    //   id: "minStock",
    //   width: 120,
    // },
    {
      label: "Acciones",
      id: "actions",
      width: 150,
      render: (params) => (
        <>
          <Tooltip title="Editar Producto">
            <IconButton
              onClick={() => {
                setDatos(params);
                setIsEditing(true);
                settitleUserDialog("Editar Producto");
                handleDialogUser();
              }}
            >
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
      {/* Dialog eliminar */}
      <SimpleDialog
        open={open}
        onClose={handleDialog}
        tittle="Eliminar Producto"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar el producto?
      </SimpleDialog>

      {/* Dialog crear o editar */}
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

      <Button
        variant="text"
        endIcon={<Inventory />}
        onClick={() => {
          setIsEditing(false);
          setDatos({});
          settitleUserDialog("Agregar Producto");
          handleDialogUser();
        }}
        sx={{ mb: 1 }}
      >
        Crear Producto
      </Button>

      <TablePro
        rows={data}
        columns={columns}
        defaultRowsPerPage={10}
        title="PRODUCTOS"
        tableMaxHeight={380}
        showIndex={true}
      />

      <ProductsGridView
        products={data}
        onEdit={(product) => {
          setDatos(product);
          setIsEditing(true);
          settitleUserDialog("Editar Producto");
          handleDialogUser();
        }}
        onReload={fecthData}
      />
    </Container>
  );
}

export default ProductsPage;
