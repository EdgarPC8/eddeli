/**
 * Perfil del usuario autenticado: foto, datos personales y contacto.
 */
import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import LocationOn from "@mui/icons-material/LocationOn";
import Home from "@mui/icons-material/Home";
import Phone from "@mui/icons-material/Phone";
import PhoneAndroid from "@mui/icons-material/PhoneAndroid";
import Bloodtype from "@mui/icons-material/Bloodtype";
import Email from "@mui/icons-material/Email";
import Business from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import CakeIcon from "@mui/icons-material/Cake";
import WcIcon from "@mui/icons-material/Wc";
import { updateUserPhotoRequest, deleteUserPhotoRequest } from "../api/userRequest.js";
import { getMyUserData, updateMyUserData } from "../api/userDataRequest.js";
import { buildImageUrl } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import SimpleDialog from "../components/Dialogs/SimpleDialog.jsx";
import ProfileForm from "../components/Forms/ProfileForm.jsx";

const emptyForm = {
  direction: "",
  placeResidence: "",
  phone: "",
  cellPhone: "",
  bloodType: "",
  personalEmail: "",
  institutionalEmail: "",
};

function fullName(user) {
  return [user?.firstName, user?.secondName, user?.firstLastName, user?.secondLastName]
    .filter(Boolean)
    .join(" ");
}

