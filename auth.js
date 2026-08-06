// eventory — signup page behavior

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
    const storeName = form.storeName.value.trim();
    const email = form.email.value.trim();
    const phoneNumber = form.phoneNumber.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const termsAccepted = form.terms.checked;

    let hasError = false;

    if (!fullName) {
      showError(form.fullName, "Full name is required.");
      hasError = true;
    }

    if (!storeName) {
      showError(form.storeName, "Store name is required.");
      hasError = true;
    }

    if (!email) {
      showError(form.email, "Email is required.");
      hasError = true;
    }

    if (!phoneNumber) {
      showError(form.phoneNumber, "Phone number is required.");
      hasError = true;
    }

    if (password.length < 6) {
      showError(form.password, "Password must be at least 6 characters.");
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

    try {
      const data = await EvApi.json("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          storeName,
          phoneNumber,
          email,
          password,
        }),
      });

      const payload = data.data || data;

      if (payload.token) {
        localStorage.setItem("token", payload.token);
      }

      if (payload.user) {
        localStorage.setItem("user", JSON.stringify(payload.user));
      }

      if (payload.store) {
        localStorage.setItem("store", JSON.stringify(payload.store));
      }

      window.location.href = "dashboard.html";
    } catch (err) {
      const message =
        err.name === "TypeError"
          ? "Unable to reach the server. Please check your connection and try again."
          : err.message;
      showFormError(form, message);
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
