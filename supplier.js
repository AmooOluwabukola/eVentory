// /* eVentory — Suppliers page script.
//  * Talks to the documented Supplier endpoints (GET/POST/PUT/DELETE /suppliers)
//  * and falls back to realistic mock data if a call fails, same pattern as
//  * product.js.
//  */

// (function () {
//   "use strict";

//   const EXTRA_ICON_PATHS = {
//     edit: '<path d="M13.4 3.6 16.4 6.6 6.6 16.4l-3.6.7.7-3.6z"/><path d="m11.8 5.2 3 3"/>',
//     trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
//     close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
//     phone: '<path d="M6.2 3.4h2.6l1 3.4-1.6 1.4a10 10 0 0 0 4.6 4.6l1.4-1.6 3.4 1v2.6a1.4 1.4 0 0 1-1.5 1.4A13.6 13.6 0 0 1 4.8 4.9a1.4 1.4 0 0 1 1.4-1.5z"/>',
//     mail: '<rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2"/><path d="m3.4 5.6 6.6 5 6.6-5"/>',
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
//   const MOCK_SUPPLIERS = [
//     { id: "sup1", name: "Olam Foods Ltd", category: "Grains & Cereals", rating: 4.8, contact: "Yemi Akande", phone: "+234 802 341 9920", email: "sales@olamfoods.com", address: "Lagos", orders: 32, pending: 1, lastOrder: "2025-07-20" },
//     { id: "sup2", name: "Dufil Prima Foods", category: "Pasta & Noodles", rating: 4.5, contact: "Blessing Okafor", phone: "+234 803 554 7710", email: "sales@dufil.com", address: "Ota", orders: 28, pending: 0, lastOrder: "2025-07-18" },
//     { id: "sup3", name: "Nestlé Nigeria", category: "Beverages & Dairy", rating: 4.9, contact: "Ibrahim Musa", phone: "+234 812 233 8844", email: "sales@nestle.com", address: "Abuja", orders: 45, pending: 2, lastOrder: "2025-07-22" },
//     { id: "sup4", name: "Dangote Industries", category: "Sugars & Staples", rating: 4.6, contact: "Chinedu Eze", phone: "+234 700 123 4567", email: "sales@dangote.com", address: "Lagos", orders: 60, pending: 0, lastOrder: "2025-07-25" },
//     { id: "sup5", name: "Reckitt Nigeria", category: "Personal Care", rating: 4.3, contact: "Adaeze Williams", phone: "+234 809 876 5432", email: "sales@reckitt.com", address: "Lagos", orders: 19, pending: 1, lastOrder: "2025-07-15" },
//   ];

//   let suppliersCache = [];

//   // ---------- Load suppliers ----------
//   async function loadSuppliers() {
//     if (window.EvApi) {
//       try {
//         const response = await EvApi.json("/suppliers", { method: "GET" });
//         suppliersCache = (response.data || response).map(normalizeSupplier);
//         renderSupplierCount();
//         renderGrid();
//         return;
//       } catch (err) {
//         /* fall back below */
//       }
//     }
//     suppliersCache = MOCK_SUPPLIERS.map(normalizeSupplier);
//     renderSupplierCount();
//     renderGrid();
//   }

//   function normalizeSupplier(s) {
//     return {
//       id: s.id,
//       name: s.name || "",
//       category: s.category || s.productCategory || "Uncategorized",
//       rating: Number(s.rating) || 0,
//       contact: s.contact || s.contactPerson || "",
//       phone: s.phone || s.phoneNumber || "",
//       email: s.email || "",
//       address: s.address || "",
//       orders: Number(s.orders) || 0,
//       pending: Number(s.pending) || 0,
//       lastOrder: s.lastOrder || s.lastOrderDate || "—",
//     };
//   }

//   function renderSupplierCount() {
//     const el = document.getElementById("supplier-count-text");
//     if (!el) return;
//     const pending = suppliersCache.filter((s) => s.pending > 0).length;
//     el.textContent = suppliersCache.length + " total suppliers · " + pending + " with pending orders";
//   }

//   function getFilteredSuppliers() {
//     const search = (document.getElementById("supplier-search")?.value || "").toLowerCase();
//     if (!search) return suppliersCache;
//     return suppliersCache.filter((s) =>
//       [s.name, s.category, s.contact, s.phone].some((v) => String(v).toLowerCase().includes(search))
//     );
//   }

