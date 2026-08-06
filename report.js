/* eVentory — Reports page logic.
 *
 * ============================================================================
 * READ ME FIRST — gaps between the documented API and this screen's design,
 * and exactly how this file works around each one. (These were discussed and
 * signed off on with the product owner before writing this file — see the
 * three rounds of Q&A. Flagging them here too so future-you / teammates
 * don't mistake a workaround for a real backend contract.)
 *
 * 1. No "yearly" period on GET /api/reports/sales (only daily|weekly|monthly).
 *    -> Yearly is built entirely client-side from GET /api/sales?startDate&endDate.
 *
 * 2. No endpoint returns "expenses" or "net profit". The only cost figure in
 *    the docs is Product.costPrice (Module 4).
 *    -> "Profit" = revenue − COGS, where COGS = Σ(item.quantity × product.costPrice).
 *    -> "Expenses" in the trend chart is set equal to that same COGS figure —
 *       there is no real operating-expense data source (rent, salaries, etc.)
 *       to plot instead. This was the explicitly approved workaround; if a
 *       real expenses endpoint/table shows up later, swap it in at
 *       computeBucketFinancials() below.
 *
 * 3. GET /api/sales (list) in the doc's example response does NOT show an
 *    `items` array per sale (only totalAmount / paymentMethod / createdAt /
 *    User) — only the POST /api/sales (create) response shows items. If the
 *    live API only returns the trimmed shape from the docs, unit-level figures
 *    (units sold, profit, sales-by-category) genuinely cannot be computed.
 *    -> This file reads `sale.items` defensively. If it's missing on every
 *       sale fetched, the affected metrics render as "—" with a short note
 *       instead of a fabricated number. Check the real API response shape
 *       (or ask backend to include items) if you see those dashes in prod.
 *
 * 4. GET /api/reports/best-sellers has no date-range params in the docs, so
 *    it's treated as an all-time ranking (not scoped to the selected period).
 *
 * 5. No export endpoint exists. "Export Reports" / "Export PDF" both generate
 *    a PDF client-side from whatever is currently on screen, via jsPDF +
 *    jspdf-autotable (loaded in report.html).
 * ============================================================================
 */

