import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Grid,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Add, MonetizationOn, MoneyOff } from "@mui/icons-material";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import FinanceForm from "./components/FinanceForm";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import ExpectedCollectionsPanel from "./components/ExpectedCollectionsPanel";
import {
  getAllIncomesRequest,
  getAllExpensesRequest,
  getFinanceSummaryRequest,
  deleteIncomeRequest,
  deleteExpenseRequest,
} from "../../../api/financeRequest";
import { getFinanceWorkbenchAllRequest } from "../../../api/ordersRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";
import { money } from "./collections/helpers.js";
import { formatDateTime } from "../../../helpers/functions.js";
import { buildPendingCollectionsBreakdown } from "./finance/pendingCollections.js";

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
  const [workbench, setWorkbench] = useState({
    customers: [],
    orders: [],
    groups: [],
    payments: [],
  });
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formType, setFormType] = useState("income");
  const [titleUserDialog, setTitleUserDialog] = useState("");
  const [dataToEdit, setDataToEdit] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});

  const pendingBreakdown = useMemo(
    () => buildPendingCollectionsBreakdown(workbench),
    [workbench]
  );

  const fetchData = async () => {
    setLoadingCollections(true);
    try {
      const [incomeRes, expenseRes, summaryRes, workbenchRes] = await Promise.all([
        getAllIncomesRequest(),
        getAllExpensesRequest(),
        getFinanceSummaryRequest(),
        getFinanceWorkbenchAllRequest(),
      ]);

      setIncomes(incomeRes.data);
      setExpenses(expenseRes.data);
      setSummary({ ...defaultSummary, ...summaryRes.data });
      setWorkbench({
        customers: workbenchRes.data?.customers ?? [],
        orders: workbenchRes.data?.orders ?? [],
        groups: workbenchRes.data?.groups ?? [],
        payments: workbenchRes.data?.payments ?? [],
      });
    } catch (err) {
      console.error("Error al cargar finanzas:", err);
      toast?.({ message: "No se pudo cargar la información financiera.", variant: "error" });
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDialogUser = () => setOpenDialog(!openDialog);
  const handleDialogDelete = () => setOpenDeleteDialog(!openDeleteDialog);

  const deleteData = async () => {
    const fn = formType === "income" ? deleteIncomeRequest : deleteExpenseRequest;
    await runMutationReload(toast, {
      promise: fn(dataToDelete.id),
      reload: fetchData,
      onClose: handleDialogDelete,
    });
  };

  const commonColumns = [
    {
      label: "Fecha",
      id: "date",
      render: (params) => {
        const row = params?.row ?? params;
        return formatDateTime(row?.date);
      },
    },
    { label: "Concepto", id: "concept" },
    { label: "Categoría", id: "category" },
    {
      label: "Monto",
      id: "amount",
      render: (params) => {
        const row = params?.row ?? params;
        const value = Number(row?.amount ?? 0);
        return money(value);
      },
    },
    {
      label: "Acciones",
      id: "actions",
      render: (params) => {
        const row = params?.row ?? params;
        if (!row) return null;
        return (
          <>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormType(row.type || "income");
                  setIsEditing(true);
                  setDataToEdit(row);
                  setTitleUserDialog("Editar " + (row.type === "expense" ? "Gasto" : "Ingreso"));
                  setOpenDialog(true);
                }}
              >
                <MonetizationOn />
              </IconButton>
            </Tooltip>

            <Tooltip title="Eliminar">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormType(row.type || "income");
                  setDataToDelete(row);
                  setOpenDeleteDialog(true);
                }}
              >
                <MoneyOff />
              </IconButton>
            </Tooltip>
          </>
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

      <SimpleDialog
        open={openDialog}
        onClose={handleDialogUser}
        tittle={titleUserDialog}
      >
        <FinanceForm
          type={formType}
          data={dataToEdit}
          onClose={handleDialogUser}
          onSaved={fetchData}
        />
      </SimpleDialog>

      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Finanzas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resumen del dinero registrado y lo que falta por cobrar según Cobranzas.
        </Typography>
      </Box>

      <FinanceSummaryCards
        summary={summary}
        pendingTotal={pendingBreakdown.total}
      />

      <Box sx={{ mt: 3 }}>
        <ExpectedCollectionsPanel
          customers={workbench.customers}
          orders={workbench.orders}
          groups={workbench.groups}
          payments={workbench.payments}
          loading={loadingCollections}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Ingresos
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => {
                setFormType("income");
                setTitleUserDialog("Registrar Ingreso");
                setIsEditing(false);
                setDataToEdit(null);
                handleDialogUser();
              }}
            >
              Registrar
            </Button>
          </Box>
          <TablePro
            rows={incomes.map((i) => ({ ...i, type: "income" }))}
            columns={commonColumns}
            defaultRowsPerPage={5}
            title="Ingresos registrados"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Gastos
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Add />}
              onClick={() => {
                setFormType("expense");
                setTitleUserDialog("Registrar Gasto");
                setIsEditing(false);
                setDataToEdit(null);
                handleDialogUser();
              }}
            >
              Registrar
            </Button>
          </Box>
          <TablePro
            rows={expenses.map((e) => ({ ...e, type: "expense" }))}
            columns={commonColumns}
            defaultRowsPerPage={5}
            title="Gastos registrados"
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default FinancePage;