//   function starsHtml(rating) {
//     const full = Math.round(rating);
//     const filled = "★★★★★".slice(0, full);
//     const rest = "★★★★★".slice(0, 5 - full);
//     return (
//       '<div class="card-rating"><span class="stars">' + filled +
//       '<span class="stars-empty">' + rest + "</span></span><span>" + rating.toFixed(1) + "</span></div>"
//     );
//   }

//   function renderGrid() {
//     const grid = document.getElementById("suppliers-grid");
//     if (!grid) return;
//     const rows = getFilteredSuppliers();

//     if (!rows.length) {
//       grid.innerHTML = '<div class="table-empty">No suppliers found.</div>';
//       return;
//     }

//     grid.innerHTML = rows
//       .map((s) => {
//         return (
//           '<article class="supplier-card" data-id="' + s.id + '">' +
//           '<div class="card-top">' +
//           '<div class="card-logo">' + icon("supplier", 18) + "</div>" +
//           '<div class="card-top-body">' +
//           '<p class="card-name">' + escapeHtml(s.name) + "</p>" +
//           '<p class="card-category">' + escapeHtml(s.category) + "</p>" +
//           starsHtml(s.rating) +
//           "</div></div>" +
//           '<div class="card-meta">' +
//           '<div class="card-meta-row">' + icon("user", 14) + "<span>" + escapeHtml(s.contact || "—") + "</span></div>" +
//           '<div class="card-meta-row">' + extraIcon("phone", 14) + "<span>" + escapeHtml(s.phone || "—") + "</span></div>" +
//           "</div>" +
//           '<div class="card-stats">' +
//           '<div><b class="v-orders">' + s.orders + '</b><span>Orders</span></div>' +
//           '<div><b class="' + (s.pending === 0 ? "v-pending-0" : "v-pending") + '">' + s.pending + "</b><span>Pending</span></div>" +
//           '<div><b>' + escapeHtml(s.lastOrder) + "</b><span>Last Order</span></div>" +
//           "</div>" +
//           '<div class="card-actions">' +
//           '<button type="button" class="icon-action-btn" data-edit-btn="' + s.id + '" aria-label="Edit">' + extraIcon("edit", 14) + '</button>' +
//           '<button type="button" class="icon-action-btn is-danger" data-delete-btn="' + s.id + '" aria-label="Delete">' + extraIcon("trash", 14) + "</button>" +
//           "</div>" +
//           "</article>"
//         );
//       })
//       .join("");
//   }

//   // ---------- Add / Edit Supplier modal ----------
//   function openAddSupplierModal() {
//     openModal(
//       "Add New Supplier",
//       '<div class="modal-form">' +
//         '<label class="field"><span class="field-label">COMPANY NAME *</span><input type="text" id="f-name" placeholder="e.g. Nestlé Nigeria" /><span class="field-err" id="f-err" hidden></span></label>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">CONTACT PERSON</span><input type="text" id="f-contact" placeholder="Full name" /></label>' +
//         '<label class="field"><span class="field-label">PHONE NUMBER</span><input type="text" id="f-phone" placeholder="+234" /></label></div>' +
//         '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="f-email" placeholder="sales@supplier.com" /></label>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">PRODUCT CATEGORY</span><input type="text" id="f-category" /></label>' +
//         '<label class="field"><span class="field-label">ADDRESS</span><input type="text" id="f-address" /></label></div>' +
//         "</div>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Supplier</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", submitAddSupplier);
//       }
//     );
//   }

//   async function submitAddSupplier() {
//     const name = valueOf("f-name");
//     if (!name) {
//       const err = document.getElementById("f-err");
//       err.textContent = "Company name is required.";
//       err.hidden = false;
//       return;
//     }

//     const payload = {
//       name,
//       contact: valueOf("f-contact"),
//       phone: valueOf("f-phone"),
//       email: valueOf("f-email"),
//       category: valueOf("f-category") || "Uncategorized",
//       address: valueOf("f-address"),
//     };

//     const btn = document.getElementById("modal-submit-btn");
//     btn.disabled = true;
//     btn.textContent = "Saving...";

