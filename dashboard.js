
// (function () {
//   "use strict";

//   const ACTIVITY = [
//     {
//       title: "New order received",
//       text: "Order #ORD-2847 placed by Design by Jummy",
//       time: "5 minutes ago",
//       icon: "cart",
//       tone: "purple",
//     },
//     {
//       title: "Product stock alert",
//       text: "Wireless earbuds dropped below reorder level",
//       time: "32 minutes ago",
//       icon: "box",
//       tone: "rose",
//     },
//     {
//       title: "Revenue milestone",
//       text: "You crossed ₦70,000 in monthly revenue",
//       time: "2 hours ago",
//       icon: "trendingUp",
//       tone: "green",
//     },
//   ];

//   const ORDERS = [
//     {
//       id: "#ORD-2843",
//       customer: "Design by Jummy",
//       date: "Feb 22, 2026",
//       total: "₦180.00",
//       status: "Cancelled",
//       tone: "red",
//     },
//     {
//       id: "#ORD-2842",
//       customer: "Efua UI Designs",
//       date: "Feb 22, 2026",
//       total: "₦180.00",
//       status: "Cancelled",
//       tone: "red",
//     },
//     {
//       id: "#ORD-2841",
//       customer: "Adaeze Stores",
//       date: "Feb 21, 2026",
//       total: "₦420.50",
//       status: "Cancelled",
//       tone: "red",
//     },
//     {
//       id: "#ORD-2840",
//       customer: "Kola Gadgets",
//       date: "Feb 21, 2026",
//       total: "₦95.00",
//       status: "Cancelled",
//       tone: "red",
//     },
//     {
//       id: "#ORD-2839",
//       customer: "Bloom Retail",
//       date: "Feb 20, 2026",
//       total: "₦310.00",
//       status: "Cancelled",
//       tone: "red",
//     },
//   ];

//   function requireAuth() {
//     const token = window.EvApi
//       ? EvApi.getToken()
//       : localStorage.getItem("token");
//     if (!token) {
//       window.location.href = "loginPage.html";
//       return false;
//     }
//     return true;
//   }

//   function icon(name, size) {
//     return window.EvLayout ? window.EvLayout.icon(name, size) : "";
//   }

//   function formatNaira(value) {
//     const amount = Number(value) || 0;
//     return `₦ ${amount.toLocaleString("en-NG", {
//       minimumFractionDigits: amount % 1 === 0 ? 0 : 1,
//       maximumFractionDigits: 2,
//     })}`;
//   }

//   function formatNumber(value) {
//     return Number(value || 0).toLocaleString("en-NG");
//   }

//   function statsFromSummary(summary) {
//     const data = summary || {};
//     return [
//       {
//         label: "Today's Revenue",
//         value: formatNaira(data.todaysRevenue),
//         period: "today",
//         icon: "naira",
//         tone: "green",
//       },
//       {
//         label: "Inventory Value",
//         value: formatNaira(data.inventoryValue),
//         period: "current stock",
//         icon: "dollar",
//         tone: "amber",
//       },
//       {
//         label: "Low Stock Items",
//         value: formatNumber(data.lowStockCount),
//         period: "needs attention",
//         icon: "box",
//         tone: "rose",
//       },
//       {
//         label: "Total Products",
//         value: formatNumber(data.totalProducts),
//         period: "in catalog",
//         icon: "trendingUp",
//         tone: "teal",
//       },
//       {
//         label: "Today's Sales",
//         value: formatNumber(data.todaySalesCount),
//         period: "orders today",
//         icon: "cart",
//         tone: "purple",
//       },
//     ];
//   }

//   function renderStats(root, stats, options) {
//     const opts = options || {};

//     if (opts.loading) {
//       root.innerHTML = Array.from({ length: 5 })
//         .map(
//           () => `
//         <article class="stat-card is-loading">
//           <div class="stat-main">
//             <p class="stat-label">Loading…</p>
//             <p class="stat-value">—</p>
//             <div class="stat-foot">
//               <span class="stat-period">Fetching summary</span>
//             </div>
//           </div>
//           <span class="tile tile-neutral"></span>
//         </article>`,
//         )
//         .join("");
//       return;
//     }

