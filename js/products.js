import { saveState } from "./store.js";

function validateProductDetails(details) {
  const name = details.name.trim();
  const category = details.category.trim();
  if (details.price === "") throw new Error("Escribe el precio del producto.");
  if (details.stock === "") throw new Error("Escribe las existencias del producto.");
  const price = Number(details.price);
  const stock = Number(details.stock);

  if (!name) throw new Error("Escribe el nombre del producto.");
  if (!category) throw new Error("Selecciona una categoría.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("El precio debe ser un número mayor que cero.");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Las existencias deben ser un número entero igual o mayor que cero.");
  return { name, category, price, stock };
}

export function addProduct(state, details) {
  const product = {
    id: `PRD-${state.nextProductNumber}`,
    ...validateProductDetails(details)
  };
  state.products.unshift(product);
  state.nextProductNumber += 1;
  try {
    saveState(state);
  } catch (error) {
    state.products.shift();
    state.nextProductNumber -= 1;
    throw error;
  }
  return product;
}

export function updateProduct(state, productId, details) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) throw new Error("El producto seleccionado ya no existe.");
  const updatedDetails = validateProductDetails(details);
  const previousDetails = { name: product.name, category: product.category, price: product.price, stock: product.stock };
  Object.assign(product, updatedDetails);
  try {
    saveState(state);
  } catch (error) {
    Object.assign(product, previousDetails);
    throw error;
  }
  return product;
}

export function deleteProduct(state, productId) {
  const productIndex = state.products.findIndex((product) => product.id === productId);
  if (productIndex === -1) throw new Error("El producto seleccionado ya no existe.");
  const [removed] = state.products.splice(productIndex, 1);
  try {
    saveState(state);
  } catch (error) {
    state.products.splice(productIndex, 0, removed);
    throw error;
  }
  return removed;
}
