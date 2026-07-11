/**
 * Tabla MUI con búsqueda, paginación y acciones.
 * Al cargar: CircularProgress (las tablas no usan skeleton).
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
  CircularProgress,
  alpha,
  useTheme,
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
  tableMaxHeight = "calc(100vh - 220px)",
  onRowClick,
  selectedRowId = null,
  getRowId = (row) => row.id,
  loading = false,
}) => {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState(null);
  const [orderDirection, setOrderDirection] = useState("asc");

  const colCount = (showIndex ? 1 : 0) + columns.length;

  const handleSearchChange = (e) => {
    setSearchText(e.target.value.toLowerCase());
    setPage(0);
  };

  const handleChangePage = (_, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
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
    <Paper sx={{ width: "100%", p: 1, overflow: "hidden", position: "relative" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {title && (
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {title}
          </Typography>
        )}
        {showSearch && (
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Buscar..."
            value={searchText}
            onChange={handleSearchChange}
            disabled={loading}
          />
        )}

        <TableContainer sx={{ maxHeight: tableMaxHeight, minHeight: loading ? 220 : undefined }}>
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
                    onClick={loading ? undefined : () => handleSort(column.id)}
                    sx={{
                      cursor: loading ? "default" : "pointer",
                      userSelect: "none",
                      bgcolor: "background.paper",
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? orderDirection : "asc"}
                      disabled={loading}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading &&
                paginatedRows.map((row, idx) => {
                  const rowId = getRowId(row);
                  const selected =
                    selectedRowId != null &&
                    rowId != null &&
                    rowId === selectedRowId;
                  return (
                    <TableRow
                      hover
                      key={row.id ?? `row-${idx}`}
                      selected={selected}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      sx={{
                        cursor: onRowClick ? "pointer" : undefined,
                        bgcolor: selected ? alpha(accent, 0.08) : undefined,
                        "&.Mui-selected": {
                          bgcolor: alpha(accent, 0.1),
                        },
                        "&.Mui-selected:hover": {
                          bgcolor: alpha(accent, 0.14),
                        },
                      }}
                    >
                      {showIndex && (
                        <TableCell sx={{ py: 0.5 }}>
                          {showPagination
                            ? page * rowsPerPage + idx + 1
                            : idx + 1}
                        </TableCell>
                      )}

                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          sx={{ py: 0.5 }}
                          onClick={
                            column.stopRowClick
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {column.render ? column.render(row) : row[column.id]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}

              {!loading && paginatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} align="center">
                    No hay datos
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={colCount} sx={{ border: 0, height: 180 }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {showPagination && (
          <TablePagination
            component="div"
            count={loading ? 0 : filteredRows.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            disabled={loading}
          />
        )}
      </Box>

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(theme.palette.background.paper, 0.55),
            zIndex: 2,
            borderRadius: 1,
          }}
        >
          <CircularProgress size={36} />
        </Box>
      )}
    </Paper>
  );
};

export default TablePro;
