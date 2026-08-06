
(function () {
  "use strict";

  const STORE_KEYS = { theme: "ev-theme", collapsed: "ev-sidebar-collapsed" };

  const PATHS = {
    stroke:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  };

  const ICONS = {
    grid:
      '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2"/>',
    supplier:
      '<rect x="2.6" y="8.2" width="18.8" height="11.6" rx="3"/><path d="M2.6 12.6h18.8"/><path d="M6.2 16.6h3.6"/><path d="M13.6 4.6h5.2v5.2"/><path d="M18.8 4.6 13.9 9.5"/>',
    box:
      '<path d="M12 2.7 20.8 7.3v9.4L12 21.3 3.2 16.7V7.3z"/><path d="m3.4 7.4 8.6 4.6 8.6-4.6"/><path d="M12 12v9.3"/>',
    inventory:
      '<path d="M4.2 7.2h15.6v12.2H4.2z"/><path d="M8.2 7.2V5.4a1.8 1.8 0 0 1 1.8-1.8h4a1.8 1.8 0 0 1 1.8 1.8v1.8"/><path d="M4.2 12.4h15.6"/><path d="M9.2 15.6h5.6"/>',
    invoice:
      '<path d="M5.6 3.4h12.8v17.2l-2.1-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.1-1.5-2.1 1.5z"/><path d="M9 8.6h6"/><path d="M9 12.6h4"/>',
    chart:
      '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.6"/><path d="M8.2 15.9v-3.5"/><path d="M12 15.9V8.5"/><path d="M15.8 15.9v-5.6"/>',
    user:
      '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="9.7" r="3"/><path d="M6.4 18.7c1.1-2.6 3.2-4 5.6-4s4.5 1.4 5.6 4"/>',
    settings:
      '<circle cx="12" cy="12" r="3.1"/><path d="M12.4 2.6h-.8a1.9 1.9 0 0 0-1.9 1.9v.3a1.9 1.9 0 0 1-1 1.6l-.5.3a1.9 1.9 0 0 1-1.9 0l-.2-.1a1.9 1.9 0 0 0-2.6.7l-.4.7a1.9 1.9 0 0 0 .7 2.6l.2.1a1.9 1.9 0 0 1 .9 1.6v.6a1.9 1.9 0 0 1-.9 1.6l-.2.1a1.9 1.9 0 0 0-.7 2.6l.4.7a1.9 1.9 0 0 0 2.6.7l.2-.1a1.9 1.9 0 0 1 1.9 0l.5.3a1.9 1.9 0 0 1 1 1.6v.3a1.9 1.9 0 0 0 1.9 1.9h.8a1.9 1.9 0 0 0 1.9-1.9v-.3a1.9 1.9 0 0 1 1-1.6l.5-.3a1.9 1.9 0 0 1 1.9 0l.2.1a1.9 1.9 0 0 0 2.6-.7l.4-.7a1.9 1.9 0 0 0-.7-2.6l-.2-.1a1.9 1.9 0 0 1-.9-1.6v-.6a1.9 1.9 0 0 1 .9-1.6l.2-.1a1.9 1.9 0 0 0 .7-2.6l-.4-.7a1.9 1.9 0 0 0-2.6-.7l-.2.1a1.9 1.9 0 0 1-1.9 0l-.5-.3a1.9 1.9 0 0 1-1-1.6v-.3a1.9 1.9 0 0 0-1.9-1.9z"/>',
    panel:
      '<rect x="3.2" y="3.6" width="17.6" height="16.8" rx="4"/><path d="M16 3.6v16.8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.2 20.2-3.7-3.7"/>',
    nairaCircle:
      '<circle cx="12" cy="12" r="9.2"/><path d="M8.4 7.6v8.8"/><path d="M15.6 7.6v8.8"/><path d="m8.4 7.6 7.2 8.8"/><path d="M6.9 10.8h10.2"/><path d="M6.9 13.4h10.2"/>',
    language:
      '<circle cx="12" cy="12" r="9.2"/><path d="M3.2 12h17.6"/><path d="M12 2.8c2.6 2.8 3.9 5.8 3.9 9.2S14.6 18.4 12 21.2C9.4 18.4 8.1 15.4 8.1 12S9.4 5.6 12 2.8z"/>',
    chat:
      '<path d="M20.4 11.8c0 4-3.8 7.2-8.4 7.2-.9 0-1.8-.1-2.6-.4l-5.2 1.6 1.4-3.6a6.8 6.8 0 0 1-2-4.8c0-4 3.8-7.2 8.4-7.2s8.4 3.2 8.4 7.2z"/><path d="M9 10.8h6"/><path d="M9 14h4"/>',
    bell:
      '<path d="M18 8.8a6 6 0 1 0-12 0c0 5.8-2.4 7.2-2.4 7.2h16.8S18 14.6 18 8.8z"/><path d="M13.7 19.6a2 2 0 0 1-3.4 0"/>',
    sun:
      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2"/><path d="M12 19.2v2.2"/><path d="M4.6 12H2.4"/><path d="M21.6 12h-2.2"/><path d="M6.4 6.4 4.9 4.9"/><path d="m19.1 19.1-1.5-1.5"/><path d="m17.6 6.4 1.5-1.5"/><path d="m4.9 19.1 1.5-1.5"/>',
    moon: '<path d="M20.6 14.7A8.7 8.7 0 0 1 9.3 3.4 8.9 8.9 0 1 0 20.6 14.7z"/>',
    chevronDown: '<path d="m6.4 9.2 5.6 5.6 5.6-5.6"/>',
    arrowRight: '<path d="M4.2 12h14.4"/><path d="m12.8 6.2 5.8 5.8-5.8 5.8"/>',
    logout:
      '<path d="M9.6 20.4H6.2a2.6 2.6 0 0 1-2.6-2.6V6.2a2.6 2.6 0 0 1 2.6-2.6h3.4"/><path d="m16 8.2 3.8 3.8-3.8 3.8"/><path d="M19.8 12H9.6"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    naira:
      '<path d="M6.2 6.4v11.2"/><path d="M17.8 6.4v11.2"/><path d="m6.2 6.4 11.6 11.2"/><path d="M4.4 10.4h15.2"/><path d="M4.4 13.6h15.2"/>',
    users:
      '<path d="M15.8 19.4v-1.6a3.9 3.9 0 0 0-3.9-3.9H7.3a3.9 3.9 0 0 0-3.9 3.9v1.6"/><circle cx="9.6" cy="7.6" r="3.4"/><path d="M20.6 19.4v-1.6a3.9 3.9 0 0 0-2.9-3.8"/><path d="M15.4 4.4a3.4 3.4 0 0 1 0 6.6"/>',
    trendingUp: '<path d="m3.4 16.6 5.4-5.4 3.8 3.8 8-8"/><path d="M15.2 7h5.4v5.4"/>',
    cart:
      '<circle cx="9.6" cy="19.4" r="1.6"/><circle cx="17.4" cy="19.4" r="1.6"/><path d="M2.6 3.4h2.2l2.4 11.4h11.6l2.2-8.2H6"/>',
    dollar:
      '<path d="M12 2.6v18.8"/><path d="M16.8 6.8H10a3.2 3.2 0 0 0 0 6.4h4.2a3.2 3.2 0 0 1 0 6.4H7"/>',
    trophy:
      '<path d="M8 4.2h8v4.6a4 4 0 0 1-8 0z"/><path d="M8 5.6H5.6a2.4 2.4 0 0 0 2.4 4.4"/><path d="M16 5.6h2.4a2.4 2.4 0 0 1-2.4 4.4"/><path d="M12 12.8v3.4"/><path d="M9.4 16.2h5.2l.8 3.6H8.6z"/>',
    checkSquare: '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.6"/>',
    cursor:
      '<path d="M8.6 4.2v11.2l2.8-2.4 2 4.8 2.4-1-2-4.8 3.6-.5z"/>',
    calendar:
      '<rect x="3.6" y="5.6" width="16.8" height="14.8" rx="3.4"/><path d="M8.2 3.4v4.2"/><path d="M15.8 3.4v4.2"/><path d="M3.6 10.6h16.8"/>',
    sort:
      '<path d="M7.2 4.2v15.6"/><path d="m3.8 7.6 3.4-3.4 3.4 3.4"/><path d="M16.8 19.8V4.2"/><path d="m13.4 16.4 3.4 3.4 3.4-3.4"/>',
    filterLines: '<path d="M4.2 6.6h15.6"/><path d="M7 12h10"/><path d="M9.8 17.4h4.4"/>',
    filter: '<path d="M3.6 5.4h16.8l-6.6 7.8v6.6l-3.6-2.2v-4.4z"/>',
    viewGrid:
      '<rect x="3.6" y="3.6" width="7" height="7" rx="2.2"/><rect x="13.4" y="3.6" width="7" height="7" rx="2.2"/><rect x="3.6" y="13.4" width="7" height="7" rx="2.2"/><rect x="13.4" y="13.4" width="7" height="7" rx="2.2"/>',
  };

  const NAV_SECTIONS = [
    {
      label: "HOME",
      items: [
        { id: "overview", label: "Overview", href: "dashboard.html", icon: "grid" },
        { id: "supplier", label: "Supplier Page", href: "supplier.html", icon: "supplier" },
        { id: "product", label: "Product", href: "product.html", icon: "box" },
        { id: "inventory", label: "Inventory", href: "inventory.html", icon: "inventory" },
        { id: "orders", label: "Orders", href: "orders.html", icon: "invoice" },
        { id: "report", label: "Report", href: "report.html", icon: "chart" },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { id: "settings", label: "Settings", href: "settings.html", icon: "settings" },
      ],
    },
  ];

  function icon(name, size) {
    const body = ICONS[name];
    if (!body) return "";
    const px = size || 20;
    return (
      PATHS.stroke.replace(
        "<svg",
        `<svg width="${px}" height="${px}" aria-hidden="true" focusable="false"`
      ) +
      body +
      "</svg>"
    );
  }

  function readJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (err) {
      return null;
    }
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "EV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getProfile() {
    const user = readJSON("user") || {};
    const store = readJSON("store") || {};
    const role = user.role || "owner";
    return {
      name: user.fullName || role.charAt(0).toUpperCase() + role.slice(1),
      role,
      email: user.email || "",
      store: store.name || "Tech Stores",
    };
  }

  const BAG_SVG = `
    <svg class="upgrade-bag" viewBox="0 0 140 132" fill="none" aria-hidden="true">
      <path d="M46 50V27a13 13 0 0 1 26 0v23" stroke="#2f2f3a" stroke-width="6" stroke-linecap="round"/>
      <path d="M68 50V27a13 13 0 0 1 26 0v23" stroke="#2f2f3a" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 47h74l4 78H26z" fill="#877afe"/>
      <path d="M104 47l18 11 4 67-18-4z" fill="#5e5ce1"/>
      <circle cx="46" cy="51" r="3.6" fill="#2f2f3a"/>
      <circle cx="94" cy="51" r="3.6" fill="#2f2f3a"/>
    </svg>`;

  function buildSidebar(activePage, profile) {
    const sections = NAV_SECTIONS.map((section) => {
      const items = section.items
        .map((item) => {
          const active = item.id === activePage ? " is-active" : "";
          return `<a class="nav-item${active}" href="${item.href}" data-nav="${item.id}">
              <span class="nav-icon">${icon(item.icon, 20)}</span>
              <span class="nav-label">${item.label}</span>
            </a>`;
        })
        .join("");
      return `<p class="nav-section">${section.label}</p>${items}`;
    }).join("");

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-head">
          <img class="sidebar-logo" src="logo.png" alt="eVentory" />
          <span class="sidebar-store">${profile.store}</span>
          <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-label="Collapse sidebar">
            ${icon("panel", 22)}
          </button>
        </div>
        <nav class="sidebar-nav" aria-label="Main">${sections}</nav>
        <div class="upgrade">
          ${BAG_SVG}
          <div class="upgrade-card">
            <p class="upgrade-title">Unlock with Upgrade</p>
            <p class="upgrade-text">Free plan active - upgrade to unlock more.</p>
            <button type="button" class="upgrade-btn">
              <span>Upgrade now</span>
              <span class="upgrade-arrow">${icon("arrowRight", 18)}</span>
            </button>
          </div>
        </div>
      </aside>`;
  }

  function buildTopbar(profile) {
    return `
      <header class="topbar">
      
        <label class="search">
          ${icon("search", 18)}
          <input type="search" placeholder="Search..." aria-label="Search" />
        </label>
        <div class="topbar-actions">
          <button type="button" class="icon-btn" aria-label="Language" disabled>${icon("language", 18)}</button>
          <button type="button" class="icon-btn" aria-label="Messages" disabled>${icon("chat", 18)}</button>
          <button type="button" class="icon-btn has-dot" aria-label="Notifications" disabled>${icon("bell", 18)}</button>
          <div class="theme-switch" role="group" aria-label="Theme">
            <button type="button" class="theme-btn" data-theme-value="light" aria-label="Light mode">${icon("sun", 18)}</button>
            <button type="button" class="theme-btn" data-theme-value="dark" aria-label="Dark mode">${icon("moon", 18)}</button>
          </div>
          <div class="user-menu" id="user-menu">
            <button type="button" class="user-pill" id="user-pill" aria-expanded="false" aria-haspopup="true">
              <span class="user-avatar">${initials(profile.name)}</span>
              <span class="user-meta">
                <span class="user-name">${profile.name}</span>
                <span class="user-role">${ profile.role}</span>
              </span>
              <span class="user-caret">${icon("chevronDown", 16)}</span>
            </button>
            <div class="user-dropdown" id="user-dropdown" hidden>
              <a class="dropdown-item" href="account.html">${icon("user", 18)}<span>My account</span></a>
              <a class="dropdown-item" href="settings.html">${icon("settings", 18)}<span>Settings</span></a>
              <div class="dropdown-sep"></div>
              <button type="button" class="dropdown-item is-danger" id="logout-btn">
                ${icon("logout", 18)}<span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </header>`;
  }

  function buildPageHead(page) {
    const title = page.dataset.title;
    if (!title) return "";
    const subtitle = page.dataset.subtitle
      ? `<p class="page-subtitle">${page.dataset.subtitle}</p>`
      : "";
    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">${title}</h1>
          ${subtitle}
        </div>
        <div class="page-actions" id="page-actions"></div>
      </div>`;
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.themeValue === theme);
    });
    try {
      localStorage.setItem(STORE_KEYS.theme, theme);
    } catch (err) {
      /* storage unavailable — theme just won't persist */
    }
  }

  function init() {
    const page = document.getElementById("page");
    if (!page) return;

    const profile = getProfile();
    const activePage = page.dataset.page || "";
    const actionsTemplate = page.querySelector("template[data-page-actions]");

    const shell = document.createElement("div");
    shell.className = "app";
    shell.innerHTML = `
      ${buildSidebar(activePage, profile)}
      <div class="app-body">
        ${buildTopbar(profile)}
        <main class="app-content" id="app-content">${buildPageHead(page)}</main>
      </div>
      <div class="nav-overlay" id="nav-overlay"></div>`;

    document.body.insertBefore(shell, page);

    const content = shell.querySelector("#app-content");
    const actionsSlot = shell.querySelector("#page-actions");

    if (actionsTemplate && actionsSlot) {
      actionsSlot.appendChild(actionsTemplate.content.cloneNode(true));
      actionsTemplate.remove();
    }

    while (page.firstChild) {
      content.appendChild(page.firstChild);
    }
    page.remove();

    let savedTheme = null;
    let savedCollapsed = null;
    try {
      savedTheme = localStorage.getItem(STORE_KEYS.theme);
      savedCollapsed = localStorage.getItem(STORE_KEYS.collapsed);
    } catch (err) {
      /* ignore */
    }

    applyTheme(savedTheme === "dark" ? "dark" : "light");
    shell.dataset.collapsed = savedCollapsed === "true" ? "true" : "false";

    shell.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.themeValue));
    });

    const toggle = shell.querySelector("#sidebar-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const collapsed = shell.dataset.collapsed === "true";
        shell.dataset.collapsed = collapsed ? "false" : "true";
        try {
          localStorage.setItem(STORE_KEYS.collapsed, String(!collapsed));
        } catch (err) {
          /* ignore */
        }
      });
    }

    const overlay = shell.querySelector("#nav-overlay");
    const openBtn = shell.querySelector("#nav-open");
    if (openBtn && overlay) {
      openBtn.addEventListener("click", () => shell.classList.add("nav-open"));
      overlay.addEventListener("click", () => shell.classList.remove("nav-open"));
    }

    const userMenu = shell.querySelector("#user-menu");
    const userPill = shell.querySelector("#user-pill");
    const dropdown = shell.querySelector("#user-dropdown");
    if (userMenu && userPill && dropdown) {
      const setOpen = (open) => {
        userMenu.classList.toggle("is-open", open);
        dropdown.hidden = !open;
        userPill.setAttribute("aria-expanded", String(open));
      };
      userPill.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(dropdown.hidden);
      });
      document.addEventListener("click", (event) => {
        if (!userMenu.contains(event.target)) setOpen(false);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          setOpen(false);
          shell.classList.remove("nav-open");
        }
      });
    }

    const logoutBtn = shell.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (window.EvApi) {
          EvApi.clearSession();
        } else {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("store");
          } catch (err) {
            /* ignore */
          }
        }
        window.location.href = "loginPage.html";
      });
    }

    document.body.classList.add("shell-ready");
    document.dispatchEvent(new CustomEvent("shell:ready", { detail: { content } }));
  }

  window.EvLayout = { icon, ICONS, getProfile, initials };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
