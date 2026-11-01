import { saveState } from "./store.js";

export function registerSale(state, details) {
  const client = details.client.trim();
  const productId = details.productId;
  const quantity = Number(details.quantity);

  if (!client) throw new Error("Escribe el nombre del cliente.");
  if (!productId) throw new Error("Selecciona un producto.");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("La cantidad debe ser un número entero mayor que cero.");

  const product = state.products.find((item) => item.id === productId);
  if (!product) throw new Error("El producto seleccionado ya no está disponible.");
  if (quantity > product.stock) throw new Error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);

  const sale = {
    id: `V-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    client,
    productId: product.id,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    total: product.price * quantity
  };

  product.stock -= quantity;
  state.sales.unshift(sale);
  try {
    saveState(state);
  } catch (error) {
    product.stock += quantity;
    state.sales.shift();
    throw error;
  }
  return sale;
}
