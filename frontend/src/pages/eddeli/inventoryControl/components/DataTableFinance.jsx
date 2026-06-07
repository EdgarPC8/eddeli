import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  Box,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const ResponsiveTable = ({
  columns = [],
  rows = [],
  title = null,
  showIndex = true, // 👈 Prop para mostrar/ocultar columna de índice
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <TableContainer component={Paper}>
      {title && (
        <Box p={2}>
          <Typography variant="h6" textAlign="center">
            {title}
          </Typography>
        </Box>
      )}
      <Table
        size="small"
        aria-label="responsive table"
        sx={{
          width: '100%',
          tableLayout: 'auto',
        }}
      >
        <TableHead>
          <TableRow>
            {showIndex && (
              <TableCell
                align="center"
                style={{ fontWeight: 'bold', width: 40 }}
              >
                #
              </TableCell>
            )}
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align || 'left'}
                style={{
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <TableRow key={idx}>
                {showIndex && (
                  <TableCell align="center">{idx + 1}</TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align || 'left'}>
                    {row[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + (showIndex ? 1 : 0)}
                align="center"
              >
                No hay datos disponibles
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;
