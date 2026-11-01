import { escapeHTML, formatCurrency, formatDate, loadState, saveState } from "./store.js";
import { addProduct, deleteProduct, updateProduct } from "./products.js";
import { registerSale } from "./sales.js";

const { state, recovered } = loadState();
const toastRegion = document.querySelector("#toast-region");
let editingProductId = null;

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : type === "warning" ? " warning" : ""}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function resetProductForm(form) {
  editingProductId = null;
  form.reset();
  setText("#product-form-eyebrow", "NUEVA REFERENCIA");
  setText("#product-form-title", "Agregar producto");
  document.querySelector("#save-product-button").innerHTML = 'Guardar producto <span aria-hidden="true">→</span>';
  document.querySelector("#cancel-product-edit").classList.add("hidden");
}

function beginProductEdit(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    showToast("El producto seleccionado ya no existe.", "error");
    return;
  }
  editingProductId = product.id;
  document.querySelector("#product-name").value = product.name;
  document.querySelector("#product-category").value = product.category;
  document.querySelector("#product-price").value = product.price;
  document.querySelector("#product-stock").value = product.stock;
  setText("#product-form-eyebrow", "ACTUALIZAR REFERENCIA");
  setText("#product-form-title", "Editar producto");
  document.querySelector("#save-product-button").innerHTML = 'Guardar cambios <span aria-hidden="true">→</span>';
  document.querySelector("#cancel-product-edit").classList.remove("hidden");
  document.querySelector("#product-name").focus();
  document.querySelector("#product-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function runAction(action, successMessage) {
  try {
    const result = action();
    renderAll();
    showToast(successMessage(result));
    return true;
  } catch (error) {
    showToast(error.message || "No fue posible completar la operación.", "error");
    return false;
  }
}

function getRevenue() {
  return state.sales.reduce((sum, sale) => sum + sale.total, 0);
}

function getUnitsSold() {
  return state.sales.reduce((sum, sale) => sum + sale.quantity, 0);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setEmptyState(selector, isEmpty) {
  document.querySelector(selector).classList.toggle("hidden", !isEmpty);
}

function renderHome() {
  setText("#welcome-date", new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date()).toUpperCase());
  setText("#home-revenue", formatCurrency(getRevenue()));
  setText("#home-products", state.products.length);
  setText("#home-sales", state.sales.length);
  const recentSales = state.sales.slice(0, 4);
  document.querySelector("#home-recent-sales").innerHTML = recentSales.map((sale) => `
    <tr>
      <td>${escapeHTML(sale.client)}</td>
      <td>${escapeHTML(sale.productName)}</td>
      <td>${formatDate(sale.date)}</td>
      <td class="align-right">${formatCurrency(sale.total)}</td>
    </tr>`).join("");
  setEmptyState("#home-empty-sales", recentSales.length === 0);
}

function renderProducts() {
  const query = document.querySelector("#product-search").value.trim().toLocaleLowerCase("es");
  const products = state.products.filter((product) => `${product.name} ${product.category} ${product.id}`.toLocaleLowerCase("es").includes(query));
  setText("#product-count", state.products.length);
  document.querySelector("#products-table").innerHTML = products.map((product) => `
    <tr>
      <td class="product-name-cell"><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.id)}</small></td>
      <td><span class="category-tag">${escapeHTML(product.category)}</span></td>
      <td>${formatCurrency(product.price)}</td>
      <td><span class="stock-badge${product.stock <= 5 ? " low" : ""}">${product.stock} uds.</span></td>
      <td class="action-cell"><button class="edit-button" type="button" data-edit-product="${escapeHTML(product.id)}" aria-label="Editar ${escapeHTML(product.name)}" title="Editar producto">✎</button><button class="delete-button" type="button" data-delete-product="${escapeHTML(product.id)}" aria-label="Eliminar ${escapeHTML(product.name)}" title="Eliminar producto">×</button></td>
    </tr>`).join("");
  setEmptyState("#products-empty", products.length === 0);

  const selectedProductId = document.querySelector("#sale-product").value;
  document.querySelector("#sale-product").innerHTML = `<option value="">Selecciona un producto</option>${state.products
    .filter((product) => product.stock > 0)
    .map((product) => `<option value="${escapeHTML(product.id)}">${escapeHTML(product.name)} · ${product.stock} disponibles</option>`)
    .join("")}`;
  if (state.products.some((product) => product.id === selectedProductId && product.stock > 0)) {
    document.querySelector("#sale-product").value = selectedProductId;
  }
  updateSalePreview();
  setText("#sale-product-count", state.products.length);
  setText("#sale-units-count", state.products.reduce((sum, product) => sum + product.stock, 0));
}

function renderHistory() {
  const query = document.querySelector("#history-search").value.trim().toLocaleLowerCase("es");
  const sales = state.sales.filter((sale) => `${sale.client} ${sale.productName}`.toLocaleLowerCase("es").includes(query));
  setText("#history-count", state.sales.length);
  document.querySelector("#history-table").innerHTML = sales.map((sale) => `
    <tr>
      <td>${formatDate(sale.date, true)}</td>
      <td>${escapeHTML(sale.client)}</td>
      <td>${escapeHTML(sale.productName)}</td>
      <td>${sale.quantity}</td>
      <td>${formatCurrency(sale.unitPrice)}</td>
      <td class="align-right"><strong>${formatCurrency(sale.total)}</strong></td>
    </tr>`).join("");
  setEmptyState("#history-empty", sales.length === 0);
}

