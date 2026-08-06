// /* eVentory — Products page script.
//  * Maps directly to the backend's documented models: Product, Category,
//  * Supplier, InventoryLog. Every action tries the real API first
//  * (GET/POST/PUT/DELETE /products, GET /categories, GET /suppliers,
//  * POST /inventory/adjust, GET /inventory-logs) and falls back to
//  * realistic mock data if a call fails.
//  */

// (function () {
//   "use strict";

//   const EXTRA_ICON_PATHS = {
//     eye: '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.4"/>',
//     edit: '<path d="M13.4 3.6 16.4 6.6 6.6 16.4l-3.6.7.7-3.6z"/><path d="m11.8 5.2 3 3"/>',
//     trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
//     close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
//     arrowLeft: '<path d="M16 10H4"/><path d="m8.6 4.8-5.2 5.2 5.2 5.2"/>',
//     camera: '<path d="M3 6.6h3.2L7.6 4h4.8l1.4 2.6H17v9.8H3z"/><circle cx="10" cy="11.2" r="3.2"/>',
//     arrowUp: '<path d="M10 16V4"/><path d="m4.8 9.2 5.2-5.2 5.2 5.2"/>',
//     arrowDown: '<path d="M10 4v12"/><path d="m15.2 10.8-5.2 5.2-5.2-5.2"/>',
//   };

//   function extraIcon(name, size) {
//     const body = EXTRA_ICON_PATHS[name];
//     if (!body) return "";
//     const px = size || 16;
//     return (
//       '<svg width="' + px + '" height="' + px + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
//       body +
//       "</svg>"
//     );
//   }

//   function icon(name, size) {
//     return window.EvLayout ? window.EvLayout.icon(name, size) : "";
//   }

//   function decorateIcons(root) {
//     (root || document).querySelectorAll("[data-p-icon]").forEach((el) => {
//       el.innerHTML = extraIcon(el.getAttribute("data-p-icon"), el.getAttribute("data-icon-size") || 14);
//     });
//     (root || document).querySelectorAll("[data-icon]").forEach((el) => {
//       el.innerHTML = icon(el.getAttribute("data-icon"), 16);
//     });
//   }

//   function requireAuth() {
//     const token = window.EvApi ? EvApi.getToken() : localStorage.getItem("token");
//     if (!token) {
//       window.location.href = "loginPage.html";
//       return false;
//     }
//     return true;
//   }

//   function escapeHtml(str) {
//     const div = document.createElement("div");
//     div.textContent = str == null ? "" : String(str);
//     return div.innerHTML;
//   }

//   function formatNaira(value) {
//     return "₦" + (Number(value) || 0).toLocaleString("en-NG");
//   }

//   function initialsOf(name) {
//     const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
//     if (!parts.length) return "?";
//     if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
//     return (parts[0][0] + parts[1][0]).toUpperCase();
//   }

//   function showToast(message, isError) {
//     let toast = document.querySelector(".save-toast");
//     if (!toast) {
//       toast = document.createElement("div");
//       toast.className = "save-toast";
//       document.body.appendChild(toast);
//     }
//     toast.textContent = message;
//     toast.classList.toggle("is-error", !!isError);
//     toast.classList.add("is-visible");
//     clearTimeout(toast._hideTimer);
//     toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
//   }

//   // ---------- Modal ----------
//   const modalOverlay = () => document.getElementById("modal-overlay");
//   const modalTitleEl = () => document.getElementById("modal-title");
//   const modalBodyEl = () => document.getElementById("modal-body");

//   function openModal(title, bodyHtml, onMount) {
//     modalTitleEl().textContent = title;
//     modalBodyEl().innerHTML = bodyHtml;
//     modalOverlay().hidden = false;
//     decorateIcons(modalBodyEl());
//     if (typeof onMount === "function") onMount(modalBodyEl());
//   }

//   function closeModal() {
//     modalOverlay().hidden = true;
//     modalBodyEl().innerHTML = "";
//   }

//   function setupModalChrome() {
//     document.getElementById("modal-close")?.addEventListener("click", closeModal);
//     modalOverlay()?.addEventListener("click", (e) => {
//       if (e.target === modalOverlay()) closeModal();
//     });
//     document.addEventListener("keydown", (e) => {
//       if (e.key === "Escape") closeModal();
//     });
//   }

//   // ---------- Mock fallback data ----------
//   const MOCK_CATEGORIES = [
//     { id: "cat1", name: "Grains & Cereals" },
//     { id: "cat2", name: "Beverages" },
//     { id: "cat3", name: "Pasta & Noodles" },
//     { id: "cat4", name: "Sugars & Sweeteners" },
//     { id: "cat5", name: "Personal Care" },
//   ];

//   const MOCK_SUPPLIERS = [
//     { id: "sup1", name: "Olam Foods Ltd" },
//     { id: "sup2", name: "Nestlé Nigeria" },
//     { id: "sup3", name: "Dufil Prima Foods" },
//     { id: "sup4", name: "Dangote Foods Ltd" },
//   ];

//   const MOCK_PRODUCTS = [
//     { id: "1", name: "Basmati Rice 5kg", sku: "RICE-BAS-5KG", category: "Grains & Cereals", supplier: "Olam Foods Ltd", unitPrice: 4500, costPrice: 3800, currentStock: 142, reorderLevel: 20, unit: "bag" },
//     { id: "2", name: "Milo Tin 400g", sku: "MALT-MIL-400", category: "Beverages", supplier: "Nestlé Nigeria", unitPrice: 1500, costPrice: 1200, currentStock: 0, reorderLevel: 15, unit: "tin" },
//     { id: "3", name: "Indomie Noodles (Carton)", sku: "NDL-IND-CTN", category: "Pasta & Noodles", supplier: "Dufil Prima Foods", unitPrice: 6800, costPrice: 5500, currentStock: 8, reorderLevel: 20, unit: "carton" },
//     { id: "4", name: "Dangote Sugar 1kg", sku: "SGR-DNG-1KG", category: "Sugars & Sweeteners", supplier: "Dangote Foods Ltd", unitPrice: 1500, costPrice: 1150, currentStock: 142, reorderLevel: 20, unit: "bag" },
//     { id: "5", name: "Dettol Soap 90g (3-Pack)", sku: "SOAP-DTL-3PK", category: "Personal Care", supplier: "Olam Foods Ltd", unitPrice: 4500, costPrice: 3600, currentStock: 12, reorderLevel: 20, unit: "pack" },
//   ];

//   const MOCK_HISTORY = [
//     { type: "IN", reason: "Purchase from Olam Foods", date: "2025-07-27", quantity: 60 },
//     { type: "OUT", reason: "Sale – Walk-in customer", date: "2025-07-27", quantity: -2 },
//     { type: "OUT", reason: "Sale – Mrs. Fatima Aliyu", date: "2025-07-26", quantity: -1 },
//   ];

//   let productsCache = [];
//   let categoriesCache = [];
//   let suppliersCache = [];
//   let currentView = "list";
//   let currentProductId = null;

//   // ---------- Status helpers ----------
//   function statusOf(product) {
//     if (Number(product.currentStock) <= 0) return "outofstock";
//     if (Number(product.currentStock) <= Number(product.reorderLevel)) return "lowstock";
//     return "instock";
//   }