//     try {
//       if (window.EvApi) {
//         await EvApi.json("/suppliers", { method: "POST", body: JSON.stringify(payload) });
//       } else {
//         suppliersCache.unshift(normalizeSupplier({ id: "local-" + Date.now(), rating: 4.5, orders: 0, pending: 0, lastOrder: new Date().toISOString().slice(0, 10), ...payload }));
//       }
//       showToast("Supplier added.");
//       closeModal();
//       loadSuppliers();
//     } catch (err) {
//       suppliersCache.unshift(normalizeSupplier({ id: "local-" + Date.now(), rating: 4.5, orders: 0, pending: 0, lastOrder: new Date().toISOString().slice(0, 10), ...payload }));
//       showToast("Couldn't reach the server — added locally instead.", true);
//       closeModal();
//       renderSupplierCount();
//       renderGrid();
//     } finally {
//       btn.disabled = false;
//       btn.textContent = "Save Supplier";
//     }
//   }

//   function openEditSupplierModal(id) {
//     const supplier = suppliersCache.find((s) => String(s.id) === String(id));
//     if (!supplier) return;

//     openModal(
//       "Edit Supplier",
//       '<div class="modal-form">' +
//         '<label class="field"><span class="field-label">COMPANY NAME *</span><input type="text" id="f-name" value="' + escapeHtml(supplier.name) + '" /><span class="field-err" id="f-err" hidden></span></label>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">CONTACT PERSON</span><input type="text" id="f-contact" value="' + escapeHtml(supplier.contact) + '" /></label>' +
//         '<label class="field"><span class="field-label">PHONE NUMBER</span><input type="text" id="f-phone" value="' + escapeHtml(supplier.phone) + '" /></label></div>' +
//         '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="f-email" value="' + escapeHtml(supplier.email) + '" /></label>' +
//         '<div class="field-row">' +
//         '<label class="field"><span class="field-label">PRODUCT CATEGORY</span><input type="text" id="f-category" value="' + escapeHtml(supplier.category) + '" /></label>' +
//         '<label class="field"><span class="field-label">ADDRESS</span><input type="text" id="f-address" value="' + escapeHtml(supplier.address) + '" /></label></div>' +
//         "</div>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-primary" id="modal-submit-btn">Update</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", () => submitEditSupplier(id));
//       }
//     );
//   }

//   async function submitEditSupplier(id) {
//     const name = valueOf("f-name");
//     if (!name) {
//       const err = document.getElementById("f-err");
//       err.textContent = "Company name is required.";
//       err.hidden = false;
//       return;
//     }

//     const updates = {
//       name,
//       contact: valueOf("f-contact"),
//       phone: valueOf("f-phone"),
//       email: valueOf("f-email"),
//       category: valueOf("f-category") || "Uncategorized",
//       address: valueOf("f-address"),
//     };

//     const btn = document.getElementById("modal-submit-btn");
//     btn.disabled = true;
//     btn.textContent = "Updating...";

//     try {
//       if (window.EvApi) {
//         await EvApi.json("/suppliers/" + id, { method: "PUT", body: JSON.stringify(updates) });
//       }
//       applyLocalSupplierUpdate(id, updates);
//       showToast("Supplier updated.");
//       closeModal();
//       renderSupplierCount();
//       renderGrid();
//     } catch (err) {
//       applyLocalSupplierUpdate(id, updates);
//       showToast("Couldn't reach the server — updated locally instead.", true);
//       closeModal();
//       renderSupplierCount();
//       renderGrid();
//     } finally {
//       btn.disabled = false;
//       btn.textContent = "Update";
//     }
//   }

//   function applyLocalSupplierUpdate(id, updates) {
//     const idx = suppliersCache.findIndex((s) => String(s.id) === String(id));
//     if (idx > -1) suppliersCache[idx] = Object.assign({}, suppliersCache[idx], updates);
//   }

//   // ---------- Delete ----------
//   function confirmDeleteSupplier(id) {
//     const supplier = suppliersCache.find((s) => String(s.id) === String(id));
//     if (!supplier) return;

//     openModal(
//       "Delete Supplier",
//       '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">Are you sure you want to delete <strong>' +
//         escapeHtml(supplier.name) +
//         "</strong>? This can't be undone.</p>" +
//         '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
//         '<button type="button" class="btn btn-danger" id="modal-submit-btn">Delete</button></div>',
//       () => {
//         document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
//         document.getElementById("modal-submit-btn").addEventListener("click", () => deleteSupplier(id));
//       }
//     );
//   }

