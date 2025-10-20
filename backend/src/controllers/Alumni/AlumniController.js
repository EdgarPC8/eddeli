import { Account, AccountRoles } from "../../models/Account.js";
import { Matricula, Matriz } from "../../models/Alumni.js";
import { Roles } from "../../models/Roles.js";
import { Users } from "../../models/Users.js";
import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
import bcrypt from "bcrypt";

export const filterUsers = async (req, res) => {
  const {
    rolId,
    especialidad,
    periodoAcademico,
    periodoActivo,
    fuente,
    carrera, // <- nuevo
    periodo, // <- nuevo
  } = req.body;

  try {
    let include = [
      {
        model: Account,
        as: "accounts",
        include: [
          {
            model: Roles,
            as: "roles",
            where: rolId ? { id: rolId } : undefined,
          },
        ],
      },
    ];

    // Fuente: estudiantes
    if (fuente === "matriculas") {
      include.push({
        model: Matricula,
        where: {
          ...(especialidad && { especialidad }),
          ...(periodoAcademico && { periodoAcademico }),
          ...(periodoActivo && { periodoActivo }),
        },
      });
    }

    // Fuente: egresados
    if (fuente === "matrices") {
      include.push({
        model: Matriz,
        where: {
          ...(carrera && { idCareer: carrera }),
          ...(periodo && { idPeriod: periodo }),
        },
      });
    }

    const users = await Users.findAll({ include });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getEspecialidades = async (req, res) => {
  try {
    const result = await Matricula.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("especialidad")), "value"]],
      raw: true,
    });

    const response = result
      .filter(e => e.value !== null)
      .map(e => ({ value: e.value, name: e.value }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPeriodosAcademicos = async (req, res) => {
  try {
    const result = await Matricula.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("periodoAcademico")), "value"]],
      raw: true,
    });

    const response = result
      .filter(e => e.value !== null)
      .map(e => ({ value: e.value, name: e.value }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const createAccountsFromMatriculas = async (req, res) => {
  try {
    // // // 1. Obtener rol 'Estudiante'
    // const studentRole = await Roles.findOne({ where: { name: 'Estudiante' } });
    // if (!studentRole) return res.status(404).json({ message: 'Rol Estudiante no encontrado' });

    // // 2. Obtener todas las matrículas activas
    // const matriculas = await Matricula.findAll({
    //   where: { periodoActivo: 'ACTIVO' }, // Ajusta si el campo se llama diferente
    //   include: [
    //     {
    //       model: Users,
    //       as: "user",
    //       attributes: [
    //         "ci",
    //       ],
    //     },
    //   ],
    // });
    // let cuentasCreadas = 0;

    // for (const mat of matriculas) {
    //   const username = mat.idUser;
    //   if (!username) continue;

    //   // Verificar si la cuenta ya existe
    //   const existingAccount = await Account.findOne({ where: { username } });
    //   if (existingAccount) continue;

    //   // Crear cuenta nueva
    //   const passwordHash = await bcrypt.hash(mat.user.ci, 10);

    //   const newAccount = await Account.create({
    //     username:mat.user.ci,
    //     password: passwordHash,
    //     userId:mat.idUser
    //   });

    //   // Asignar rol estudiante
    //   await AccountRoles.create({
    //     accountId: newAccount.id,
    //     roleId: studentRole.id,
    //   });

    //   cuentasCreadas++;
    // }

    // res.json({ message: `cuentas creadas exitosamente.`,data:cuentasCreadas.lenght });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear cuentas', error });
  }
};