//   function statusLabel(status) {
//     return { instock: "in stock", lowstock: "Low stock", outofstock: "Out of stock" }[status];
//   }

//   function toneOf(status) {
//     return { instock: "green", lowstock: "amber", outofstock: "rose" }[status];
//   }

//   // ---------- Load reference data ----------
//   async function loadCategories() {
//     if (window.EvApi) {
//       try {
//         const response = await EvApi.json("/categories");
//         categoriesCache = (response.data || response).map((c, i) => ({ id: c.id ?? i, name: c.name }));
//         return;
//       } catch (err) {
//         /* fall back */
//       }
//     }
//     categoriesCache = MOCK_CATEGORIES;
//   }

//   async function loadSuppliers() {
//     if (window.EvApi) {
//       try {
//         const response = await EvApi.json("/suppliers");
//         suppliersCache = (response.data || response).map((s, i) => ({ id: s.id ?? i, name: s.name }));
//         return;
//       } catch (err) {
//         /* fall back */
//       }
//     }
//     suppliersCache = MOCK_SUPPLIERS;
//   }

//   function populateCategoryFilter() {
//     const select = document.getElementById("category-filter");
//     if (!select) return;
//     select.innerHTML =
//       '<option value="">All categories</option>' +
//       categoriesCache.map((c) => '<option value="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + "</option>").join("");
//   }

//   // ---------- Load products ----------
//   async function loadProducts() {
//     if (window.EvApi) {
//       try {
//         const response = await EvApi.json("/products", { method: "GET" });
//         productsCache = (response.data || response).map(normalizeProduct);
//         renderProductCount();
//         renderList();
//         return;
//       } catch (err) {
//         /* fall back below */
//       }
//     }
//     productsCache = MOCK_PRODUCTS.map(normalizeProduct);
//     renderProductCount();
//     renderList();
//   }

//   function normalizeProduct(p) {
//     return {
//       id: p.id,
//       name: p.name,
//       sku: p.sku,
//       category: p.category || p.categoryName || "",
//       supplier: p.supplier || p.supplierName || "",
//       unitPrice: Number(p.unitPrice) || 0,
//       costPrice: Number(p.costPrice) || 0,
//       currentStock: Number(p.currentStock) || 0,
//       reorderLevel: Number(p.reorderLevel) || 0,
//       unit: p.unit || "unit",
//     };
//   }

//   function renderProductCount() {
//     const el = document.getElementById("product-count-text");
//     if (!el) return;
//     const lowStock = productsCache.filter((p) => statusOf(p) === "lowstock").length;
//     el.textContent = productsCache.length + " total products · " + lowStock + " low stock";
//   }

//   function getFilteredProducts() {
//     const search = (document.getElementById("product-search")?.value || "").toLowerCase();
//     const category = document.getElementById("category-filter")?.value || "";

//     return productsCache.filter((p) => {
//       const matchesSearch = !search || p.name.toLowerCase().includes(search) || (p.sku || "").toLowerCase().includes(search);
//       const matchesCategory = !category || p.category === category;
//       return matchesSearch && matchesCategory;
//     });
//   }

//   function renderList() {
//     if (currentView === "list") renderTable();
//     else renderGrid();
//   }

//   function renderTable() {
//     const tbody = document.getElementById("products-tbody");
//     if (!tbody) return;
//     const rows = getFilteredProducts();

//     if (!rows.length) {
//       tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No products found.</td></tr>';
//       return;
//     }

//     tbody.innerHTML = rows
//       .map((p) => {
//         const status = statusOf(p);
//         const tone = toneOf(status);
//         const barPct = Math.max(6, Math.min(100, (p.currentStock / Math.max(p.reorderLevel * 5, 50)) * 100));
//         return (
//           "<tr data-open=\"" + p.id + "\">" +
//           '<td><div class="cell-product"><span class="product-thumb">' + initialsOf(p.name) + '</span>' +
//           '<div class="product-name-col"><p class="product-name">' + escapeHtml(p.name) + '</p>' +
//           '<p class="product-supplier">' + escapeHtml(p.supplier || "—") + "</p></div></div></td>" +
//           '<td><span class="sku-badge">' + escapeHtml(p.sku || "—") + "</span></td>" +
//           "<td>" + escapeHtml(p.category || "—") + "</td>" +
//           '<td class="cell-price">' + formatNaira(p.unitPrice) + "</td>" +
//           '<td><div class="stock-cell"><span class="stock-mini-bar"><span class="stock-mini-fill tone-' + tone + '" style="width:' + barPct + '%"></span></span>' + p.currentStock + "</div></td>" +
//           '<td><span class="status-badge ' + status + '">' + statusLabel(status) + "</span></td>" +
//           '<td><div class="row-actions">' +
//           '<button type="button" class="icon-action-btn" data-view-btn="' + p.id + '" aria-label="View">' + extraIcon("eye", 14) + '</button>' +
//           '<button type="button" class="icon-action-btn" data-edit-btn="' + p.id + '" aria-label="Edit">' + extraIcon("edit", 14) + '</button>' +
//           "</div></td>" +
//           "</tr>"
//         );
//       })
//       .join("");
//   }

//   function renderGrid() {
//     const grid = document.getElementById("products-grid");
//     if (!grid) return;
//     const rows = getFilteredProducts();

//     if (!rows.length) {
//       grid.innerHTML = '<div class="table-empty">No products found.</div>';
//       return;
//     }

//     grid.innerHTML = rows
//       .map((p) => {
//         const status = statusOf(p);
//         return (
//           '<div class="product-card" data-open="' + p.id + '">' +
//           '<div class="product-card-thumb">' + initialsOf(p.name) + "</div>" +
//           '<p class="product-card-name">' + escapeHtml(p.name) + "</p>" +
//           '<p class="product-card-sub">' + escapeHtml(p.sku || "") + "</p>" +
//           '<div class="product-card-foot"><span class="product-card-price">' + formatNaira(p.unitPrice) + '</span>' +
//           '<span class="status-badge ' + status + '">' + statusLabel(status) + "</span></div>" +
//           "</div>"
//         );
//       })
//       .join("");
//   }

//   function setupViewToggle() {
//     document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
//       btn.addEventListener("click", () => {
//         currentView = btn.getAttribute("data-view");
//         document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
//         document.getElementById("products-table").style.display = currentView === "list" ? "" : "none";
//         document.getElementById("products-grid").hidden = currentView !== "grid";
//         renderList();
//       });
//     });
//   }

//   // ---------- Detail view ----------
//   function showListView() {
//     document.getElementById("product-list-view").hidden = false;
//     document.getElementById("product-detail-view").hidden = true;
//     currentProductId = null;
//   }

//   async function showDetailView(id) {
//     const product = productsCache.find((p) => String(p.id) === String(id));
//     if (!product) return;

//     currentProductId = id;
//     document.getElementById("product-list-view").hidden = true;
//     document.getElementById("product-detail-view").hidden = false;
//     document.getElementById("detail-product-name").textContent = product.name;
//     document.getElementById("product-image-card").textContent = initialsOf(product.name);

//     const status = statusOf(product);
//     const tone = toneOf(status);
//     const countEl = document.getElementById("stock-count");
//     countEl.textContent = product.currentStock + " " + product.unit + (product.currentStock === 1 ? "" : "s");
//     countEl.className = "stock-count tone-" + tone;