//     if (opts.error) {
//       root.innerHTML = `
//         <article class="stat-card stat-error">
//           <div class="stat-main">
//             <p class="stat-label">Dashboard summary</p>
//             <p class="stat-value" style="font-size:16px">${opts.error}</p>
//             <div class="stat-foot">
//               <button type="button" class="btn btn-ghost" id="retry-summary">Retry</button>
//             </div>
//           </div>
//         </article>`;

//       const retry = document.getElementById("retry-summary");
//       if (retry) retry.addEventListener("click", () => loadSummary(root));
//       return;
//     }

//     root.innerHTML = stats
//       .map(
//         (stat) => `
//       <article class="stat-card">
//         <div class="stat-main">
//           <p class="stat-label">${stat.label}</p>
//           <p class="stat-value">${stat.value}</p>
//           <div class="stat-foot">
//             <span class="stat-period">${stat.period}</span>
//           </div>
//         </div>
//         <span class="tile tile-${stat.tone}">${icon(stat.icon, 18)}</span>
//       </article>`,
//       )
//       .join("");
//   }

//   async function loadSummary(root) {
//     if (!root || !window.EvApi) return;

//     renderStats(root, null, { loading: true });

//     try {
//       const response = await EvApi.json("/dashboard/summary");
//       const summary = response.data || response;
//       renderStats(root, statsFromSummary(summary));
//     } catch (err) {
//       renderStats(root, null, {
//         error: err.message || "Unable to load dashboard summary.",
//       });
//     }
//   }
//   const dashboard = {
//     summary: null,
//     monthlySales: [],
//     categorySales: [],
//     orders: [],
//     activity: [],
//   };
//   async function loadRevenue() {
//     try {
//       const response = await EvApi.json("/reports/monthly-sales", {
//         method: "GET",
//       });

//       dashboard.monthlySales = response.data || response;
//       renderCharts();
//     } catch (err) {
//       console.error(err);

//       dashboard.monthlySales = null;

//       renderCharts();
//     }
//   }
//   async function loadOrders(body) {
//     const response = await EvApi.json("/sales");

//     const orders = response.data || response || [];

//     renderOrders(body, orders);
//   }
//   async function loadActivity(list) {
//     try {
//       const response = await EvApi.json("/inventory/logs", {
//         method: "GET",
//       });

//       dashboard.activity = response.data || response || [];

//       renderActivity(list, dashboard.activity);
//     } catch (err) {
//       console.error(err);

//       dashboard.activity = [];

//       renderActivity(list, []);
//     }
//   }

//   async function loadSalesByCategory() {
//     try {
//       const response = await EvApi.json("/reports/sales-by-category", {
//         method: "GET",
//       });

//       dashboard.categorySales = response.data || response;
//       renderCharts();
//     } catch (err) {
//       console.error(err);
//       dashboard.categorySales = null;
//       renderCharts();
//     }
//   }

//   function renderActivity(list, activity) {
//     if (!list) return;

//     if (!activity.length) {
//       list.innerHTML = `
//             <li class="empty-state">
//                 No recent activity.
//             </li>
//         `;
//       return;
//     }

//     list.innerHTML = activity
//       .map(
//         (item) => `
//         ...
//     `,
//       )
//       .join("");
//   }

//   function renderOrders(body, orders) {
//     if (!orders.length) {
//       body.innerHTML = `
//             <tr>
//                 <td colspan="5">No orders yet.</td>
//             </tr>
//         `;
//       return;
//     }

//     body.innerHTML = orders
//       .map(
//         (order) => `
//         ...
//     `,
//       )
//       .join("");
//   }

//   function decorateTableHeaders() {
//     document.querySelectorAll("[data-th-icon]").forEach((el) => {
//       const name = el.getAttribute("data-th-icon");
//       el.insertAdjacentHTML("afterbegin", icon(name, 14));
//     });
//   }

//   function decorateTools() {
//     const filterBtn = document.getElementById("filter-btn");
//     const sortBtn = document.getElementById("sort-btn");
//     const ordersIcon = document.getElementById("orders-icon");
//     const activityIcon = document.getElementById("activity-icon");

