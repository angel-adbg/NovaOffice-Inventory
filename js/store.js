export const STORAGE_KEY = "novaoffice-dashboard-v1";

const initialProducts = [
  { id: "PRD-1001", name: "Cuaderno ejecutivo", category: "Papelería", price: 18500, stock: 24 },
  { id: "PRD-1002", name: "Mouse inalámbrico", category: "Tecnología", price: 45900, stock: 12 },
  { id: "PRD-1003", name: "Bolígrafo gel (x3)", category: "Escritura", price: 12900, stock: 5 },
  { id: "PRD-1004", name: "Organizador de escritorio", category: "Organización", price: 32700, stock: 8 },
  { id: "PRD-1005", name: "Base para portátil", category: "Accesorios", price: 68900, stock: 3 }
];

export function createInitialState() {
  return { products: initialProducts.map((product) => ({ ...product })), sales: [], requests: [], nextProductNumber: 1006 };
}

export function loadState() {
  let saved;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("No se pudo acceder al almacenamiento local de NovaOffice.", error);
    return { state: createInitialState(), recovered: true };
  }
  if (saved === null) return { state: createInitialState(), recovered: false };

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.sales) || !Array.isArray(parsed.requests)) {
      throw new Error("La estructura almacenada no es válida.");
    }
    return {
      state: {
        products: parsed.products,
        sales: parsed.sales,
        requests: parsed.requests,
        nextProductNumber: Number.isInteger(parsed.nextProductNumber) ? parsed.nextProductNumber : 1006
      },
      recovered: false
    };
  } catch (error) {
    console.error("No se pudieron leer los datos guardados de NovaOffice.", error);
    return { state: createInitialState(), recovered: true };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(amount);
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function formatDate(value, includeTime = false) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CO", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
}
