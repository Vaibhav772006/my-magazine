document.addEventListener("DOMContentLoaded", () => {
  // Load navbar
  fetch("navbar.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("navbar-placeholder").innerHTML = data;

      // ✅ Highlight the active menu item
      const currentPage = window.location.pathname.split("/").pop();
      const links = document.querySelectorAll("#nav-links a"); // FIXED selector

      links.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
          link.classList.add("active");
        }
      });
    });

  // Load footer
  fetch("footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    });
});