//     if (filterBtn) {
//       filterBtn.insertAdjacentHTML("afterbegin", icon("filter", 16));
//     }
//     if (sortBtn) {
//       sortBtn.insertAdjacentHTML("afterbegin", icon("sort", 16));
//     }
//     if (ordersIcon) {
//       ordersIcon.innerHTML = icon("trophy", 22);
//     }
//     if (activityIcon) {
//       activityIcon.innerHTML = icon("cursor", 18);
//     }
//   }

//   function renderCharts() {
//     const category = document.getElementById("category-chart");
//     const trend = document.getElementById("trend-chart");
//     if (!window.EvCharts) return;

//     if (category) {
//       EvCharts.bar(category, {
//         max: 14000,
//         step: 3500,
//         height: 250,
//         data: [
//           { label: "Electronics", value: 12500 },
//           { label: "Clothing", value: 9800 },
//           { label: "Home", value: 8200 },
//           { label: "Sports", value: 7000 },
//           { label: "Books", value: 5500 },
//         ],
//       });
//     }

//     if (trend) {
//       EvCharts.line(trend, {
//         max: 8000,
//         step: 2000,
//         height: 250,
//         labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
//         series: [
//           {
//             name: "Revenue ($)",
//             color: "brand",
//             values: [4200, 3800, 5200, 4600, 5800, 6200],
//           },
//           {
//             name: "Orders",
//             color: "green",
//             values: [220, 180, 260, 210, 300, 280],
//           },
//         ],
//       });
//     }
//   }

//   function boot() {
//     if (!requireAuth()) return;

//     const stats = document.getElementById("stats-panel");
//     const activity = document.getElementById("activity-list");
//     const orders = document.getElementById("orders-body");
//     const revenue = document.getElementById("trend-chart");
//     const category = document.getElementById("category-chart");

//     if (stats) loadSummary(stats);
//     if (activity) loadActivity(activity);
//     if (orders) loadOrders(orders);
//     if (revenue) loadRevenue(revenue);
//     if (category) loadSalesByCategory(category);

//     decorateTools();
//     decorateTableHeaders();
//     renderCharts();
//   }

//   document.addEventListener("shell:ready", boot);

//   if (document.body.classList.contains("shell-ready")) {
//     boot();
//   }
// })();

/* eVentory — Dashboard Overview page script.
 * Loads /dashboard/summary for the top stats, and live data for the
 * category/trend charts, recent activity, and recent orders. No mock
 * fallback: a failed or empty response shows an explicit loading/empty/
 * error state instead of fabricated numbers.
 */