//     const barPct = Math.max(4, Math.min(100, (product.currentStock / Math.max(product.reorderLevel * 3, 30)) * 100));
//     const barFill = document.getElementById("stock-bar-fill");
//     barFill.style.width = barPct + "%";
//     barFill.style.background = "var(--" + (tone === "green" ? "green" : tone === "amber" ? "amber" : "rose") + ")";

//     document.getElementById("stock-min").textContent = "Min. stock: " + product.reorderLevel + " " + product.unit + "s";

//     const margin = product.unitPrice > 0 ? (((product.unitPrice - product.costPrice) / product.unitPrice) * 100).toFixed(1) : "0.0";

//     const fields = [
//       ["SKU", product.sku || "—"],
//       ["Category", product.category || "—"],
//       ["Selling Price", formatNaira(product.unitPrice)],
//       ["Cost Price", formatNaira(product.costPrice)],
//       ["Profit Margin", margin + "%"],
//       ["Unit", product.unit],
//       ["Supplier", product.supplier || "—"],
//       ["Status", statusLabel(status)],
//     ];

//     document.getElementById("product-details-grid").innerHTML = fields
//       .map(([label, value]) => '<div class="detail-field"><dt>' + label + "</dt><dd>" + escapeHtml(value) + "</dd></div>")
//       .join("");

//     loadStockHistory(id);
//   }

//   async function loadStockHistory(productId) {
//     const list = document.getElementById("stock-history-list");
//     list.innerHTML = '<li class="history-item"><p class="history-body">Loading…</p></li>';

//     let history = MOCK_HISTORY;
//     if (window.EvApi) {
//       try {
//         const response = await EvApi.json("/inventory-logs?productId=" + encodeURIComponent(productId));
//         history = response.data || response;
//       } catch (err) {
//         /* keep mock */
//       }
//     }

//     if (!history.length) {
//       list.innerHTML = '<li class="history-item"><p class="history-body">No stock movement yet.</p></li>';
//       return;
//     }

//     list.innerHTML = history
//       .map((h) => {
//         const isIn = h.quantity > 0 || h.type === "IN";
//         return (
//           '<li class="history-item"><span class="history-icon tone-' + (isIn ? "in" : "out") + '">' +
//           extraIcon(isIn ? "arrowUp" : "arrowDown", 14) +
//           '</span><div class="history-body"><p class="history-title">' + escapeHtml(h.reason || h.note || "Stock update") + '</p>' +
//           '<p class="history-date">' + escapeHtml(h.date || h.createdAt || "") + "</p></div>" +
//           '<span class="history-delta tone-' + (isIn ? "in" : "out") + '">' + (h.quantity > 0 ? "+" : "") + h.quantity + "</span></li>"
//         );
//       })
//       .join("");
//   }

//   // ---------- Add / Edit Product modal ----------
//   function categoryOptions(selected) {
//     return categoriesCache
//       .map((c) => '<option value="' + escapeHtml(c.name) + '"' + (c.name === selected ? " selected" : "") + ">" + escapeHtml(c.name) + "</option>")
//       .join("");
//   }

//   function supplierOptions(selected) {
//     return suppliersCache
//       .map((s) => '<option value="' + escapeHtml(s.name) + '"' + (s.name === selected ? " selected" : "") + ">" + escapeHtml(s.name) + "</option>")
//       .join("");
//   }

//   function openAddProductModal() {
//     openModal(
//       "Add New Product",
//       '<div class="modal-form">' +
//         '<label class="field"><span class="field-label">PRODUCT NAME *</span><input type="text" id="f-name" placeholder="e.g. Basmati Rice 5kg" /></label>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">SKU</span><input type="text" id="f-sku" placeholder="Auto-generated" /></label>' +
//         '<label class="field"><span class="field-label">CATEGORY *</span><select id="f-category"><option value="" disabled selected></option>' + categoryOptions() + "</select></label></div>" +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">SELLING PRICE (₦) *</span><input type="number" id="f-price" placeholder="0.00" /></label>' +
//         '<label class="field"><span class="field-label">COST PRICE (₦)</span><input type="number" id="f-cost" placeholder="0.00" /></label></div>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">CURRENT STOCK</span><input type="number" id="f-stock" placeholder="0" /></label>' +
//         '<label class="field"><span class="field-label">MIN. STOCK ALERT</span><input type="number" id="f-reorder" placeholder="10" /></label></div>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">UNIT</span><select id="f-unit"><option value="" disabled selected></option><option>unit</option><option>bag</option><option>carton</option><option>pack</option><option>tin</option><option>bottle</option></select></label>' +
//         '<label class="field"><span class="field-label">SUPPLIER</span><select id="f-supplier"><option value="" disabled selected></option>' + supplierOptions() + "</select></label></div>" +
//         "</div>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Product</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", submitAddProduct);
//       }
//     );
//   }

//   async function submitAddProduct() {
//     const name = valueOf("f-name");
//     if (!name) {
//       showToast("Product name is required.", true);
//       return;
//     }

//     const payload = {
//       name,
//       sku: valueOf("f-sku"),
//       category: valueOf("f-category"),
//       unitPrice: Number(valueOf("f-price")) || 0,
//       costPrice: Number(valueOf("f-cost")) || 0,
//       currentStock: Number(valueOf("f-stock")) || 0,
//       reorderLevel: Number(valueOf("f-reorder")) || 10,
//       unit: valueOf("f-unit") || "unit",
//       supplier: valueOf("f-supplier"),
//     };

//     const btn = document.getElementById("modal-submit-btn");
//     btn.disabled = true;
//     btn.textContent = "Saving...";

//     try {
//       if (window.EvApi) {
//         await EvApi.json("/products", { method: "POST", body: JSON.stringify(payload) });
//       } else {
//         productsCache.unshift(normalizeProduct({ id: "local-" + Date.now(), ...payload }));
//       }
//       showToast("Product added.");
//       closeModal();
//       loadProducts();
//     } catch (err) {
//       productsCache.unshift(normalizeProduct({ id: "local-" + Date.now(), ...payload }));
//       showToast("Couldn't reach the server — added locally instead.", true);
//       closeModal();
//       renderProductCount();
//       renderList();
//     } finally {
//       btn.disabled = false;
//       btn.textContent = "Save Product";
//     }
//   }

//   function openEditProductModal(id) {
//     const product = productsCache.find((p) => String(p.id) === String(id));
//     if (!product) return;

//     openModal(
//       "Edit Product",
//       '<div class="modal-form">' +
//         '<label class="field"><span class="field-label">Product Name</span><input type="text" id="f-name" value="' + escapeHtml(product.name) + '" /></label>' +
//         '<label class="field"><span class="field-label">Category</span><select id="f-category">' + categoryOptions(product.category) + "</select></label>" +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">Selling Price (₦)</span><input type="number" id="f-price" value="' + product.unitPrice + '" /></label>' +
//         '<label class="field"><span class="field-label">Cost Price (₦)</span><input type="number" id="f-cost" value="' + product.costPrice + '" /></label></div>' +
//         '<label class="field"><span class="field-label">SKU / Barcode</span><input type="text" id="f-sku" value="' + escapeHtml(product.sku || "") + '" /></label>' +
//         "</div>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-primary" id="modal-submit-btn">Update Product</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", () => submitEditProduct(id));
//       }
//     );
//   }

