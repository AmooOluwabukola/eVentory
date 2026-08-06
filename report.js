"use strict";

/* ===========================================
   REPORT PAGE
=========================================== */

const API_BASE = "https://backend-group-3.onrender.com/api";

const ReportState = {
  period: "monthly",

  revenueChart: null,

  categoryChart: null,

  refreshTimer: null,

  salesData: [],

  currentPage: 1,

  totalPages: 1,

  cache: new Map(),
};

/* ===========================================
   AUTH
=========================================== */

function getToken() {
  return localStorage.getItem("token");
}

function headers() {
  return {
    "Content-Type": "application/json",

    Authorization: `Bearer ${getToken()}`,
  };
}

/* ===========================================
   REQUEST
=========================================== */

// async function request(endpoint) {
//   const response = await fetch(API_BASE + endpoint, {
//     headers: headers(),
//   });

//   if (!response.ok) {
//     throw new Error("Unable to fetch " + endpoint);
//   }

//   return response.json();
// }

async function request(endpoint) {

  const response = await fetch(API_BASE + endpoint, {

      method: "GET",

      headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
      }

  });

  const body = await response.json();

  if (!response.ok) {

      throw new Error(body.message || "Request failed");

  }

  return body.data ?? body;

}

const KPI_CONFIG = [
  {
      element: grossRevenueCard,
      title: "Gross Revenue",
      key: "grossRevenue",
      formatter: money
  },
  {
      element: netProfitCard,
      title: "Net Profit",
      key: "netProfit",
      formatter: money
  },
  {
      element: unitsSoldCard,
      title: "Units Sold",
      key: "unitsSold",
      formatter: number
  },
  {
      element: averageOrderCard,
      title: "Average Order",
      key: "averageOrderValue",
      formatter: money
  }
];

/* ===========================================
   FORMATTERS
=========================================== */

function money(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",

    currency: "NGN",

    maximumFractionDigits: 0,
  }).format(value || 0);
}

