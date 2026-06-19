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
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
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
        p: 1,
        height: "100%",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: alpha(main, 0.28),
        background: `linear-gradient(145deg, ${alpha(main, 0.12)} 0%, ${alpha(main, 0.03)} 100%)`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: `0 4px 12px ${alpha(main, 0.16)}`,
          borderColor: main,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, fontSize: "0.68rem", lineHeight: 1.2, display: "block" }}
          >
            {tab.label}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: main, lineHeight: 1.2 }}>
            {tab.count}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontSize: "0.62rem", lineHeight: 1.2, mt: 0.25 }}
            noWrap
          >
            {tab.subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(main, 0.15),
            color: main,
          }}
        >
          <Icon sx={{ fontSize: "0.95rem" }} />
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
      <Paper sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, height: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={0.75}
          mb={1}
        >
          <ChartBlockHeader title="Resumen de estados de pedido" sx={{ mb: 0, flex: 1, minWidth: 0 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<VisibilityIcon sx={{ fontSize: "0.95rem !important" }} />}
            onClick={() => openDetail("unpaid")}
            sx={{
              flexShrink: 0,
              fontSize: "0.7rem",
              py: 0.25,
              px: 0.75,
              minWidth: 0,
            }}
          >
            Ver detalle
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 0.75,
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
