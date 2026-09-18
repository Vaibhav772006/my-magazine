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
      // Highlight active link
      const currentPage = window.location.pathname.split("/").pop() || "index.html";
      const links = document.querySelectorAll(".primary-nav a, #nav-links a");
      links.forEach(link => {
        const linkPage = new URL(link.href, document.baseURI).pathname.split("/").pop() || "index.html";
        if (linkPage === currentPage) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });

      // Mobile hamburger toggle setup
      const toggleBtn = document.getElementById("nav-toggle") || document.querySelector(".nav-toggle") || document.querySelector(".menu-toggle");
      const navMenu = document.getElementById("primary-nav") || document.getElementById("nav-links");

      if (toggleBtn && navMenu) {
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = navMenu.classList.toggle("open");
          toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        document.addEventListener("click", (e) => {
          if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove("open");
            toggleBtn.setAttribute("aria-expanded", "false");
          }
        });
      }
    })
    .catch(error => console.error("Error loading navbar:", error));

  // Load footer
  loadPartial("#footer-placeholder", "../pages/footer.html")
    .catch(error => console.error("Error loading footer:", error));
});
