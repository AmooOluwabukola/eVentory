/* eVentory — Dashboard Overview page script.
 * Loads /dashboard/summary for the top stats, keeps charts/activity as local UI.
 */

(function () {
  "use strict";

  const ACTIVITY = [
    {
      title: "New order received",
      text: "Order #ORD-2847 placed by Design by Jummy",
      time: "5 minutes ago",
      icon: "cart",
      tone: "purple",
    },
    {
      title: "Product stock alert",
      text: "Wireless earbuds dropped below reorder level",
      time: "32 minutes ago",
      icon: "box",
      tone: "rose",
    },
    {
      title: "Revenue milestone",
      text: "You crossed ₦70,000 in monthly revenue",
      time: "2 hours ago",
      icon: "trendingUp",
      tone: "green",
    },
  ];

  const ORDERS = [
    {
      id: "#ORD-2843",
      customer: "Design by Jummy",
      date: "Feb 22, 2026",
      total: "₦180.00",
      status: "Cancelled",
      tone: "red",
    },
    {
      id: "#ORD-2842",
      customer: "Efua UI Designs",
      date: "Feb 22, 2026",
      total: "₦180.00",
      status: "Cancelled",
      tone: "red",
    },
    {
      id: "#ORD-2841",
      customer: "Adaeze Stores",
      date: "Feb 21, 2026",
      total: "₦420.50",
      status: "Cancelled",
      tone: "red",
    },
    {
      id: "#ORD-2840",
      customer: "Kola Gadgets",
      date: "Feb 21, 2026",
      total: "₦95.00",
      status: "Cancelled",
      tone: "red",
    },
    {
      id: "#ORD-2839",
      customer: "Bloom Retail",
      date: "Feb 20, 2026",
      total: "₦310.00",
      status: "Cancelled",
      tone: "red",
    },
  ];

  function requireAuth() {
    const token = window.EvApi ? EvApi.getToken() : localStorage.getItem("token");
    if (!token) {
      window.location.href = "loginPage.html";
      return false;
    }
    return true;
  }

  function icon(name, size) {
    return window.EvLayout ? window.EvLayout.icon(name, size) : "";
  }

  function formatNaira(value) {
    const amount = Number(value) || 0;
    return `₦ ${amount.toLocaleString("en-NG", {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-NG");
  }

  function statsFromSummary(summary) {
    const data = summary || {};
    return [
      {
        label: "Today's Revenue",
        value: formatNaira(data.todaysRevenue),
        period: "today",
        icon: "naira",
        tone: "green",
      },
      {
        label: "Inventory Value",
        value: formatNaira(data.inventoryValue),
        period: "current stock",
        icon: "dollar",
        tone: "amber",
      },
      {
        label: "Low Stock Items",
        value: formatNumber(data.lowStockCount),
        period: "needs attention",
        icon: "box",
        tone: "rose",
      },
      {
        label: "Total Products",
        value: formatNumber(data.totalProducts),
        period: "in catalog",
        icon: "trendingUp",
        tone: "teal",
      },
      {
        label: "Today's Sales",
        value: formatNumber(data.todaySalesCount),
        period: "orders today",
        icon: "cart",
        tone: "purple",
      },
    ];
  }

  function renderStats(root, stats, options) {
    const opts = options || {};

    if (opts.loading) {
      root.innerHTML = Array.from({ length: 5 })
        .map(
          () => `
        <article class="stat-card is-loading">
          <div class="stat-main">
            <p class="stat-label">Loading…</p>
            <p class="stat-value">—</p>
            <div class="stat-foot">
              <span class="stat-period">Fetching summary</span>
            </div>
          </div>
          <span class="tile tile-neutral"></span>
        </article>`
        )
        .join("");
      return;
    }

    if (opts.error) {
      root.innerHTML = `
        <article class="stat-card stat-error">
          <div class="stat-main">
            <p class="stat-label">Dashboard summary</p>
            <p class="stat-value" style="font-size:16px">${opts.error}</p>
            <div class="stat-foot">
              <button type="button" class="btn btn-ghost" id="retry-summary">Retry</button>
            </div>
          </div>
        </article>`;

      const retry = document.getElementById("retry-summary");
      if (retry) retry.addEventListener("click", () => loadSummary(root));
      return;
    }

    root.innerHTML = stats
      .map(
        (stat) => `
      <article class="stat-card">
        <div class="stat-main">
          <p class="stat-label">${stat.label}</p>
          <p class="stat-value">${stat.value}</p>
          <div class="stat-foot">
            <span class="stat-period">${stat.period}</span>
          </div>
        </div>
        <span class="tile tile-${stat.tone}">${icon(stat.icon, 18)}</span>
      </article>`
      )
      .join("");
  }

  async function loadSummary(root) {
    if (!root || !window.EvApi) return;

    renderStats(root, null, { loading: true });

    try {
      const response = await EvApi.json("/dashboard/summary");
      const summary = response.data || response;
      renderStats(root, statsFromSummary(summary));
    } catch (err) {
      renderStats(root, null, {
        error: err.message || "Unable to load dashboard summary.",
      });
    }
  }

  function renderActivity(list) {
    list.innerHTML = ACTIVITY.map(
      (item) => `
      <li class="activity-item">
        <span class="tile tile-${item.tone}">${icon(item.icon, 18)}</span>
        <div class="activity-body">
          <p class="activity-name">${item.title}</p>
          <p class="activity-text">${item.text}</p>
          <p class="activity-time">${item.time}</p>
        </div>
      </li>`
    ).join("");
  }

  function renderOrders(body) {
    body.innerHTML = ORDERS.map(
      (order) => `
      <tr>
        <td class="cell-id">${order.id}</td>
        <td>${order.customer}</td>
        <td>${order.date}</td>
        <td class="cell-total">${order.total}</td>
        <td><span class="badge badge-${order.tone}">${order.status}</span></td>
      </tr>`
    ).join("");
  }

  function decorateTableHeaders() {
    document.querySelectorAll("[data-th-icon]").forEach((el) => {
      const name = el.getAttribute("data-th-icon");
      el.insertAdjacentHTML("afterbegin", icon(name, 14));
    });
  }

  function decorateTools() {
    const filterBtn = document.getElementById("filter-btn");
    const sortBtn = document.getElementById("sort-btn");
    const ordersIcon = document.getElementById("orders-icon");
    const activityIcon = document.getElementById("activity-icon");

    if (filterBtn) {
      filterBtn.insertAdjacentHTML("afterbegin", icon("filter", 16));
    }
    if (sortBtn) {
      sortBtn.insertAdjacentHTML("afterbegin", icon("sort", 16));
    }
    if (ordersIcon) {
      ordersIcon.innerHTML = icon("trophy", 22);
    }
    if (activityIcon) {
      activityIcon.innerHTML = icon("cursor", 18);
    }
  }

  function renderCharts() {
    const category = document.getElementById("category-chart");
    const trend = document.getElementById("trend-chart");
    if (!window.EvCharts) return;

    if (category) {
      EvCharts.bar(category, {
        max: 14000,
        step: 3500,
        height: 250,
        data: [
          { label: "Electronics", value: 12500 },
          { label: "Clothing", value: 9800 },
          { label: "Home", value: 8200 },
          { label: "Sports", value: 7000 },
          { label: "Books", value: 5500 },
        ],
      });
    }

    if (trend) {
      EvCharts.line(trend, {
        max: 8000,
        step: 2000,
        height: 250,
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        series: [
          {
            name: "Revenue ($)",
            color: "brand",
            values: [4200, 3800, 5200, 4600, 5800, 6200],
          },
          {
            name: "Orders",
            color: "green",
            values: [220, 180, 260, 210, 300, 280],
          },
        ],
      });
    }
  }

  function boot() {
    if (!requireAuth()) return;

    const stats = document.getElementById("stats-panel");
    const activity = document.getElementById("activity-list");
    const orders = document.getElementById("orders-body");

    if (stats) loadSummary(stats);
    if (activity) renderActivity(activity);
    if (orders) renderOrders(orders);

    decorateTools();
    decorateTableHeaders();
    renderCharts();
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();
