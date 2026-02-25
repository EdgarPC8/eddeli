import { sequelize } from "../database/connection.js";
import { Account, AccountRoles } from "../models/Account.js";
import { Roles } from "../models/Roles.js";
import { Users } from "../models/Users.js";
import bcrypt from "bcrypt";

export const getRoles = async (req, res) => {
  try {
    const data = await Roles.findAll();
    res.json(data);


  } catch (error) {
    console.error("Error al obtener los roles:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
  };

export const addAccount = async (req, res) => {
  try {
    const {
      username,
      newPassword,
      confirmPassword,
      roles,  // Array de IDs de roles
      userId,
    } = req.body;

    if (!newPassword || newPassword.trim() === "") {
      return res.status(400).json({ message: "La contraseña es obligatoria" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Crear la cuenta
    const newAccount = await Account.create({
      username,
      password: hashedPassword,
      userId,
    });
    // Insertar los roles
    if (roles && roles.length > 0) {
      const roleEntries = roles.map(roleId => ({
        accountId: newAccount.id,
        roleId,
      }));
      await AccountRoles.bulkCreate(roleEntries);
    }

    res.json({ message: "Cuenta creada con éxito", data: newAccount });
  } catch (error) {
    console.error("Error al crear cuenta:", error);
    res.status(500).json({ message: error.message });
  }
};


export const updateAccount = async (req, res) => {
  const data = req.body;
  const idAccount = req.params.id;

  try {
    const cuenta = await Account.findByPk(idAccount);

    if (!cuenta) {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }

    // ✅ Actualizar el username si viene
    if (data.username) {
      cuenta.username = data.username;
    }

    // ✅ Solo actualiza la contraseña si se mandó explícitamente
    if (data.newPassword && data.confirmPassword) {
      if (data.newPassword !== data.confirmPassword) {
        return res.status(400).json({ message: "Las contraseñas nuevas no coinciden" });
      }

      const passgenerate = await bcrypt.hash(data.newPassword, 10);
      cuenta.password = passgenerate;
    }

    // ✅ Guardar cambios básicos
    await cuenta.save();

    // ✅ Actualizar roles si vienen
    if (Array.isArray(data.roles)) {
      await cuenta.setRoles(data.roles); // ← esto borra y vuelve a insertar
    }

    return res.json({ message: "Cuenta actualizada con éxito" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar cuenta" });
  }
};


export const updateAccountUser = async (req, res) => {
  const data = req.body;
  const idAccount = req.params.id;
  console.log("-------------------:",idAccount)

  try {
    const cuenta = await Account.findByPk(idAccount, {
      include: [
        { model: Roles},
        { model: Users }
      ]
    });

    if (!cuenta) {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }

    // Actualizar username si viene
    if (data.username) {
      cuenta.username = data.username;
    }

    // 🔒 Cambiar contraseña solo si se proveen ambas: old + new
    if (data.oldPassword && data.newPassword) {
      const isValid = await bcrypt.compare(data.oldPassword, cuenta.password);
      if (!isValid) {
        return res.status(401).json({ message: "La contraseña anterior es incorrecta" });
      }

      const hashed = await bcrypt.hash(data.newPassword, 10);
      cuenta.password = hashed;
    }

    await cuenta.save();

    // Actualizar roles si se envían
    if (Array.isArray(data.roles)) {
      await cuenta.setRoles(data.roles);
    }

    // También podrías enviar los datos actualizados del usuario si quieres
    return res.json({
      message: "Cuenta actualizada con éxito",
      data: {
        id: cuenta.id,
        username: cuenta.username,
        roles: await cuenta.getRoles(), // opcional
      }
    });

  } catch (error) {
    console.error("Error actualizando cuenta:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const getAccounts = async (req, res) => {
  try {
    const data = await Account.findAll({
      attributes: ["id", "username"], // solo lo necesario de Account
      include: [
        {
          model: Roles,
          as: "roles",
          attributes: ["id", "name"], // solo el nombre del rol
          through: { attributes: [] },
        },
        {
          model: Users,
          as: "user",
          attributes: [
            "firstName",
            "secondName",
            "firstLastName",
            "secondLastName",
            "gender",
          ],
        },
      ],
    });

    res.json(data);
  } catch (error) {
    console.error("Error al obtener cuentas:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

  
  export const getOneAccount= async (req, res) => {
    const { id } = req.params;
    try {
      const data = await Account.findOne({
        where: { id },
        include: [
          {
            model: Roles,
            as: 'roles', // asegúrate de tener esta asociación en tus modelos
            through: { attributes: [] }
          }
        ]
      });
      
      res.json({
        ...data.toJSON(),
        roles: data.roles.map(r => r.id)
      });
      
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  export const getAccount = async (req, res) => {
    const { accountId, rolId } = req.params;
  
    try {
      const data = await Account.findOne({
        where: { id:accountId },
        attributes: [
          "username",
          "id",
          "userId"
        ],
        include: [
          {
            model: Roles,
            as: 'roles',
            through: { attributes: [] }, // trae todos los roles, sin info de tabla intermedia
          },
          {
            model: Users,
            as: 'user',
            attributes: [
              "id",
              "firstName",
              "secondName",
              "firstLastName",
              "secondLastName",
              "photo",
              "ci",
              "birthday",
              "gender"
            ]
          }
        ]
      });
  
      if (!data) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
  
      res.json({
        ...data.toJSON(),
        activeRoleId: parseInt(rolId), // <- opcionalmente indicamos cuál es el rol actual
      });
  
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  export const deleteAccount = async (req, res) => {
    try {
      await Account.destroy({
        where: {
          id: req.params.id,
        },
      });
  
      res.json({ message: "Cuenta eleminado con éxito" });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };

  export const resetPassword = async (req, res) => {
    // const data=req.body;
    const idAccount=req.params.id;

  
    try {

      const passgenerate = await bcrypt.hash("12345678", 10);

     await Account.update({
      password:passgenerate,
     },
        {
          where: {
            id: idAccount
          },
        }
      );
      res.json({ message: "Password Reseteda a 12345678 con éxito" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };


  export const getOneRol= async (req, res) => {
    const { id } = req.params;
    try {
      const data = await Roles.findOne({
        where: { id:id },
      });
  
      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
  export const addRol = async (req, res) => {
    try {
      const data= req.body;
    const newData = await Roles.create(data);
    res.json({ message: `agregado con éxito`,data:newData});
    } catch (error) {
      // manejo de errores si ocurre algún problema durante la creación del usuario
      console.error("error al crear el rol:", error);
    }
  };
  export const deleteRol = async (req, res) => {
    try {
      await Roles.destroy({
        where: {
          id: req.params.id,
        },
      });
  
      res.json({ message: "Rol eleminado con éxito" });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };
  export const updateRol = async (req, res) => {
    const data=req.body;
  
    try {
     await Roles.update(data,
        {
          where: {
            id: req.params.id,
          },
        }
      );
      res.json({ message: "Rol editado con éxito" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
