import {
    Container,
    IconButton,
    Button,
    Grid,
    Box,
    TextField
  } from "@mui/material";
  import { useEffect, useState } from "react";
  import { deleteRolRequest, getRolRequest,updateRolRequest,addRolRequest } from "../api/accountRequest.js";
  import { Person, Edit, Delete,Send } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import TablePro from "../components/Tables/TablePro";
import SimpleDialog from "../components/Dialogs/SimpleDialog";
import UserForm from "../components/Forms/UserForm.jsx";

  function Roles() {
    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [dataToDelete, setDataToDelete] = useState({});
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [datos, setDatos] = useState([]);
    const [id, setId] = useState(0);
    const [titleUserDialog, settitleUserDialog] = useState("");
  const { toast} = useAuth();

    const {
      register,
      handleSubmit,
      setValue,
      reset,
  
      formState: { errors },
    } = useForm();
    const onSubmit = async (values) => {
      if (isEditing) {
        toast({
          promise: 
          updateRolRequest(id, values),
              successMessage: "Rol editado con éxito",
              onSuccess: (data) => {
                fetchdata();
                reset();
                setIsEditing(false);
              }
        });
      }else{
        toast({
          promise: 
          addRolRequest(values),
              successMessage: "Rol guardado con éxito",
              onSuccess: (data) => {
                fetchdata();
                reset();
                setIsEditing(false);
              }
        });
  
      }

    };
  
   
    const handleDialog = () => {
      setOpen(!open);
    };
    const handleDialogUser = () => {
      setOpenDialog(!openDialog);
    };
  
    const deleteUser = async () => {
      toast({
        promise: 
        deleteRolRequest(dataToDelete.id),
            successMessage: "Rol Eliminado con éxito",
            onSuccess: (dataresponse) => {
  
              setData(data.filter((data) => data.id !== dataToDelete.id));
              handleDialog();
            }
      });
    };
    const columns = [
      { id: "id", label: "Id" },
      { id: "name", label: "Nombre" },
      {
        id: "actions",
        label: "Actions",
        render: (row) => (
          <>
            <IconButton
              onClick={() => {
                setValue("name", row.name);
                setIsEditing(true);
                setId(row.id);
              }}
            >
              <Edit />
            </IconButton>
            <IconButton
              onClick={() => {
                handleDialog();
                setDataToDelete(row);
              }}
            >
              <Delete />
            </IconButton>
          </>
        ),
      },
    ];
     const fetchdata = async () => {
      const { data } = await getRolRequest();
      setData(data);
    };
  
    useEffect(() => {
      fetchdata();
    }, []);
    return (

      <Container>
            <SimpleDialog
              open={open}
              onClose={handleDialog}
              tittle="Eliminar Rol"
              onClickAccept={deleteUser}
            >
              ¿Está seguro de eliminar el rol?
            </SimpleDialog>
            {/* <Button
              sx={{ marginTop: "30px" }}
              variant="text"
              endIcon={<Person />}
              onClick={() => {
                setIsEditing(false)
                settitleUserDialog("Agregar Cuenta")
                handleDialogUser();
              }}
            >
              Añadir Rol
            </Button> */}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      label="Agregar Rol"
                      variant="standard"
                      {...register("name", { required: true })}
                      InputProps={{
                        endAdornment: (
                          <IconButton type="submit">
                            <Send />
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            <SimpleDialog
              open={openDialog}
              onClose={handleDialogUser}
              tittle={titleUserDialog}
            >
              <UserForm onClose={handleDialogUser} isEditing={isEditing} datos={datos} reload={fetchdata}></UserForm>
            </SimpleDialog>
            <TablePro
              rows={data.map((row, i) => ({ ...row, id: row.id ?? i }))}
              columns={columns}
              title=""
              showSearch
              showPagination
              defaultRowsPerPage={5}
              tableMaxHeight={400}
              showIndex
              indexHeader="#"
            />
      </Container>
    );
  }
  
  export default Roles;
  