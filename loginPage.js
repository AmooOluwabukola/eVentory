"use strict";

const API = {
  baseURL: "https://backend-group-3.onrender.com/api",

  login: "/auth/login",

  signupPage: "signup.html",
  dashboardPage: "dashboard.html",
  forgotPasswordPage: "forgot-password.html",
};

// Get DOM Elements

const loginForm = document.querySelector(".login-form");

const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const rememberMe = document.querySelector("#remember-me");

const loginButton = document.querySelector(".login-btn");

const forgotPasswordLink = document.querySelector(".login-forgot-password");

const signupLink = document.querySelector(".signup");

const passwordToggle = document.querySelector(".password-input i");

// Password Visibility

passwordToggle.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";

  passwordToggle.classList.toggle("ph-eye");
  passwordToggle.classList.toggle("ph-eye-slash");
});

// Remember Users

window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("rememberedEmail");

  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberMe.checked = true;
  }
});

// Validation Helpers

function showError(input, message) {
  input.classList.add("error");

  const formGroup = input.parentElement;

  const error = formGroup.querySelector(".error-message");

  error.textContent = message;
  error.style.display = "block";
}

function clearError(input) {
  input.classList.remove("error");

  const formGroup = input.parentElement;

  const error = formGroup.querySelector(".error-message");

  error.textContent = "";
  error.style.display = "none";
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);
}

function validateInputs() {
  let valid = true;

  clearError(emailInput);
  clearError(passwordInput);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (email === "") {
    showError(emailInput, "Email is required.");
    valid = false;
  } else if (!validateEmail(email)) {
    showError(emailInput, "Please enter a valid email.");
    valid = false;
  }

  if (password === "") {
    showError(passwordInput, "Password is required.");
    valid = false;
  } else if (password.length < 6) {
    showError(passwordInput, "Password must be at least 6 characters.");
    valid = false;
  }

  return valid;
}

// Button Loading State

function setLoading(isLoading) {
  loginButton.disabled = isLoading;

  loginButton.textContent = isLoading ? "Logging in..." : "Log in";
}

// Login Request

async function loginUser(email, password) {
  try {
    setLoading(true);

    const response = await fetch(`${API.baseURL}${API.login}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
      throw new Error(data.message || "Login failed.");
    }

    const { token, user } = data.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("store", JSON.stringify(user.storeName));

    if (rememberMe.checked) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    window.location.href = API.dashboardPage;
  } catch (error) {
    const message =
      error.message === "Failed to fetch"
        ? "Network connection lost."
        : error.message;

    showError(passwordInput, message);
    console.error(error);
  } finally {
    setLoading(false);
  }
}

// Form Submission

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateInputs()) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginUser(email, password);
});

// Live Validation

emailInput.addEventListener("input", () => {
  clearError(emailInput);
});

passwordInput.addEventListener("input", () => {
  clearError(passwordInput);
});

// Forgot Password

forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();

  window.location.href = "forgot-password.html";
});

// Sign up

if (signupLink) {
  signupLink.addEventListener("click", (event) => {
    event.preventDefault();

    window.location.href = API.signup;
  });
}
