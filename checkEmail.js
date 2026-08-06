"use strict";

const API = {
  BASE_URL: "https://backend-group-3.onrender.com/api",
  RESEND_EMAIL: "/auth/forgot-password",
};

// Get DOM Elements

const emailPlaceholder = document.querySelector(".email-placeholder");

const openEmailButton = document.querySelector(".secondary-btn");

const resendButton = document.querySelector(".primary-btn");

const resendCounter = document.querySelector(".resend-btn");

// Storage Keys

const EMAIL_KEY = "resetEmail";
const COUNTDOWN_KEY = "resetEmailCountdownEnd";

const COUNTDOWN_DURATION = 60;

// Initialisation

let userEmail = sessionStorage.getItem(EMAIL_KEY);

if (!userEmail) {
  userEmail = localStorage.getItem(EMAIL_KEY);
}

if (userEmail) {
  emailPlaceholder.textContent = userEmail;
} else {
  emailPlaceholder.textContent = "your email";
}

// Open Email App

openEmailButton.addEventListener("click", () => {
  window.location.href = "mailto:";
});

// Resend Timrr

function startCountdown(seconds = COUNTDOWN_DURATION) {
  const expires = Date.now() + seconds * 1000;

  sessionStorage.setItem(COUNTDOWN_KEY, expires);

  updateCountdown();
}

function updateCountdown() {
  const interval = setInterval(() => {
    const expires = Number(sessionStorage.getItem(COUNTDOWN_KEY));

    if (!expires) {
      clearInterval(interval);
      enableResendButton();
      return;
    }

    const remaining = Math.ceil((expires - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(interval);

      sessionStorage.removeItem(COUNTDOWN_KEY);

      enableResendButton();

      return;
    }

    resendButton.disabled = true;
    resendCounter.textContent = remaining;
  }, 500);
}

function enableResendButton() {
  resendButton.disabled = false;
  resendCounter.textContent = "0";
  resendButton.innerHTML = "Resend email";
}

const storedExpiry = sessionStorage.getItem(COUNTDOWN_KEY);

if (storedExpiry) {
  const remaining = Math.ceil((Number(storedExpiry) - Date.now()) / 1000);

  if (remaining > 0) {
    updateCountdown();
  } else {
    sessionStorage.removeItem(COUNTDOWN_KEY);
    enableResendButton();
  }
} else {
  startCountdown();
}

// Error Message

function showInlineError(message) {
  clearInlineError();

  const existing = document.createElement("p");
  existing.className = "input-error";
  existing.textContent = message;

  resendButton.insertAdjacentElement("afterend", existing);
}

function clearInlineError() {
  document.querySelector(".input-error")?.remove();
}

// Loading State

function setLoading(isLoading) {
  resendButton.disabled = isLoading;

  if (isLoading) {
    resendButton.textContent = "Sending...";
  } else {
    resendButton.innerHTML =
      'Resend email (<span class="resend-btn">60</span>s)';
  }
}

// Resend Email

async function resendEmail() {
  clearInlineError();

  if (!userEmail) {
    showInlineError("Email address not found.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(`${API.BASE_URL}${API.RESEND_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to resend email.");
    }

    setLoading(false);

    startCountdown();
  } catch (error) {
    setLoading(false);

    showInlineError(error.message);
  }
}

// Event

resendButton.addEventListener("click", () => {
  if (resendButton.disabled) return;

  resendEmail();
});
