/**
 * Tabla de movimientos con búsqueda, orden y paginación (solo MUI).
 * No usa TablePro — evita cargar todas las filas a la vez.
 */
import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  TableSortLabel,
} from "@mui/material";

export default function PaginatedMovementTable({
  title = "",
  rows = [],
  columns = [],
  showSearch = true,
  showPagination = true,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  showIndex = true,
  tableMaxHeight = "calc(100vh - 220px)",
}) {
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState(null);
  const [orderDirection, setOrderDirection] = useState("asc");

  const handleSearchChange = (e) => {
    setSearchText(e.target.value.toLowerCase());
    setPage(0);
  };

  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrderDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columnId);
      setOrderDirection("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) return rows;
    const column = columns.find((c) => c.id === orderBy);
    const getValue = (r) =>
      column?.getSortValue
        ? column.getSortValue(r)
        : typeof r[orderBy] === "string"
          ? r[orderBy].toLowerCase()
          : r[orderBy];

    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return orderDirection === "asc" ? 1 : -1;
      if (vb == null) return orderDirection === "asc" ? -1 : 1;
      if (va < vb) return orderDirection === "asc" ? -1 : 1;
      if (va > vb) return orderDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, orderBy, orderDirection, columns]);

  const filteredRows = sortedRows.filter((row) =>
    columns.some((column) => {
      const raw = column.getSearchValue ? column.getSearchValue(row) : row[column.id];
      if (raw == null) return false;
      const val =
        typeof raw === "string" || typeof raw === "number" ? String(raw).toLowerCase() : "";
      return val.includes(searchText);
    })
  );

  const paginatedRows = showPagination
    ? filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : filteredRows;

  return (
    <Paper variant="outlined" sx={{ width: "100%", overflow: "hidden" }}>
      <Box sx={{ p: 1 }}>
        {title ? (
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            {title}
          </Typography>
        ) : null}
        {showSearch && (
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Buscar en esta tabla…"
            value={searchText}
            onChange={handleSearchChange}
            sx={{ mb: 1 }}
          />
        )}

        <TableContainer sx={{ maxHeight: tableMaxHeight }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {showIndex && (
                  <TableCell sx={{ width: 48, bgcolor: "background.paper" }}>#</TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    sortDirection={orderBy === column.id ? orderDirection : false}
                    onClick={() => handleSort(column.id)}
                    sx={{ cursor: "pointer", userSelect: "none", bgcolor: "background.paper" }}
                  >
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? orderDirection : "asc"}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.map((row, idx) => (
                <TableRow hover key={row.id ?? `r-${idx}`}>
                  {showIndex && (
                    <TableCell sx={{ py: 0.5 }}>
                      {showPagination ? page * rowsPerPage + idx + 1 : idx + 1}
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.id} sx={{ py: 0.5 }}>
                      {column.render ? column.render(row) : row[column.id]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {paginatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={(showIndex ? 1 : 0) + columns.length} align="center">
                    No hay datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {showPagination && (
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={rowsPerPageOptions}
            labelRowsPerPage="Filas"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        )}
      </Box>
    </Paper>
  );
}