//   async function submitEditProduct(id) {
//     const updates = {
//       name: valueOf("f-name"),
//       category: valueOf("f-category"),
//       unitPrice: Number(valueOf("f-price")) || 0,
//       costPrice: Number(valueOf("f-cost")) || 0,
//       sku: valueOf("f-sku"),
//     };

//     const btn = document.getElementById("modal-submit-btn");
//     btn.disabled = true;
//     btn.textContent = "Updating...";

//     try {
//       if (window.EvApi) {
//         await EvApi.json("/products/" + id, { method: "PUT", body: JSON.stringify(updates) });
//       }
//       applyLocalProductUpdate(id, updates);
//       showToast("Product updated.");
//       closeModal();
//       renderProductCount();
//       renderList();
//       if (currentProductId === id) showDetailView(id);
//     } catch (err) {
//       applyLocalProductUpdate(id, updates);
//       showToast("Couldn't reach the server — updated locally instead.", true);
//       closeModal();
//       renderProductCount();
//       renderList();
//       if (currentProductId === id) showDetailView(id);
//     } finally {
//       btn.disabled = false;
//       btn.textContent = "Update Product";
//     }
//   }

//   function applyLocalProductUpdate(id, updates) {
//     const idx = productsCache.findIndex((p) => String(p.id) === String(id));
//     if (idx > -1) productsCache[idx] = Object.assign({}, productsCache[idx], updates);
//   }

//   // ---------- Adjust Stock modal ----------
//   function openAdjustStockModal() {
//     const product = productsCache.find((p) => String(p.id) === String(currentProductId));
//     if (!product) return;

//     openModal(
//       "Adjust Stock — " + product.name,
//       '<div class="modal-form">' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">TYPE</span><select id="adj-type"><option value="IN">Stock In</option><option value="OUT">Stock Out</option></select></label>' +
//         '<label class="field"><span class="field-label">QUANTITY</span><input type="number" id="adj-qty" min="1" value="1" /></label></div>' +
//         '<label class="field"><span class="field-label">REASON</span><input type="text" id="adj-reason" placeholder="e.g. Purchase from supplier" /></label>' +
//         "</div>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Adjustment</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", submitAdjustStock);
//       }
//     );
//   }

//   async function submitAdjustStock() {
//     const type = valueOf("adj-type");
//     const qty = Math.max(1, Number(valueOf("adj-qty")) || 1);
//     const reason = valueOf("adj-reason") || (type === "IN" ? "Stock in" : "Stock out");
//     const delta = type === "IN" ? qty : -qty;

//     const product = productsCache.find((p) => String(p.id) === String(currentProductId));
//     if (!product) return;

//     const btn = document.getElementById("modal-submit-btn");
//     btn.disabled = true;
//     btn.textContent = "Saving...";

//     try {
//       if (window.EvApi) {
//         await EvApi.json("/inventory/adjust", {
//           method: "POST",
//           body: JSON.stringify({ productId: product.id, type, quantity: qty, reason }),
//         });
//       }
//       product.currentStock = Math.max(0, product.currentStock + delta);
//       MOCK_HISTORY.unshift({ type, reason, date: new Date().toISOString().slice(0, 10), quantity: delta });
//       showToast("Stock adjusted.");
//       closeModal();
//       showDetailView(product.id);
//       renderProductCount();
//     } catch (err) {
//       product.currentStock = Math.max(0, product.currentStock + delta);
//       MOCK_HISTORY.unshift({ type, reason, date: new Date().toISOString().slice(0, 10), quantity: delta });
//       showToast("Couldn't reach the server — adjusted locally instead.", true);
//       closeModal();
//       showDetailView(product.id);
//       renderProductCount();
//     } finally {
//       btn.disabled = false;
//       btn.textContent = "Save Adjustment";
//     }
//   }

//   // ---------- Delete ----------
//   function confirmDeleteProduct() {
//     const product = productsCache.find((p) => String(p.id) === String(currentProductId));
//     if (!product) return;

//     openModal(
//       "Delete Product",
//       '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">Are you sure you want to delete <strong>' +
//         escapeHtml(product.name) +
//         "</strong>? This can't be undone.</p>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-danger" id="modal-submit-btn">Delete</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", deleteProduct);
//       }
//     );
//   }

//   async function deleteProduct() {
//     const id = currentProductId;
//     try {
//       if (window.EvApi) {
//         await EvApi.json("/products/" + id, { method: "DELETE" });
//       }
//       productsCache = productsCache.filter((p) => String(p.id) !== String(id));
//       showToast("Product deleted.");
//       closeModal();
//       showListView();
//       renderProductCount();
//       renderList();
//     } catch (err) {
//       productsCache = productsCache.filter((p) => String(p.id) !== String(id));
//       showToast("Couldn't reach the server — deleted locally instead.", true);
//       closeModal();
//       showListView();
//       renderProductCount();
//       renderList();
//     }
//   }

//   // ---------- Snap Photo ----------
//   function setupSnapPhoto() {
//     const btn = document.getElementById("snap-photo-btn");
//     const input = document.getElementById("snap-photo-input");
//     if (!btn || !input) return;

//     btn.addEventListener("click", () => input.click());
//     input.addEventListener("change", () => {
//       if (input.files && input.files[0]) {
//         showToast("Photo captured — opening Add Product to fill in details.");
//         openAddProductModal();
//       }
//       input.value = "";
//     });
//   }

//   // ---------- Helpers ----------
//   function valueOf(id) {
//     const el = document.getElementById(id);
//     return el ? el.value.trim() : "";
//   }

//   // ---------- Boot ----------
//   function boot() {
//     if (!requireAuth()) return;

//     decorateIcons();
//     setupModalChrome();
//     setupViewToggle();
//     setupSnapPhoto();

//     Promise.all([loadCategories(), loadSuppliers()]).then(() => {
//       populateCategoryFilter();
//       loadProducts();
//     });

//     document.getElementById("product-search")?.addEventListener("input", renderList);
//     document.getElementById("category-filter")?.addEventListener("change", renderList);
//     document.getElementById("add-product-btn")?.addEventListener("click", openAddProductModal);

//     document.getElementById("products-tbody")?.addEventListener("click", (e) => {
//       const viewBtn = e.target.closest("[data-view-btn]");
//       const editBtn = e.target.closest("[data-edit-btn]");
//       const row = e.target.closest("[data-open]");
//       if (editBtn) return openEditProductModal(editBtn.getAttribute("data-edit-btn"));
//       if (viewBtn) return showDetailView(viewBtn.getAttribute("data-view-btn"));
//       if (row) return showDetailView(row.getAttribute("data-open"));
//     });

//     document.getElementById("products-grid")?.addEventListener("click", (e) => {
//       const card = e.target.closest("[data-open]");
//       if (card) showDetailView(card.getAttribute("data-open"));
//     });

//     document.getElementById("back-to-products-btn")?.addEventListener("click", showListView);
//     document.getElementById("detail-edit-btn")?.addEventListener("click", () => openEditProductModal(currentProductId));
//     document.getElementById("detail-delete-btn")?.addEventListener("click", confirmDeleteProduct);
//     document.getElementById("adjust-stock-btn")?.addEventListener("click", openAdjustStockModal);
//   }

