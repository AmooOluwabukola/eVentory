// eventory — role selection page

const ROLES = [
  {
    id: "owner",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l4 2 6-6 6 6 4-2-2 11H4L2 9z"/></svg>`,
    title: "Store Owner",
    desc: "I own the store and manage overall operations, settings and performance.",
    btnLabel: "Select Role",
    btnClass: "owner-btn",
    iconClass: "owner",
    selected: true,
  },
  {
    id: "manager",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    title: "Manager",
    desc: "I manage store operations, oversee staff and handle daily activities",
    btnLabel: "Select Role",
    btnClass: "manager-btn",
    iconClass: "manager",
  },
  {
    id: "attendant",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>`,
    title: "Attendants",
    desc: "I assist customers, process sales and support daily store tasks.",
    btnLabel: "Select Role",
    btnClass: "attendant-btn",
    iconClass: "attendant",
  },
];

function renderRoleCards() {
  const container = document.getElementById("role-cards");
  container.innerHTML = ROLES.map(
    (r) => `
    <div class="role-card ${r.selected ? "selected" : ""}" data-role="${r.id}">
      <div class="role-icon ${r.iconClass}">${r.icon}</div>
      <h3>${r.title}</h3>
      <p>${r.desc}</p>
      <button class="role-select-btn ${r.btnClass}" data-role="${r.id}">${r.btnLabel}</button>
    </div>
  `
  ).join("");
}

function setupRoleSelection() {
  document.getElementById("role-cards").addEventListener("click", (e) => {
    const btn = e.target.closest(".role-select-btn");
    if (!btn) return;

    const roleId = btn.getAttribute("data-role");

    // Highlight selected card visually
    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.getAttribute("data-role") === roleId);
    });

    // Store the chosen role and move on
    localStorage.setItem("selectedRole", roleId);

    // Route through the shared loading screen, same pattern used everywhere else.
    // dashboard.html doesn't exist yet — update this once it's built.
    window.location.href = "loading.html?next=dashboard.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderRoleCards();
  setupRoleSelection();
});