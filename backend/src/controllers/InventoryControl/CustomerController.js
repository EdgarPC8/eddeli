import { Customer } from "../../models/Orders.js";
import {
  composeCustomerFullName,
  normalizeCustomerPayload,
} from "../../services/customerNameService.js";

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [["id", "DESC"]] });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener clientes", error });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const payload = normalizeCustomerPayload(req.body || {});
    if (!String(payload.name || "").trim() && !String(payload.firstName || "").trim()) {
      return res.status(400).json({ message: "El primer nombre es obligatorio" });
    }
    if (!payload.name) {
      payload.name = composeCustomerFullName(payload) || "Sin nombre";
    }
    if (!payload.firstName) {
      payload.firstName = payload.name;
    }
    if (!payload.identType) payload.identType = "05";

    if (payload.phone) {
      const existing = await Customer.findOne({ where: { phone: payload.phone } });
      if (existing) {
        return res.status(409).json({ message: "Ya existe un cliente con ese teléfono" });
      }
    }

    const customer = await Customer.create(payload);
    res.status(201).json(customer);
  } catch (error) {
    console.error("createCustomer", error);
    res.status(500).json({ message: "Error al crear cliente", error: String(error?.message || error) });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Cliente no encontrado" });

    const current = customer.toJSON();
    const payload = normalizeCustomerPayload({
      firstName: current.firstName,
      secondName: current.secondName,
      firstLastName: current.firstLastName,
      secondLastName: current.secondLastName,
      identType: current.identType,
      cedula: current.cedula,
      name: current.name,
      ...(req.body || {}),
    });

    if (!payload.name) {
      payload.name = composeCustomerFullName(payload) || current.name;
    }

    await customer.update(payload);
    res.json(await customer.reload());
  } catch (error) {
    console.error("updateCustomer", error);
    res.status(500).json({ message: "Error al actualizar cliente", error: String(error?.message || error) });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const deleted = await Customer.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Cliente no encontrado" });
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar cliente", error });
  }
};