//   document.addEventListener("shell:ready", boot);

//   if (document.body.classList.contains("shell-ready")) {
//     boot();
//   }
// })();


/* eVentory — Products page script.
 * Maps directly to the backend's documented models: Product, Category,
 * Supplier, InventoryLog. Every action tries the real API first
 * (GET/POST/PUT/DELETE /products, GET /categories, GET /suppliers,
 * POST /inventory/adjust, GET /inventory-logs) and falls back to
 * realistic mock data if a call fails.
 */

(function () {
  "use strict";

  const EXTRA_ICON_PATHS = {
    eye: '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.4"/>',
    edit: '<path d="M13.4 3.6 16.4 6.6 6.6 16.4l-3.6.7.7-3.6z"/><path d="m11.8 5.2 3 3"/>',
    trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
    close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
    arrowLeft: '<path d="M16 10H4"/><path d="m8.6 4.8-5.2 5.2 5.2 5.2"/>',
    camera: '<path d="M3 6.6h3.2L7.6 4h4.8l1.4 2.6H17v9.8H3z"/><circle cx="10" cy="11.2" r="3.2"/>',
    arrowUp: '<path d="M10 16V4"/><path d="m4.8 9.2 5.2-5.2 5.2 5.2"/>',
    arrowDown: '<path d="M10 4v12"/><path d="m15.2 10.8-5.2 5.2-5.2-5.2"/>',
  };

  function extraIcon(name, size) {
    const body = EXTRA_ICON_PATHS[name];
    if (!body) return "";
    const px = size || 16;
    return (
      '<svg width="' + px + '" height="' + px + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body +
      "</svg>"
    );
  }

  function icon(name, size) {
    return window.EvLayout ? window.EvLayout.icon(name, size) : "";
  }

  function decorateIcons(root) {
    (root || document).querySelectorAll("[data-p-icon]").forEach((el) => {
      el.innerHTML = extraIcon(el.getAttribute("data-p-icon"), el.getAttribute("data-icon-size") || 14);
    });
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = icon(el.getAttribute("data-icon"), 16);
    });
  }

  function requireAuth() {
    const token = window.EvApi ? EvApi.getToken() : localStorage.getItem("token");
    if (!token) {
      window.location.href = "loginPage.html";
      return false;
    }
    return true;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatNaira(value) {
    return "₦" + (Number(value) || 0).toLocaleString("en-NG");
  }

  function initialsOf(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function showToast(message, isError) {
    let toast = document.querySelector(".save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "save-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle("is-error", !!isError);
    toast.classList.add("is-visible");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  // ---------- Modal ----------
  const modalOverlay = () => document.getElementById("modal-overlay");
  const modalTitleEl = () => document.getElementById("modal-title");
  const modalBodyEl = () => document.getElementById("modal-body");

  function openModal(title, bodyHtml, onMount) {
    modalTitleEl().textContent = title;
    modalBodyEl().innerHTML = bodyHtml;
    modalOverlay().hidden = false;
    decorateIcons(modalBodyEl());
    if (typeof onMount === "function") onMount(modalBodyEl());
  }

  function closeModal() {
    modalOverlay().hidden = true;
    modalBodyEl().innerHTML = "";
  }

  function setupModalChrome() {
    document.getElementById("modal-close")?.addEventListener("click", closeModal);
    modalOverlay()?.addEventListener("click", (e) => {
      if (e.target === modalOverlay()) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------- Mock fallback data ----------
  const MOCK_CATEGORIES = [
    { id: "cat1", name: "Grains & Cereals" },
    { id: "cat2", name: "Beverages" },
    { id: "cat3", name: "Pasta & Noodles" },
    { id: "cat4", name: "Sugars & Sweeteners" },
    { id: "cat5", name: "Personal Care" },
  ];

  const MOCK_PRODUCTS = [
    { id: "1", name: "Basmati Rice 5kg", sku: "RICE-BAS-5KG", category: "Grains & Cereals", supplier: "Olam Foods Ltd", unitPrice: 4500, costPrice: 3800, currentStock: 142, reorderLevel: 20, unit: "bag" },
    { id: "2", name: "Milo Tin 400g", sku: "MALT-MIL-400", category: "Beverages", supplier: "Nestlé Nigeria", unitPrice: 1500, costPrice: 1200, currentStock: 0, reorderLevel: 15, unit: "tin" },
    { id: "3", name: "Indomie Noodles (Carton)", sku: "NDL-IND-CTN", category: "Pasta & Noodles", supplier: "Dufil Prima Foods", unitPrice: 6800, costPrice: 5500, currentStock: 8, reorderLevel: 20, unit: "carton" },
    { id: "4", name: "Dangote Sugar 1kg", sku: "SGR-DNG-1KG", category: "Sugars & Sweeteners", supplier: "Dangote Foods Ltd", unitPrice: 1500, costPrice: 1150, currentStock: 142, reorderLevel: 20, unit: "bag" },
    { id: "5", name: "Dettol Soap 90g (3-Pack)", sku: "SOAP-DTL-3PK", category: "Personal Care", supplier: "Olam Foods Ltd", unitPrice: 4500, costPrice: 3600, currentStock: 12, reorderLevel: 20, unit: "pack" },
  ];

  const MOCK_HISTORY = [
    { type: "IN", reason: "Purchase from Olam Foods", date: "2025-07-27", quantity: 60 },
    { type: "OUT", reason: "Sale – Walk-in customer", date: "2025-07-27", quantity: -2 },
    { type: "OUT", reason: "Sale – Mrs. Fatima Aliyu", date: "2025-07-26", quantity: -1 },
  ];

  let productsCache = [];
  let categoriesCache = [];
  let suppliersCache = [];
  let currentView = "list";
  let currentProductId = null;

  // ---------- Status helpers ----------
  function statusOf(product) {
    if (Number(product.currentStock) <= 0) return "outofstock";
    if (Number(product.currentStock) <= Number(product.reorderLevel)) return "lowstock";
    return "instock";
  }

  function statusLabel(status) {
    return { instock: "in stock", lowstock: "Low stock", outofstock: "Out of stock" }[status];
  }

  function toneOf(status) {
    return { instock: "green", lowstock: "amber", outofstock: "rose" }[status];
  }

  // ---------- Load reference data ----------
  // The API wraps list responses as { status, message, data: { <plural>: [...] } }
  // (sometimes flattened to { data: [...] }). Stay defensive about the exact
  // nesting so a well-formed response never gets misread as a failure.
  function extractList(response, key) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.[key])) return response.data[key];
    if (Array.isArray(response?.[key])) return response[key];
    return null;
  }



  async function loadSuppliers() {
    if (window.EvApi) {
      try {
        const response = await EvApi.json("/suppliers");
        const list = extractList(response, "suppliers");
        if (!Array.isArray(list)) throw new Error("Unexpected /suppliers response shape");
        suppliersCache = list.map((s, i) => ({ id: s.id ?? i, name: s.name }));
        return;
      } catch (err) {
        /* couldn't reach the server — leave suppliersCache empty */
        suppliersCache = [];
        showToast("Couldn't load suppliers from the server.", true);
      }
    } else {
      suppliersCache = [];
    }
  }
  async function loadCategories(){
    if (window.EvApi) {
      try {
        const response = await EvApi.json("/categories", { method: "GET" });
        const list = extractList(response, "categories");
        if (!Array.isArray(list)) throw new Error("Unexpected /categories response shape");
        categoriesCache = list.map((c, i) => ({ id: c.id ?? i, name: c.name }));
        return;
      } catch (error) {
        categoriesCache =[];
        showToast("Couldn't load categories from the server.", true);
        
      }
    }else {
      categoriesCache = [];
    }
  }

  function populateCategoryFilter() {
    const select = document.getElementById("category-filter");
    if (!select) return;
    select.innerHTML =
      '<option value="">All categories</option>' +
      categoriesCache.map((c) => '<option value="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + "</option>").join("");
  }

  // ---------- Load products ----------
  // async function loadProducts() {
  //   if (window.EvApi) {
  //     try {
  //       const response = await EvApi.json("/products", { method: "GET" });
  //       productsCache = (response.data || response).map(normalizeProduct);
  //       renderProductCount();
  //       renderList();
  //       return;
  //     } catch (err) {
  //       /* fall back below */
  //     }
  //   }
  //   productsCache = MOCK_PRODUCTS.map(normalizeProduct);
  //   renderProductCount();
  //   renderList();
  // }

  async function loadProducts() {
  if (!window.EvApi) {
    productsCache = [];
    renderProductCount();
    renderList();
    return;
  }

  try {
    const response = await EvApi.json("/products", { method: "GET" });
    const list = extractList(response, "products");
    if (!Array.isArray(list)) throw new Error("Unexpected /products response shape");
    productsCache = list.map(normalizeProduct);
    renderProductCount();
    renderList();
  } catch (err) {
    productsCache = [];
    renderProductCount();
    renderList();
    showToast("Couldn't load products from the server.", true);
  }
}

  // function normalizeProduct(p) {
  //   return {
  //     id: p.id,
  //     name: p.name,
  //     sku: p.sku,
  //     category: p.category || p.categoryName || "",
  //     supplier: p.supplier || p.supplierName || "",
  //     unitPrice: Number(p.unitPrice) || 0,
  //     costPrice: Number(p.costPrice) || 0,
  //     currentStock: Number(p.currentStock) || 0,
  //     reorderLevel: Number(p.reorderLevel) || 0,
  //     unit: p.unit || "unit",
  //   };
  // }

 function normalizeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId || p.Category?.id || "",
    category: p.Category?.name || "",
    supplierId: p.supplierId || p.Supplier?.id || "",
    supplier: p.Supplier?.name || "",
    unitPrice: Number(p.unitPrice) || 0,
    costPrice: Number(p.costPrice) || 0,
    currentStock: Number(p.currentStock) || 0,
    reorderLevel: Number(p.reorderLevel) || 0,
    unit: p.unit || "unit",
  };
}

  function renderProductCount() {
    const el = document.getElementById("product-count-text");
    if (!el) return;
    const lowStock = productsCache.filter((p) => statusOf(p) === "lowstock").length;
    el.textContent = productsCache.length + " total products · " + lowStock + " low stock";
  }

  function getFilteredProducts() {
    const search = (document.getElementById("product-search")?.value || "").toLowerCase();
    const category = document.getElementById("category-filter")?.value || "";

    return productsCache.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search) || (p.sku || "").toLowerCase().includes(search);
      const matchesCategory = !category || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }

  function renderList() {
    if (currentView === "list") renderTable();
    else renderGrid();
  }

  function renderTable() {
    const tbody = document.getElementById("products-tbody");
    if (!tbody) return;
    const rows = getFilteredProducts();

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No products found.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((p) => {
        const status = statusOf(p);
        const tone = toneOf(status);
        const barPct = Math.max(6, Math.min(100, (p.currentStock / Math.max(p.reorderLevel * 5, 50)) * 100));
        return (
          "<tr data-open=\"" + p.id + "\">" +
          '<td><div class="cell-product"><span class="product-thumb">' + initialsOf(p.name) + '</span>' +
          '<div class="product-name-col"><p class="product-name">' + escapeHtml(p.name) + '</p>' +
          '<p class="product-supplier">' + escapeHtml(p.supplier || "—") + "</p></div></div></td>" +
          '<td><span class="sku-badge">' + escapeHtml(p.sku || "—") + "</span></td>" +
          "<td>" + escapeHtml(p.category || "—") + "</td>" +
          '<td class="cell-price">' + formatNaira(p.unitPrice) + "</td>" +
          '<td><div class="stock-cell"><span class="stock-mini-bar"><span class="stock-mini-fill tone-' + tone + '" style="width:' + barPct + '%"></span></span>' + p.currentStock + "</div></td>" +
          '<td><span class="status-badge ' + status + '">' + statusLabel(status) + "</span></td>" +
          '<td><div class="row-actions">' +
          '<button type="button" class="icon-action-btn" data-view-btn="' + p.id + '" aria-label="View">' + extraIcon("eye", 14) + '</button>' +
          '<button type="button" class="icon-action-btn" data-edit-btn="' + p.id + '" aria-label="Edit">' + extraIcon("edit", 14) + '</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderGrid() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    const rows = getFilteredProducts();

    if (!rows.length) {
      grid.innerHTML = '<div class="table-empty">No products found.</div>';
      return;
    }

    grid.innerHTML = rows
      .map((p) => {
        const status = statusOf(p);
        return (
          '<div class="product-card" data-open="' + p.id + '">' +
          '<div class="product-card-thumb">' + initialsOf(p.name) + "</div>" +
          '<p class="product-card-name">' + escapeHtml(p.name) + "</p>" +
          '<p class="product-card-sub">' + escapeHtml(p.sku || "") + "</p>" +
          '<div class="product-card-foot"><span class="product-card-price">' + formatNaira(p.unitPrice) + '</span>' +
          '<span class="status-badge ' + status + '">' + statusLabel(status) + "</span></div>" +
          "</div>"
        );
      })
      .join("");
  }

  function setupViewToggle() {
    document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentView = btn.getAttribute("data-view");
        document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
        document.getElementById("products-table").style.display = currentView === "list" ? "" : "none";
        document.getElementById("products-grid").hidden = currentView !== "grid";
        renderList();
      });
    });
  }

  // ---------- Detail view ----------
  function showListView() {
    document.getElementById("product-list-view").hidden = false;
    document.getElementById("product-detail-view").hidden = true;
    currentProductId = null;
  }

  async function showDetailView(id) {
    const product = productsCache.find((p) => String(p.id) === String(id));
    if (!product) return;

    currentProductId = id;
    document.getElementById("product-list-view").hidden = true;
    document.getElementById("product-detail-view").hidden = false;
    document.getElementById("detail-product-name").textContent = product.name;
    document.getElementById("product-image-card").textContent = initialsOf(product.name);

    const status = statusOf(product);
    const tone = toneOf(status);
    const countEl = document.getElementById("stock-count");
    countEl.textContent = product.currentStock + " " + product.unit + (product.currentStock === 1 ? "" : "s");
    countEl.className = "stock-count tone-" + tone;

    const barPct = Math.max(4, Math.min(100, (product.currentStock / Math.max(product.reorderLevel * 3, 30)) * 100));
    const barFill = document.getElementById("stock-bar-fill");
    barFill.style.width = barPct + "%";
    barFill.style.background = "var(--" + (tone === "green" ? "green" : tone === "amber" ? "amber" : "rose") + ")";

    document.getElementById("stock-min").textContent = "Min. stock: " + product.reorderLevel + " " + product.unit + "s";

    const margin = product.unitPrice > 0 ? (((product.unitPrice - product.costPrice) / product.unitPrice) * 100).toFixed(1) : "0.0";

    const fields = [
      ["SKU", product.sku || "—"],
      ["Category", product.category || "—"],
      ["Selling Price", formatNaira(product.unitPrice)],
      ["Cost Price", formatNaira(product.costPrice)],
      ["Profit Margin", margin + "%"],
      ["Unit", product.unit],
      ["Supplier", product.supplier || "—"],
      ["Status", statusLabel(status)],
    ];

    document.getElementById("product-details-grid").innerHTML = fields
      .map(([label, value]) => '<div class="detail-field"><dt>' + label + "</dt><dd>" + escapeHtml(value) + "</dd></div>")
      .join("");

    loadStockHistory(id);
  }

 async function loadStockHistory(productId) {
  const list = document.getElementById("stock-history-list");
  if (!list) return;
  list.innerHTML = '<li class="history-item"><p class="history-body">Loading…</p></li>';

  if (!window.EvApi) {
    list.innerHTML = '<li class="history-item"><p class="history-body">No stock movement yet.</p></li>';
    return;
  }

  let history;
  try {
    const response = await EvApi.json("/inventory/logs/" + encodeURIComponent(productId));
    const logs = extractList(response, "logs");
    if (!Array.isArray(logs)) throw new Error("Unexpected /inventory/logs response shape");
    history = logs;
  } catch (err) {
    list.innerHTML = '<li class="history-item"><p class="history-body">Couldn\'t load stock history.</p></li>';
    return;
  }

  if (!history.length) {
    list.innerHTML = '<li class="history-item"><p class="history-body">No stock movement yet.</p></li>';
    return;
  }

  list.innerHTML = history
    .map((h) => {
      const isIn = h.type === "IN";
      const signedQty = isIn ? h.quantity : -h.quantity;
      const date = h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "";
      return (
        '<li class="history-item"><span class="history-icon tone-' + (isIn ? "in" : "out") + '">' +
        extraIcon(isIn ? "arrowUp" : "arrowDown", 14) +
        '</span><div class="history-body"><p class="history-title">' + escapeHtml(h.reason || "Stock update") + '</p>' +
        '<p class="history-date">' + escapeHtml(date) + "</p></div>" +
        '<span class="history-delta tone-' + (isIn ? "in" : "out") + '">' + (signedQty > 0 ? "+" : "") + signedQty + "</span></li>"
      );
    })
    .join("");
}

  // ---------- Add / Edit Product modal ----------
  function categoryOptions(selected) {
  return categoriesCache
    .map((c) => '<option value="' + escapeHtml(c.id) + '"' + (c.id === selected ? " selected" : "") + ">" + escapeHtml(c.name) + "</option>")
    .join("");
}
  function supplierOptions(selected) {
    return suppliersCache
      .map((s) => '<option value="' + escapeHtml(s.id) + '"' + (s.id === selected ? " selected" : "") + ">" + escapeHtml(s.name) + "</option>")
      .join("");
  }

  function openAddProductModal() {
    openModal(
      "Add New Product",
      '<div class="modal-form">' +
        '<label class="field"><span class="field-label">PRODUCT NAME *</span><input type="text" id="f-name" placeholder="e.g. Basmati Rice 5kg" /></label>' +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">SKU</span><input type="text" id="f-sku" placeholder="Auto-generated" /></label>' +
        '<label class="field"><span class="field-label">CATEGORY *</span><select id="f-category"><option value="" disabled selected></option>' + categoryOptions() + "</select></label></div>" +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">SELLING PRICE (₦) *</span><input type="number" id="f-price" placeholder="0.00" /></label>' +
        '<label class="field"><span class="field-label">COST PRICE (₦)</span><input type="number" id="f-cost" placeholder="0.00" /></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">CURRENT STOCK</span><input type="number" id="f-stock" placeholder="0" /></label>' +
        '<label class="field"><span class="field-label">MIN. STOCK ALERT</span><input type="number" id="f-reorder" placeholder="10" /></label></div>' +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">UNIT</span><select id="f-unit"><option value="" disabled selected></option><option>unit</option><option>bag</option><option>carton</option><option>pack</option><option>tin</option><option>bottle</option></select></label>' +
        '<label class="field"><span class="field-label">SUPPLIER</span><select id="f-supplier"><option value="" disabled selected></option>' + supplierOptions() + "</select></label></div>" +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Product</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", submitAddProduct);
      }
    );
  }

  async function submitAddProduct() {
    const name = valueOf("f-name");
    if (!name) {
      showToast("Product name is required.", true);
      return;
    }

    const payload = {
      name,
      sku: valueOf("f-sku"),
      categoryId: valueOf("f-category"),
      unitPrice: Number(valueOf("f-price")) || 0,
      costPrice: Number(valueOf("f-cost")) || 0,
      currentStock: Number(valueOf("f-stock")) || 0,
      reorderLevel: Number(valueOf("f-reorder")) || 10,
      unit: valueOf("f-unit") || "unit",
      supplierId: valueOf("f-supplier"),
    };

    const btn = document.getElementById("modal-submit-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      if (window.EvApi) {
        await EvApi.json("/products", { method: "POST", body: JSON.stringify(payload) });
      } else {
        productsCache.unshift(normalizeProduct({ id: "local-" + Date.now(), ...payload }));
      }
      showToast("Product added.");
      closeModal();
      loadProducts();
    } catch (err) {
      productsCache.unshift(normalizeProduct({ id: "local-" + Date.now(), ...payload }));
      showToast("Couldn't reach the server — added locally instead.", true);
      closeModal();
      renderProductCount();
      renderList();
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Product";
    }
  }

  function openEditProductModal(id) {
    const product = productsCache.find((p) => String(p.id) === String(id));
    if (!product) return;

    openModal(
      "Edit Product",
      '<div class="modal-form">' +
        '<label class="field"><span class="field-label">Product Name</span><input type="text" id="f-name" value="' + escapeHtml(product.name) + '" /></label>' +
        '<label class="field"><span class="field-label">Category</span><select id="f-category">' + categoryOptions(product.category) + "</select></label>" +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">Selling Price (₦)</span><input type="number" id="f-price" value="' + product.unitPrice + '" /></label>' +
        '<label class="field"><span class="field-label">Cost Price (₦)</span><input type="number" id="f-cost" value="' + product.costPrice + '" /></label></div>' +
        '<label class="field"><span class="field-label">SKU / Barcode</span><input type="text" id="f-sku" value="' + escapeHtml(product.sku || "") + '" /></label>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="modal-submit-btn">Update Product</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", () => submitEditProduct(id));
      }
    );
  }

  async function submitEditProduct(id) {
    const updates = {
      name: valueOf("f-name"),
      categoryId: valueOf("f-category"),
      unitPrice: Number(valueOf("f-price")) || 0,
      costPrice: Number(valueOf("f-cost")) || 0,
      sku: valueOf("f-sku"),
    };

    const btn = document.getElementById("modal-submit-btn");
    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
      if (window.EvApi) {
        await EvApi.json("/products/" + id, { method: "PATCH", body: JSON.stringify(updates) });
      }
      applyLocalProductUpdate(id, updates);
      showToast("Product updated.");
      closeModal();
      renderProductCount();
      renderList();
      if (currentProductId === id) showDetailView(id);
    } catch (err) {
      applyLocalProductUpdate(id, updates);
      showToast("Couldn't reach the server — updated locally instead.", true);
      closeModal();
      renderProductCount();
      renderList();
      if (currentProductId === id) showDetailView(id);
    } finally {
      btn.disabled = false;
      btn.textContent = "Update Product";
    }
  }

  function applyLocalProductUpdate(id, updates) {
    const idx = productsCache.findIndex((p) => String(p.id) === String(id));
    if (idx > -1) productsCache[idx] = Object.assign({}, productsCache[idx], updates);
  }

  // ---------- Adjust Stock modal ----------
  function openAdjustStockModal() {
    const product = productsCache.find((p) => String(p.id) === String(currentProductId));
    if (!product) return;

    openModal(
      "Adjust Stock — " + product.name,
      '<div class="modal-form">' +
        '<div class="field-row">' +
        '<label class="field"><span class="field-label">TYPE</span><select id="adj-type"><option value="IN">Stock In</option><option value="OUT">Stock Out</option></select></label>' +
        '<label class="field"><span class="field-label">QUANTITY</span><input type="number" id="adj-qty" min="1" value="1" /></label></div>' +
        '<label class="field"><span class="field-label">REASON</span><input type="text" id="adj-reason" placeholder="e.g. Purchase from supplier" /></label>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Adjustment</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", submitAdjustStock);
      }
    );
  }

  // async function submitAdjustStock() {
  //   const type = valueOf("adj-type");
  //   const qty = Math.max(1, Number(valueOf("adj-qty")) || 1);
  //   const reason = valueOf("adj-reason") || (type === "IN" ? "Stock in" : "Stock out");
  //   const delta = type === "IN" ? qty : -qty;

  //   const product = productsCache.find((p) => String(p.id) === String(currentProductId));
  //   if (!product) return;

  //   const btn = document.getElementById("modal-submit-btn");
  //   btn.disabled = true;
  //   btn.textContent = "Saving...";

  //   try {
  //     if (window.EvApi) {
  //       await EvApi.json("/inventory/adjust", {
  //         method: "POST",
  //         body: JSON.stringify({ productId: product.id, type, quantity: qty, reason }),
  //       });
  //     }
  //     product.currentStock = Math.max(0, product.currentStock + delta);
  //     MOCK_HISTORY.unshift({ type, reason, date: new Date().toISOString().slice(0, 10), quantity: delta });
  //     showToast("Stock adjusted.");
  //     closeModal();
  //     showDetailView(product.id);
  //     renderProductCount();
  //   } catch (err) {
  //     product.currentStock = Math.max(0, product.currentStock + delta);
  //     MOCK_HISTORY.unshift({ type, reason, date: new Date().toISOString().slice(0, 10), quantity: delta });
  //     showToast("Couldn't reach the server — adjusted locally instead.", true);
  //     closeModal();
  //     showDetailView(product.id);
  //     renderProductCount();
  //   } finally {
  //     btn.disabled = false;
  //     btn.textContent = "Save Adjustment";
  //   }
  // }
