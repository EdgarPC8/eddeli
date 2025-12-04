// loggerMiddleware.js
import { getHeaderToken, verifyJWT } from "../libs/jwt.js";
import { logger } from "../log/LogActivity.js";
import { sequelize } from "../database/connection.js";
import { Account } from "../models/Account.js";
import { Roles } from "../models/Roles.js";
import { Users } from "../models/Users.js";

const methodsToFilter = ["GET","OPTIONS"];
const urlFilter = ["/getMatrizFilter"];
const actions = [
  {
    url: "/api/matriz/editCareer/:careerId",
    action: "Se editó una Carrera",
    method: "PUT"
  },
];

export const loggerMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const system = req.headers['user-agent'];

  if (
    authHeader &&
    authHeader !== "Bearer null" &&
    !methodsToFilter.includes(req.method) &&
    !urlFilter.includes(req.method)
  ) {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    try {
      const account = await Account.findOne({
        include: [
          {
            model: Roles,
            as: 'roles',
            through: { attributes: [] },
          },
          {
            model: Users,
            as: 'user',
          },
        ],
        where: { id: user.accountId },
      });

      const rolName = account.roles?.[0]?.name || "Rol desconocido";

      const matchedAction = actions.find(action => {
        const pattern = action.url.replace(/:[a-zA-Z0-9]+/g, '[a-zA-Z0-9]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(req.originalUrl) && action.method === req.method;
      });

      const actionText = matchedAction ? matchedAction.action : "Acción desconocida";

      logger({
        httpMethod: req.method,
        endPoint: req.originalUrl,
        action: actionText,
        description: `EL ${rolName} ${account.user.firstName} ${account.user.firstLastName} realizó una acción`,
        system: system
      });
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
    }
  }

  next();
};
