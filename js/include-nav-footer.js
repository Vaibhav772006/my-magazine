document.addEventListener("DOMContentLoaded", () => {
  const loadPartial = (selector, filename) => {
    const placeholder = document.querySelector(selector);
    if (!placeholder) return Promise.resolve();

    const candidates = [
      `../pages/${filename}`,
      `pages/${filename}`,
      `/pages/${filename}`,
      filename,
      `/${filename}`
    ];

    const tryFetch = (index) => {
      if (index >= candidates.length) {
        return Promise.reject(new Error(`Unable to load partial ${filename}`));
      }
      return fetch(new URL(candidates[index], document.baseURI))
        .then(response => {
          if (!response.ok) return tryFetch(index + 1);
          return response.text();
        })
        .catch(() => tryFetch(index + 1));
    };

    return tryFetch(0).then(data => {
      placeholder.innerHTML = data;
    });
  };

  // Load navbar
  loadPartial("#navbar-placeholder", "navbar.html")
    .then(() => {
      // Highlight active link with clean URL normalization
      const normalize = (p) => {
        if (!p) return "index";
        let clean = p.split("?")[0].split("#")[0].replace(/\.html$/, "").replace(/^\/+|\/+$/g, "").split("/").pop() || "index";
        if (clean === "magazines") clean = "magazine";
        if (clean === "articles") clean = "article";
        return clean;
      };

      const currentNorm = normalize(window.location.pathname);
      const sectionMap = {
        "magazine-preview": "magazine",
        "magazine-view": "magazine",
        "article-view": "article"
      };
      const target = sectionMap[currentNorm] || currentNorm;

      const links = document.querySelectorAll(".primary-nav a, #nav-links a");
      links.forEach(link => {
        const linkNorm = normalize(new URL(link.href, document.baseURI).pathname);
        if (linkNorm === target) {
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
  loadPartial("#footer-placeholder", "footer.html")
    .catch(error => console.error("Error loading footer:", error));
});

