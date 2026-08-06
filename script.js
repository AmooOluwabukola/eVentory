// eVentory landing page — dynamic content rendering

const FEATURES = [
  {
    title: "Product Management",
    desc: "Add, edit, and organize your entire product catalog effortlessly.",
  },
  {
    title: "Inventory Control",
    desc: "Real-time stock tracking with automated low-stock alerts",
  },
  {
    title: "Sales Tracking",
    desc: "Monitor every transaction and update order statuses instantly.",
  },
  {
    title: "Smart Reports",
    desc: "Visual analytics to help you make confident business decisions.",
  },
  {
    title: "Low-Stock Alerts",
    desc: "Never run out. Get notified before inventory runs dry.",
  },
  {
    title: "Multi-User Roles",
    desc: "Owner, Manager, and Cashier roles with tailored access levels.",
  },
];

const PLANS = [
  {
    tier: "STARTER",
    amount: "Free",
    suffix: "Forever",
    features: ["Up to 50 products", "1 user account", "Basic reports", "7-day history"],
    style: "light",
  },
  {
    tier: "BUSINESS",
    amount: "₦9,900",
    suffix: "/month",
    badge: "★ Most popular",
    features: [
      "Unlimited products",
      "Up to 5 users",
      "Advanced reports & charts",
      "Full stock history",
      "Low-stock alerts",
      "Priority support",
    ],
    style: "dark",
  },
  {
    tier: "ENTERPRISE",
    amount: "Custom",
    suffix: "pricing",
    features: [
      "Everything in Business",
      "Unlimited users",
      "Custom integration",
      "Dedicated manager",
      "SLA guarantee",
    ],
    style: "light",
  },
];

function renderFeatures() {
  const grid = document.getElementById("features-grid");
  grid.innerHTML = FEATURES.map(
    (f) => `
    <div class="feature-card">
      <div class="feature-icon">📦</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>
  `
  ).join("");
}

function renderPricing() {
  const grid = document.getElementById("pricing-grid");
  grid.innerHTML = PLANS.map(
    (p) => `
    <div class="pricing-card ${p.style === "dark" ? "dark" : ""}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      <div class="plan-tier">${p.tier}</div>
      <div class="plan-price">
        <span class="amount">${p.amount}</span>
        <span class="suffix">${p.suffix}</span>
      </div>
      <ul class="plan-features">
        ${p.features
          .map(
            (f) => `<li><span class="check-icon">✔</span><span>${f}</span></li>`
          )
          .join("")}
      </ul>
      <button class="plan-cta">Get Started</button>
    </div>
  `
  ).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderFeatures();
  renderPricing();

  // Hook up "Get Started" / "Start for Free" buttons -> route to signup page
  document.querySelectorAll(".btn-primary, .plan-cta").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = "signup.html";
    });
  });
});