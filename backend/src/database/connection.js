import Sequelize from "sequelize";

const sequelize = new Sequelize("softed", "root", "", {
  host: "localhost",
  dialect: "mysql",
  timezone: '-05:00', // ✅ ajusta al horario local
});

export { sequelize };
