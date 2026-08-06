/* eVentory — Inventory page script */

(function () {
  "use strict";

  const STOCK = [
    {
      name: "Basmati Rice 5kg",
      sku: "RICE-BAS-5KG",
      category: "Grains & Cereals",
      qty: 142,
      unit: "bags",
      min: 40,
      capacity: 180,
      unitValue: 18500,
      emoji: "🍚",
      tint: "#eef8e8",
    },
    {
      name: "Golden Penny Semovita 1kg",
      sku: "SEM-GP-1KG",
      category: "Grains & Cereals",
      qty: 96,
      unit: "packs",
      min: 30,
      capacity: 120,
      unitValue: 2200,
      emoji: "🥣",
      tint: "#fff6e8",
    },
    {
      name: "Peak Milk Powder 400g",
      sku: "MILK-PEAK-400",
      category: "Dairy",
      qty: 78,
      unit: "tins",
      min: 25,
      capacity: 100,
      unitValue: 4500,
      emoji: "🥛",
      tint: "#eef4ff",
    },
    {
      name: "Dangote Sugar 1kg",
      sku: "SUG-DAN-1KG",
      category: "Baking",
      qty: 64,
      unit: "packs",
      min: 20,
      capacity: 90,
      unitValue: 1800,
      emoji: "🍬",
      tint: "#f5f0ff",
    },
    {
      name: "Nestlé Pure Life 75cl",
      sku: "WAT-NPL-75",
      category: "Beverages",
      qty: 210,
      unit: "bottles",
      min: 50,
      capacity: 250,
      unitValue: 250,
      emoji: "💧",
      tint: "#e8f7ff",
    },
    {
      name: "Indomie Super Pack",
      sku: "IND-SUP-40",
      category: "Noodles",
      qty: 18,
      unit: "cartons",
      min: 25,
      capacity: 80,
      unitValue: 9800,
      emoji: "🍜",
      tint: "#fff0e8",
    },
    {
      name: "Power Oil 3L",
      sku: "OIL-POW-3L",
      category: "Oils & Fats",
      qty: 12,
      unit: "bottles",
      min: 20,
      capacity: 60,
      unitValue: 7200,
      emoji: "🫙",
      tint: "#fff7e0",
    },
    {
      name: "Milo Refill 500g",
      sku: "MIL-REF-500",
      category: "Beverages",
      qty: 9,
      unit: "packs",
      min: 15,
      capacity: 50,
      unitValue: 3900,
      emoji: "🍫",
      tint: "#fdece8",
    },
    {
      name: "Bournvita Refill 500g",
      sku: "BV-REF-500",
      category: "Beverages",
      qty: 7,
      unit: "packs",
      min: 15,
      capacity: 50,
      unitValue: 4100,
      emoji: "☕",
      tint: "#f3ebe4",
    },
    {
      name: "Sunflower Cooking Oil 5L",
      sku: "OIL-SUN-5L",
      category: "Oils & Fats",
      qty: 0,
      unit: "bottles",
      min: 15,
      capacity: 50,
      unitValue: 9800,
      emoji: "🌻",
      tint: "#fff4d6",
    },
  ];

  const TABS = [
    { id: "overview", label: "Stock Overview" },
    { id: "adjustment", label: "Stock Adjustment" },
    { id: "history", label: "Stock History" },
    { id: "low", label: "Low Stock", showCount: "low" },
    { id: "reorder", label: "Reorder Suggestions" },
  ];

  const TITLES = {
    overview: "All Stock Levels",
    adjustment: "Stock Adjustment",
    history: "Stock History",
    low: "Low Stock Items",
    reorder: "Reorder Suggestions",
  };

  let activeTab = "overview";

  function requireAuth() {
    try {
      if (!localStorage.getItem("token")) {
        window.location.href = "loginPage.html";
        return false;
      }
    } catch (err) {
      /* ignore */
    }
    return true;
  }

  function statusOf(item) {
    if (item.qty <= 0) {
      return { key: "out", label: "out of-stock", tone: "red" };
    }
    if (item.qty <= item.min) {
      return { key: "low", label: "low stock", tone: "amber" };
    }
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
    if (item.qty <= 0) return 0;
    return Math.max(4, Math.min(100, Math.round((item.qty / item.capacity) * 100)));
  }

  function filteredItems() {
    if (activeTab === "low") {
      return STOCK.filter((item) => statusOf(item).key === "low");
    }
    if (activeTab === "reorder") {
      return STOCK.filter((item) => {
        const key = statusOf(item).key;
        return key === "low" || key === "out";
      });
    }
    if (activeTab === "adjustment" || activeTab === "history") {
      return [];
    }
    return STOCK.slice();
  }

  function renderTabs(summary) {
    const root = document.getElementById("inv-tabs");
    if (!root) return;

    root.innerHTML = TABS.map((tab) => {
      const count =
        tab.showCount === "low" ? ` <span class="inv-tab-count">(${summary.low})</span>` : "";
      const active = tab.id === activeTab ? " is-active" : "";
      return `<button type="button" class="inv-tab${active}" data-tab="${tab.id}">${tab.label}${count}</button>`;
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

  function renderTable(items) {
    const body = document.getElementById("inv-body");
    const empty = document.getElementById("inv-empty");
    const title = document.getElementById("inv-panel-title");
    const wrap = document.querySelector(".inv-table-wrap");

    if (title) title.textContent = TITLES[activeTab] || "All Stock Levels";

    if (!items.length) {
      if (body) body.innerHTML = "";
      if (wrap) wrap.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          activeTab === "adjustment"
            ? "Stock adjustment tools coming soon."
            : activeTab === "history"
              ? "Stock history will appear here."
              : "No items match this view.";
      }
      return;
    }

    if (wrap) wrap.hidden = false;
    if (empty) empty.hidden = true;

    body.innerHTML = items
      .map((item) => {
        const status = statusOf(item);
        const pct = fillPercent(item);
        const value = item.qty * item.unitValue;
        return `
          <tr>
            <td>
              <div class="inv-product">
                <span class="inv-thumb" style="background:${item.tint}">${item.emoji}</span>
                <div class="inv-product-meta">
                  <p class="inv-product-name">${item.name}</p>
                  <p class="inv-product-sku">${item.sku}</p>
                </div>
              </div>
            </td>
            <td>${item.category}</td>
            <td>
              <div class="inv-stock">
                <div class="inv-stock-track">
                  <div class="inv-stock-fill is-${status.tone}" style="width:${pct}%"></div>
                </div>
                <p class="inv-stock-label">${item.qty} ${item.unit}</p>
              </div>
            </td>
            <td>${item.min}</td>
            <td class="inv-value">${formatNaira(value)}</td>
            <td><span class="inv-status is-${status.tone}">${status.label}</span></td>
          </tr>`;
      })
      .join("");
  }

  function render() {
    const summary = summarize(STOCK);
    renderTabs(summary);
    renderKpis(summary);
    renderLegend(summary);
    renderTable(filteredItems());
  }

  function boot() {
    if (!requireAuth()) return;
    render();
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();