(function () {
  "use strict";

  function requireAuth() {
    const token = window.EvApi
      ? EvApi.getToken()
      : localStorage.getItem("token");
    if (!token) {
      window.location.href = "loginPage.html";
      return false;
    }
    return true;
  }

  function icon(name, size) {
    return window.EvLayout ? window.EvLayout.icon(name, size) : "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
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

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function extractList(response, key) {
    if (!response) return null;
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.[key])) return response.data[key];
    if (Array.isArray(response[key])) return response[key];
    return null;
  }

  function emptyState(message) {
    return (
      '<p style="padding:40px 4px;text-align:center;color:var(--muted);font-size:13.5px;">' +
      escapeHtml(message) +
      "</p>"
    );
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
        </article>`,
        )
        .join("");
      return;
    }

    if (opts.error) {
      root.innerHTML = `
        <article class="stat-card stat-error">
          <div class="stat-main">
            <p class="stat-label">Dashboard summary</p>
            <p class="stat-value" style="font-size:16px">${escapeHtml(opts.error)}</p>
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
          <p class="stat-label">${escapeHtml(stat.label)}</p>
          <p class="stat-value">${escapeHtml(stat.value)}</p>
          <div class="stat-foot">
            <span class="stat-period">${escapeHtml(stat.period)}</span>
          </div>
        </div>
        <span class="tile tile-${stat.tone}">${icon(stat.icon, 18)}</span>
      </article>`,
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

  const dashboard = {
    monthlySales: undefined,
    categorySales: undefined,
    orders: [],
    activity: [],
  };

  async function loadRevenue() {
    if (!window.EvApi) {
      dashboard.monthlySales = null;
      renderCharts();
      return;
    }
    try {
      const response = await EvApi.json("/reports/monthly-sales", { method: "GET" });
      const list = extractList(response, "monthlySales") || extractList(response, "reports");
      dashboard.monthlySales = Array.isArray(list) ? list : [];
      renderCharts();
    } catch (err) {
      console.error(err);
      dashboard.monthlySales = null;
      renderCharts();
    }
  }

  async function loadSalesByCategory() {
    if (!window.EvApi) {
      dashboard.categorySales = null;
      renderCharts();
      return;
    }
    try {
      const response = await EvApi.json("/reports/sales-by-category", { method: "GET" });
      const list = extractList(response, "categorySales") || extractList(response, "salesByCategory") || extractList(response, "categories");
      dashboard.categorySales = Array.isArray(list) ? list : [];
      renderCharts();
    } catch (err) {
      console.error(err);
      dashboard.categorySales = null;
      renderCharts();
    }
  }

  async function loadOrders(body) {
    if (!body || !window.EvApi) return;
    try {
      const response = await EvApi.json("/sales");
      const list = extractList(response, "sales") || extractList(response, "orders");
      dashboard.orders = Array.isArray(list) ? list : [];
      renderOrders(body, dashboard.orders);
    } catch (err) {
      console.error(err);
      renderOrders(body, []);
    }
  }

  async function loadActivity(list) {
    if (!list || !window.EvApi) return;
    try {
      const response = await EvApi.json("/inventory/logs", { method: "GET" });
      const logs = extractList(response, "logs") || extractList(response, "activity");
      dashboard.activity = Array.isArray(logs) ? logs : [];
      renderActivity(list, dashboard.activity);
    } catch (err) {
      console.error(err);
      dashboard.activity = [];
      renderActivity(list, []);
    }
  }

  function renderActivity(list, activity) {
    if (!list) return;

    if (!activity.length) {
      list.innerHTML = '<li class="empty-state">No recent activity logged.</li>';
      return;
    }

    list.innerHTML = activity
      .map((item) => {
        const title = item.title || item.type || item.reason || "Inventory Log";
        const productName = item.Product?.name ? ` on ${item.Product.name}` : "";
        const userName = item.User?.name ? ` by ${item.User.name}` : "";
        const qty = item.quantity ? ` (Qty: ${item.quantity})` : "";
        const text = item.text || `${title}${productName}${qty}${userName}`;
        
        const dateStr = item.createdAt ? formatDate(item.createdAt) : item.time || "Recently";
        const tone = item.tone || (item.type === "IN" ? "green" : item.type === "OUT" ? "rose" : "purple");
        const iconName = item.icon || (item.type === "IN" ? "box" : "cart");

        return `
          <li class="activity-item">
            <span class="tile tile-${tone}">${icon(iconName, 16)}</span>
            <div class="activity-body">
              <p class="activity-text"><strong>${escapeHtml(title)}</strong> — ${escapeHtml(text)}</p>
              <p class="activity-time">${escapeHtml(dateStr)}</p>
            </div>
          </li>
        `;
      })
      .join("");
  }

  function renderOrders(body, orders) {
    if (!body) return;

    if (!orders.length) {
      body.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 24px;">No orders found.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = orders
      .map((order) => {
        const orderId = order.orderNumber || (order.id ? `#${String(order.id).slice(0, 8)}` : "#ORD-0000");
        const customer = order.customerName || order.Customer?.name || order.customer || "Walk-in Customer";
        const date = formatDate(order.createdAt || order.date);
        const total = formatNaira(order.totalAmount || order.totalPrice || order.total || 0);
        const status = order.status || "Completed";
        const tone = status.toLowerCase() === "cancelled" ? "red" : status.toLowerCase() === "pending" ? "amber" : "green";

        return `
          <tr>
            <td><strong>${escapeHtml(orderId)}</strong></td>
            <td>${escapeHtml(customer)}</td>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(total)}</td>
            <td><span class="badge badge-${tone}">${escapeHtml(status)}</span></td>
          </tr>
        `;
      })
      .join("");
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

    if (filterBtn) filterBtn.insertAdjacentHTML("afterbegin", icon("filter", 16));
    if (sortBtn) sortBtn.insertAdjacentHTML("afterbegin", icon("sort", 16));
    if (ordersIcon) ordersIcon.innerHTML = icon("trophy", 22);
    if (activityIcon) activityIcon.innerHTML = icon("cursor", 18);
  }

  function renderCategoryChart(root) {
    if (!root) return;
    const rows = dashboard.categorySales;

    if (rows === undefined) {
      root.innerHTML = emptyState("Loading category sales…");
      return;
    }
    if (rows === null) {
      root.innerHTML = emptyState("Couldn't load category sales.");
      return;
    }
    if (!rows.length) {
      root.innerHTML = emptyState("No category sales data yet.");
      return;
    }

    const data = rows.map((row) => ({
      label: row.category || row.categoryName || row.name || "Uncategorized",
      value: Number(row.totalRevenue || row.totalSales || row.revenue || row.amount || row.value) || 0,
    }));

    const maxValue = Math.max(...data.map((d) => d.value), 0);

    EvCharts.bar(root, {
      max: maxValue > 0 ? Math.ceil(maxValue * 1.1) : 100,
      step: maxValue > 0 ? Math.ceil(maxValue / 4) : 25,
      height: 250,
      data,
    });
  }

  function renderTrendChart(root) {
    if (!root) return;
    const rows = dashboard.monthlySales;

    if (rows === undefined) {
      root.innerHTML = emptyState("Loading monthly sales…");
      return;
    }
    if (rows === null) {
      root.innerHTML = emptyState("Couldn't load monthly sales.");
      return;
    }
    if (!rows.length) {
      root.innerHTML = emptyState("No monthly sales data yet.");
      return;
    }

    const labels = rows.map((row) => row.month || row.label || row.period || "N/A");
    const revenueValues = rows.map((row) => Number(row.revenue || row.totalRevenue || row.amount) || 0);
    const orderValues = rows.map((row) => Number(row.orders || row.orderCount || row.count) || 0);
    const maxRevenue = Math.max(...revenueValues, 0);

    EvCharts.line(root, {
      max: maxRevenue > 0 ? Math.ceil(maxRevenue * 1.1) : 100,
      step: maxRevenue > 0 ? Math.ceil(maxRevenue / 4) : 25,
      height: 250,
      labels,
      series: [
        { name: "Revenue (₦)", color: "brand", values: revenueValues },
        { name: "Orders", color: "green", values: orderValues },
      ],
    });
  }

  function renderCharts() {
    if (!window.EvCharts) return;
    renderCategoryChart(document.getElementById("category-chart"));
    renderTrendChart(document.getElementById("trend-chart"));
  }

  function boot() {
    if (!requireAuth()) return;

    const stats = document.getElementById("stats-panel");
    const activity = document.getElementById("activity-list");
    const orders = document.getElementById("orders-body");

    if (stats) loadSummary(stats);
    if (activity) loadActivity(activity);
    if (orders) loadOrders(orders);

    loadRevenue();
    loadSalesByCategory();

    decorateTools();
    decorateTableHeaders();
    renderCharts();
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();

// (function () {
//   "use strict";

//   function requireAuth() {
//     const token = window.EvApi
//       ? EvApi.getToken()
//       : localStorage.getItem("token");
//     if (!token) {
//       window.location.href = "loginPage.html";
//       return false;
//     }
//     return true;
//   }

//   function icon(name, size) {
//     return window.EvLayout ? window.EvLayout.icon(name, size) : "";
//   }

//   function escapeHtml(str) {
//     const div = document.createElement("div");
//     div.textContent = str == null ? "" : String(str);
//     return div.innerHTML;
//   }

//   function formatNaira(value) {
//     const amount = Number(value) || 0;
//     return `₦ ${amount.toLocaleString("en-NG", {
//       minimumFractionDigits: amount % 1 === 0 ? 0 : 1,
//       maximumFractionDigits: 2,
//     })}`;
//   }

//   function formatNumber(value) {
//     return Number(value || 0).toLocaleString("en-NG");
//   }

//   // The API wraps list responses as { status, message, data: { <key>: [...] } }
//   // (sometimes flattened to { data: [...] }). Stay defensive about the exact
//   // nesting so a well-formed response never gets misread as a failure.
//   function extractList(response, key) {
//     if (Array.isArray(response)) return response;
//     if (Array.isArray(response?.data)) return response.data;
//     if (Array.isArray(response?.data?.[key])) return response.data[key];
//     if (Array.isArray(response?.[key])) return response[key];
//     return null;
//   }

//   function emptyState(message) {
//     return (
//       '<p style="padding:40px 4px;text-align:center;color:var(--muted);font-size:13.5px;">' +
//       escapeHtml(message) +
//       "</p>"
//     );
//   }

//   function statsFromSummary(summary) {
//     const data = summary || {};
//     return [
//       {
//         label: "Today's Revenue",
//         value: formatNaira(data.todaysRevenue),
//         period: "today",
//         icon: "naira",
//         tone: "green",
//       },
//       {
//         label: "Inventory Value",
//         value: formatNaira(data.inventoryValue),
//         period: "current stock",
//         icon: "dollar",
//         tone: "amber",
//       },
//       {
//         label: "Low Stock Items",
//         value: formatNumber(data.lowStockCount),
//         period: "needs attention",
//         icon: "box",
//         tone: "rose",
//       },
//       {
//         label: "Total Products",
//         value: formatNumber(data.totalProducts),
//         period: "in catalog",
//         icon: "trendingUp",
//         tone: "teal",
//       },
//       {
//         label: "Today's Sales",
//         value: formatNumber(data.todaySalesCount),
//         period: "orders today",
//         icon: "cart",
//         tone: "purple",
//       },
//     ];
//   }

//   function renderStats(root, stats, options) {
//     const opts = options || {};

//     if (opts.loading) {
//       root.innerHTML = Array.from({ length: 5 })
//         .map(
//           () => `
//         <article class="stat-card is-loading">
//           <div class="stat-main">
//             <p class="stat-label">Loading…</p>
//             <p class="stat-value">—</p>
//             <div class="stat-foot">
//               <span class="stat-period">Fetching summary</span>
//             </div>
//           </div>
//           <span class="tile tile-neutral"></span>
//         </article>`,
//         )
//         .join("");
//       return;
//     }

//     if (opts.error) {
//       root.innerHTML = `
//         <article class="stat-card stat-error">
//           <div class="stat-main">
//             <p class="stat-label">Dashboard summary</p>
//             <p class="stat-value" style="font-size:16px">${opts.error}</p>
//             <div class="stat-foot">
//               <button type="button" class="btn btn-ghost" id="retry-summary">Retry</button>
//             </div>
//           </div>
//         </article>`;

//       const retry = document.getElementById("retry-summary");
//       if (retry) retry.addEventListener("click", () => loadSummary(root));
//       return;
//     }

//     root.innerHTML = stats
//       .map(
//         (stat) => `
//       <article class="stat-card">
//         <div class="stat-main">
//           <p class="stat-label">${stat.label}</p>
//           <p class="stat-value">${stat.value}</p>
//           <div class="stat-foot">
//             <span class="stat-period">${stat.period}</span>
//           </div>
//         </div>
//         <span class="tile tile-${stat.tone}">${icon(stat.icon, 18)}</span>
//       </article>`,
//       )
//       .join("");
//   }

//   async function loadSummary(root) {
//     if (!root || !window.EvApi) return;

//     renderStats(root, null, { loading: true });

//     try {
//       const response = await EvApi.json("/dashboard/summary");
//       const summary = response.data || response;
//       renderStats(root, statsFromSummary(summary));
//     } catch (err) {
//       renderStats(root, null, {
//         error: err.message || "Unable to load dashboard summary.",
//       });
//     }
//   }

//   const dashboard = {
//     monthlySales: undefined, // undefined = loading, null = error, [] = empty
//     categorySales: undefined,
//     orders: [],
//     activity: [],
//   };

//   async function loadRevenue() {
//     if (!window.EvApi) {
//       dashboard.monthlySales = null;
//       renderCharts();
//       return;
//     }
//     try {
//       const response = await EvApi.json("/reports/monthly-sales", { method: "GET" });
//       const list = extractList(response, "monthlySales");
//       if (!Array.isArray(list)) throw new Error("Unexpected /reports/monthly-sales response shape");
//       dashboard.monthlySales = list;
//       renderCharts();
//     } catch (err) {
//       console.error(err);
//       dashboard.monthlySales = null;
//       renderCharts();
//     }
//   }

//   async function loadSalesByCategory() {
//     if (!window.EvApi) {
//       dashboard.categorySales = null;
//       renderCharts();
//       return;
//     }
//     try {
//       const response = await EvApi.json("/reports/sales-by-category", { method: "GET" });
//       const list = extractList(response, "categorySales");
//       if (!Array.isArray(list)) throw new Error("Unexpected /reports/sales-by-category response shape");
//       dashboard.categorySales = list;
//       renderCharts();
//     } catch (err) {
//       console.error(err);
//       dashboard.categorySales = null;
//       renderCharts();
//     }
//   }

//   async function loadOrders(body) {
//     if (!body || !window.EvApi) return;
//     try {
//       const response = await EvApi.json("/sales");
//       const list = extractList(response, "sales");
//       if (!Array.isArray(list)) throw new Error("Unexpected /sales response shape");
//       dashboard.orders = list;
//       renderOrders(body, list);
//     } catch (err) {
//       console.error(err);
//       renderOrders(body, []);
//     }
//   }

//   async function loadActivity(list) {
//     if (!list || !window.EvApi) return;
//     try {
//       const response = await EvApi.json("/inventory/logs", { method: "GET" });
//       const logs = extractList(response, "logs");
//       if (!Array.isArray(logs)) throw new Error("Unexpected /inventory/logs response shape");
//       dashboard.activity = logs;
//       renderActivity(list, logs);
//     } catch (err) {
//       console.error(err);
//       dashboard.activity = [];
//       renderActivity(list, []);
//     }
//   }

//   function renderActivity(list, activity) {
//     if (!list) return;

//     if (!activity.length) {
//       list.innerHTML = '<li class="empty-state">No recent activity.</li>';
//       return;
//     }

//     // TODO: this only has raw /inventory/logs fields to work with
//     // (type, quantity, reason, createdAt, Product, User — see the shape
//     // confirmed earlier for /inventory/logs/{productId}). Fill in the
//     // markup once the activity-item design is finalized.
//     list.innerHTML = activity
//       .map(
//         (item) => `
//         <li class="activity-item">
//           <div class="activity-body">
//             <p class="activity-text">${escapeHtml(item.reason || "Stock update")}</p>
//             <p class="activity-time">${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString() : "")}</p>
//           </div>
//         </li>
//       `,
//       )
//       .join("");
//   }

//   function renderOrders(body, orders) {
//     if (!body) return;

//     if (!orders.length) {
//       body.innerHTML = `
//             <tr>
//                 <td colspan="5">No orders yet.</td>
//             </tr>
//         `;
//       return;
//     }

//     // TODO: same as renderActivity — needs the real /sales row shape
//     // filled in against the actual table columns (id/customer/date/total/status).
//     body.innerHTML = orders
//       .map(
//         (order) => `
//         <tr>
//           <td colspan="5">${escapeHtml(order.id || "")}</td>
//         </tr>
//       `,
//       )
//       .join("");
//   }

//   function decorateTableHeaders() {
//     document.querySelectorAll("[data-th-icon]").forEach((el) => {
//       const name = el.getAttribute("data-th-icon");
//       el.insertAdjacentHTML("afterbegin", icon(name, 14));
//     });
//   }

//   function decorateTools() {
//     const filterBtn = document.getElementById("filter-btn");
//     const sortBtn = document.getElementById("sort-btn");
//     const ordersIcon = document.getElementById("orders-icon");
//     const activityIcon = document.getElementById("activity-icon");

//     if (filterBtn) {
//       filterBtn.insertAdjacentHTML("afterbegin", icon("filter", 16));
//     }
//     if (sortBtn) {
//       sortBtn.insertAdjacentHTML("afterbegin", icon("sort", 16));
//     }
//     if (ordersIcon) {
//       ordersIcon.innerHTML = icon("trophy", 22);
//     }
//     if (activityIcon) {
//       activityIcon.innerHTML = icon("cursor", 18);
//     }
//   }

//   // ---------- Charts: driven entirely by dashboard.categorySales / dashboard.monthlySales ----------
//   // Field names below (row.category/total, row.month/revenue/orders) are
//   // best-guess fallbacks across a few likely key spellings — verify against
//   // the real /reports/monthly-sales and /reports/sales-by-category payloads
//   // and tighten these once confirmed.
//   function renderCategoryChart(root) {
//     if (!root) return;
//     const rows = dashboard.categorySales;

//     if (rows === undefined) {
//       root.innerHTML = emptyState("Loading category sales…");
//       return;
//     }
//     if (rows === null) {
//       root.innerHTML = emptyState("Couldn't load category sales.");
//       return;
//     }
//     if (!rows.length) {
//       root.innerHTML = emptyState("No category sales data yet.");
//       return;
//     }

//     const data = rows.map((row) => ({
//       label: row.category ?? row.categoryName ?? row.name ?? "—",
//       value: Number(row.totalRevenue ?? row.totalSales ?? row.revenue ?? row.amount ?? row.value) || 0,
//     }));
//     const maxValue = Math.max(...data.map((d) => d.value), 0);

//     EvCharts.bar(root, {
//       max: maxValue > 0 ? Math.ceil(maxValue * 1.1) : 100,
//       step: maxValue > 0 ? Math.ceil(maxValue / 4) : 25,
//       height: 250,
//       data,
//     });
//   }

//   function renderTrendChart(root) {
//     if (!root) return;
//     const rows = dashboard.monthlySales;

//     if (rows === undefined) {
//       root.innerHTML = emptyState("Loading monthly sales…");
//       return;
//     }
//     if (rows === null) {
//       root.innerHTML = emptyState("Couldn't load monthly sales.");
//       return;
//     }
//     if (!rows.length) {
//       root.innerHTML = emptyState("No monthly sales data yet.");
//       return;
//     }

//     const labels = rows.map((row) => row.month ?? row.label ?? row.period ?? "");
//     const revenueValues = rows.map((row) => Number(row.revenue ?? row.totalRevenue ?? row.amount) || 0);
//     const orderValues = rows.map((row) => Number(row.orders ?? row.orderCount ?? row.count) || 0);
//     const maxRevenue = Math.max(...revenueValues, 0);

//     EvCharts.line(root, {
//       max: maxRevenue > 0 ? Math.ceil(maxRevenue * 1.1) : 100,
//       step: maxRevenue > 0 ? Math.ceil(maxRevenue / 4) : 25,
//       height: 250,
//       labels,
//       series: [
//         { name: "Revenue (₦)", color: "brand", values: revenueValues },
//         { name: "Orders", color: "green", values: orderValues },
//       ],
//     });
//   }

//   function renderCharts() {
//     if (!window.EvCharts) return;
//     renderCategoryChart(document.getElementById("category-chart"));
//     renderTrendChart(document.getElementById("trend-chart"));
//   }

//   function boot() {
//     if (!requireAuth()) return;

//     const stats = document.getElementById("stats-panel");
//     const activity = document.getElementById("activity-list");
//     const orders = document.getElementById("orders-body");

//     if (stats) loadSummary(stats);
//     if (activity) loadActivity(activity);
//     if (orders) loadOrders(orders);

//     loadRevenue();
//     loadSalesByCategory();

//     decorateTools();
//     decorateTableHeaders();
//     renderCharts();
//   }

//   document.addEventListener("shell:ready", boot);

//   if (document.body.classList.contains("shell-ready")) {
//     boot();
//   }
// })();