(function () {
  "use strict";

  const state = {
    period: "monthly",
    products: null, // Map<id, product>
    categories: null, // Map<id, category>
    bestSellers: null,
    current: null, // last computed period snapshot, used by PDF export
  };

  // ---------------------------------------------------------------- helpers

  function naira(n) {
    const value = Number(n);
    if (!isFinite(value)) return "—";
    return "₦" + Math.round(value).toLocaleString("en-US");
  }

  function numberFmt(n) {
    const value = Number(n);
    if (!isFinite(value)) return "—";
    return Math.round(value).toLocaleString("en-US");
  }

  function pctFmt(n) {
    if (n === null || n === undefined || !isFinite(n)) return null;
    const sign = n >= 0 ? "↑" : "↓";
    return `${sign} ${Math.abs(n).toFixed(1)}%`;
  }

  function fmtISODate(d) {
    return d.toISOString().slice(0, 10);
  }

  function el(id) {
    return document.getElementById(id);
  }

  // ------------------------------------------------------------- API calls

  async function fetchAllPages(path, dataKey) {
    let page = 1;
    let all = [];
    // Safety cap so a runaway pagination bug can't hang the page forever.
    for (let guard = 0; guard < 200; guard += 1) {
      const sep = path.includes("?") ? "&" : "?";
      const res = await EvApi.json(`${path}${sep}page=${page}&limit=100`);
      const list = (res.data && res.data[dataKey]) || [];
      all = all.concat(list);
      const pagination = res.data && res.data.pagination;
      if (!pagination || page >= pagination.totalPages || list.length === 0)
        break;
      page += 1;
    }
    return all;
  }

  async function getProducts() {
    if (state.products) return state.products;
    const list = await fetchAllPages("/products", "products");
    const map = new Map(list.map((p) => [p.id, p]));
    state.products = map;
    return map;
  }

  async function getCategories() {
    if (state.categories) return state.categories;
    const res = await EvApi.json("/categories");
    const list = (res.data && res.data.categories) || [];
    const map = new Map(list.map((c) => [c.id, c]));
    state.categories = map;
    return map;
  }

  async function getBestSellers() {
    if (state.bestSellers) return state.bestSellers;
    const res = await EvApi.json("/reports/best-sellers");
    const list = (res.data && res.data.bestSellers) || [];
    state.bestSellers = list;
    return list;
  }

  async function getSalesInRange(start, end) {
    const path = `/sales?startDate=${fmtISODate(start)}&endDate=${fmtISODate(end)}`;
    return fetchAllPages(path, "sales");
  }

  async function getPeriodReport(period) {
    // period must be "daily" | "weekly" | "monthly" — yearly is handled by the caller.
    const res = await EvApi.json(`/reports/sales?period=${period}`);
    return res.data;
  }

  // ---------------------------------------------------------- date ranges

  function getMetricRange(period) {
    const now = new Date();
    if (period === "weekly") {
      const end = now;
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start, end, label: "This week" };
    }
    if (period === "yearly") {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now, label: String(now.getFullYear()) };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start,
      end: now,
      label: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }

  function getPreviousRange(period, current) {
    if (period === "weekly") {
      const end = new Date(current.start);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    if (period === "yearly") {
      const y = current.start.getFullYear() - 1;
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
    }
    const y = current.start.getFullYear();
    const m = current.start.getMonth() - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start, end };
  }

  function getTrendBuckets(period) {
    const now = new Date();
    if (period === "weekly") {
      const buckets = [];
      for (let i = 7; i >= 0; i -= 1) {
        const end = new Date(now);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        buckets.push({ label: `Wk ${8 - i}`, start, end });
      }
      return buckets;
    }
    if (period === "yearly") {
      const buckets = [];
      for (let i = 4; i >= 0; i -= 1) {
        const y = now.getFullYear() - i;
        buckets.push({
          label: String(y),
          start: new Date(y, 0, 1),
          end: i === 0 ? now : new Date(y, 11, 31),
        });
      }
      return buckets;
    }
    const buckets = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end =
        i === 0 ? now : new Date(d.getFullYear(), d.getMonth() + 1, 0);
      buckets.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        start,
        end,
      });
    }
    return buckets;
  }

  // ----------------------------------------------------- financial helpers

  // Returns { revenue, cogs, unitsSold, orderCount, itemsAvailable }
  // itemsAvailable === false means no sale in this slice had an `items` array,
  // so unitsSold/cogs could not really be computed (see gap #3 at the top).
  function computeFinancials(sales) {
    let revenue = 0;
    let cogs = 0;
    let unitsSold = 0;
    let itemsSeen = false;
    const products = state.products || new Map();

    sales.forEach((sale) => {
      revenue += Number(sale.totalAmount) || 0;
      if (Array.isArray(sale.items) && sale.items.length > 0) {
        itemsSeen = true;
        sale.items.forEach((item) => {
          const qty = Number(item.quantity) || 0;
          unitsSold += qty;
          const product = products.get(item.productId);
          const cost = product ? Number(product.costPrice) || 0 : 0;
          cogs += qty * cost;
        });
      }
    });

    return {
      revenue,
      cogs,
      profit: revenue - cogs,
      unitsSold,
      orderCount: sales.length,
      itemsAvailable: itemsSeen,
    };
  }

  function categoryBreakdown(sales) {
    const products = state.products || new Map();
    const categories = state.categories || new Map();
    const totals = new Map(); // categoryId -> revenue
    let itemsSeen = false;

    sales.forEach((sale) => {
      if (!Array.isArray(sale.items)) return;
      sale.items.forEach((item) => {
        itemsSeen = true;
        const product = products.get(item.productId);
        const categoryId = product ? product.categoryId : "unknown";
        const lineRevenue =
          (Number(item.quantity) || 0) *
          (Number(item.unitPrice) || (product ? product.unitPrice : 0) || 0);
        totals.set(categoryId, (totals.get(categoryId) || 0) + lineRevenue);
      });
    });

    if (!itemsSeen) return { itemsAvailable: false, rows: [] };

    let rows = Array.from(totals.entries()).map(([categoryId, revenue]) => ({
      name:
        (categories.get(categoryId) && categories.get(categoryId).name) ||
        "Uncategorized",
      revenue,
    }));
    rows.sort((a, b) => b.revenue - a.revenue);

    if (rows.length > 5) {
      const top = rows.slice(0, 4);
      const other = rows.slice(4).reduce((sum, r) => sum + r.revenue, 0);
      rows = top.concat([{ name: "Other", revenue: other }]);
    }

    const total = rows.reduce((sum, r) => sum + r.revenue, 0);
    rows.forEach((r) => {
      r.share = total > 0 ? (r.revenue / total) * 100 : 0;
    });

    return { itemsAvailable: true, rows };
  }

  // -------------------------------------------------------------- render

  const CATEGORY_PALETTE = [
    "#4c1d95",
    "#6415ea",
    "#8b5cf6",
    "#ab8ef4",
    "#d8c7fb",
  ];

  function setMetricTrend(id, deltaPct) {
    const node = el(id);
    const formatted = pctFmt(deltaPct);
    if (!formatted) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    node.textContent = `${formatted} vs previous ${state.period === "weekly" ? "week" : state.period === "yearly" ? "year" : "month"}`;
    node.className = "metric-trend " + (deltaPct >= 0 ? "is-up" : "is-down");
  }

  function renderMetrics(curr, prev) {
    el("metric-gross-revenue").textContent = naira(curr.revenue);
    el("metric-gross-revenue-sub").textContent = curr.rangeLabel;
    setMetricTrend(
      "metric-gross-revenue-trend",
      prev.revenue > 0
        ? ((curr.revenue - prev.revenue) / prev.revenue) * 100
        : null,
    );

    el("metric-net-profit").textContent = curr.itemsAvailable
      ? naira(curr.profit)
      : "—";
    el("metric-net-profit-sub").innerHTML = curr.itemsAvailable
      ? 'After expenses<sup class="footnote-mark" title="Net profit = Revenue − cost of goods sold (product costPrice × qty). No dedicated expenses/profit endpoint exists yet.">†</sup>'
      : "No line-item sales data for this range";
    setMetricTrend(
      "metric-net-profit-trend",
      curr.itemsAvailable && prev.itemsAvailable && prev.profit !== 0
        ? ((curr.profit - prev.profit) / Math.abs(prev.profit)) * 100
        : null,
    );

    el("metric-units-sold").textContent = curr.itemsAvailable
      ? numberFmt(curr.unitsSold)
      : "—";
    el("metric-units-sold-sub").textContent = curr.itemsAvailable
      ? "All products"
      : "Sales API didn't return line items for this range";
    setMetricTrend(
      "metric-units-sold-trend",
      curr.itemsAvailable && prev.itemsAvailable && prev.unitsSold > 0
        ? ((curr.unitsSold - prev.unitsSold) / prev.unitsSold) * 100
        : null,
    );

    const aov = curr.orderCount > 0 ? curr.revenue / curr.orderCount : 0;
    const prevAov = prev.orderCount > 0 ? prev.revenue / prev.orderCount : 0;
    el("metric-aov").textContent = curr.orderCount > 0 ? naira(aov) : "—";
    setMetricTrend(
      "metric-aov-trend",
      prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : null,
    );
  }

  function renderTrendChart(buckets) {
    el("trend-chart-title").textContent =
      state.period === "weekly"
        ? "Revenue, Expenses & Profit — last 8 weeks"
        : state.period === "yearly"
          ? "Revenue, Expenses & Profit — last 5 years"
          : "Revenue, Expenses & Profit";

    const maxValue = Math.max(
      1,
      ...buckets.map((b) =>
        Math.max(b.financials.revenue, b.financials.cogs, b.financials.profit),
      ),
    );
    const step = niceStep(maxValue);
    const roundedMax = Math.ceil(maxValue / step) * step;

    // charts.js draws one series per bar today (EvCharts.bar takes a single
    // `data` array of {label, value}). To show three bars per month we lay
    // out three synced mini bar charts is overkill — instead we render our
    // own grouped-bar SVG here, reusing the same CSS vars for consistency.
    const host = el("trend-chart");
    host.innerHTML = renderGroupedBarSVG(
      buckets,
      roundedMax,
      step,
      host.clientWidth || 900,
    );

    const missingItems = buckets.some((b) => !b.financials.itemsAvailable);
    el("trend-chart-note").textContent = missingItems
      ? "Expenses/Profit use cost-of-goods (product costPrice × qty sold); some buckets had no item-level sales data to compute this from."
      : "Expenses shown here is cost-of-goods sold (no separate operating-expenses source exists in the API yet).";
  }

  function niceStep(max) {
    const rough = max / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1))));
    const n = rough / pow;
    let mult = 1;
    if (n > 5) mult = 10;
    else if (n > 2) mult = 5;
    else if (n > 1) mult = 2;
    return mult * pow;
  }

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  }

  function renderGroupedBarSVG(buckets, max, step, hostWidth) {
    const width = Math.max(320, hostWidth);
    const height = 260;
    const padL = 52;
    const padR = 10;
    const padT = 12;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const band = plotW / buckets.length;
    const groupW = Math.min(90, band * 0.72);
    const barW = groupW / 3 - 3;
    const baseY = padT + plotH;
    const scale = (v) => baseY - (v / max) * plotH;
    const grid = cssVar("--row-line", "#f1f1f5");
    const axis = cssVar("--line", "#ededf2");
    const label = cssVar("--faint", "#9c9ca8");
    const revenueColor = cssVar("--green", "#12a150");
    const expensesColor = "#f6dfb4";
    const profitColor = "#e2661f";

    let out = `<svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Revenue, expenses and profit by period">`;

    for (let v = 0; v <= max + 0.0001; v += step) {
      const y = scale(v);
      if (v > 0) {
        out += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${grid}" stroke-width="1" stroke-dasharray="2 4"/>`;
      }
      out += `<text x="${padL - 10}" y="${y + 4}" fill="${label}" font-family='"Space Grotesk","Poppins",sans-serif' font-size="12" text-anchor="end">${Math.round(v)}</text>`;
    }
    out += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baseY}" stroke="${axis}" stroke-width="1"/>`;
    out += `<line x1="${padL}" y1="${baseY}" x2="${width - padR}" y2="${baseY}" stroke="${axis}" stroke-width="1"/>`;

    buckets.forEach((b, i) => {
      const groupCenter = padL + band * i + band / 2;
      const groupStart = groupCenter - groupW / 2;
      const values = [
        { v: b.financials.revenue, color: revenueColor },
        { v: b.financials.cogs, color: expensesColor },
        { v: b.financials.profit, color: profitColor },
      ];
      values.forEach((entry, j) => {
        const x = groupStart + j * (barW + 3);
        const y = scale(Math.max(0, entry.v));
        const h = baseY - y;
        out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" fill="${entry.color}"/>`;
      });
      out += `<text x="${groupCenter}" y="${height - 8}" fill="${label}" font-family='"Space Grotesk","Poppins",sans-serif' font-size="12" text-anchor="middle">${b.label}</text>`;
    });

    out += "</svg>";
    return out;
  }

  function renderTopProducts(bestSellers) {
    const list = el("top-products-list");
    if (!bestSellers.length) {
      list.innerHTML =
        '<li class="top-product-row is-empty">No sales data yet.</li>';
      return;
    }
    const sorted = [...bestSellers]
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 5);
    const max = Math.max(...sorted.map((p) => p.totalRevenue || 0), 1);
    list.innerHTML = sorted
      .map(
        (p, i) => `
        <li class="top-product-row">
          <div class="product-row-top">
            <span class="product-rank">${i + 1}</span>
            <span class="product-name">${escapeHTML(p.name)}</span>
            <span class="product-amount">${naira(p.totalRevenue)}</span>
          </div>
          <div class="product-bar-track"><div class="product-bar-fill" style="width:${((p.totalRevenue || 0) / max) * 100}%"></div></div>
          <span class="product-share">${Math.round(((p.totalRevenue || 0) / max) * 100)}%</span>
        </li>`,
      )
      .join("");
  }

  function renderCategoryPie(breakdown) {
    const legend = el("category-legend");
    const pieHost = el("category-pie");

    if (!breakdown.itemsAvailable || breakdown.rows.length === 0) {
      pieHost.innerHTML = "";
      legend.innerHTML =
        '<li class="category-legend-row is-empty">No item-level sales data available for this range yet.</li>';
      return;
    }

    const data = breakdown.rows.map((r, i) => ({
      label: r.name,
      value: r.revenue,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));

    EvCharts.pie(pieHost, { data, size: 260 });

    legend.innerHTML = breakdown.rows
      .map(
        (r, i) => `
        <li class="category-legend-row">
          <span class="category-dot" style="background:${CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}"></span>
          <span class="category-legend-label">${escapeHTML(r.name)}</span>
          <span class="category-legend-value">${r.share.toFixed(0)}%</span>
        </li>`,
      )
      .join("");
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  // ---------------------------------------------------------------- load

  async function loadPeriod(period) {
    state.period = period;

    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.period === period);
    });

    el("trend-chart").innerHTML = '<p class="chart-note">Loading…</p>';

    try {
      await Promise.all([getProducts(), getCategories(), getBestSellers()]);

      const metricRange = getMetricRange(period);
      const prevRange = getPreviousRange(period, metricRange);
      const buckets = getTrendBuckets(period);
      const fetchFrom =
        buckets[0].start < prevRange.start ? buckets[0].start : prevRange.start;

      // fetchFrom is chosen so this single fetch covers the trend buckets,
      // the current metric period, AND the previous-period comparison window
      // — no need for a second network round-trip.
      const rangeSales = await getSalesInRange(fetchFrom, metricRange.end);

      const inRange = (sale, range) => {
        const d = new Date(sale.createdAt);
        return d >= range.start && d <= range.end;
      };

      const currSales = rangeSales.filter((s) => inRange(s, metricRange));
      const prevSalesFinal = rangeSales.filter((s) => inRange(s, prevRange));

      const curr = computeFinancials(currSales);
      curr.rangeLabel = metricRange.label;
      const prev = computeFinancials(prevSalesFinal);

      // GET /api/reports/sales is the backend's own authoritative summary for
      // daily/weekly/monthly — prefer its revenue/order-count over our own
      // date-window math when it's available, since the backend's definition
      // of "this week/month" may not exactly match the trailing window we
      // compute client-side. (No such endpoint exists for "yearly" — see
      // NOTE at the top of this file — so that stays fully client-computed.)
      if (period === "weekly" || period === "monthly") {
        try {
          const report = await getPeriodReport(period);
          if (typeof report.totalRevenue === "number")
            curr.revenue = report.totalRevenue;
          if (typeof report.totalSales === "number")
            curr.orderCount = report.totalSales;
        } catch (err) {
          console.warn(
            "Falling back to client-computed totals — /api/reports/sales failed:",
            err,
          );
        }
      }

      buckets.forEach((b) => {
        b.financials = computeFinancials(
          rangeSales.filter((s) => inRange(s, b)),
        );
      });

      state.current = { curr, prev, buckets, metricRange };

      renderMetrics(curr, prev);
      renderTrendChart(buckets);
      renderTopProducts(state.bestSellers);
      renderCategoryPie(categoryBreakdown(currSales));
    } catch (err) {
      console.error("Failed to load report data:", err);
      el("trend-chart").innerHTML =
        "<p class=\"chart-note\">Couldn't load report data. Check the network tab / that you're logged in, then refresh.</p>";
    }
  }

  // -------------------------------------------------------------- export

  function buildExportDoc() {
    if (!window.jspdf || !state.current) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { curr, buckets, metricRange } = state.current;

    doc.setFontSize(16);
    doc.text("eVentory — Sales Report", 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(
      `Period: ${state.period[0].toUpperCase()}${state.period.slice(1)} (${metricRange.label})`,
      14,
      25,
    );
    doc.setTextColor(0);

    doc.autoTable({
      startY: 32,
      head: [["Metric", "Value"]],
      body: [
        ["Gross Revenue", naira(curr.revenue)],
        [
          "Net Profit (COGS-based)",
          curr.itemsAvailable ? naira(curr.profit) : "N/A",
        ],
        ["Units Sold", curr.itemsAvailable ? numberFmt(curr.unitsSold) : "N/A"],
        [
          "Avg. Order Value",
          curr.orderCount > 0 ? naira(curr.revenue / curr.orderCount) : "N/A",
        ],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 21, 234] },
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Period", "Revenue", "Expenses (COGS)", "Profit"]],
      body: buckets.map((b) => [
        b.label,
        naira(b.financials.revenue),
        naira(b.financials.cogs),
        naira(b.financials.profit),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 21, 234] },
    });

    if (state.bestSellers && state.bestSellers.length) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Top Products (all-time)", "Qty Sold", "Revenue"]],
        body: [...state.bestSellers]
          .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
          .slice(0, 5)
          .map((p) => [
            p.name,
            numberFmt(p.totalQuantitySold),
            naira(p.totalRevenue),
          ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [100, 21, 234] },
      });
    }

    return doc;
  }

  function exportPdf() {
    const doc = buildExportDoc();
    if (!doc) {
      alert("Report data is still loading — try again in a moment.");
      return;
    }
    doc.save(`eventory-report-${state.period}-${fmtISODate(new Date())}.pdf`);
  }

  // ---------------------------------------------------------------- init

  function wireEvents() {
    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.addEventListener("click", () => loadPeriod(btn.dataset.period));
    });
    const pdfBtn = el("export-pdf-btn");
    const reportsBtn = el("export-reports-btn");
    if (pdfBtn) pdfBtn.addEventListener("click", exportPdf);
    if (reportsBtn) reportsBtn.addEventListener("click", exportPdf);
  }

  function start() {
    wireEvents();
    loadPeriod(state.period);
  }

  // dashboard-layout.js dispatches "shell:ready" on document once the shared
  // sidebar/topbar/page-head have been built around #page's children — wait
  // for it so we never query DOM nodes before they exist under #app-content.
  document.addEventListener("shell:ready", start);
})();