function number(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function percent(value) {
  return `${value}%`;
}

/* ===========================================
   DOM
=========================================== */

const grossRevenueCard = document.getElementById("grossRevenueCard");

const netProfitCard = document.getElementById("netProfitCard");

const unitsSoldCard = document.getElementById("unitsSoldCard");

const averageOrderCard = document.getElementById("averageOrderCard");

const topProducts = document.getElementById("topProducts");

const revenueEmpty = document.getElementById("revenueEmpty");

const categoryEmpty = document.getElementById("categoryEmpty");

const productsEmpty = document.getElementById("productsEmpty");

const lastUpdated = document.getElementById("lastUpdated");

// Skeleton Loader

function cardSkeleton() {
  return `
    
    <div class="skeleton" style="height:20px;width:120px"></div>
    
    <div class="skeleton" style="height:38px;width:80%;margin-top:18px"></div>
    
    <div class="skeleton" style="height:16px;width:50%;margin-top:22px"></div>
    
    `;
}

function showLoading() {
  grossRevenueCard.innerHTML = cardSkeleton();

  netProfitCard.innerHTML = cardSkeleton();

  unitsSoldCard.innerHTML = cardSkeleton();

  averageOrderCard.innerHTML = cardSkeleton();
}

// Empty Cards

function emptyCard(title) {
  return `
    
    <h4>${title}</h4>
    
    <h2>—</h2>
    
    <p>No data available</p>
    
    `;
}

// Render KPI

// function renderCard(element, title, value, footer) {
//   element.innerHTML = `
    
//     <h4>${title}</h4>
    
//     <h2>${value}</h2>
    
//     <p>${footer}</p>
    
//     `;

//   element.classList.add("fade-in");
// }

function renderSummary(summary) {

  KPI_CONFIG.forEach(card => {

      renderCard(
          card.element,
          card.title,
          card.formatter(summary[card.key]),
          ""
      );

  });

}

// Dashboard Summary

async function loadSummary() {
  try {
    const data = await request("/dashboard/summary");
    const summary = response.data ?? response;
    renderCard(
      grossRevenueCard,

      "Gross Revenue",

      money(summary.grossRevenue),

      "Total business revenue",
    );

    renderCard(
      netProfitCard,

      "Net Profit",

      money(data.netProfit),

      "Revenue after expenses",
    );

    renderCard(
      unitsSoldCard,

      "Units Sold",

      number(data.unitsSold),

      "Products sold",
    );

    renderCard(
      averageOrderCard,

      "Average Order",

      money(data.averageOrderValue),

      "Average value per order",
    );

    lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString();
  } catch (error) {
    showError(

      error.message
      
      );

    grossRevenueCard.innerHTML = emptyCard("Gross Revenue");

    netProfitCard.innerHTML = emptyCard("Net Profit");

    unitsSoldCard.innerHTML = emptyCard("Units Sold");

    averageOrderCard.innerHTML = emptyCard("Average Order");
  }
}

// Period Buttons

document

  .querySelectorAll(".filter-btn")

  .forEach((button) => {
    button.onclick = () => {
      document

        .querySelector(".filter-btn.active")

        .classList.remove("active");

      button.classList.add("active");

      ReportState.period = button.dataset.period;

      loadReports();
    };
  });

//   Page Initialization

document.addEventListener("DOMContentLoaded", () => {
  showLoading();

  loadReports();

  startAutoRefresh();
});

/* ===========================================
   MONTHLY REVENUE
=========================================== */

async function loadRevenueChart() {
  try {
    const data = await request(
      `/reports/monthly-sales?period=${ReportState.period}`,
    );

    renderRevenueChart(data);
  } catch (error) {
    showError(

      error.message
      
      );

    revenueEmpty.classList.remove("hidden");

    if (ReportState.revenueChart) {
      ReportState.revenueChart.destroy();

      ReportState.revenueChart = null;
    }
  }
}

// Revenue Chart

function renderRevenueChart(rows) {
  const ctx = document

    .getElementById("revenueChart")

    .getContext("2d");

  if (ReportState.revenueChart) {
    ReportState.revenueChart.destroy();
  }

  if (!rows.length) {
    revenueEmpty.classList.remove("hidden");

    return;
  }

  revenueEmpty.classList.add("hidden");

  ReportState.revenueChart = new Chart(ctx, {
    type: "line",

    data: {
      labels: rows.map((item) => item.month),

      datasets: [
        {
          label: "Revenue",

          data: rows.map((item) => item.sales),

          fill: true,

          tension: 0.35,

          borderWidth: 3,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false,
        },
      },

      interaction: {
        intersect: false,

        mode: "index",
      },

      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/* ===========================================
   BEST SELLERS
=========================================== */

async function loadBestSellers() {
  try {
    const products = await request("/reports/best-sellers");

    renderProducts(normalize(products));
  } catch (error) {
    showError(

      error.message
      
      );

    productsEmpty.classList.remove("hidden");
  }
}

// Render Products

function renderProducts(

    normalize(products)
    
    ) {
  topProducts.innerHTML = "";

  if (!products.length) {
    productsEmpty.classList.remove("hidden");

    return;
  }

  productsEmpty.classList.add("hidden");

  const highest = products[0].quantitySold;

  products.forEach((product) => {
    const percentage = (product.quantitySold / highest) * 100;

    topProducts.insertAdjacentHTML(
      "beforeend",

      `
    
    <div class="product fade-in">
    
    <div class="product-header">
    
    <span class="product-name">
    
    ${product.name}
    
    </span>
    
    <span class="product-value">
    
    ${number(product.quantitySold)}
    
    </span>
    
    </div>
    
    <div class="progress">
    
    <span style="width:${percentage}%"></span>
    
    </div>
    
    </div>
    
    `,
    );
  });
}

/* ===========================================
   CATEGORY CHART
=========================================== */

async function loadCategoryChart() {
  try {
    const data = await request("/reports/sales-by-category");

    renderCategoryChart(data);
  } catch (error) {
    showError(

      error.message
      
      );

    categoryEmpty.classList.remove("hidden");
  }
}

// Pie Chart

function renderCategoryChart(rows) {
  const ctx = document

    .getElementById("categoryChart")

    .getContext("2d");

  if (ReportState.categoryChart) {
    ReportState.categoryChart.destroy();
  }

  if (!rows.length) {
    categoryEmpty.classList.remove("hidden");

    return;
  }

  categoryEmpty.classList.add("hidden");

  ReportState.categoryChart = new Chart(ctx, {
    type: "doughnut",

    data: {
      labels: rows.map((r) => r.category),

      datasets: [
        {
          data: rows.map((r) => r.totalSales),

          borderWidth: 0,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

/* ===========================================
   SALES REPORT
=========================================== */

// async function loadSalesReport(page = 1) {
//   try {
//     return await request(
//       `/reports/sales?period=${ReportState.period}&page=${page}`,
//     );
//   } catch (error) {
//     showError(error.message);

//     return [];
//   }
// }

async function loadSalesReport(page=1){

  try{
  
  const report=
  
  await request(
  
  `/reports/sales?period=${ReportState.period}&page=${page}`
  
  );
  
  ReportState.salesData=
  
  normalize(report);
  
  ReportState.currentPage=
  
  report.page||1;
  
  ReportState.totalPages=
  
  report.totalPages||1;
  
  renderPagination();
  
  }
  
  catch(error){
  
    showError(

      error.message
      
      );
  
  }
  
  }

  // Pagination

  function renderPagination(){

    const container=
    
    document.getElementById(
    
    "pagination"
    
    );
    
    if(!container)return;
    
    container.innerHTML=`
    
    <button
    
    id="previousPage"
    
    ${ReportState.currentPage===1?"disabled":""}
    
    >
    
    Previous
    
    </button>
    
    <span>
    
    ${ReportState.currentPage}
    
    /
    
    ${ReportState.totalPages}
    
    </span>
    
    <button
    
    id="nextPage"
    
    ${ReportState.currentPage===ReportState.totalPages?"disabled":""}
    
    >
    
    Next
    
    </button>
    
    `;
    
    document
    
    .getElementById(
    
    "previousPage"
    
    )?.addEventListener(
    
    "click",
    
    ()=>{
    
    loadSalesReport(
    
    ReportState.currentPage-1
    
    );
    
    }
    
    );
    
    document
    
    .getElementById(
    
    "nextPage"
    
    )?.addEventListener(
    
    "click",
    
    ()=>{
    
    loadSalesReport(
    
    ReportState.currentPage+1
    
    );
    
    }
    
    );
    
    }

// Load Reports


async function loadReports() {
  showLoading();

  await Promise.all([

    loadSummary(),
    
    loadRevenueChart(),
    
    loadCategoryChart(),
    
    loadBestSellers(),
    
    loadSalesReport()
    
    ]);
}

/* ===========================================
   AUTO REFRESH
=========================================== */

function startAutoRefresh() {
  clearInterval(ReportState.refreshTimer);

  ReportState.refreshTimer = setInterval(() => {
    loadReports();
  }, 60000);
}

// Helper

function normalize(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.data)) return data.data;

  if (Array.isArray(data.results)) return data.results;

  if (Array.isArray(data.items)) return data.items;

  return [];
}

// CSV Export

document

.getElementById(

"exportReport"

)

.addEventListener(

"click",

exportCSV

);

function exportCSV(){

  if(
  
  !ReportState.salesData.length
  
  ){
  
  return;
  
  }
  
  const headers=
  
  Object.keys(
  
  ReportState.salesData[0]
  
  );
  
  const rows=[
  
  headers.join(",")
  
  ];
  
  ReportState.salesData.forEach(row=>{
  
  rows.push(
  
  headers.map(
  
  key=>row[key]
  
  ).join(",")
  
  );
  
  });
  
  const blob=new Blob(
  
  [rows.join("\n")],
  
  {
  
  type:"text/csv"
  
  }
  
  );
  
  const url=
  
  URL.createObjectURL(blob);
  
  const a=
  
  document.createElement("a");
  
  a.href=url;
  
  a.download=
  
  `report-${Date.now()}.csv`;
  
  a.click();
  
  URL.revokeObjectURL(url);
  
  }

  window.addEventListener(

    "focus",
    
    ()=>{
    
    ReportState.cache.clear();
    
    loadReports();
    
    }
    
    );

    window.addEventListener(

      "beforeunload",
      
      ()=>{
      
      clearInterval(
      
      ReportState.refreshTimer
      
      );
      
      if(
      
      ReportState.revenueChart
      
      ){
      
      ReportState.revenueChart.destroy();
      
      }
      
      if(
      
      ReportState.categoryChart
      
      ){
      
      ReportState.categoryChart.destroy();
      
      }
      
      }
      );

      function showError(message){

        const banner=
        
        document.createElement("div");
        
        banner.className=
        
        "error-banner";
        
        banner.innerHTML=`
        
        ${message}
        
        <button>
        
        Retry
        
        </button>
        
        `;
        
        banner
        
        .querySelector("button")
        
        .onclick=()=>{
        
        banner.remove();
        
        loadReports();
        
        };
        
        document.body.prepend(
        
        banner
        
        );
        
        }

        function compactMoney(value){

          return new Intl.NumberFormat(
          
          "en-NG",
          
          {
          
          notation:"compact",
          
          maximumFractionDigits:1
          
          }
          
          ).format(value);
          
          }