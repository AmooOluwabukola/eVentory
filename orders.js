/* eVentory — Orders / Sales page script.
 * Tries the real API first (GET/POST /sales, GET /products — these map
 * directly to the backend's documented Sale/SaleItem/Product models),
 * and falls back to realistic mock data if a call fails so the page
 * stays usable while endpoints are being confirmed.
 */

(function () {
  "use strict";

  // ---------- Icons not in the shared dashboard-layout.js library ----------
  const EXTRA_ICON_PATHS = {
    eye: '<path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.4"/>',
    receipt: '<path d="M5 2.6h10v14.8l-1.8-1.3-1.9 1.3-1.8-1.3-1.9 1.3-1.8-1.3-1.8 1.3z"/><path d="M7.4 7h5.2"/><path d="M7.4 10.4h3.4"/>',
    download: '<path d="M10 3v9.4"/><path d="m6.4 9 3.6 3.6L13.6 9"/><path d="M4 15.4h12"/>',
    warning: '<path d="M10 3.4 18 16.6H2z"/><path d="M10 8.4v3.6"/><circle cx="10" cy="14.4" r="0.9" fill="currentColor" stroke="none"/>',
    arrowLeft: '<path d="M16 10H4"/><path d="m8.6 4.8-5.2 5.2 5.2 5.2"/>',
    close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
    check: '<path d="M3.6 10.4 8 14.8l8.4-9.6"/>',
    trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
    card: '<rect x="2.4" y="4.8" width="15.2" height="10.4" rx="1.8"/><path d="M2.4 8.4h15.2"/><path d="M5.4 12h3"/>',
    bank: '<path d="M2.6 8.2 10 3.4l7.4 4.8"/><path d="M3.6 8.2v8.4"/><path d="M16.4 8.2v8.4"/><path d="M7 8.2v8.4"/><path d="M13 8.2v8.4"/><path d="M2.4 16.6h15.2"/>',
    cart: '<circle cx="8.4" cy="17" r="1.4"/><circle cx="15.2" cy="17" r="1.4"/><path d="M2.2 3h1.9l2.1 9.8h10l1.9-7H5.2"/>',
    naira: '<path d="M5.4 5v10"/><path d="M14.6 5v10"/><path d="m5.4 5 9.2 10"/><path d="M4 8.6h12"/><path d="M4 11.4h12"/>',
    invoice: '<path d="M4.8 2.6h10.4v14.8l-1.7-1.3-1.9 1.3-1.7-1.3-1.9 1.3-1.7-1.3-1.5 1.3z"/><path d="M7.2 7h5.6"/><path d="M7.2 10.4h3.6"/>',
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
    (root || document).querySelectorAll("[data-order-icon]").forEach((el) => {
      el.innerHTML = extraIcon(el.getAttribute("data-order-icon"), el.getAttribute("data-icon-size") || 14);
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
    const amount = Number(value) || 0;
    return "₦" + amount.toLocaleString("en-NG");
  }

  // ---------- Mock fallback data (matches the Figma screenshots) ----------
  const MOCK_PRODUCTS = [
    { id: "p1", name: "Basmati Rice 5kg", unitPrice: 4500 },
    { id: "p2", name: "Vegetable Oil 1L", unitPrice: 2200 },
    { id: "p3", name: "Indomie Chicken 70g", unitPrice: 200 },
    { id: "p4", name: "Coca-Cola 50cl", unitPrice: 350 },
    { id: "p5", name: "Peak Milk Tin", unitPrice: 1500 },
  ];

  const MOCK_SALES = [
    {
      id: "S001", date: "2025-07-27", customer: "Walk-in", attendant: "Emeka Obi",
      paymentMethod: "cash", status: "completed", total: 9000,
      items: [{ name: "Basmati Rice 5kg", quantity: 2, unitPrice: 4500 }],
    },
    {
      id: "S002", date: "2025-07-27", customer: "Mrs. Fatima Aliyu", attendant: "Amina Bello",
      paymentMethod: "card", status: "completed", total: 9850,
      items: [
        { name: "Vegetable Oil 1L", quantity: 2, unitPrice: 2200 },
        { name: "Peak Milk Tin", quantity: 3, unitPrice: 1483.33 },
      ],
    },
    {
      id: "S003", date: "2025-07-27", customer: "Mr. Chukwudi Nwosu", attendant: "Emeka Obi",
      paymentMethod: "credit", status: "credit", total: 6800,
      items: [{ name: "Basmati Rice 5kg", quantity: 1, unitPrice: 4500 }, { name: "Vegetable Oil 1L", quantity: 1, unitPrice: 2300 }],
    },
    {
      id: "S004", date: "2025-07-26", customer: "Walk-in", attendant: "Amina Bello",
      paymentMethod: "transfer", status: "completed", total: 12700,
      items: [{ name: "Peak Milk Tin", quantity: 4, unitPrice: 1500 }, { name: "Coca-Cola 50cl", quantity: 20, unitPrice: 320 }],
    },
    {
      id: "S005", date: "2025-07-26", customer: "Mrs. Ngozi Adeyemi", attendant: "Emeka Obi",
      paymentMethod: "cash", status: "refunded", total: 7400,
      items: [{ name: "Basmati Rice 5kg", quantity: 1, unitPrice: 4500 }, { name: "Indomie Chicken 70g", quantity: 5, unitPrice: 580 }],
    },
    {
      id: "S006", date: "2025-07-25", customer: "Walk-in", attendant: "Chidi Eze",
      paymentMethod: "cash", status: "completed", total: 4080,
      items: [{ name: "Coca-Cola 50cl", quantity: 12, unitPrice: 340 }],
    },
  ];

  let salesSource = "local";
  let salesCache = [];
  let productsCache = [];

  // ---------- Tabs ----------
  function setupTabs() {
    const tabs = document.querySelectorAll(".orders-tab");
    const panels = document.querySelectorAll("[data-tab-panel]");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        panels.forEach((p) => {
          p.hidden = p.getAttribute("data-tab-panel") !== target;
        });
        showListView();
      });
    });
  }

  // ---------- Sales History: load + render ----------
  async function loadSales() {
    if (window.EvApi) {
      try {
        const response = await EvApi.json("/sales");
        salesCache = response.data || response;
        salesSource = "api";
        renderAll();
        return;
      } catch (err) {
        /* fall back below */
      }
    }
    salesSource = "local";
    salesCache = MOCK_SALES;
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderTable();
  }

  function renderStats() {
    const el = document.getElementById("order-stats");
    if (!el) return;

    const today = salesCache; // (API version would filter by today's date server-side)
    const totalToday = today.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const completed = today.filter((s) => s.status === "completed").length;
    const credit = today.filter((s) => s.status === "credit").length;
    const refunded = today.filter((s) => s.status === "refunded").length;

    const cards = [
      { value: formatNaira(totalToday), label: "Today's Sales", tone: "brand" },
      { value: completed, label: "Completed", tone: "green" },
      { value: credit, label: "Credit Sales", tone: "amber" },
      { value: refunded, label: "Refunded", tone: "rose" },
    ];

    el.innerHTML = cards
      .map(
        (c) =>
          '<div class="order-stat-card"><div class="order-stat-value tone-' +
          c.tone +
          '">' +
          c.value +
          '</div><div class="order-stat-label">' +
          c.label +
          "</div></div>"
      )
      .join("");
  }

  function renderTable() {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;

    const search = (document.getElementById("order-search")?.value || "").toLowerCase();
    const statusFilter = document.getElementById("status-filter")?.value || "";

    const rows = salesCache.filter((s) => {
      const matchesSearch =
        !search ||
        s.id.toLowerCase().includes(search) ||
        (s.customer || "").toLowerCase().includes(search) ||
        (s.attendant || "").toLowerCase().includes(search);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No sales found.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((s) => {
        const itemCount = (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        return (
          "<tr>" +
          '<td class="cell-order-id">' + escapeHtml(s.id) + "</td>" +
          "<td>" + escapeHtml(s.date) + "</td>" +
          "<td>" + escapeHtml(s.customer || "Walk-in") + "</td>" +
          "<td>" + itemCount + (itemCount === 1 ? " item" : " items") + "</td>" +
          '<td class="cell-total">' + formatNaira(s.total) + "</td>" +
          '<td><span class="status-badge ' + s.status + '">' + escapeHtml(s.status) + "</span></td>" +
          "<td>" + escapeHtml(s.attendant || "—") + "</td>" +
          '<td><div class="row-actions">' +
          '<button type="button" class="icon-action-btn" data-view="' + s.id + '" aria-label="View order">' + extraIcon("eye", 14) + '</button>' +
          '<button type="button" class="icon-action-btn" data-receipt="' + s.id + '" aria-label="View receipt">' + extraIcon("receipt", 14) + '</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ---------- Order detail drill-down ----------
  function showListView() {
    document.getElementById("history-list-view").hidden = false;
    document.getElementById("order-detail-view").hidden = true;
  }

  function showDetailView(orderId) {
    const order = salesCache.find((s) => s.id === orderId);
    if (!order) return;

    document.getElementById("history-list-view").hidden = true;
    const detailView = document.getElementById("order-detail-view");
    detailView.hidden = false;
    detailView.dataset.currentOrder = orderId;

    document.getElementById("detail-title").textContent = "Order " + order.id;

    const itemsEl = document.getElementById("detail-items");
    itemsEl.innerHTML = (order.items || [])
      .map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        return (
          '<div class="detail-item-row">' +
          '<div><p class="detail-item-name">' + escapeHtml(item.name) + '</p>' +
          '<p class="detail-item-meta">' + formatNaira(item.unitPrice) + ' × ' + item.quantity + '</p></div>' +
          '<div class="detail-item-amount">' + formatNaira(lineTotal) + "</div>" +
          "</div>"
        );
      })
      .join("");

    document.getElementById("detail-total").textContent = formatNaira(order.total);

    const infoRows = [
      ["Order ID", order.id],
      ["Date", order.date],
      ["Customer", order.customer || "Walk-in"],
      ["Attendant", order.attendant || "—"],
      ["Payment", order.status === "credit" ? "Pending" : "Paid"],
      ["Status", order.status.charAt(0).toUpperCase() + order.status.slice(1)],
    ];

    document.getElementById("sale-info-list").innerHTML = infoRows
      .map(
        ([label, value]) =>
          '<div class="sale-info-row"><dt>' + label + "</dt><dd>" + escapeHtml(value) + "</dd></div>"
      )
      .join("");
  }

  // ---------- Receipt modal ----------
  function openReceipt(orderId) {
    const order = salesCache.find((s) => s.id === orderId);
    if (!order) return;

    const store = (function () {
      try {
        return JSON.parse(localStorage.getItem("store") || "null") || {};
      } catch (e) {
        return {};
      }
    })();

    const itemsHtml = (order.items || [])
      .map(
        (item) =>
          '<div class="receipt-line"><span>' +
          escapeHtml(item.name) +
          " × " +
          item.quantity +
          "</span><span>" +
          formatNaira(item.quantity * item.unitPrice) +
          "</span></div>"
      )
      .join("");

    document.getElementById("receipt-print-area").innerHTML =
      '<div class="receipt-logo-row">' + extraIcon("invoice", 20) + " Eventory</div>" +
      '<p class="receipt-store-name">' + escapeHtml(store.name || "Your Store") + "</p>" +
      '<p class="receipt-store-address">' + escapeHtml(store.address || "") + "</p>" +
      '<p class="receipt-meta">Receipt #' + escapeHtml(order.id) + " · " + escapeHtml(order.date) + "</p>" +
      itemsHtml +
      '<div class="receipt-total"><span>TOTAL</span><span>' + formatNaira(order.total) + "</span></div>" +
      '<p class="receipt-thanks">Thank you for shopping at ' + escapeHtml(store.name || "our store") + "!<br/>Powered by Eventory</p>";

    document.getElementById("receipt-overlay").hidden = false;
  }

  function closeReceipt() {
    document.getElementById("receipt-overlay").hidden = true;
  }

  // ---------- Record Sale ----------
  let cart = [];

  async function loadProducts() {
    const select = document.getElementById("product-select");
    if (!select) return;

    if (window.EvApi) {
      try {
        const response = await EvApi.json("/products");
        productsCache = response.data || response;
      } catch (err) {
        productsCache = MOCK_PRODUCTS;
      }
    } else {
      productsCache = MOCK_PRODUCTS;
    }

    select.innerHTML =
      '<option value="" disabled selected>Select a product</option>' +
      productsCache
        .map((p) => '<option value="' + p.id + '">' + escapeHtml(p.name) + " — " + formatNaira(p.unitPrice) + "</option>")
        .join("");
  }

  function addItemToCart() {
    const select = document.getElementById("product-select");
    const qtyInput = document.getElementById("item-qty");
    const productId = select.value;
    const qty = Math.max(1, Number(qtyInput.value) || 1);

    if (!productId) return;

    const product = productsCache.find((p) => String(p.id) === String(productId));
    if (!product) return;

    const existing = cart.find((c) => c.productId === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        productId,
        name: product.name,
        unitPrice: product.unitPrice ?? product.price ?? 0,
        quantity: qty,
      });
    }

    qtyInput.value = 1;
    renderCart();
  }

  function removeCartItem(productId) {
    cart = cart.filter((c) => c.productId !== productId);
    renderCart();
  }

  function renderCart() {
    const container = document.getElementById("cart-items");
    const emptyState = document.getElementById("cart-empty");

    if (!cart.length) {
      container.innerHTML = "";
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      container.innerHTML = cart
        .map(
          (item) =>
            '<div class="cart-item-row">' +
            '<span class="cart-item-name">' + escapeHtml(item.name) + "</span>" +
            '<span class="cart-item-qty">×' + item.quantity + "</span>" +
            '<span class="cart-item-amount">' + formatNaira(item.unitPrice * item.quantity) + "</span>" +
            '<button type="button" class="cart-item-remove" data-remove-item="' + item.productId + '" aria-label="Remove item">' +
            extraIcon("trash", 12) +
            "</button></div>"
        )
        .join("");
    }

    updateSummary();
  }

  let selectedPayment = "cash";

  function renderPaymentGrid() {
    const grid = document.getElementById("payment-grid");
    if (!grid) return;

    const options = [
      { id: "cash", label: "Cash", icon: "naira" },
      { id: "card", label: "Card", icon: "card" },
      { id: "transfer", label: "Transfer", icon: "bank" },
      { id: "credit", label: "Credit", icon: "invoice" },
    ];

    grid.innerHTML = options
      .map(
        (o) =>
          '<button type="button" class="payment-option' +
          (o.id === selectedPayment ? " is-selected" : "") +
          '" data-payment="' + o.id + '">' +
          extraIcon(o.icon, 18) +
          "<span>" + o.label + "</span></button>"
      )
      .join("");

    grid.querySelectorAll("[data-payment]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedPayment = btn.getAttribute("data-payment");
        renderPaymentGrid();
      });
    });
  }

  function updateSummary() {
    const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
    const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);

    document.getElementById("summary-items").textContent = itemCount;
    document.getElementById("summary-subtotal").textContent = formatNaira(subtotal);
    document.getElementById("summary-total").textContent = formatNaira(subtotal);
    document.getElementById("record-sale-label").textContent = "Record Sale · " + formatNaira(subtotal);

    const warning = document.getElementById("summary-warning");
    const submitBtn = document.getElementById("record-sale-btn");
    const hasItems = cart.length > 0;

    warning.hidden = hasItems;
    submitBtn.disabled = !hasItems;
  }

  async function submitSale() {
    if (!cart.length) return;

    const btn = document.getElementById("record-sale-btn");
    btn.disabled = true;
    const originalLabel = document.getElementById("record-sale-label").textContent;
    document.getElementById("record-sale-label").textContent = "Recording...";

    const payload = {
      items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
      paymentMethod: selectedPayment,
      customerName: document.getElementById("customerName").value.trim() || "Walk-in",
      customerPhone: document.getElementById("customerPhone").value.trim(),
    };

    try {
      if (window.EvApi) {
        await EvApi.json("/sales", { method: "POST", body: JSON.stringify(payload) });
      }
      resetRecordSaleForm();
      // Switch back to Sales History and refresh
      document.querySelector('.orders-tab[data-tab="history"]').click();
      loadSales();
    } catch (err) {
      document.getElementById("record-sale-label").textContent = originalLabel;
      btn.disabled = false;
      alert(err.message || "Couldn't record sale. Please try again.");
    }
  }

  function resetRecordSaleForm() {
    cart = [];
    renderCart();
    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    selectedPayment = "cash";
    renderPaymentGrid();
  }

  // ---------- Boot ----------
  function boot() {
    if (!requireAuth()) return;

    decorateIcons();
    setupTabs();
    loadSales();
    loadProducts();
    renderPaymentGrid();
    renderCart();

    document.getElementById("order-search")?.addEventListener("input", renderTable);
    document.getElementById("status-filter")?.addEventListener("change", renderTable);

    document.getElementById("orders-tbody")?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view]");
      const receiptBtn = e.target.closest("[data-receipt]");
      if (viewBtn) showDetailView(viewBtn.getAttribute("data-view"));
      if (receiptBtn) openReceipt(receiptBtn.getAttribute("data-receipt"));
    });

    document.getElementById("back-to-list-btn")?.addEventListener("click", showListView);
    document.getElementById("view-receipt-btn")?.addEventListener("click", () => {
      const id = document.getElementById("order-detail-view").dataset.currentOrder;
      if (id) openReceipt(id);
    });

    document.getElementById("add-item-btn")?.addEventListener("click", addItemToCart);
    document.getElementById("cart-items")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-item]");
      if (btn) removeCartItem(btn.getAttribute("data-remove-item"));
    });
    document.getElementById("record-sale-btn")?.addEventListener("click", submitSale);

    document.getElementById("receipt-close-btn")?.addEventListener("click", closeReceipt);
    document.getElementById("receipt-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "receipt-overlay") closeReceipt();
    });
    document.getElementById("print-receipt-btn")?.addEventListener("click", () => window.print());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeReceipt();
    });
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();