async function submitAdjustStock() {
  const type = valueOf("adj-type");
  const qty = Math.max(1, Number(valueOf("adj-qty")) || 1);
  const reason = valueOf("adj-reason") || (type === "IN" ? "Stock in" : "Stock out");

  const product = productsCache.find((p) => String(p.id) === String(currentProductId));
  if (!product) return;

  if (!window.EvApi) {
    showToast("Can't adjust stock — not connected to the server.", true);
    return;
  }

  const endpoint =
    type === "IN"
      ? "/inventory/stock-in/" + product.id
      : "/inventory/stock-out/" + product.id;

  const btn = document.getElementById("modal-submit-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await EvApi.json(endpoint, {
      method: "POST",
      body: JSON.stringify({ quantity: qty, reason }),
    });
    showToast("Stock adjusted.");
    closeModal();
    loadProducts();
    showDetailView(product.id);
  } catch (err) {
    showToast(err.message || "Couldn't reach the server. Please try again.", true);
    btn.disabled = false;
    btn.textContent = "Save Adjustment";
  }
}
  // ---------- Delete ----------
  function confirmDeleteProduct() {
    const product = productsCache.find((p) => String(p.id) === String(currentProductId));
    if (!product) return;

    openModal(
      "Delete Product",
      '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">Are you sure you want to delete <strong>' +
        escapeHtml(product.name) +
        "</strong>? This can't be undone.</p>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-danger" id="modal-submit-btn">Delete</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", deleteProduct);
      }
    );
  }

  async function deleteProduct() {
    const id = currentProductId;
    try {
      if (window.EvApi) {
        await EvApi.json("/products/" + id, { method: "DELETE" });
      }
      productsCache = productsCache.filter((p) => String(p.id) !== String(id));
      showToast("Product deleted.");
      closeModal();
      showListView();
      renderProductCount();
      renderList();
    } catch (err) {
      productsCache = productsCache.filter((p) => String(p.id) !== String(id));
      showToast("Couldn't reach the server — deleted locally instead.", true);
      closeModal();
      showListView();
      renderProductCount();
      renderList();
    }
  }

  // ---------- Snap Photo ----------
  function setupSnapPhoto() {
    const btn = document.getElementById("snap-photo-btn");
    const input = document.getElementById("snap-photo-input");
    if (!btn || !input) return;

    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) {
        showToast("Photo captured — opening Add Product to fill in details.");
        openAddProductModal();
      }
      input.value = "";
    });
  }

  // ---------- Helpers ----------
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  // ---------- Boot ----------
  function boot() {
    if (!requireAuth()) return;

    decorateIcons();
    setupModalChrome();
    setupViewToggle();
    setupSnapPhoto();

    Promise.all([loadCategories(), loadSuppliers()]).then(() => {
      populateCategoryFilter();
      loadProducts();
    });

    document.getElementById("product-search")?.addEventListener("input", renderList);
    document.getElementById("category-filter")?.addEventListener("change", renderList);
    document.getElementById("add-product-btn")?.addEventListener("click", openAddProductModal);

    document.getElementById("products-tbody")?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view-btn]");
      const editBtn = e.target.closest("[data-edit-btn]");
      const row = e.target.closest("[data-open]");
      if (editBtn) return openEditProductModal(editBtn.getAttribute("data-edit-btn"));
      if (viewBtn) return showDetailView(viewBtn.getAttribute("data-view-btn"));
      if (row) return showDetailView(row.getAttribute("data-open"));
    });

    document.getElementById("products-grid")?.addEventListener("click", (e) => {
      const card = e.target.closest("[data-open]");
      if (card) showDetailView(card.getAttribute("data-open"));
    });

    document.getElementById("back-to-products-btn")?.addEventListener("click", showListView);
    document.getElementById("detail-edit-btn")?.addEventListener("click", () => openEditProductModal(currentProductId));
    document.getElementById("detail-delete-btn")?.addEventListener("click", confirmDeleteProduct);
    document.getElementById("adjust-stock-btn")?.addEventListener("click", openAdjustStockModal);
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();