// controllers/financeController.js
import { Account } from "../../models/Account.js";
import { Income, Expense } from "../../models/Finance.js";
import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

// controllers/finance.controller.js
import { Op, fn, literal } from 'sequelize';
import { Order, OrderItem } from "../../models/Orders.js";




export const getFinanceSummary = async (req, res) => {
  try {
    const [totalIncome, totalExpense, futureIncomeRow] = await Promise.all([
      Income.sum('amount'),
      Expense.sum('amount'),
      // Suma de (price * quantity) de ítems NO pagados
      OrderItem.findOne({
        attributes: [[fn('COALESCE', fn('SUM', literal('price * quantity')), 0), 'futureIncome']],
        where: {
          paidAt: { [Op.is]: null },       // aún sin pago
          // opcional: excluye eliminados/soft-delete si existe un flag
          
        //    include: [{ 
        //      model: Order, 
        //    as: 'ERP_order', 
        //    attributes: [], 
        //    required: true, 
        //    where: { status: { [Op.ne]: 'pending' } } 
        //  }],
        },
        raw: true,
      }),
    ]);

    const futureIncome = Number(futureIncomeRow?.futureIncome || 0);
    const income = Number(totalIncome || 0);
    const expense = Number(totalExpense || 0);

    const balance = income - expense;
    const projectedBalance = balance + futureIncome;

    res.json({
      totalIncome: income,
      totalExpense: expense,
      balance,
      futureIncome,        // << nuevos ingresos esperados (órdenes no pagadas)
      projectedBalance,    // << balance proyectado = balance + futuros ingresos
    });
  } catch (error) {
    console.error('Error al obtener resumen financiero:', error);
    res.status(500).json({ message: 'Error interno al obtener resumen financiero' });
  }
};



/** Crear un nuevo ingreso */
export const createIncome = async (req, res) => {
  try {
    const { date, amount, concept, category, referenceId, referenceType } = req.body;

        const token = getHeaderToken(req);
      const user = await verifyJWT(token); // para createdBy
    const createdBy = user.accountId;
    const income = await Income.create({ date, amount, concept, category, referenceId, referenceType, createdBy });
    res.status(201).json(income);
  } catch (error) {
    console.error("Error al crear ingreso:", error);
    res.status(500).json({ message: "Error interno al crear ingreso" });
  }
};

/** Crear un nuevo gasto */
export const createExpense = async (req, res) => {
  try {
    const { date, amount, concept, category, referenceId, referenceType } = req.body;
      const token = getHeaderToken(req);
      const user = await verifyJWT(token); // para createdBy
    const createdBy = user.accountId;

    const expense = await Expense.create({ date, amount, concept, category, referenceId, referenceType, createdBy });
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error al crear gasto:", error);
    res.status(500).json({ message: "Error interno al crear gasto" });
  }
};

/** Obtener todos los ingresos */
export const getAllIncomes = async (req, res) => {
  try {
    const incomes = await Income.findAll({
      include: [{ model: Account }],
      order: [["date", "DESC"]],
    });
    res.json(incomes);
  } catch (error) {
    console.error("Error al obtener ingresos:", error);
    res.status(500).json({ message: "Error interno al obtener ingresos" });
  }
};

/** Obtener todos los gastos */
export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      include: [{ model: Account }],
      order: [["date", "DESC"]],
    });
    res.json(expenses);
  } catch (error) {
    console.error("Error al obtener gastos:", error);
    res.status(500).json({ message: "Error interno al obtener gastos" });
  }
};


/** Editar ingreso */
export const updateIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, concept, category, referenceId, referenceType } = req.body;
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: "Ingreso no encontrado" });

    await income.update({ date, amount, concept, category, referenceId, referenceType });
    res.json(income);
  } catch (error) {
    console.error("Error al editar ingreso:", error);
    res.status(500).json({ message: "Error interno al editar ingreso" });
  }
};

/** Editar gasto */
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, concept, category, referenceId, referenceType } = req.body;
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: "Gasto no encontrado" });

    await expense.update({ date, amount, concept, category, referenceId, referenceType });
    res.json(expense);
  } catch (error) {
    console.error("Error al editar gasto:", error);
    res.status(500).json({ message: "Error interno al editar gasto" });
  }
};

/** Eliminar ingreso */
export const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: "Ingreso no encontrado" });

    await income.destroy();
    res.json({ message: "Ingreso eliminado" });
  } catch (error) {
    console.error("Error al eliminar ingreso:", error);
    res.status(500).json({ message: "Error interno al eliminar ingreso" });
  }
};

/** Eliminar gasto */
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: "Gasto no encontrado" });

    await expense.destroy();
    res.json({ message: "Gasto eliminado" });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    res.status(500).json({ message: "Error interno al eliminar gasto" });
  }
};
