(function () {
  "use strict";

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

  function extractList(response, key) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.[key])) return response.data[key];
    if (Array.isArray(response?.[key])) return response[key];
    return null;
  }

  function initialsOf(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const TABS = [
    { id: "overview", label: "Stock Overview" },
    { id: "adjustment", label: "Stock Adjustment" },
    { id: "history", label: "Stock History" },
    { id: "low", label: "Low Stock", showCount: "low" },
    { id: "reorder", label: "Reorder Suggestions" },
  ];

  const THUMB_TINTS = [
    "#eef8e8", "#fff6e8", "#eef4ff", "#f5f0ff", "#e8f7ff",
    "#fff0e8", "#fff7e0", "#fdece8", "#f3ebe4", "#fff4d6",
  ];

  function tintFor(index) {
    return THUMB_TINTS[index % THUMB_TINTS.length];
  }

  let activeTab = "overview";
  let productsCache = [];
  let lowStockCache = [];
  let historyLogs = [];
  let recentAdjustments = [];
  let selectedAdjType = "IN";
  let loadError = null;

  function statusOf(item) {
    const qty = Number(item.currentStock) || 0;
    const min = Number(item.reorderLevel) || 0;
    if (qty <= 0) return { key: "out", label: "out of-stock", tone: "red" };
    if (qty <= min) return { key: "low", label: "low stock", tone: "amber" };
    return { key: "in", label: "in stock", tone: "green" };
  }

  function summarize(items) {
    return items.reduce(
      (acc, item) => {
        const status = statusOf(item).key;
        if (status === "in") acc.in += 1;
        if (status === "low") acc.low += 1;
        if (status === "out") acc.out += 1;
        return acc;
      },
      { total: items.length, in: 0, low: 0, out: 0 }
    );
  }

  function formatNaira(value) {
    return `₦${Math.round(value).toLocaleString("en-NG")}`;
  }

  function fillPercent(item) {
    const qty = Number(item.currentStock) || 0;
    const min = Number(item.reorderLevel) || 0;
    if (qty <= 0) return 0;
    const ceiling = Math.max(min * 5, 50);
    return Math.max(4, Math.min(100, Math.round((qty / ceiling) * 100)));
  }

  function normalizeProduct(p) {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.Category?.name || "—",
      supplier: p.Supplier?.name || "Supplier N/A",
      unitPrice: Number(p.unitPrice) || 0,
      costPrice: Number(p.costPrice) || 0,
      currentStock: Number(p.currentStock) || 0,
      reorderLevel: Number(p.reorderLevel) || 0,
    };
  }

  // fallbackProductName covers /inventory/logs/{productId}, whose entries
  // don't repeat Product on each log — the name lives once at data.product.
  function normalizeLog(log, fallbackProductName) {
    const change = Number(log.newStock) - Number(log.previousStock);
    const typeLabel = log.type === "IN" ? "stock in"
      : log.type === "OUT" ? "stock out"
      : log.type === "SALE" ? "sale"
      : String(log.type || "adjustment").toLowerCase();
    return {
      date: (log.createdAt || "").split("T")[0] || "",
      productName: log.Product?.name || fallbackProductName || "Product",
      type: typeLabel,
      change,
      before: log.previousStock,
      after: log.newStock,
      reason: log.reason || "",
      staff: log.User?.fullName || "Current User",
    };
  }

  async function loadData() {
    if (!window.EvApi) return;

    try {
      let page = 1;
      let totalPages = 1;
      let all = [];

      do {
        const response = await EvApi.json("/products?page=" + page + "&limit=100", { method: "GET" });
        const list = extractList(response, "products");
        if (!Array.isArray(list)) throw new Error("Unexpected response structure");
        all = all.concat(list);
        totalPages = response?.data?.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      productsCache = all.map(normalizeProduct);

      // Load low stock items from API endpoint
      try {
        const lowRes = await EvApi.json("/inventory/low-stock", { method: "GET" });
        const lowList = extractList(lowRes, "products");
        if (Array.isArray(lowList)) {
          lowStockCache = lowList.map(normalizeProduct);
        } else {
          lowStockCache = productsCache.filter((item) => statusOf(item).key !== "in");
        }
      } catch (err) {
        lowStockCache = productsCache.filter((item) => statusOf(item).key !== "in");
      }

      loadError = null;
      render();
    } catch (err) {
      loadError = "Failed to load inventory data.";
      render();
    }
  }

  // Full stock history tab — GET /inventory/logs, paginated the same way
  // /products is above.
  async function loadHistoryLogs() {
    if (!window.EvApi) return;

    try {
      let page = 1;
      let totalPages = 1;
      let all = [];

      do {
        const response = await EvApi.json("/inventory/logs?page=" + page + "&limit=100", { method: "GET" });
        const list = extractList(response, "logs");
        if (!Array.isArray(list)) throw new Error("Unexpected response structure");
        all = all.concat(list);
        totalPages = response?.data?.pagination?.pages || 1;
        page += 1;
      } while (page <= totalPages);

      historyLogs = all.map((log) => normalizeLog(log));
    } catch (err) {
      historyLogs = [];
    }
    renderHistory();
  }

  // Recent adjustments panel (stock adjustment tab) — GET
  // /inventory/logs/{productId}, scoped to whichever product is selected.
  async function loadRecentAdjustments(productId) {
    if (!window.EvApi || !productId) {
      recentAdjustments = [];
      renderRecentAdjustments();
      return;
    }

    try {
      const response = await EvApi.json(`/inventory/logs/${productId}`, { method: "GET" });
      const list = extractList(response, "logs");
      const productName = response?.data?.product?.name;
      recentAdjustments = Array.isArray(list) ? list.map((log) => normalizeLog(log, productName)) : [];
    } catch (err) {
      recentAdjustments = [];
    }
    renderRecentAdjustments();
  }

  function renderTabs(summary) {
    const root = document.getElementById("inv-tabs");
    if (!root) return;

    root.innerHTML = TABS.map((tab) => {
      const count = tab.showCount === "low" ? ` <span class="inv-tab-count">(${summary.low + summary.out})</span>` : "";
      const active = tab.id === activeTab ? " is-active" : "";
      return `<button type="button" class="inv-tab${active}" data-tab="${tab.id}">${escapeHtml(tab.label)}${count}</button>`;
    }).join("");

    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab");
        render();
      });
    });
  }

  function renderKpis(summary) {
    const root = document.getElementById("inv-kpis");
    if (!root) return;

    if (activeTab !== "overview") {
      root.style.display = "none";
      return;
    }
    root.style.display = "grid";

    root.innerHTML = `
      <article class="inv-kpi is-purple">
        <span class="inv-kpi-value">${summary.total}</span>
        <span class="inv-kpi-label">Total SKUs</span>
      </article>
      <article class="inv-kpi is-amber">
        <span class="inv-kpi-value">${summary.low}</span>
        <span class="inv-kpi-label">Low Stock</span>
      </article>
      <article class="inv-kpi is-red">
        <span class="inv-kpi-value">${summary.out}</span>
        <span class="inv-kpi-label">Out of Stock</span>
      </article>`;
  }

  function renderLegend(summary) {
    const root = document.getElementById("inv-legend");
    if (!root) return;
    root.innerHTML = `
      <span class="inv-chip is-green">In Stock: ${summary.in}</span>
      <span class="inv-chip is-amber">Low: ${summary.low}</span>
      <span class="inv-chip is-red">Out: ${summary.out}</span>`;
  }

  function renderOverview() {
    const body = document.getElementById("inv-body");
    if (!body) return;

    body.innerHTML = productsCache.map((item, index) => {
      const status = statusOf(item);
      const pct = fillPercent(item);
      const value = item.currentStock * item.unitPrice;
      return `
        <tr>
          <td>
            <div class="inv-product">
              <span class="inv-thumb" style="background:${tintFor(index)}">${escapeHtml(initialsOf(item.name))}</span>
              <div class="inv-product-meta">
                <p class="inv-product-name">${escapeHtml(item.name)}</p>
                <p class="inv-product-sku">${escapeHtml(item.sku || "—")}</p>
              </div>
            </div>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td>
            <div class="inv-stock">
              <div class="inv-stock-track">
                <div class="inv-stock-fill is-${status.tone}" style="width:${pct}%"></div>
              </div>
              <p class="inv-stock-label">${item.currentStock}</p>
            </div>
          </td>
          <td>${item.reorderLevel}</td>
          <td class="inv-value">${formatNaira(value)}</td>
          <td><span class="inv-status is-${status.tone}">${escapeHtml(status.label)}</span></td>
        </tr>`;
    }).join("");
  }

  function setupAdjustmentForm() {
    const select = document.getElementById("adj-product");
    if (!select) return;

    select.innerHTML = '<option value="">Select a product...</option>' +
      productsCache.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.currentStock} in stock)</option>`).join("");

    const updatePreview = () => {
      const prodId = select.value;
      const qtyVal = Number(document.getElementById("adj-qty").value) || 0;
      const prod = productsCache.find(p => p.id === prodId);

      const currentElem = document.getElementById("prev-current");
      const newElem = document.getElementById("prev-new");

      if (!prod) {
        currentElem.textContent = "--";
        newElem.textContent = "--";
        return;
      }

      currentElem.textContent = prod.currentStock;
      let newQty = prod.currentStock;

      if (selectedAdjType === "IN") newQty += qtyVal;
      else if (selectedAdjType === "OUT") newQty = Math.max(0, prod.currentStock - qtyVal);
      else newQty = qtyVal;

      newElem.textContent = newQty;
    };

    select.onchange = () => {
      updatePreview();
      loadRecentAdjustments(select.value);
    };
    document.getElementById("adj-qty").oninput = updatePreview;

    document.querySelectorAll(".adj-type-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".adj-type-btn").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        selectedAdjType = btn.getAttribute("data-type");
        updatePreview();
      };
    });

    const form = document.getElementById("adj-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const prodId = select.value;
      const qty = Number(document.getElementById("adj-qty").value);
      const reason = document.getElementById("adj-reason").value;

      if (!prodId || !qty) {
        document.getElementById("adj-alert").hidden = false;
        return;
      }
      document.getElementById("adj-alert").hidden = true;

      const endpoint = selectedAdjType === "OUT" 
        ? `/inventory/stock-out/${prodId}` 
        : `/inventory/stock-in/${prodId}`;

      try {
        await EvApi.json(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: qty, reason: reason }),
        });

        showToast("Stock updated successfully");
        await loadData();
        await loadRecentAdjustments(prodId);
        form.reset();
        updatePreview();
      } catch (err) {
        showToast(err.message || "Failed to adjust stock", true);
      }
    };

    renderRecentAdjustments();
    loadRecentAdjustments(select.value);
  }

  function renderRecentAdjustments() {
    const root = document.getElementById("adj-recent-list");
    if (!root) return;
    if (!recentAdjustments.length) {
      root.innerHTML = `<p class="inv-empty">No recent adjustments logged.</p>`;
      return;
    }
    root.innerHTML = recentAdjustments.slice(0, 5).map(log => `
      <div class="adj-recent-item">
        <div class="adj-recent-icon ${log.change < 0 ? 'is-down' : 'is-up'}">
          ${log.change < 0 ? '↓' : '↑'}
        </div>
        <div class="adj-recent-info">
          <p class="adj-recent-name">${escapeHtml(log.productName)}</p>
          <p class="adj-recent-sub">${escapeHtml(log.reason)} • ${log.date}</p>
        </div>
        <span class="adj-recent-val ${log.change < 0 ? 'is-neg' : 'is-pos'}">
          ${log.change > 0 ? '+' : ''}${log.change}
        </span>
      </div>
    `).join("");
  }

  function renderHistory() {
    const body = document.getElementById("history-body");
    if (!body) return;

    const searchTerm = (document.getElementById("history-search")?.value || "").toLowerCase();
    const filtered = historyLogs.filter(h => 
      h.productName.toLowerCase().includes(searchTerm) || 
      h.reason.toLowerCase().includes(searchTerm)
    );

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6" class="inv-empty">No history logs found.</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map(log => `
      <tr>
        <td>${log.date}</td>
        <td><strong>${escapeHtml(log.productName)}</strong></td>
        <td><span class="inv-status ${log.change < 0 ? 'is-red' : 'is-green'}">${log.type}</span></td>
        <td class="${log.change < 0 ? 'text-red' : 'text-green'}"><strong>${log.change > 0 ? '+' : ''}${log.change}</strong></td>
        <td>${log.before} → <strong>${log.after}</strong></td>
        <td>${escapeHtml(log.reason)}</td>
      </tr>
    `).join("");

    const searchInput = document.getElementById("history-search");
    if (searchInput) {
      searchInput.oninput = () => renderHistory();
    }
  }

  function renderLowStock() {
    const banner = document.getElementById("low-banner");
    const list = document.getElementById("low-list");
    const items = lowStockCache;

    const outCount = items.filter(i => Number(i.currentStock) === 0).length;
    if (banner) {
      banner.hidden = false;
      banner.innerHTML = `⚠️ <strong>${items.length} items</strong> are at or below minimum stock levels. <strong>${outCount}</strong> are completely out of stock.`;
    }

    if (!items.length) {
      list.innerHTML = `<p class="inv-empty">All stock levels are optimal.</p>`;
      return;
    }

    list.innerHTML = items.map((item, index) => `
      <div class="low-card">
        <div class="low-card-main">
          <span class="inv-thumb" style="background:${tintFor(index)}">${escapeHtml(initialsOf(item.name))}</span>
          <div class="low-card-info">
            <h4 class="low-card-name">${escapeHtml(item.name)}</h4>
            <p class="low-card-sub">${escapeHtml(item.supplier || 'Supplier')} • ${escapeHtml(item.category)}</p>
          </div>
        </div>
        <div class="low-card-side">
          <div class="low-card-qty">
            <span class="low-qty-num ${item.currentStock === 0 ? 'is-out' : ''}">${item.currentStock}</span>
            <span class="low-qty-min">of ${item.reorderLevel} min.</span>
          </div>
          <div class="low-card-actions">
            <button class="low-btn-adj" onclick="window.switchToAdj('${item.id}')">+ Adjust Stock</button>
            <button class="low-btn-reorder">↻ Reorder</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  window.switchToAdj = (prodId) => {
    activeTab = "adjustment";
    render();
    const select = document.getElementById("adj-product");
    if (select) {
      select.value = prodId;
      select.dispatchEvent(new Event('change'));
    }
  };

  function renderReorder() {
    const list = document.getElementById("reorder-list");
    const items = lowStockCache;

    if (!items.length) {
      list.innerHTML = `<p class="inv-empty">No reorder suggestions right now.</p>`;
      return;
    }

    list.innerHTML = items.map((item) => {
      const suggestedQty = Math.max(item.reorderLevel * 2 - item.currentStock, item.reorderLevel);
      const estCost = suggestedQty * (item.costPrice || item.unitPrice * 0.7);
      return `
        <div class="reorder-card">
          <div class="reorder-card-info">
            <h4 class="reorder-title">${escapeHtml(item.name)}</h4>
            <p class="reorder-sub">Supplier: ${escapeHtml(item.supplier || 'N/A')}</p>
            <div class="reorder-metrics">
              <div>
                <span class="reorder-m-label">CURRENT STOCK</span>
                <span class="reorder-m-val ${item.currentStock === 0 ? 'is-red' : ''}">${item.currentStock} units</span>
              </div>
              <div>
                <span class="reorder-m-label">SUGGESTED ORDER</span>
                <span class="reorder-m-val is-purple">${suggestedQty} units</span>
              </div>
              <div>
                <span class="reorder-m-label">EST. COST</span>
                <span class="reorder-m-val">${formatNaira(estCost)}</span>
              </div>
            </div>
          </div>
          <button class="reorder-btn">↻ One-Tap Restock</button>
        </div>
      `;
    }).join("");
  }

  function render() {
    const summary = summarize(productsCache);
    renderTabs(summary);
    renderKpis(summary);
    renderLegend(summary);

    document.querySelectorAll(".inv-view").forEach(el => el.hidden = true);
    const activeView = document.getElementById(`view-${activeTab}`);
    if (activeView) activeView.hidden = false;

    if (activeTab === "overview") renderOverview();
    else if (activeTab === "adjustment") setupAdjustmentForm();
    else if (activeTab === "history") { renderHistory(); loadHistoryLogs(); }
    else if (activeTab === "low") renderLowStock();
    else if (activeTab === "reorder") renderReorder();
  }

  function boot() {
    if (!requireAuth()) return;
    render();
    loadData();
  }

  document.addEventListener("shell:ready", boot);
  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();