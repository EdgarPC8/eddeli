/**
 * Selector múltiple de roles (desde GET /rol).
 */
import { useEffect, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { getRolRequest } from "../../api/accountRequest.js";

export default function SelectDataRoles({ value = [], onChange }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRolRequest()
      .then((res) => setRoles(res.data || []))
      .catch(() => setRoles([]));
  }, []);

  return (
    <FormControl fullWidth variant="standard" sx={{ mt: 1 }}>
      <InputLabel id="roles-select-label">Roles</InputLabel>
      <Select
        labelId="roles-select-label"
        multiple
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label="Roles"
        renderValue={(selected) =>
          selected
            .map((id) => roles.find((r) => r.id === id)?.name || id)
            .join(", ")
        }
      >
        {roles.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
