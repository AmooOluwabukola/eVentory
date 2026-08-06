/* eVentory — Settings page script.
 * Follows the same EvApi / EvLayout / shell:ready pattern as dashboard.js.
 */

(function () {
  "use strict";

  const CATEGORY_COLORS = [
    "#6415ea", "#2563eb", "#d97706", "#12a150",
    "#e4626f", "#7c3aed", "#e14257", "#12b3a5",
  ];

  // Icons not present in the shared dashboard-layout.js library (edit,
  // trash, close, check). Drawn in the same stroke style so they match.
  const EXTRA_ICON_PATHS = {
    edit: '<path d="M13.4 3.6 16.4 6.6 6.6 16.4l-3.6.7.7-3.6z"/><path d="m11.8 5.2 3 3"/>',
    trash: '<path d="M3.6 5.8h12.8"/><path d="M7.2 5.8V4a1.4 1.4 0 0 1 1.4-1.4h2.8A1.4 1.4 0 0 1 12.8 4v1.8"/><path d="M5.6 5.8v10.6A1.4 1.4 0 0 0 7 17.8h6a1.4 1.4 0 0 0 1.4-1.4V5.8"/><path d="M8.4 8.8v5.4"/><path d="M11.6 8.8v5.4"/>',
    close: '<path d="m4.4 4.4 11.2 11.2"/><path d="M15.6 4.4 4.4 15.6"/>',
    check: '<path d="M3.6 10.4 8 14.8l8.4-9.6"/>',
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

  // Replaces <span data-settings-icon="..."> placeholders in the static
  // HTML (save button checkmarks, danger button trash, modal close X)
  // with real inline SVGs — no external image files required.
  function decorateStaticIcons(root) {
    (root || document).querySelectorAll("[data-settings-icon]").forEach((el) => {
      const name = el.getAttribute("data-settings-icon");
      el.innerHTML = extraIcon(name, el.getAttribute("data-icon-size") || 14);
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

  function icon(name, size) {
    return window.EvLayout ? window.EvLayout.icon(name, size) : "";
  }

  function readJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage unavailable */
    }
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function decorateSelectCarets() {
    document.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      el.innerHTML = icon(name, 16);
    });
  }

  function setBtnLoading(btn, label) {
    if (!btn) return;
    btn.disabled = true;
    if (btn.dataset.originalHtml == null) btn.dataset.originalHtml = btn.innerHTML;
    btn.textContent = label;
  }

  function resetBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.originalHtml != null) btn.innerHTML = btn.dataset.originalHtml;
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

  const modalOverlay = () => document.getElementById("modal-overlay");
  const modalTitleEl = () => document.getElementById("modal-title");
  const modalBodyEl = () => document.getElementById("modal-body");

  function openModal(title, bodyHtml, onMount) {
    const overlay = modalOverlay();
    if (!overlay) return;
    modalTitleEl().textContent = title;
    modalBodyEl().innerHTML = bodyHtml;
    overlay.hidden = false;
    decorateStaticIcons(modalBodyEl());
    if (typeof onMount === "function") onMount(modalBodyEl());
  }

  function closeModal() {
    const overlay = modalOverlay();
    if (!overlay) return;
    overlay.hidden = true;
    modalBodyEl().innerHTML = "";
  }

  function setupModalChrome() {
    document.getElementById("modal-close")?.addEventListener("click", closeModal);
    modalOverlay()?.addEventListener("click", (e) => {
      if (e.target === modalOverlay()) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".settings-tab");
    const panels = document.querySelectorAll("[data-tab-panel]");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute("data-tab-panel") !== target;
        });
        const url = new URL(window.location.href);
        url.searchParams.set("tab", target);
        window.history.replaceState({}, "", url);
      });
    });

    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested) {
      const match = document.querySelector(`.settings-tab[data-tab="${requested}"]`);
      if (match) match.click();
    }
  }

  // ---------- Business tab ----------
  function fillBusinessForm() {
    const store = readJSON("store") || {};
    setValue("businessName", store.name);
    setValue("businessType", store.type);
    setValue("businessAddress", store.address);
    setValue("businessPhone", store.phone);
    setValue("businessEmail", store.email);
    setValue("businessRegNo", store.regNo);
    setValue("currency", store.currency);
    setValue("dateFormat", store.dateFormat);
    setValue("timeZone", store.timeZone);
    setValue("language", store.language);
  }

  async function saveBusiness() {
    const btn = document.getElementById("save-business-btn");
    setBtnLoading(btn, "Saving...");

    const store = {
      ...(readJSON("store") || {}),
      name: valueOf("businessName"),
      type: valueOf("businessType"),
      address: valueOf("businessAddress"),
      phone: valueOf("businessPhone"),
      email: valueOf("businessEmail"),
      regNo: valueOf("businessRegNo"),
      currency: valueOf("currency"),
      dateFormat: valueOf("dateFormat"),
      timeZone: valueOf("timeZone"),
      language: valueOf("language"),
    };

    try {
      if (window.EvApi) {
        await EvApi.json("/settings/business", { method: "PUT", body: JSON.stringify(store) });
      }
      writeJSON("store", store);
      showToast("Business settings saved.");
    } catch (err) {
      writeJSON("store", store);
      showToast("Saved locally — couldn't reach the server.", true);
    } finally {
      resetBtn(btn);
    }
  }

  // ---------- Team tab ----------
  function getLocalTeam() {
    return readJSON("team") || [];
  }

  function initialsFrom(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "??";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function loadTeam() {
    const list = document.getElementById("team-list");
    if (!list) return;
    list.innerHTML = '<li class="team-empty">Loading team…</li>';

    if (window.EvApi) {
      try {
        const response = await EvApi.json("/team");
        const members = response.data || response;
        renderTeam(members);
        return;
      } catch (err) {
        /* fall back below */
      }
    }

    const local = getLocalTeam();
    const user = readJSON("user") || {};
    const self = {
      id: "self",
      name: user.fullName || "You",
      email: user.email || "",
      role: user.role || "owner",
      isSelf: true,
    };
    renderTeam([self, ...local]);
  }

  function renderTeam(members) {
    const list = document.getElementById("team-list");
    if (!list) return;

    if (!members || !members.length) {
      list.innerHTML = '<li class="team-empty">No team members yet — invite your first one above.</li>';
      return;
    }

    list.innerHTML = members
      .map((m) => {
        const name = escapeHtml(m.name || m.fullName || m.email || "Member");
        const email = escapeHtml(m.email || "");
        const role = escapeHtml(m.role || "member");
        const removeBtn = m.isSelf
          ? ""
          : '<button type="button" class="icon-action-btn is-danger" data-remove-member="' + m.id + '" aria-label="Remove member">' + extraIcon("trash", 14) + '</button>';
        return (
          '<li class="team-row" data-id="' + m.id + '">' +
          '<span class="team-avatar">' + initialsFrom(name) + '</span>' +
          '<div class="team-meta"><p class="team-name">' + name + (m.isSelf ? " (You)" : "") + '</p>' +
          '<p class="team-email">' + email + '</p></div>' +
          '<span class="team-role-badge">' + role + '</span>' +
          '<div class="row-actions">' + removeBtn + '</div></li>'
        );
      })
      .join("");
  }

  function openInviteModal() {
    openModal(
      "Invite Member",
      '<div class="settings-form">' +
        '<label class="field"><span class="field-label">EMAIL *</span>' +
        '<input type="email" id="inviteEmail" placeholder="teammate@example.com" /></label>' +
        '<label class="field"><span class="field-label">ROLE</span>' +
        '<span class="select-wrap"><select id="inviteRole">' +
        '<option value="manager">Manager</option>' +
        '<option value="attendant">Attendant</option>' +
        '</select><span class="select-caret" data-icon="chevronDown"></span></span></label></div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" id="invite-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="invite-submit-btn">Send Invite</button></div>',
      () => {
        decorateSelectCarets();
        document.getElementById("invite-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("invite-submit-btn").addEventListener("click", submitInvite);
      }
    );
  }

  async function submitInvite() {
    const email = valueOf("inviteEmail");
    const role = valueOf("inviteRole") || "manager";

    if (!email) {
      showToast("Enter an email address.", true);
      return;
    }

    const btn = document.getElementById("invite-submit-btn");
    setBtnLoading(btn, "Sending...");

    try {
      if (window.EvApi) {
        await EvApi.json("/team/invite", { method: "POST", body: JSON.stringify({ email, role }) });
        showToast("Invite sent to " + email + ".");
        closeModal();
        loadTeam();
        return;
      }
      throw new Error("no-api");
    } catch (err) {
      const team = getLocalTeam();
      team.push({ id: "local-" + Date.now(), name: email.split("@")[0], email, role });
      writeJSON("team", team);
      showToast('"' + email + '" invited (locally).');
      closeModal();
      loadTeam();
    } finally {
      resetBtn(btn);
    }
  }

  async function removeMember(id) {
    if (window.EvApi) {
      try {
        await EvApi.json("/team/" + id, { method: "DELETE" });
        showToast("Member removed.");
        loadTeam();
        return;
      } catch (err) {
        /* fall back below */
      }
    }
    const team = getLocalTeam().filter((m) => m.id !== id);
    writeJSON("team", team);
    showToast("Member removed (locally).");
    loadTeam();
  }

  // ---------- Profile tab ----------
  function splitName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  }

  function profileInitials(first, last) {
    const a = (first || "").charAt(0);
    const b = (last || "").charAt(0);
    return (a + b).toUpperCase() || "EV";
  }

  function fillProfileForm() {
    const user = readJSON("user") || {};
    const { first, last } = splitName(user.fullName);

    setValue("firstName", user.firstName || first);
    setValue("lastName", user.lastName || last);
    setValue("email", user.email);
    setValue("phone", user.phone);

    updateProfileHead(user);
  }

  function updateProfileHead(user) {
    const first = valueOf("firstName") || user.firstName || splitName(user.fullName).first;
    const last = valueOf("lastName") || user.lastName || splitName(user.fullName).last;
    const role = user.role || "owner";

    const nameEl = document.getElementById("profile-name");
    const roleEl = document.getElementById("profile-role");
    const avatarEl = document.getElementById("profile-avatar");

    if (nameEl) nameEl.textContent = (first + " " + last).trim() || "—";
    if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    if (avatarEl) avatarEl.textContent = profileInitials(first, last);
  }

  function setupChangePhoto() {
    const btn = document.getElementById("change-photo-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const avatarEl = document.getElementById("profile-avatar");
          if (avatarEl) {
            avatarEl.textContent = "";
            avatarEl.style.backgroundImage = "url(" + reader.result + ")";
            avatarEl.style.backgroundSize = "cover";
            avatarEl.style.backgroundPosition = "center";
          }
          showToast("Photo preview updated (not yet uploaded to server).");
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  async function saveProfile() {
    const btn = document.getElementById("save-profile-btn");
    setBtnLoading(btn, "Saving...");

    const firstName = valueOf("firstName");
    const lastName = valueOf("lastName");

    const user = {
      ...(readJSON("user") || {}),
      firstName,
      lastName,
      fullName: (firstName + " " + lastName).trim(),
      email: valueOf("email"),
      phone: valueOf("phone"),
    };

    try {
      if (window.EvApi) {
        await EvApi.json("/users/me", {
          method: "PUT",
          body: JSON.stringify({ fullName: user.fullName, email: user.email, phone: user.phone }),
        });
      }
      writeJSON("user", user);
      updateProfileHead(user);
      showToast("Profile saved.");
    } catch (err) {
      writeJSON("user", user);
      updateProfileHead(user);
      showToast("Saved locally — couldn't reach the server.", true);
    } finally {
      resetBtn(btn);
    }
  }

  // ---------- Categories tab ----------
  let categoriesSource = "local";

  function getLocalCategories() {
    return readJSON("categories") || [];
  }

  function normalizeCategory(cat, index) {
  if (typeof cat === "string") return { id: index, name: cat, description: "" };
  return { id: cat.id != null ? cat.id : index, name: cat.name, description: cat.description || "" };
}

// Same defensive unwrapping used for /products and /suppliers — the API
// wraps arrays as { data: { categories: [...] } } (sometimes flattened to
// { data: [...] }).
function extractCategoryList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.categories)) return response.data.categories;
  if (Array.isArray(response?.categories)) return response.categories;
  return null;
}

