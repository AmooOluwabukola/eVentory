/* eVentory — Orders page script (Sales History + Record Sale).
 * Talks to the real API: GET/POST /sales, GET /products (Record Sale
 * product picker). Attendant name is resolved only for the currently
 * logged-in user (via localStorage "user") — there's no endpoint to
 * look up other staff members' names from a userId. No mock-data
 * fallback.
 */

(function () {
  "use strict";

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

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-NG", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  // The backend id is a full UUID — display a short, human-friendly form
  // everywhere, but always key lookups off the full id.
  function shortOrderId(id) {
    if (!id) return "—";
    const first = String(id).split("-")[0];
    return "ORD-" + first.toUpperCase();
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

  // The API wraps list responses as { status, message, data: { <key>: [...] } }
  // (sometimes flattened to { data: [...] }). Stay defensive about the exact
  // nesting so a well-formed response never gets misread as a failure.
  function extractList(response, key) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.[key])) return response.data[key];
    if (Array.isArray(response?.[key])) return response[key];
    return null;
  }

  let salesCache = [];
  let productsCache = [];

  // ---------- Attendant lookup ----------
  // There's no endpoint that lists all users, so there's no way to resolve
  // *other* staff members' names from a userId alone. The only identity we
  // actually have on hand is whoever is currently logged in (localStorage
  // "user", set at login) — so we can only label a sale as "You" when its
  // userId matches the current session, and show "—" for everyone else.
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch (e) {
      return {};
    }
  }

  function attendantName(userId) {
    if (!userId) return "—";
    const me = getCurrentUser();
    if (me && me.id != null && String(me.id) === String(userId)) {
      return me.fullName || me.name || "You";
    }
    return "—";
  }

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
    if (!window.EvApi) {
      salesCache = [];
      renderAll();
      return;
    }

    try {
      const response = await EvApi.json("/sales", { method: "GET" });
      const list = extractList(response, "sales");
      if (!Array.isArray(list)) throw new Error("Unexpected /sales response shape");
      salesCache = list.map(normalizeSale);
      renderAll();
    } catch (err) {
      salesCache = [];
      renderAll();
      showToast("Couldn't load sales from the server.", true);
    }
  }

  // Backend shape (confirmed): { id, userId, paymentMethod, totalAmount,
  // note, createdAt, SaleItems: [{ quantity, unitPrice, Product: {name, sku} }] }.
  // There is no "customer" or "status" field on the sale at all — both are
  // derived/defaulted below rather than coming from the API.
  function normalizeSale(s) {
    const items = (s.SaleItems || []).map((it) => ({
      name: it.Product?.name || "",
      sku: it.Product?.sku || "",
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
    }));

    return {
      id: s.id,
      date: s.createdAt,
      customer: s.customerName || "Walk-in", // not currently returned by the backend
      userId: s.userId,
      paymentMethod: s.paymentMethod,
      // Best-guess display status — the backend has no status field yet,
      // so "refunded" can never actually occur until one exists.
      status: s.paymentMethod === "credit" ? "credit" : "completed",
      total: Number(s.totalAmount) || 0,
      note: s.note || "",
      items,
    };
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

  function getFilteredSales() {
    const search = (document.getElementById("order-search")?.value || "").toLowerCase();
    const statusFilter = document.getElementById("status-filter")?.value || "";

    return salesCache.filter((s) => {
      const matchesSearch =
        !search ||
        String(s.id || "").toLowerCase().includes(search) ||
        shortOrderId(s.id).toLowerCase().includes(search) ||
        (s.customer || "").toLowerCase().includes(search) ||
        attendantName(s.userId).toLowerCase().includes(search);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  function renderTable() {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;

    const search = document.getElementById("order-search")?.value || "";
    const statusFilter = document.getElementById("status-filter")?.value || "";
    const rows = getFilteredSales();

    if (!rows.length) {
      const filtering = search || statusFilter;
      tbody.innerHTML =
        '<tr><td colspan="8" class="table-empty">' +
        (filtering ? "No sales match your filters." : "No sales yet.") +
        "</td></tr>";
      return;
    }

    tbody.innerHTML = rows
      .map((s) => {
        const itemCount = (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        return (
          '<tr data-open="' + s.id + '">' +
          '<td class="cell-order-id" title="' + escapeHtml(s.id) + '">' + escapeHtml(shortOrderId(s.id)) + "</td>" +
          "<td>" + escapeHtml(formatDate(s.date)) + "</td>" +
          "<td>" + escapeHtml(s.customer || "Walk-in") + "</td>" +
          "<td>" + itemCount + (itemCount === 1 ? " item" : " items") + "</td>" +
          '<td class="cell-total">' + formatNaira(s.total) + "</td>" +
          '<td><span class="status-badge ' + s.status + '">' + escapeHtml(s.status) + "</span></td>" +
          "<td>" + escapeHtml(attendantName(s.userId)) + "</td>" +
          '<td><div class="row-actions">' +
          '<button type="button" class="icon-action-btn" data-view="' + s.id + '" aria-label="View order">' + extraIcon("eye", 14) + '</button>' +
          '<button type="button" class="icon-action-btn" data-receipt="' + s.id + '" aria-label="View receipt">' + extraIcon("receipt", 14) + '</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ---------- CSV export ----------
  // Escapes a value for CSV: wraps in quotes and doubles any embedded
  // quotes whenever the value itself contains a comma, quote, or newline.
  function csvEscape(value) {
    const str = value == null ? "" : String(value);
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function downloadCsv(content, filename) {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Exports exactly what's currently visible in the table — i.e. whatever
  // search/status filter is applied — not the whole unfiltered salesCache.
  function exportSalesToCsv() {
    const rows = getFilteredSales();
    if (!rows.length) {
      showToast("No sales to export.", true);
      return;
    }

    const headers = ["Order ID", "Date", "Customer", "Items", "Total (₦)", "Status", "Attendant"];
    const lines = [headers.map(csvEscape).join(",")];

    rows.forEach((s) => {
      const itemCount = (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      lines.push(
        [
          shortOrderId(s.id),
          formatDate(s.date),
          s.customer || "Walk-in",
          itemCount,
          s.total,
          s.status,
          attendantName(s.userId),
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    const filename = "sales-" + new Date().toISOString().slice(0, 10) + ".csv";
    downloadCsv(lines.join("\r\n"), filename);
    showToast("Exported " + rows.length + (rows.length === 1 ? " sale" : " sales") + " to CSV.");
  }


  function showListView() {
    document.getElementById("history-list-view").hidden = false;
    document.getElementById("order-detail-view").hidden = true;
  }

  function showDetailView(orderId) {
    const order = salesCache.find((s) => String(s.id) === String(orderId));
    if (!order) return;

    document.getElementById("history-list-view").hidden = true;
    const detailView = document.getElementById("order-detail-view");
    detailView.hidden = false;
    detailView.dataset.currentOrder = orderId;

    document.getElementById("detail-title").textContent = "Order " + shortOrderId(order.id);

    const itemsEl = document.getElementById("detail-items");
    itemsEl.innerHTML = (order.items || [])
      .map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        return (
          '<div class="detail-item-row">' +
          '<div><p class="detail-item-name">' + escapeHtml(item.name || "—") + '</p>' +
          '<p class="detail-item-meta">' + formatNaira(item.unitPrice) + ' × ' + item.quantity + '</p></div>' +
          '<div class="detail-item-amount">' + formatNaira(lineTotal) + "</div>" +
          "</div>"
        );
      })
      .join("");

    document.getElementById("detail-total").textContent = formatNaira(order.total);

    const infoRows = [
      ["Order ID", shortOrderId(order.id)],
      ["Date", formatDateTime(order.date)],
      ["Customer", order.customer || "Walk-in"],
      ["Attendant", attendantName(order.userId)],
      ["Payment", order.status === "credit" ? "Pending" : "Paid"],
      ["Status", (order.status || "").charAt(0).toUpperCase() + (order.status || "").slice(1)],
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
    const order = salesCache.find((s) => String(s.id) === String(orderId));
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
          escapeHtml(item.name || "—") +
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
      '<p class="receipt-meta">Receipt #' + escapeHtml(shortOrderId(order.id)) + " · " + escapeHtml(formatDate(order.date)) + "</p>" +
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

    if (!window.EvApi) {
      productsCache = [];
      select.innerHTML = '<option value="" disabled selected>Not connected to server</option>';
      return;
    }

    try {
      const response = await EvApi.json("/products", { method: "GET" });
      const list = extractList(response, "products");
      if (!Array.isArray(list)) throw new Error("Unexpected /products response shape");
      productsCache = list;
      select.innerHTML =
        '<option value="" disabled selected>Select a product</option>' +
        productsCache
          .map(
            (p) =>
              '<option value="' + escapeHtml(p.id) + '">' +
              escapeHtml(p.name) + " — " + formatNaira(p.unitPrice) +
              "</option>"
          )
          .join("");
    } catch (err) {
      productsCache = [];
      select.innerHTML = '<option value="" disabled selected>Couldn\'t load products</option>';
      showToast("Couldn't load products from the server.", true);
    }
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
        unitPrice: Number(product.unitPrice) || 0,
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

    if (!window.EvApi) {
      showToast("Can't record sale — not connected to the server.", true);
      return;
    }

    const btn = document.getElementById("record-sale-btn");
    btn.disabled = true;
    const originalLabel = document.getElementById("record-sale-label").textContent;
    document.getElementById("record-sale-label").textContent = "Recording...";

    // NOTE: the confirmed /sales GET response has no customerName/customerPhone
    // columns, so these are likely ignored server-side today. Sending them
    // is harmless either way — flagging in case the backend rejects unknown
    // fields once validated more strictly.
    const payload = {
      items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
      paymentMethod: selectedPayment,
      customerName: document.getElementById("customerName").value.trim() || "Walk-in",
      customerPhone: document.getElementById("customerPhone").value.trim(),
    };

    try {
      await EvApi.json("/sales", { method: "POST", body: JSON.stringify(payload) });
      showToast("Sale recorded.");
      resetRecordSaleForm();
      // Switch back to Sales History and refresh
      document.querySelector('.orders-tab[data-tab="history"]')?.click();
      loadSales();
    } catch (err) {
      document.getElementById("record-sale-label").textContent = originalLabel;
      btn.disabled = false;
      showToast(err.message || "Couldn't record sale. Please try again.", true);
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
  async function boot() {
    if (!requireAuth()) return;

    decorateIcons();
    setupTabs();
    renderPaymentGrid();
    renderCart();
    loadProducts();
    loadSales();

    // Coming from dashboard's "+ New Order" (orders.html?tab=record) opens
    // straight into the Record Sale tab instead of Sales History.
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab) {
      document.querySelector('.orders-tab[data-tab="' + requestedTab + '"]')?.click();
    }

    document.getElementById("export-csv-btn")?.addEventListener("click", exportSalesToCsv);

    document.getElementById("order-search")?.addEventListener("input", renderTable);
    document.getElementById("status-filter")?.addEventListener("change", renderTable);

    document.getElementById("orders-tbody")?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view]");
      const receiptBtn = e.target.closest("[data-receipt]");
      const row = e.target.closest("[data-open]");
      if (viewBtn) return showDetailView(viewBtn.getAttribute("data-view"));
      if (receiptBtn) return openReceipt(receiptBtn.getAttribute("data-receipt"));
      if (row) return showDetailView(row.getAttribute("data-open"));
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