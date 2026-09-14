document.addEventListener("DOMContentLoaded", () => {
  // Load navbar
  fetch("../pages/navbar.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("navbar-placeholder").innerHTML = data;

      // ✅ Highlight the active menu item
      const currentPage = window.location.pathname.split("/").pop();
      const links = document.querySelectorAll("#nav-links a");
      links.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
          link.classList.add("active");
        }
      });
    });

  // Load footer
  fetch("../pages/footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    });
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