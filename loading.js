document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const nextPage = params.get("next") || "signup.html";

  setTimeout(() => {
    window.location.href = nextPage;
  }, 1600); // matches the loading bar animation duration in loading.css
});