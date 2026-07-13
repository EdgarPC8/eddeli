import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Typography,
  Box,
  Divider,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Add, EditOutlined, DeleteOutline } from "@mui/icons-material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import FinanceForm from "./components/FinanceForm";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import {
  getAllIncomesRequest,
  getAllExpensesRequest,
  getFinanceSummaryRequest,
  deleteIncomeRequest,
  deleteExpenseRequest,
} from "../../../api/financeRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { money } from "./collections/helpers.js";
import { formatDateTime } from "../../../helpers/functions.js";

const defaultSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  futureIncome: 0,
  projectedBalance: 0,
};

function FinancePage() {
  const { toast } = useAuth();
  const [summary, setSummary] = useState(defaultSummary);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [formType, setFormType] = useState("income");
  const [titleUserDialog, setTitleUserDialog] = useState("");
  const [dataToEdit, setDataToEdit] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incomeRes, expenseRes, summaryRes] = await Promise.all([
        getAllIncomesRequest(),
        getAllExpensesRequest(),
        getFinanceSummaryRequest(),
      ]);

      setIncomes(Array.isArray(incomeRes.data) ? incomeRes.data : []);
      setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : []);
      setSummary({ ...defaultSummary, ...summaryRes.data });
    } catch (err) {
      console.error("Error al cargar finanzas:", err);
      toast?.({ message: "No se pudo cargar la información financiera.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allRows = useMemo(() => {
    const incomeRows = (incomes || []).map((i) => ({
      ...i,
      type: "income",
      sourceId: i.id,
      id: `income-${i.id}`,
    }));
    const expenseRows = (expenses || []).map((e) => ({
      ...e,
      type: "expense",
      sourceId: e.id,
      id: `expense-${e.id}`,
    }));
    return [...incomeRows, ...expenseRows].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });
  }, [incomes, expenses]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    for (const r of allRows) {
      const c = String(r.category || "").trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (typeFilter === "income" && r.type !== "income") return false;
      if (typeFilter === "expense" && r.type !== "expense") return false;
      if (categoryFilter !== "all" && String(r.category || "") !== categoryFilter) return false;
      return true;
    });
  }, [allRows, typeFilter, categoryFilter]);

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of filteredRows) {
      const amt = Number(r.amount || 0);
      if (r.type === "income") income += amt;
      else expense += amt;
    }
    return {
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      balance: Number((income - expense).toFixed(2)),
    };
  }, [filteredRows]);

  const handleDialogUser = () => setOpenDialog(!openDialog);
  const handleDialogDelete = () => setOpenDeleteDialog(!openDeleteDialog);

  const openCreate = (type) => {
    setFormType(type);
    setDataToEdit(null);
    setTitleUserDialog(type === "income" ? "Registrar Ingreso" : "Registrar Gasto");
    setOpenDialog(true);
  };

  const deleteData = async () => {
    const id = dataToDelete.sourceId ?? dataToDelete.id;
    const fn = formType === "income" ? deleteIncomeRequest : deleteExpenseRequest;
    await runMutationReload(toast, {
      promise: fn(id),
      reload: fetchData,
      onClose: handleDialogDelete,
    });
  };

  const columns = [
    {
      label: "Fecha",
      id: "date",
      getSortValue: (r) => new Date(r.date || 0).getTime(),
      render: (r) => formatDateTime(r?.date),
    },
    {
      label: "Tipo",
      id: "type",
      render: (r) =>
        r.type === "income" ? (
          <Chip size="small" color="success" label="Ingreso" icon={<TrendingUpIcon />} />
        ) : (
          <Chip size="small" color="error" label="Gasto" icon={<TrendingDownIcon />} />
        ),
    },
    { label: "Concepto", id: "concept" },
    { label: "Categoría", id: "category" },
    {
      label: "Monto",
      id: "amount",
      getSortValue: (r) => Number(r.amount || 0),
      render: (r) => (
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            color: r.type === "income" ? "success.main" : "error.main",
          }}
        >
          {r.type === "expense" ? "−" : "+"}
          {money(r?.amount)}
        </Typography>
      ),
    },
    {
      label: "Acciones",
      id: "actions",
      stopRowClick: true,
      render: (r) => {
        if (!r) return null;
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormType(r.type || "income");
                  setDataToEdit(r);
                  setTitleUserDialog(
                    "Editar " + (r.type === "expense" ? "Gasto" : "Ingreso")
                  );
                  setOpenDialog(true);
                }}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormType(r.type || "income");
                  setDataToDelete(r);
                  setOpenDeleteDialog(true);
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      <SimpleDialog
        open={openDeleteDialog}
        onClose={handleDialogDelete}
        tittle="Eliminar Registro"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este registro?
      </SimpleDialog>

      <SimpleDialog open={openDialog} onClose={handleDialogUser} tittle={titleUserDialog}>
        <FinanceForm
          type={formType}
          data={
            dataToEdit
              ? { ...dataToEdit, id: dataToEdit.sourceId ?? dataToEdit.id }
              : null
          }
          onClose={handleDialogUser}
          onSaved={fetchData}
        />
      </SimpleDialog>

      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Finanzas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resumen de ingresos y gastos registrados. El detalle de cobros está en Cobranzas.
        </Typography>
      </Box>

      <FinanceSummaryCards summary={summary} loading={loading} />

      <Divider sx={{ my: 3 }} />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Movimientos
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            <Chip size="small" color="success" variant="outlined" label={`Ingresos ${money(filteredTotals.income)}`} />
            <Chip size="small" color="error" variant="outlined" label={`Gastos ${money(filteredTotals.expense)}`} />
            <Chip
              size="small"
              color={filteredTotals.balance >= 0 ? "primary" : "warning"}
              variant="outlined"
              label={`Balance filtro ${money(filteredTotals.balance)}`}
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            color="success"
            size="small"
            startIcon={<Add />}
            onClick={() => openCreate("income")}
          >
            Ingreso
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Add />}
            onClick={() => openCreate("expense")}
          >
            Gasto
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 1.5 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={typeFilter}
          onChange={(_, v) => {
            if (v) setTypeFilter(v);
          }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="income">Solo ingresos</ToggleButton>
          <ToggleButton value="expense">Solo gastos</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          select
          size="small"
          label="Categoría"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Todas</MenuItem>
          {categoryOptions.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TablePro
        title="Ingresos y gastos"
        rows={filteredRows}
        columns={columns}
        loading={loading}
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Container>
  );
}

export default FinancePage;
