document.addEventListener("DOMContentLoaded", () => {
  const loadPartial = (selector, path) => {
    const placeholder = document.querySelector(selector);
    if (!placeholder) return Promise.resolve();

    return fetch(new URL(path, document.baseURI))
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load ${path}`);
        return response.text();
      })
      .then(data => {
        placeholder.innerHTML = data;
      });
  };

  // Load navbar
  loadPartial("#navbar-placeholder", "../pages/navbar.html")
    .then(() => {
      // ✅ Highlight the active menu item
      const currentPage = window.location.pathname.split("/").pop();
      const links = document.querySelectorAll("#nav-links a");
      links.forEach(link => {
        if (new URL(link.href).pathname.split("/").pop() === currentPage) {
          link.classList.add("active");
        }
      });
    })
    .catch(error => console.error(error));

  // Load footer
  loadPartial("#footer-placeholder", "../pages/footer.html")
    .catch(error => console.error(error));
});
// ✅ This function sets margin-top for all banners
function adjustBannerTop() {
  const navbar = document.querySelector("header");
  const banners = document.querySelectorAll(".page-banner");

  if (navbar && banners.length > 0) {
    const navHeight = navbar.offsetHeight;

    banners.forEach(banner => {
      banner.style.marginTop = navHeight + "px";
    });
  }
}