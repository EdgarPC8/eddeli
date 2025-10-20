import { Users } from "../models/Users.js";
import { Account } from "../models/Account.js";
import bcrypt from "bcrypt";
import { createAccessToken, createLicenseToken, getHeaderToken, verifyJWT } from "../libs/jwt.js";
import { Roles } from "../models/Roles.js";
import { logger } from "../log/LogActivity.js";
import { License } from "../models/License.js";
import { calculateExpirationDate } from "../helpers/functions.js";

export const login = async (req, res) => {
  let { username, password, selectedRoleId } = req.body;
  // const system = req.headers['user-agent'];

  try {
    const account = await Account.findOne({
      where: { username },
      include: [
        {
          model: Users,
          as: 'user'
        },
        {
          model: Roles,
          as: 'roles', // MANY TO MANY
          through: { attributes: [] }
        }
      ]
    });

    if (!account) {
      return res.status(400).json({ message: "Datos incorrectos" });
    }

    const isCorrectPassword = await bcrypt.compare(password, account.password);
    if (!isCorrectPassword) {
      return res.status(400).json({ message: "Datos incorrectos" });
    }

    // Si no se seleccionó un rol y tiene más de uno, devolvemos la lista para que el frontend elija
    if (!selectedRoleId) {
      if (account.roles.length > 1) {
        return res.json({
          selectRole: true,
          roles: account.roles.map((role) => ({
            id: role.id,
            name: role.name,
          })),
          accountId: account.id,
        });
      }

      // Si tiene uno solo, lo usamos directamente
      selectedRoleId = account.roles[0]?.id;
    }

    const selectedRole = account.roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) {
      return res.status(400).json({ message: "Rol seleccionado inválido" });
    }

    const payload = {
      userId: account.userId,
      accountId: account.id,
      rolId: selectedRole.id,
      loginRol: selectedRole.name,
    };

    const token = await createAccessToken({ payload });

    res.json({ message: "User authenticated", token });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: error.message });
  }
};

export const changeRole = async (req, res) => {
  const { accountId, rolId } = req.body;
  console.log(accountId, rolId )
  try {
    const account = await Account.findByPk(accountId, {
      include: [
        {
          model: Roles,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });

    if (!account) {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }

    const hasRole = account.roles.find((r) => r.id === rolId);
    if (!hasRole) {
      return res.status(403).json({ message: "No tiene asignado ese rol" });
    }

    const payload = {
      userId: account.userId,
      accountId: account.id,
      rolId: hasRole.id,
      loginRol: hasRole.name,
    };

    const token = await createAccessToken({ payload });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar de rol", error: error.message });
  }
};


export const verifytoken = async (req, res) => {
  
  try {
    const token = getHeaderToken(req);

  if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = await verifyJWT(token);

    res.json(decoded);
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
export const renoveLicense = async (req, res) => {
  const {name} = req.body;
  const now = new Date();
  try {
    const lic= await License.findOne({
      where: {...name,valide:1}
    });

    if(!lic)return res.status(401).json({ message: "Clave incorrecta para Licencia" });

    const dateExpiration = calculateExpirationDate(now, lic.time);


  const payload={
    time:lic.time,
    dateCreation:lic.dateCreation,
    codex:lic.name,
  }
  const token = await createLicenseToken({payload})
     await License.update({valide:0,token:token,dateUse:now,dateExpiration:dateExpiration},
      {
        where: {
          valide: 1,id:lic.id
        },
      }
    );

    const newTokenKey= await License.findOne({
      attributes:["token",'dateCreation',"name","time","dateExpiration"],
      where: {id:lic.id}
    });
    res.json({ message: "Clave correcta para Licencia",data:newTokenKey });
  } catch (error) {
    return res.status(401).json({ message: "License Caducada" });
  }
};
export const getLicenses = async (req, res) => {
  try {
    const data = await License.findAll();

    // console.log("Consulta completada:", users);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor." });
  }
  };
  export const addLicense = async (req, res) => {
    try {
    
      const {time,valorTime,name}= req.body;
  
      const newData = await License.create({
        time:`${valorTime}${time}`,
        name:name
      });
      res.json({ message: `agregado con éxito`,data:newData});
  
    } catch (error) {
      // manejo de errores si ocurre algún problema durante la creación del usuario
      console.error("error al crear el rol:", error);
    }
  };

  export const getOneLicense = async (req, res) => {
    const { id } = req.params;
    try {
      const data = await License.findOne({
        where: { id:id },
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
 
  export const deleteLicense= async (req, res) => {
    try {
      const removingLicense= await License.destroy({
        where: {
          id: req.params.id,
        },
      });
      res.json({ message: "Licencia eleminada con éxito" });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  export const updateLicense = async (req, res) => {
    const data=req.body;
    try {
      const lic = await License.findOne({
        where: { id: req.params.id },
      });
      if(lic.valide==0)return res.status(401).json({ message: "Ya no se puede Editar" });

      const userUpdate = await License.update(data,
        {
          where: {
            id: req.params.id,
          },
        }
      );
      res.json({ message: "Licencia editada con éxito" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  

// export { login, verifytoken };
