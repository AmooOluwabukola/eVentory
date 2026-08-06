// eventory — signup page behavior

const API_BASE_URL = "http://localhost:3000/api"; // update once backend confirms their dev URL

document.addEventListener("DOMContentLoaded", () => {
  setupPasswordToggles();
  setupSignupForm();
});

// Show/hide password fields
function setupPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
  });
}

function setupSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const fullName = form.fullName.value.trim();
    const companyName = form.companyName.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const termsAccepted = form.terms.checked;

    // Basic client-side validation
    let hasError = false;

    if (password.length < 8) {
      showError(form.password, "Password must be at least 8 characters.");
      hasError = true;
    }

    if (password !== confirmPassword) {
      showError(form.confirmPassword, "Passwords do not match.");
      hasError = true;
    }

    if (!termsAccepted) {
      showError(form.terms, "You must agree to the terms to continue.");
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";

    // TEMPORARY: backend isn't live yet, so skip the real API call and just
    // simulate success so you can test the frontend flow end-to-end.
    // Once your backend's /auth/register endpoint is ready, delete this
    // block and uncomment the real fetch block below it.
    const SKIP_REAL_API = true;

    if (SKIP_REAL_API) {
      setTimeout(() => {
        window.location.href = "loading.html?next=role-select.html";
      }, 500);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, companyName, email, phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      // TODO: confirm actual response shape with backend (token? user object?)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      window.location.href = "loading.html?next=role-select.html";
    } catch (err) {
      showFormError(form, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  });
}

function showError(inputEl, message) {
  const group = inputEl.closest(".form-group") || inputEl.closest(".form-checkbox");
  if (!group) return;
  const errorEl = document.createElement("div");
  errorEl.className = "form-error";
  errorEl.textContent = message;
  group.appendChild(errorEl);
}

function showFormError(form, message) {
  const errorEl = document.createElement("div");
  errorEl.className = "form-error";
  errorEl.textContent = message;
  form.insertBefore(errorEl, form.querySelector(".btn-primary"));
}

function clearErrors(form) {
  form.querySelectorAll(".form-error").forEach((el) => el.remove());
}