//   async function deleteSupplier(id) {
//     try {
//       if (window.EvApi) {
//         await EvApi.json("/suppliers/" + id, { method: "DELETE" });
//       }
//       suppliersCache = suppliersCache.filter((s) => String(s.id) !== String(id));
//       showToast("Supplier deleted.");
//       closeModal();
//       renderSupplierCount();
//       renderGrid();
//     } catch (err) {
//       suppliersCache = suppliersCache.filter((s) => String(s.id) !== String(id));
//       showToast("Couldn't reach the server — deleted locally instead.", true);
//       closeModal();
//       renderSupplierCount();
//       renderGrid();
//     }
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

//     loadSuppliers();

//     document.getElementById("supplier-search")?.addEventListener("input", renderGrid);
//     document.getElementById("add-supplier-btn")?.addEventListener("click", openAddSupplierModal);

//     document.getElementById("suppliers-grid")?.addEventListener("click", (e) => {
//       const editBtn = e.target.closest("[data-edit-btn]");
//       const deleteBtn = e.target.closest("[data-delete-btn]");
//       if (editBtn) return openEditSupplierModal(editBtn.getAttribute("data-edit-btn"));
//       if (deleteBtn) return confirmDeleteSupplier(deleteBtn.getAttribute("data-delete-btn"));
//     });
//   }

//   document.addEventListener("shell:ready", boot);

//   if (document.body.classList.contains("shell-ready")) {
//     boot();
//   }
// })();


/* eVentory — Suppliers page script.
 * Talks to the documented Supplier endpoints (GET/POST/PUT/DELETE /suppliers)
 * and falls back to realistic mock data if a call fails, same pattern as
 * product.js.
 */