export default function ProfilePage() {
  const theme = useTheme();
  const { user, toast, profileImageUser, setProfileImageUser, loadUserProfile } = useAuth();
  const [photoMenuAnchor, setPhotoMenuAnchor] = useState(null);
  const [openEditAccount, setOpenEditAccount] = useState(false);
  const [openDeletePhoto, setOpenDeletePhoto] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isEditingData, setIsEditingData] = useState(false);
  const [dataForm, setDataForm] = useState(emptyForm);

  const loadUserData = async () => {
    try {
      const { data } = await getMyUserData();
      setUserData(data);
      setDataForm({
        direction: data.direction ?? "",
        placeResidence: data.placeResidence ?? "",
        phone: data.phone ?? "",
        cellPhone: data.cellPhone ?? "",
        bloodType: data.bloodType ?? "",
        personalEmail: data.personalEmail ?? "",
        institutionalEmail: data.institutionalEmail ?? "",
      });
    } catch {
      setUserData(null);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.userId) return;

    const preview = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await toast({ promise: updateUserPhotoRequest(user.userId, formData) });
      const rel = res?.data?.photo;
      setProfileImageUser(rel ? buildImageUrl(rel) : preview);
      await loadUserProfile();
      setPhotoMenuAnchor(null);
    } catch {
      URL.revokeObjectURL(preview);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.userId) return;
    try {
      await toast({ promise: deleteUserPhotoRequest(user.userId) });
      setProfileImageUser(null);
      await loadUserProfile();
      setOpenDeletePhoto(false);
      setPhotoMenuAnchor(null);
    } catch {
      setOpenDeletePhoto(false);
    }
  };

  const handleSaveUserData = async () => {
    try {
      await toast({ promise: updateMyUserData(dataForm) });
      await loadUserData();
      setIsEditingData(false);
    } catch {
      /* toast */
    }
  };

  const handleCancelEditData = () => {
    if (userData) {
      setDataForm({
        direction: userData.direction ?? "",
        placeResidence: userData.placeResidence ?? "",
        phone: userData.phone ?? "",
        cellPhone: userData.cellPhone ?? "",
        bloodType: userData.bloodType ?? "",
        personalEmail: userData.personalEmail ?? "",
        institutionalEmail: userData.institutionalEmail ?? "",
      });
    }
    setIsEditingData(false);
  };

  const genderLabel =
    user?.gender === "M" ? "Masculino" : user?.gender === "F" ? "Femenino" : user?.gender || "—";

  const hasAnyData =
    userData &&
    (userData.direction ||
      userData.placeResidence ||
      userData.phone ||
      userData.cellPhone ||
      userData.bloodType ||
      userData.personalEmail ||
      userData.institutionalEmail);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Cargando perfil…</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>
        Mi perfil
      </Typography>

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
            }}
          >
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box sx={{ position: "relative", mb: 2 }}>
                <Avatar src={profileImageUser || undefined} sx={{ width: 160, height: 160 }}>
                  {(fullName(user)[0] || user.username?.[0] || "U").toUpperCase()}
                </Avatar>
                <IconButton
                  color="primary"
                  onClick={(e) => setPhotoMenuAnchor(e.currentTarget)}
                  sx={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                  }}
                >
                  <PhotoCamera />
                </IconButton>
                <Menu
                  anchorEl={photoMenuAnchor}
                  open={Boolean(photoMenuAnchor)}
                  onClose={() => setPhotoMenuAnchor(null)}
                >
                  <MenuItem>
                    <label htmlFor="upload-profile-photo" style={{ cursor: "pointer", width: "100%" }}>
                      Cambiar foto de perfil
                    </label>
                    <input
                      hidden
                      accept="image/*"
                      id="upload-profile-photo"
                      type="file"
                      onChange={handleImageChange}
                    />
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setPhotoMenuAnchor(null);
                      setOpenDeletePhoto(true);
                    }}
                  >
                    Eliminar foto de perfil
                  </MenuItem>
                </Menu>
              </Box>

              <Stack spacing={2} sx={{ width: "100%" }}>
                <InfoRow icon={<PersonIcon color="primary" />} label="Nombre" value={fullName(user)} />
                <InfoRow icon={<BadgeIcon color="primary" />} label="Cédula" value={user.ci || "—"} />
                <InfoRow icon={<WcIcon color="primary" />} label="Género" value={genderLabel} />
                <InfoRow
                  icon={<CakeIcon color="primary" />}
                  label="Nacimiento"
                  value={user.birthday || "—"}
                />
                <InfoRow icon={<PersonIcon color="primary" />} label="Usuario" value={user.username} />
                <InfoRow icon={<Business color="primary" />} label="Rol activo" value={user.loginRol} />
              </Stack>

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setOpenEditAccount(true)}
              >
                Cambiar contraseña
              </Button>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
            }}
          >
            <CardHeader
              title="Información de contacto"
              titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
              action={
                !isEditingData ? (
                  <IconButton size="small" onClick={() => setIsEditingData(true)} aria-label="Editar">
                    <EditIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton size="small" onClick={handleCancelEditData} aria-label="Cancelar">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )
              }
              sx={{ pb: 0 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {!isEditingData ? (
                <Stack spacing={2}>
                  {!hasAnyData && (
                    <Typography variant="body2" color="text.secondary">
                      Agregue dirección, teléfonos o correos. Use el ícono de lápiz para editar.
                    </Typography>
                  )}
                  {userData?.direction ? (
                    <ContactRow icon={<LocationOn />} label="Dirección" value={userData.direction} />
                  ) : null}
                  {userData?.placeResidence ? (
                    <ContactRow icon={<Home />} label="Residencia" value={userData.placeResidence} />
                  ) : null}
                  {userData?.phone ? (
                    <ContactRow icon={<Phone />} label="Teléfono" value={userData.phone} />
                  ) : null}
                  {userData?.cellPhone ? (
                    <ContactRow icon={<PhoneAndroid />} label="Celular" value={userData.cellPhone} />
                  ) : null}
                  {userData?.bloodType ? (
                    <ContactRow icon={<Bloodtype />} label="Tipo de sangre" value={userData.bloodType} />
                  ) : null}
                  {userData?.personalEmail ? (
                    <ContactRow icon={<Email />} label="Correo personal" value={userData.personalEmail} />
                  ) : null}
                  {userData?.institutionalEmail ? (
                    <ContactRow
                      icon={<Business />}
                      label="Correo institucional"
                      value={userData.institutionalEmail}
                    />
                  ) : null}
                </Stack>
              ) : (
                <Stack spacing={2} component="form" onSubmit={(e) => e.preventDefault()}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Dirección"
                    value={dataForm.direction}
                    onChange={(e) => setDataForm((p) => ({ ...p, direction: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Lugar de residencia"
                    value={dataForm.placeResidence}
                    onChange={(e) => setDataForm((p) => ({ ...p, placeResidence: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Teléfono"
                    value={dataForm.phone}
                    onChange={(e) => setDataForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Celular"
                    value={dataForm.cellPhone}
                    onChange={(e) => setDataForm((p) => ({ ...p, cellPhone: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Tipo de sangre"
                    value={dataForm.bloodType}
                    onChange={(e) => setDataForm((p) => ({ ...p, bloodType: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Correo personal"
                    type="email"
                    value={dataForm.personalEmail}
                    onChange={(e) => setDataForm((p) => ({ ...p, personalEmail: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Correo institucional"
                    type="email"
                    value={dataForm.institutionalEmail}
                    onChange={(e) =>
                      setDataForm((p) => ({ ...p, institutionalEmail: e.target.value }))
                    }
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" onClick={handleCancelEditData}>
                      Cancelar
                    </Button>
                    <Button variant="contained" onClick={handleSaveUserData}>
                      Guardar
                    </Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Paper>
        </Grid>
      </Grid>

      <SimpleDialog
        open={openEditAccount}
        onClose={() => setOpenEditAccount(false)}
        title="Cambiar contraseña"
        maxWidth="sm"
        fullWidth
      >
        <ProfileForm datos={user} onClose={() => setOpenEditAccount(false)} />
      </SimpleDialog>

      <SimpleDialog
        open={openDeletePhoto}
        onClose={() => setOpenDeletePhoto(false)}
        title="Eliminar foto"
        message="¿Eliminar su foto de perfil?"
        onClickAccept={handleDeletePhoto}
      />
    </Container>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      {icon}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600} noWrap title={value}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function ContactRow({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
      <Box sx={{ color: "text.secondary", mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    </Box>
  );
}
