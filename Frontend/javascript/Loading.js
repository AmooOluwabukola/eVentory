// eventory — loading/splash screen
// Redirects automatically after a short delay. The destination page can be
// passed as a query param, e.g. loading.html?next=login.html — falls back
// to signup.html if none is given.

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const nextPage = params.get("next") || "signup.html";

  setTimeout(() => {
    window.location.href = nextPage;
  }, 1600); // matches the loading bar animation duration in loading.css
});