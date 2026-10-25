import test from "node:test";
import assert from "node:assert/strict";
import {
  isEmployeePosUnitPriceAllowed,
  resolveAllowedPosUnitPrice,
} from "../src/utils/productPricingUtils.js";

const pan = {
  id: 103,
  name: "Pan de Sal",
  price: 0.15,
  packageTiers: [
    { qty: 2, totalPrice: 0.25 },
    { qty: 4, totalPrice: 0.5 },
    { qty: 8, totalPrice: 1 },
  ],
};

const group = {
  id: 1,
  name: "Pan surtido",
  isActive: true,
  productIds: [71, 103, 49, 117],
  packageTiers: [
    { qty: 2, totalPrice: 0.25 },
    { qty: 4, totalPrice: 0.5 },
    { qty: 8, totalPrice: 1 },
  ],
};

test("empleado: 1 pan a precio catálogo", () => {
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 1, 0.15, [group]), true);
});

test("empleado: 2 panes a tramo 0.125 (caja envía 3 decimales)", () => {
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 2, 0.125, [group]), true);
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 2, 0.13, [group]), true);
});

test("empleado: 8 panes a tramo $1", () => {
  assert.equal(resolveAllowedPosUnitPrice(pan, 8, [group]), 0.13);
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 8, 0.125, [group]), true);
});

test("empleado: rechaza descuento inventado", () => {
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 2, 0.05, [group]), false);
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 1, 0.1, [group]), false);
});

test("sin grupo: usa packageTiers del producto", () => {
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 4, 0.125, []), true);
  assert.equal(isEmployeePosUnitPriceAllowed(pan, 4, 0.15, []), true);
});
