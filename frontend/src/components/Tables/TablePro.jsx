/**
 * Tabla MUI con búsqueda, paginación y acciones por fila.
 */
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  Typography,
  Box,
  TableSortLabel,
} from "@mui/material";

const TablePro = ({
  columns = [],
  rows = [],
  title = "",
  showSearch = true,
  showPagination = true,
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 5,
  showIndex = false,
  indexHeader = "#",
  tableMaxHeight = 150,
}) => {
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState(null);
  const [orderDirection, setOrderDirection] = useState("asc");

  const handleSearchChange = (e) => {
    setSearchText(e.target.value.toLowerCase());
    setPage(0);
  };

  const handleChangePage = (_, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // --- Ordenamiento ---
  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrderDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columnId);
      setOrderDirection("asc");
    }
  };

  const sortedRows = React.useMemo(() => {
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

  // --- Filtro de búsqueda ---
  const filteredRows = sortedRows.filter((row) =>
    columns.some((column) => {
      const raw = column.getSearchValue
        ? column.getSearchValue(row)
        : row[column.id];
      if (raw == null) return false;
      const val =
        typeof raw === "string" || typeof raw === "number"
          ? String(raw).toLowerCase()
          : "";
      return val.includes(searchText);
    }),
  );

  const paginatedRows = showPagination
    ? filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : filteredRows;

  return (
    <Paper sx={{ width: "100%", p: 2 }}>
      <Box sx={{ p: 1 }}>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        {showSearch && (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar..."
            value={searchText}
            onChange={handleSearchChange}
          />
        )}

        <TableContainer sx={{ maxHeight: tableMaxHeight }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {showIndex && (
                  <TableCell sx={{ width: 56, bgcolor: "background.paper" }}>
                    {indexHeader}
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    sortDirection={
                      orderBy === column.id ? orderDirection : false
                    }
                    onClick={() => handleSort(column.id)}
                    sx={{
                      cursor: "pointer",
                      userSelect: "none",
                      bgcolor: "background.paper",
                    }}
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
                <TableRow hover key={row.id ?? `${idx}-${Math.random()}`}>
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
                  <TableCell
                    colSpan={(showIndex ? 1 : 0) + columns.length}
                    align="center"
                  >
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
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
          />
        )}
      </Box>
    </Paper>
  );
};

export default TablePro;
