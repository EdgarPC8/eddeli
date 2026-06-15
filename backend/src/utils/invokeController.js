/**
 * Ejecuta un controlador Express (req, res) y devuelve el JSON como Promise.
 */
export function invokeController(handler, req = {}) {
  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        if (statusCode >= 400) {
          reject(Object.assign(new Error(data?.message || "Error en controlador"), { status: statusCode, data }));
          return;
        }
        resolve(data);
      },
    };

    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function pickProductStockFields(p) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price ?? 0),
    stock: Number(p.stock ?? 0),
    minStock: Number(p.minStock ?? 0),
    type: p.type,
    isActive: p.isActive,
  };
}

export function buildProductsStockAlerts(products = []) {
  const list = Array.isArray(products) ? products : [];
  const agotados = list
    .filter((p) => Number(p.stock ?? 0) <= 0)
    .map(pickProductStockFields)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));

  const porAgotarse = list
    .filter((p) => {
      const stock = Number(p.stock ?? 0);
      const min = Number(p.minStock ?? 0);
      return stock > 0 && stock <= min;
    })
    .map(pickProductStockFields)
    .sort((a, b) => a.stock - b.stock || a.minStock - b.minStock);

  return { agotados, porAgotarse };
}