async function loadCategories() {
  const list = document.getElementById("category-list");
  if (list) list.innerHTML = '<li class="category-empty">Loading categories…</li>';

  if (!window.EvApi) {
    renderCategories([]);
    return;
  }

  try {
    const response = await EvApi.json("/categories");
    const raw = extractCategoryList(response);
    if (!Array.isArray(raw)) throw new Error("Unexpected /categories response shape");
    renderCategories(raw.map(normalizeCategory));
  } catch (err) {
    renderCategories([]);
    showToast("Couldn't load categories from the server.", true);
  }
}

  // function normalizeCategory(cat, index) {
  //   if (typeof cat === "string") return { id: index, name: cat, description: "" };
  //   return { id: cat.id != null ? cat.id : index, name: cat.name, description: cat.description || "" };
  // }

  // async function loadCategories() {
  //   const list = document.getElementById("category-list");
  //   if (!list) return;
  //   list.innerHTML = '<li class="category-empty">Loading categories…</li>';

  //   if (window.EvApi) {
  //     try {
  //       const response = await EvApi.json("/categories");
  //       const raw = response.data || response;
  //       categoriesSource = "api";
  //       renderCategories(raw.map(normalizeCategory));
  //       return;
  //     } catch (err) {
  //       /* fall back below */
  //     }
  //   }

  //   categoriesSource = "local";
  //   renderCategories(getLocalCategories().map(normalizeCategory));
  // }

  function renderCategories(categories) {
    const list = document.getElementById("category-list");
    if (!list) return;

    if (!categories || !categories.length) {
      list.innerHTML = '<li class="category-empty">No categories yet — add your first one above.</li>';
      renderCategories._current = [];
      return;
    }

    list.innerHTML = categories
      .map((cat, index) => {
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        return (
          '<li class="category-row" data-id="' + cat.id + '">' +
          '<span class="category-swatch" style="background:' + color + '"></span>' +
          '<span class="category-name">' + escapeHtml(cat.name) + '</span>' +
          '<div class="row-actions">' +
          '<button type="button" class="icon-action-btn" data-edit="' + cat.id + '" aria-label="Edit category">' + extraIcon("edit", 14) + '</button>' +
          '<button type="button" class="icon-action-btn is-danger" data-delete="' + cat.id + '" aria-label="Delete category">' + extraIcon("trash", 14) + '</button>' +
          '</div></li>'
        );
      })
      .join("");

    renderCategories._current = categories;
  }

  function openAddCategoryModal() {
    openModal(
      "Add Category",
      '<div class="settings-form">' +
        '<label class="field"><span class="field-label">NAME *</span><input type="text" id="categoryName" /></label>' +
        '<label class="field"><span class="field-label">DESCRIPTION</span><input type="text" id="categoryDescription" /></label></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-primary" id="category-submit-btn">Add Category</button></div>',
      () => {
        document.getElementById("category-submit-btn").addEventListener("click", submitAddCategory);
      }
    );
  }

  function openEditCategoryModal(id) {
    const current = (renderCategories._current || []).find((c) => String(c.id) === String(id));
    if (!current) return;

    openModal(
      "Update Category",
      '<div class="settings-form">' +
        '<label class="field"><span class="field-label">NAME *</span><input type="text" id="categoryName" value="' + escapeHtml(current.name) + '" /></label>' +
        '<label class="field"><span class="field-label">DESCRIPTION</span><input type="text" id="categoryDescription" value="' + escapeHtml(current.description) + '" /></label></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-primary" id="category-submit-btn">Update</button></div>',
      () => {
        document.getElementById("category-submit-btn").addEventListener("click", () => submitUpdateCategory(id));
      }
    );
  }

 