function renderChart() {
  const days = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    const total = state.sales.reduce((sum, sale) => {
      const date = new Date(sale.date);
      return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate()
        ? sum + sale.total
        : sum;
    }, 0);
    days.push({ key, date: day, total });
  }
  const max = Math.max(...days.map((day) => day.total), 1);
  document.querySelector("#revenue-chart").innerHTML = days.map((day, index) => {
    const height = day.total === 0 ? 2 : Math.max(6, Math.round(day.total / max * 100));
    const label = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(day.date).replace(".", "");
    const accessibleValue = `${label}: ${formatCurrency(day.total)}`;
    return `<div class="chart-day${index === days.length - 1 ? " today" : ""}" aria-label="${accessibleValue}">
      <div class="chart-bar-track"><div class="chart-bar" style="height:${height}%"></div></div>
      <span class="chart-day-label">${escapeHTML(label)}</span>
    </div>`;
  }).join("");
}

function renderReports() {
  const units = getUnitsSold();
  setText("#report-revenue", formatCurrency(getRevenue()));
  setText("#report-units", units);
  setText("#report-ticket", formatCurrency(state.sales.length ? getRevenue() / state.sales.length : 0));
  renderChart();

  const lowStock = state.products.filter((product) => product.stock <= 5).sort((a, b) => a.stock - b.stock);
  setText("#low-stock-count", lowStock.length);
  document.querySelector("#low-stock-list").innerHTML = lowStock.map((product) => `
    <div class="low-stock-item"><div><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.category)}</small></div><span>${product.stock} ${product.stock === 1 ? "unidad" : "unidades"}</span></div>`).join("");
  setEmptyState("#low-stock-empty", lowStock.length === 0);
}

function renderAll() {
  renderHome();
  renderProducts();
  renderHistory();
  renderReports();
}

function updateSalePreview() {
  const product = state.products.find((item) => item.id === document.querySelector("#sale-product").value);
  const quantity = Number(document.querySelector("#sale-quantity").value);
  setText("#sale-stock-note", product ? `Disponibles: ${product.stock} unidades` : "Elige un producto para consultar existencias.");
  setText("#sale-total", formatCurrency(product && Number.isInteger(quantity) && quantity > 0 ? product.price * quantity : 0));
  setText("#sale-unit-price", product ? `Precio unitario: ${formatCurrency(product.price)}` : "Selecciona un producto y una cantidad");
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => {
    const active = view.id === `view-${name}`;
    view.classList.toggle("is-visible", active);
    view.hidden = !active;
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.view === name;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.go));
});

document.querySelector("#product-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const details = { name: fields.get("name"), category: fields.get("category"), price: fields.get("price"), stock: fields.get("stock") };
  const wasEditing = Boolean(editingProductId);
  const saved = runAction(
    () => wasEditing ? updateProduct(state, editingProductId, details) : addProduct(state, details),
    (product) => `${product.name} ${wasEditing ? "se actualizó" : "se agregó"} correctamente en el inventario.`
  );
  if (saved) resetProductForm(form);
});

document.querySelector("#products-table").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    beginProductEdit(editButton.dataset.editProduct);
    return;
  }
  const button = event.target.closest("[data-delete-product]");
  if (!button) return;
  const product = state.products.find((item) => item.id === button.dataset.deleteProduct);
  if (!product || !window.confirm(`¿Eliminar "${product.name}" del inventario? Las ventas ya registradas conservarán sus datos.`)) return;
  const deleted = runAction(() => deleteProduct(state, product.id), (removed) => `${removed.name} se eliminó del inventario.`);
  if (deleted && editingProductId === product.id) resetProductForm(document.querySelector("#product-form"));
});

document.querySelector("#cancel-product-edit").addEventListener("click", () => resetProductForm(document.querySelector("#product-form")));

document.querySelector("#product-search").addEventListener("input", renderProducts);
document.querySelector("#sale-product").addEventListener("change", updateSalePreview);
document.querySelector("#sale-quantity").addEventListener("input", updateSalePreview);

document.querySelector("#sale-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const saved = runAction(
    () => registerSale(state, { client: fields.get("client"), productId: fields.get("productId"), quantity: fields.get("quantity") }),
    (sale) => `Venta registrada por ${formatCurrency(sale.total)}. El inventario fue actualizado.`
  );
  if (saved) form.reset();
  updateSalePreview();
});

document.querySelector("#history-search").addEventListener("input", renderHistory);

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const name = String(fields.get("name")).trim();
  const email = String(fields.get("email")).trim();
  const subject = String(fields.get("subject")).trim();
  const message = String(fields.get("message")).trim();
  if (!name || !email || !subject || !message) {
    showToast("Completa todos los campos del formulario de contacto.", "error");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Escribe un correo electrónico válido.", "error");
    return;
  }
  try {
    const request = { id: `SOL-${Date.now()}`, name, email, subject, message, date: new Date().toISOString() };
    state.requests.unshift(request);
    saveState(state);
    form.reset();
    showToast("Tu solicitud quedó registrada en este dispositivo. El equipo de NovaOffice te contactará pronto.");
  } catch (error) {
    if (state.requests[0]?.id.startsWith("SOL-")) state.requests.shift();
    showToast("No fue posible guardar la solicitud. Verifica el espacio disponible en el navegador.", "error");
    console.error("No se pudo guardar la solicitud de contacto.", error);
  }
});

setText("#footer-year", new Date().getFullYear());
renderAll();
if (recovered) showToast("Los datos guardados estaban dañados. Se cargó un inventario inicial para continuar.", "warning");
