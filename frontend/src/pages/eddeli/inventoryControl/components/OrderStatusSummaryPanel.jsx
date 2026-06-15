import { useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  alpha,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { buildOverviewCards } from "../orderStatus/orderStatusHelpers.js";
import OrderStatusDetailDialog from "./OrderStatusDetailDialog.jsx";

function StatusCard({ tab, onClick }) {
  const theme = useTheme();
  const main = theme.palette[tab.color]?.main || theme.palette.primary.main;
  const Icon = tab.icon;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.75,
        height: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(main, 0.28),
        background: `linear-gradient(145deg, ${alpha(main, 0.12)} 0%, ${alpha(main, 0.03)} 100%)`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 6px 16px ${alpha(main, 0.18)}`,
          borderColor: main,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {tab.label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: main, mt: 0.5 }}>
            {tab.count}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {tab.subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(main, 0.15),
            color: main,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Stack>
    </Paper>
  );
}

export default function OrderStatusSummaryPanel({ overView = [] }) {
  const cards = buildOverviewCards(overView);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("unpaid");

  const openDetail = useCallback((tabId = "unpaid") => {
    setInitialTab(tabId);
    setModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <>
      <Paper sx={{ p: 2, borderRadius: 2, height: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          spacing={1.5}
          mb={2}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Resumen de estados de pedido
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clic en una tarjeta para ver el detalle. Solo Programador puede corregir entrega, pago y stock.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => openDetail("unpaid")}
            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, whiteSpace: "nowrap" }}
          >
            Ver detalle
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {cards.map((tab) => (
            <StatusCard key={tab.id} tab={tab} onClick={() => openDetail(tab.id)} />
          ))}
        </Box>
      </Paper>

      <OrderStatusDetailDialog
        open={modalOpen}
        onClose={closeDetail}
        initialTab={initialTab}
      />
    </>
  );
}
