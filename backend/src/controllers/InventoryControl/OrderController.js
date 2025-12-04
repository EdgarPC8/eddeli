import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

import { InventoryMovement, InventoryProduct } from "../../models/Inventory.js";
import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';
export const markItemAsPaid = async (req, res) => {
  try {
    const { itemId } = req.params;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.paidAt) {
      return res.status(400).json({ message: 'This item is already marked as paid' });
    }

    item.paidAt = new Date();
    await item.save();

    // Check if all items in the order are paid
    const allItems = await OrderItem.findAll({ where: { orderId: item.orderId } });
    const allPaid = allItems.every(i => !!i.paidAt);

    if (allPaid) {
      const order = await Order.findByPk(item.orderId);
      order.status = 'pagado';
      await order.save();

      // Check for existing income
      const existingIncome = await Income.findOne({
        where: {
          referenceId: order.id,
          referenceType: 'order',
        }
      });

      if (!existingIncome) {
        const total = allItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        await Income.create({
          date: new Date(),
          amount: total,
          concept: `Order #${order.id} payment`,
          category: 'Venta',
          referenceId: order.id,
          referenceType: 'order',
          createdBy: user.accountId,
        });
      }
    }

    res.json({ message: 'Item marked as paid', item });

  } catch (error) {
    console.error("Error in markItemAsPaid:", error);
    res.status(500).json({ message: 'Error marking item as paid', error });
  }
};
export const markItemAsDelivered = async (req, res) => {
  try {
    const { itemId } = req.params;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.deliveredAt) {
      return res.status(400).json({ message: 'Este ítem ya fue marcado como entregado' });
    }
    
    const product = await InventoryProduct.findByPk(item.productId);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    
    if (product.stock < item.quantity) {
      return res.status(400).json({ message: 'Stock insuficiente para entregar este ítem' });
    }
    

    // 1. Deduct stock
    product.stock -= item.quantity;
    await product.save();

    // 2. Record stock movement
    await InventoryMovement.create({
      productId: item.productId,
      quantity: item.quantity,
      type: "salida",
      referenceType: "order",
      referenceId: item.orderId,
      date: new Date(),
      createdBy: user.accountId
    });

    // 3. Mark as delivered (set delivery timestamp)
    item.deliveredAt = new Date();
    await item.save();

    // 4. Check if all items are delivered
    const allItems = await OrderItem.findAll({ where: { orderId: item.orderId } });
    const allDelivered = allItems.every(i => !!i.deliveredAt);

    if (allDelivered) {
      const order = await Order.findByPk(item.orderId);
      if (order.status !== 'paid') {
        order.status = 'entregado';
        await order.save();
      }
    }

    res.json({ message: 'Item delivered, stock updated, and movement recorded', item });

  } catch (error) {
    console.error("Error delivering item:", error);
    res.status(500).json({ message: 'Error delivering item', error });
  }
};
// Crear un nuevo cliente
export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cliente', error });
  }
};

// Crear un nuevo pedido
export const createOrder = async (req, res) => {
  try {
    const { customerId, notes, date, items } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos del pedido' });
    }

    const order = await Order.create({
      customerId,
      notes,
      date:date, // usa la fecha enviada, o la actual si no viene
    });

    const createdItems = await Promise.all(
      items.map((item) =>
        OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          statusEntrega: false,
          statusPago: false,
        })
      )
    );

    res.status(201).json({ order, items: createdItems });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear pedido', error });
  }
};


export const markOrderAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    if (order.status === 'pagado') {
      return res.status(400).json({ message: 'El pedido ya está marcado como pagado' });
    }

    order.status = 'pagado';
    await order.save();

    res.json({ message: 'Pedido marcado como pagado', order });
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar pedido como pagado', error });
  }
};

export const deleteOrderItem = async (req, res) => {
  try {
    const item = await OrderItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Ítem no encontrado" });
    await item.destroy();
    res.json({ message: "Ítem eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar ítem", error });
  }
};
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Orden no encontrado" });
    await order.destroy();
    res.json({ message: "Orden eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar Orden", error });
  }
};
// Editar un pedido y su cliente
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    // Permitimos updates parciales solo en estos campos
    const { customerId, notes, date } = req.body ?? {};

    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Bloqueo por estado si no es Admin/Programador
    const isPrivileged = ['Administrador', 'Programador'].includes(user?.loginRol);
    if (['entregado', 'pagado'].includes(order.status) && !isPrivileged) {
      return res.status(403).json({
        message: `No tiene permisos para editar pedidos ${order.status}`,
      });
    }

    // Construimos el payload de actualización SOLO con campos presentes
    const updates = {};

    if (typeof customerId !== 'undefined') {
      // Validación simple
      if (customerId === null || Number.isNaN(Number(customerId))) {
        return res.status(400).json({ message: 'customerId inválido' });
      }
      updates.customerId = customerId;
    }

    if (typeof notes !== 'undefined') {
      // Sanitizar/limitar si quieres (ej. longitud)
      updates.notes = String(notes);
    }

    if (typeof date !== 'undefined') {
      // Acepta Date ISO o string "YYYY-MM-DDTHH:mm:ss"
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha inválido' });
      }
      updates.date = parsed; // Sequelize DATE/DATETIME
    }

    // Si no hay nada que actualizar:
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No se enviaron campos válidos para actualizar' });
    }

    await order.update(updates);

    // Opcional: vuelve a cargar asociaciones mínimas si las necesitas en el front
    // await order.reload({ include: [Customer] });

    return res.json({ message: 'Pedido actualizado', order });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return res.status(500).json({ message: 'Error al actualizar pedido', error: String(error?.message || error) });
  }
};


export const updateOrderItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, price, deliveredAt, paidAt } = req.body;

    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Ítem no encontrado' });

    item.quantity = quantity;
    item.price = price;
    item.deliveredAt = deliveredAt;
    item.paidAt = paidAt ;

    // console.log("------------------",deliveredAt,paidAt)
    await item.save();

    res.json({ message: 'Ítem actualizado correctamente', item });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ítem', error });
  }
};


// Cambiar el estado del pedido
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    order.status = status;
    await order.save();
    res.json({ message: 'Estado actualizado', order });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado del pedido', error });
  }
};

// Obtener todos los pedidos con sus items y cliente



export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          as: "ERP_customer"
        },
        {
          model: OrderItem,
          as: "ERP_order_items",
          include: [
            {
              model: InventoryProduct,
              as: "ERP_inventory_product"
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedOrders = orders.map(order => {
      const formattedItems = order.ERP_order_items.map(item => ({
        ...item.toJSON(),
        paidAt: item.paidAt ? format(new Date(item.paidAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : null,
        deliveredAt: item.deliveredAt ? format(new Date(item.deliveredAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : null,
      }));

      return {
        ...order.toJSON(),
        date: format(new Date(order.date), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        createdAt: format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        updatedAt: format(new Date(order.updatedAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        ERP_order_items: formattedItems,
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos', error });
  }
};


