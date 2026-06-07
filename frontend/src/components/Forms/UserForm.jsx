import { useState, useEffect } from "react";
import {
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Box,
} from "@mui/material";

import { useRoles } from "../../hooks/useRoles";

export default function UsersForm({ onSubmit, initialData }) {
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const [form, setForm] = useState({
    email: "",
    username: "",
    ci: "",
    firstName: "",
    firstLastName: "",
    password: "",
    roles: [],
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        email: initialData.email || "",
        username: initialData.username || "",
        ci: initialData.ci || "",
        firstName: initialData.firstName || "",
        firstLastName: initialData.firstLastName || "",
        password: initialData.password || "",
        roles: initialData.roles || [],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Nombre de usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="CI / Cédula de identidad"
            name="ci"
            value={form.ci}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Primer nombre"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Primer apellido"
            name="firstLastName"
            value={form.firstLastName}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth size="small">
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              name="roles"
              required
              value={form.roles}
              onChange={handleChange}
              label="Roles"
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((id) => {
                    const role = roles?.find((r) => r.id === id);
                    return <Chip key={id} label={role?.name} />;
                  })}
                </Box>
              )}
            >
              {roles?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          {!!initialData ? (
            <TextField
              fullWidth
              size="small"
              label="Nueva Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
          ) : (
            <TextField
              fullWidth
              size="small"
              label="Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          )}
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" fullWidth>
            {initialData ? "Actualizar" : "Registrar"}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
}