(function () {
  "use strict";

  const EXTRA_ICON_PATHS = {
    edit: '<path d="M13.4 3.6 16.4 6.6 6.6 16.4l-3.6.7.7-3.6z"/><path d="m11.8 5.2 3 3"/>',
    trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
    close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
    phone: '<path d="M6.2 3.4h2.6l1 3.4-1.6 1.4a10 10 0 0 0 4.6 4.6l1.4-1.6 3.4 1v2.6a1.4 1.4 0 0 1-1.5 1.4A13.6 13.6 0 0 1 4.8 4.9a1.4 1.4 0 0 1 1.4-1.5z"/>',
    mail: '<rect x="2.6" y="4.6" width="14.8" height="10.8" rx="2"/><path d="m3.4 5.6 6.6 5 6.6-5"/>',
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

  let suppliersCache = [];

  // ---------- Load suppliers ----------
  async function loadSuppliers() {
    const grid = document.getElementById("suppliers-grid");
    if (grid) grid.innerHTML = '<div class="table-empty">Loading suppliers…</div>';

    if (!window.EvApi) {
      suppliersCache = [];
      renderSupplierCount();
      renderGrid();
      return;
    }

    try {
      const response = await EvApi.json("/suppliers", { method: "GET" });
      const list = extractSupplierList(response);
      if (!Array.isArray(list)) throw new Error("Unexpected /suppliers response shape");
      suppliersCache = list.map(normalizeSupplier);
      renderSupplierCount();
      renderGrid();
    } catch (err) {
      suppliersCache = [];
      renderSupplierCount();
      renderGrid();
      showToast("Couldn't load suppliers from the server.", true);
    }
  }

  // The API wraps the array as { status, message, data: { suppliers: [...] } }.
  // Stay defensive about the exact nesting so this doesn't silently fall
  // back to mock data if the shape shifts slightly.
  function extractSupplierList(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.suppliers)) return response.data.suppliers;
    if (Array.isArray(response?.suppliers)) return response.suppliers;
    return null;
  }

  function normalizeSupplier(s) {
    return {
      id: s.id,
      name: s.name || "",
    //   category: s.category || s.productCategory || "Uncategorized",
    //   rating: Number(s.rating) || 0,
    //   contact: s.contact || s.contactPerson || s.contactName || "",
     contactPhone:  s.contactPhone || "",
      email: s.email || "",
      address: s.address && s.address !== "nil" ? s.address : "",
      orders: Number(s.orders) || 0,
      pending: Number(s.pending) || 0,
      lastOrder: s.lastOrder || s.lastOrderDate || "—",
    };
  }

  function renderSupplierCount() {
    const el = document.getElementById("supplier-count-text");
    if (!el) return;
    const pending = suppliersCache.filter((s) => s.pending > 0).length;
    el.textContent = suppliersCache.length + " total suppliers · " + pending + " with pending orders";
  }

  function getFilteredSuppliers() {
    const search = (document.getElementById("supplier-search")?.value || "").toLowerCase();
    if (!search) return suppliersCache;
    return suppliersCache.filter((s) =>
      [s.name, s.category, s.contact, s.phone].some((v) => String(v).toLowerCase().includes(search))
    );
  }

  function starsHtml(rating) {
    const full = Math.round(rating);
    const filled = "★★★★★".slice(0, full);
    const rest = "★★★★★".slice(0, 5 - full);
    return (
      '<div class="card-rating"><span class="stars">' + filled +
      '<span class="stars-empty">' + rest + "</span></span><span>" + rating.toFixed(1) + "</span></div>"
    );
  }

  function renderGrid() {
    const grid = document.getElementById("suppliers-grid");
    if (!grid) return;
    const rows = getFilteredSuppliers();

    if (!rows.length) {
      const searching = (document.getElementById("supplier-search")?.value || "").trim();
      grid.innerHTML =
        '<div class="table-empty">' +
        (searching ? "No suppliers match your search." : "No suppliers yet. Add your first supplier to get started.") +
        "</div>";
      return;
    }

    grid.innerHTML = rows
      .map((s) => {
        return (
          '<article class="supplier-card" data-id="' + s.id + '">' +
          '<div class="card-top">' +
          '<div class="card-logo">' + icon("supplier", 18) + "</div>" +
          '<div class="card-top-body">' +
          '<p class="card-name">' + escapeHtml(s.name) + "</p>" +
          "</div></div>" +
          '<div class="card-meta">' +
          '<div class="card-meta-row">' + extraIcon("phone", 14) + "<span>" + escapeHtml(s.contactPhone || "—") + "</span></div>" +
          "</div>" +
          '<div class="card-stats">' +
          '<div><b class="v-orders">' + s.orders + '</b><span>Orders</span></div>' +
          '<div><b class="' + (s.pending === 0 ? "v-pending-0" : "v-pending") + '">' + s.pending + "</b><span>Pending</span></div>" +
          '<div><b>' + escapeHtml(s.lastOrder) + "</b><span>Last Order</span></div>" +
          "</div>" +
          '<div class="card-actions">' +
          '<button type="button" class="icon-action-btn" data-edit-btn="' + s.id + '" aria-label="Edit">' + extraIcon("edit", 14) + '</button>' +
          '<button type="button" class="icon-action-btn is-danger" data-delete-btn="' + s.id + '" aria-label="Delete">' + extraIcon("trash", 14) + "</button>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  // ---------- Add / Edit Supplier modal ----------
  function openAddSupplierModal() {
    openModal(
      "Add New Supplier",
      '<div class="modal-form">' +
        '<label class="field"><span class="field-label">COMPANY NAME *</span><input type="text" id="f-name" placeholder="e.g. Nestlé Nigeria" /><span class="field-err" id="f-err" hidden></span></label>' +
        '<div class="field">' +
        '<label class="field"><span class="field-label">PHONE NUMBER</span><input type="text" id="f-phone" placeholder="+234" /></label></div>' +
        '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="f-email" placeholder="sales@supplier.com" /></label>' +
        '<div class="field">' +
        '<label class="field"><span class="field-label">ADDRESS</span><input type="text" id="f-address" /></label></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="modal-submit-btn">Save Supplier</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", submitAddSupplier);
      }
    );
  }

  async function submitAddSupplier() {
    const name = valueOf("f-name");
    if (!name) {
      const err = document.getElementById("f-err");
      err.textContent = "Company name is required.";
      err.hidden = false;
      return;
    }

    const payload = {
      name,
    //   contact: valueOf("f-contact"),
      contactPhone: valueOf("f-phone"),
      email: valueOf("f-email"),
    //   category: valueOf("f-category") || "Uncategorized",
      address: valueOf("f-address"),
    };

    if (!window.EvApi) {
      showToast("Can't save — not connected to the server.", true);
      return;
    }

    const btn = document.getElementById("modal-submit-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      await EvApi.json("/suppliers", { method: "POST", body: JSON.stringify(payload) });
      showToast("Supplier added.");
      closeModal();
      loadSuppliers();
    } catch (err) {
      showToast("Couldn't reach the server. Please try again.", true);
      btn.disabled = false;
      btn.textContent = "Save Supplier";
    }
  }

  function openEditSupplierModal(id) {
    const supplier = suppliersCache.find((s) => String(s.id) === String(id));
    if (!supplier) return;

    openModal(
      "Edit Supplier",
      '<div class="modal-form">' +
        '<label class="field"><span class="field-label">COMPANY NAME *</span><input type="text" id="f-name" value="' + escapeHtml(supplier.name) + '" /><span class="field-err" id="f-err" hidden></span></label>' +
        '<div class="field-row">' +
        // '<label class="field"><span class="field-label">CONTACT PERSON</span><input type="text" id="f-contact" value="' + escapeHtml(supplier.contact) + '" /></label>' +
        '<label class="field"><span class="field-label">PHONE NUMBER</span><input type="text" id="f-phone" value="' + escapeHtml(supplier.contactPhone) + '" /></label></div>' +
        '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="f-email" value="' + escapeHtml(supplier.email) + '" /></label>' +
        '<div class="field-row">' +
        // '<label class="field"><span class="field-label">PRODUCT CATEGORY</span><input type="text" id="f-category" value="' + escapeHtml(supplier.category) + '" /></label>' +
        '<label class="field"><span class="field-label">ADDRESS</span><input type="text" id="f-address" value="' + escapeHtml(supplier.address) + '" /></label></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="modal-submit-btn">Update</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", () => submitEditSupplier(id));
      }
    );
  }

  async function submitEditSupplier(id) {
    const name = valueOf("f-name");
    if (!name) {
      const err = document.getElementById("f-err");
      err.textContent = "Company name is required.";
      err.hidden = false;
      return;
    }

    const updates = {
      name,
    //   contact: valueOf("f-contact"),
     contactPhone: valueOf("f-phone"),
      email: valueOf("f-email"),
    //   category: valueOf("f-category") || "Uncategorized",
      address: valueOf("f-address"),
    };

    if (!window.EvApi) {
      showToast("Can't save — not connected to the server.", true);
      return;
    }

    const btn = document.getElementById("modal-submit-btn");
    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
      await EvApi.json("/suppliers/" + id, { method: "PUT", body: JSON.stringify(updates) });
      showToast("Supplier updated.");
      closeModal();
      loadSuppliers();
    } catch (err) {
      showToast("Couldn't reach the server. Please try again.", true);
      btn.disabled = false;
      btn.textContent = "Update";
    }
  }

  // ---------- Delete ----------
  function confirmDeleteSupplier(id) {
    const supplier = suppliersCache.find((s) => String(s.id) === String(id));
    if (!supplier) return;

    openModal(
      "Delete Supplier",
      '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">Are you sure you want to delete <strong>' +
        escapeHtml(supplier.name) +
        "</strong>? This can't be undone.</p>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-danger" id="modal-submit-btn">Delete</button></div>',
      () => {
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-submit-btn").addEventListener("click", () => deleteSupplier(id));
      }
    );
  }

  async function deleteSupplier(id) {
    if (!window.EvApi) {
      showToast("Can't delete — not connected to the server.", true);
      return;
    }

    const btn = document.getElementById("modal-submit-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Deleting...";
    }

    try {
      await EvApi.json("/suppliers/" + id, { method: "DELETE" });
      showToast("Supplier deleted.");
      closeModal();
      loadSuppliers();
    } catch (err) {
      showToast("Couldn't reach the server. Please try again.", true);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Delete";
      }
    }
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

    loadSuppliers();

    document.getElementById("supplier-search")?.addEventListener("input", renderGrid);
    document.getElementById("add-supplier-btn")?.addEventListener("click", openAddSupplierModal);

    document.getElementById("suppliers-grid")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-btn]");
      const deleteBtn = e.target.closest("[data-delete-btn]");
      if (editBtn) return openEditSupplierModal(editBtn.getAttribute("data-edit-btn"));
      if (deleteBtn) return confirmDeleteSupplier(deleteBtn.getAttribute("data-delete-btn"));
    });
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();