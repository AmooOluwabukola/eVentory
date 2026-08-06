// Select Elements

const form = document.querySelector(".reset-form");
const newPasswordInput = document.querySelector("#new-password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const confirmButton = document.querySelector(".confirm-btn");
const passwordGroups = document.querySelectorAll(".form-group");

// Password Visibility Toggle

passwordGroups.forEach((group) => {
  const input = group.querySelector("input");
  const icon = group.querySelector("i");

  icon.addEventListener("click", () => {
    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";

    icon.classList.toggle("ph-eye");
    icon.classList.toggle("ph-eye-slash");
  });
});

// Error Functions

function showError(input, message) {
  const formGroup = input.parentElement;
  const errorMessage = formGroup.querySelector(".error-message");

  input.classList.add("error");

  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function clearError(input) {
  const formGroup = input.parentElement;
  const errorMessage = formGroup.querySelector(".error-message");

  input.classList.remove("error");

  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}

function clearAllErrors() {
  clearError(newPasswordInput);
  clearError(confirmPasswordInput);
}

// Password Validation

function validatePassword(password) {
  /*
      Requirements:
      - Minimum 8 characters
      - One uppercase letter
      - One lowercase letter
      - One number
      - One special character
  */

  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=])[A-Za-z\d@$!%*?&^#()_\-+=]{8,}$/;

  return regex.test(password);
}

// Submit Form

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearAllErrors();

  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  let hasError = false;

  // Empty password

  if (!newPassword) {
    showError(newPasswordInput, "Please enter a new password.");
    hasError = true;
  }

  // Password strength
  else if (!validatePassword(newPassword)) {
    showError(
      newPasswordInput,
      "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character.",
    );
    hasError = true;
  }

  // Empty confirmation

  if (!confirmPassword) {
    showError(confirmPasswordInput, "Please confirm your password.");
    hasError = true;
  }

  // Password match
  else if (newPassword !== confirmPassword) {
    showError(confirmPasswordInput, "Passwords do not match.");
    hasError = true;
  }

  if (hasError) return;

  // Disable button while request is processing

  confirmButton.disabled = true;
  confirmButton.textContent = "Updating Password...";

  try {
    // BACKEND ENDPOINT PLACEHOLDER

    const response = await fetch(
      "https://api-url.com/api/auth/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          password: newPassword,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to reset password.");
    }

    // Success

    confirmButton.textContent = "Password Updated ✓";

    setTimeout(() => {
      window.location.href = "loginPage.html";
    }, 2000);
  } catch (error) {
    showError(newPasswordInput, error.message);
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = "Click Here to Confirm";
  }
});

// Remove Error While Typing

[newPasswordInput, confirmPasswordInput].forEach((input) => {
  input.addEventListener("input", () => {
    clearError(input);
  });
});