async function submitAddCategory() {
  const name = valueOf("categoryName");
  const description = valueOf("categoryDescription");
  if (!name) {
    showToast("Category name is required.", true);
    return;
  }

  if (!window.EvApi) {
    showToast("Can't add — not connected to the server.", true);
    return;
  }

  const btn = document.getElementById("category-submit-btn");
  setBtnLoading(btn, "Adding...");

  try {
    await EvApi.json("/categories", { method: "POST", body: JSON.stringify({ name, description }) });
    showToast('"' + name + '" added.');
    closeModal();
    loadCategories();
  } catch (err) {
    showToast(err.message || "Couldn't reach the server. Please try again.", true);
    resetBtn(btn);
  }
}
  async function submitUpdateCategory(id) {
    const name = valueOf("categoryName");
    const description = valueOf("categoryDescription");
    if (!name) {
      showToast("Category name is required.", true);
      return;
    }

    const btn = document.getElementById("category-submit-btn");
    setBtnLoading(btn, "Updating...");

    if (window.EvApi && categoriesSource === "api") {
      try {
        await EvApi.json("/categories/" + id, { method: "PUT", body: JSON.stringify({ name, description }) });
        showToast("Category updated.");
        closeModal();
        loadCategories();
        return;
      } catch (err) {
        showToast(err.message || "Couldn't update via API.", true);
        resetBtn(btn);
        return;
      }
    }

    const categories = getLocalCategories().map(normalizeCategory);
    const idx = categories.findIndex((c) => String(c.id) === String(id));
    if (idx > -1) categories[idx] = Object.assign({}, categories[idx], { name, description });
    writeJSON("categories", categories);
    showToast("Category updated (locally).");
    closeModal();
    loadCategories();
  }

  function confirmDeleteCategory(id) {
    const current = (renderCategories._current || []).find((c) => String(c.id) === String(id));
    const name = current ? current.name : "this category";

    openModal(
      "Delete Category",
      '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">Are you sure you want to delete <strong>' +
        escapeHtml(name) +
        '</strong>? This can\'t be undone.</p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" id="delete-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-danger" id="delete-confirm-btn">Delete</button></div>',
      () => {
        document.getElementById("delete-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("delete-confirm-btn").addEventListener("click", () => deleteCategory(id));
      }
    );
  }

  async function deleteCategory(id) {
    if (window.EvApi && categoriesSource === "api") {
      try {
        await EvApi.json("/categories/" + id, { method: "DELETE" });
        showToast("Category deleted.");
        closeModal();
        loadCategories();
        return;
      } catch (err) {
        showToast(err.message || "Couldn't delete via API.", true);
        return;
      }
    }

    const categories = getLocalCategories().map(normalizeCategory).filter((c) => String(c.id) !== String(id));
    writeJSON("categories", categories);
    showToast("Category deleted (locally).");
    closeModal();
    loadCategories();
  }

  // ---------- Security tab ----------
  async function updatePassword() {
    const current = valueOf("currentPassword");
    const next = valueOf("newPassword");
    const confirm = valueOf("confirmNewPassword");

    if (!current || !next || !confirm) {
      showToast("Fill in all password fields.", true);
      return;
    }
    if (next.length < 8) {
      showToast("New password must be at least 8 characters.", true);
      return;
    }
    if (next !== confirm) {
      showToast("New passwords do not match.", true);
      return;
    }

    const btn = document.getElementById("save-security-btn");
    setBtnLoading(btn, "Updating...");

    try {
      if (window.EvApi) {
        await EvApi.json("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
      }
      showToast("Password updated.");
      ["currentPassword", "newPassword", "confirmNewPassword"].forEach((id) => setValue(id, ""));
    } catch (err) {
      showToast(err.message || "Couldn't update password. Please try again.", true);
    } finally {
      resetBtn(btn);
    }
  }

  function confirmDeleteAccount() {
    openModal(
      "Delete Account",
      '<p style="font-size:14.5px;color:var(--ink-soft);line-height:1.5;">This will permanently delete your account and everything tied to it. This action <strong>cannot be undone</strong>. Type <strong>DELETE</strong> to confirm.</p>' +
        '<div class="settings-form" style="margin-top:14px;"><label class="field"><input type="text" id="deleteConfirmInput" placeholder="Type DELETE to confirm" /></label></div>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" id="delete-account-cancel-btn">Cancel</button>' +
        '<button type="button" class="btn btn-danger" id="delete-account-confirm-btn">Delete Account</button></div>',
      () => {
        document.getElementById("delete-account-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("delete-account-confirm-btn").addEventListener("click", deleteAccount);
      }
    );
  }

  async function deleteAccount() {
    if (valueOf("deleteConfirmInput") !== "DELETE") {
      showToast('Type "DELETE" to confirm.', true);
      return;
    }

    const btn = document.getElementById("delete-account-confirm-btn");
    setBtnLoading(btn, "Deleting...");

    try {
      if (window.EvApi) {
        await EvApi.json("/users/me", { method: "DELETE" });
      }
      if (window.EvApi) EvApi.clearSession();
      else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("store");
      }
      window.location.href = "loginPage.html";
    } catch (err) {
      showToast(err.message || "Couldn't delete account. Please try again.", true);
      resetBtn(btn);
    }
  }

  // ---------- Boot ----------
  function boot() {
    if (!requireAuth()) return;

    decorateSelectCarets();
    decorateStaticIcons();
    setupTabs();
    setupModalChrome();

    fillBusinessForm();
    setupChangePhoto();
    fillProfileForm();
    loadTeam();
    loadCategories();

    document.getElementById("save-business-btn")?.addEventListener("click", saveBusiness);
    document.getElementById("save-profile-btn")?.addEventListener("click", saveProfile);
    document.getElementById("save-security-btn")?.addEventListener("click", updatePassword);
    document.getElementById("delete-account-btn")?.addEventListener("click", confirmDeleteAccount);
    document.getElementById("invite-member-btn")?.addEventListener("click", openInviteModal);
    document.getElementById("add-category-btn")?.addEventListener("click", openAddCategoryModal);

    document.getElementById("category-list")?.addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit]");
      const deleteBtn = e.target.closest("[data-delete]");
      if (editBtn) openEditCategoryModal(editBtn.getAttribute("data-edit"));
      if (deleteBtn) confirmDeleteCategory(deleteBtn.getAttribute("data-delete"));
    });

    document.getElementById("team-list")?.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove-member]");
      if (removeBtn) removeMember(removeBtn.getAttribute("data-remove-member"));
    });
  }

  document.addEventListener("shell:ready", boot);

  if (document.body.classList.contains("shell-ready")) {
    boot();
  }
})();