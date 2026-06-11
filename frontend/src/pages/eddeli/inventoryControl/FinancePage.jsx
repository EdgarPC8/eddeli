import {
  Container,
  IconButton,
  Button,
  Tooltip,
  Grid,
  Typography,
  Paper,

} from "@mui/material";
import { useEffect, useState } from "react";
import { Add, MonetizationOn, MoneyOff } from "@mui/icons-material";
import DataTable from "../../../components/Tables/DataTable";
import TablePro from "../../../components/Tables/TablePro";
import SimpleDialog from "../../../components/Dialogs/SimpleDialog";
import FinanceForm from "./components/FinanceForm";
import {
  getAllIncomesRequest,
  getAllExpensesRequest,
  getFinanceSummaryRequest,
  deleteIncomeRequest,
  deleteExpenseRequest,
} from "../../../api/financeRequest";
import { useAuth } from "../../../context/AuthContext.jsx";
import { runMutationReload } from "../../../utils/mutationToast.js";

function FinancePage() {
  const { toast } = useAuth();
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formType, setFormType] = useState("income");
  const [titleUserDialog, setTitleUserDialog] = useState("");
  const [dataToEdit, setDataToEdit] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [dataToDelete, setDataToDelete] = useState({});

  const fetchData = async () => {
    const incomeRes = await getAllIncomesRequest();
    const expenseRes = await getAllExpensesRequest();
    const summaryRes = await getFinanceSummaryRequest();
    setIncomes(incomeRes.data);
    setExpenses(expenseRes.data);
    setSummary(summaryRes.data);



// 🔎 Normaliza arreglo (por si tu API devuelve {data:{data:[]}} o directo [])
const incomesRaw =
  Array.isArray(incomeRes?.data?.data) ? incomeRes.data.data :
  Array.isArray(incomeRes?.data)       ? incomeRes.data :
  [];

// Helpers seguros
const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
const d = (v) => (v ? new Date(v) : null);

// ✅ Totales
const totalIncomeCalc = incomesRaw.reduce((s, r) => s + n(r.amount), 0);

// ✅ Tabla principal (para ver TODO rápido)
const tableAll = incomesRaw.map((r) => ({
  id: r.id,
  fecha: r.date ? new Date(r.date).toISOString().slice(0, 10) : "—",
  concepto: r.concept ?? "—",
  categoria: r.category ?? "—",
  amount: n(r.amount),
  referenceType: r.referenceType ?? "—",
  referenceId: r.referenceId ?? "—",
  status: r.status ?? "—",
}));

console.groupCollapsed(`💰 DEBUG INCOMES | registros=${incomesRaw.length} | suma=${totalIncomeCalc.toFixed(2)}`);
console.table(tableAll);
console.log("Suma ingresos (calculada):", totalIncomeCalc.toFixed(2));
console.groupEnd();

// ✅ Resumen por categoría
const byCategory = Object.values(
  incomesRaw.reduce((acc, r) => {
    const key = r.category ?? "—";
    acc[key] ??= { categoria: key, count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += n(r.amount);
    return acc;
  }, {})
).sort((a, b) => b.total - a.total);

console.groupCollapsed("📌 Ingresos por CATEGORÍA");
console.table(byCategory.map(x => ({ ...x, total: Number(x.total.toFixed(2)) })));
console.groupEnd();

// ✅ Resumen por referenceType (para detectar duplicados por order/order_item, etc.)
const byRefType = Object.values(
  incomesRaw.reduce((acc, r) => {
    const key = r.referenceType ?? "—";
    acc[key] ??= { referenceType: key, count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += n(r.amount);
    return acc;
  }, {})
).sort((a, b) => b.total - a.total);

console.groupCollapsed("🧾 Ingresos por referenceType");
console.table(byRefType.map(x => ({ ...x, total: Number(x.total.toFixed(2)) })));
console.groupEnd();

// ✅ Posibles sospechosos
// 1) amount 0 o negativos
const weirdAmounts = incomesRaw
  .filter(r => n(r.amount) <= 0)
  .map(r => ({
    id: r.id,
    concepto: r.concept ?? "—",
    categoria: r.category ?? "—",
    amount: n(r.amount),
  }));

// 2) posibles duplicados por referenceType+referenceId (muy típico cuando se crean 2 incomes por el mismo item/order)
const dupMap = incomesRaw.reduce((acc, r) => {
  const key = `${r.referenceType ?? "—"}::${r.referenceId ?? "—"}`;
  acc[key] ??= [];
  acc[key].push(r);
  return acc;
}, {});

const duplicates = Object.entries(dupMap)
  .filter(([, arr]) => arr.length > 1 && arr[0]?.referenceId != null) // solo si hay referenceId
  .map(([key, arr]) => ({
    key,
    count: arr.length,
    total: Number(arr.reduce((s, r) => s + n(r.amount), 0).toFixed(2)),
    ids: arr.map(x => x.id).join(", "),
  }))
  .sort((a, b) => b.total - a.total);

// 3) fechas raras (futuro) por si se desordenan reportes
const futureDates = incomesRaw
  .filter(r => r.date && d(r.date) && d(r.date).getTime() > Date.now() + 24*60*60*1000)
  .map(r => ({
    id: r.id,
    date: r.date,
    concept: r.concept ?? "—",
    amount: n(r.amount),
  }));

console.groupCollapsed("⚠️ SOSPECHOSOS");
if (weirdAmounts.length) {
  console.log("Montos <= 0:");
  console.table(weirdAmounts);
} else {
  console.log("Montos <= 0: ninguno ✅");
}

if (duplicates.length) {
  console.log("Duplicados por referenceType::referenceId:");
  console.table(duplicates);
} else {
  console.log("Duplicados por referenceType::referenceId: ninguno ✅");
}

if (futureDates.length) {
  console.log("Fechas en el futuro:");
  console.table(futureDates);
} else {
  console.log("Fechas en el futuro: ninguna ✅");
}
console.groupEnd();

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

// 1) commonColumns: maneja params y stopPropagation
const commonColumns = [
  { label: "Fecha", id: "date" },
  { label: "Concepto", id: "concept" },
  { label: "Categoría", id: "category" },
  { label: "Monto", id: "amount" },
  {
    label: "Acciones",
    id: "actions",
    // Si tu TablePro usa 'renderCell', pásalo también/además:
    render: (params) => {
      const row = params?.row ?? params; // tolera ambas formas
      if (!row) return null;
      return (
        <>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // 🔒 no dejes que la fila consuma el click
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
                e.stopPropagation(); // 🔒
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
    // renderCell: ... // si tu TablePro usa esta prop, duplica el mismo contenido aquí
  },
];


  return (
    <Container>
      {/* Dialog Eliminar */}
      <SimpleDialog
        open={openDeleteDialog}
        onClose={handleDialogDelete}
        tittle="Eliminar Registro"
        onClickAccept={deleteData}
      >
        ¿Está seguro de eliminar este registro?
      </SimpleDialog>

      {/* Dialog Crear/Editar */}
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


      <Grid container spacing={2} mb={4} mt={2}>
        <Grid item xs={12} md={4}>
          <Paper>
            <Typography variant="h6">💰 Total Dinero</Typography>
            <Typography variant="h5">${(summary.balance).toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper>
            <Typography variant="h6">📈 Total Ingresos</Typography>
            <Typography variant="h5">${summary.totalIncome.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper>
            <Typography variant="h6">📉 Total Gastos</Typography>
            <Typography variant="h5">${summary.totalExpense.toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={4} mt={2}>
        <Grid item xs={12} md={6}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => {
              setFormType("income");
              setTitleUserDialog("Registrar Ingreso");
              setIsEditing(false);
              setDataToEdit(null);
              handleDialogUser();
            }}
            sx={{ mr: 2 }}
          >
            Registrar Ingreso
          </Button>
          <TablePro
            rows={incomes.map(i => ({ ...i, type: "income" }))} 
            columns={commonColumns}
            defaultRowsPerPage={5}
            title="Ingresos"
          />
        </Grid>
        <Grid item xs={12} md={6}>

          <Button
            variant="outlined"
            color="error"
            startIcon={<Add />}
            onClick={() => {
              setFormType("expense");
              setTitleUserDialog("Registrar Gasto");
              setIsEditing(false);
              setDataToEdit(null);
              handleDialogUser();
            }}
          >
            Registrar Gasto
          </Button>
          {/* <DataTable data={expenses.map(e => ({ ...e, type: "expense" }))} columns={commonColumns} /> */}
                    <TablePro
            rows={expenses.map(e => ({ ...e, type: "expense" }))} 
            columns={commonColumns}
            defaultRowsPerPage={5}
            title="Gastos"
          />
        </Grid>
      </Grid>

    </Container>
  );
}

export default FinancePage;
