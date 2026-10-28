// Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag("js", new Date());
gtag("config", "G-LQD1PB867E");

const analyticsScript = document.createElement("script");
analyticsScript.async = true;
analyticsScript.src = "https://www.googletagmanager.com/gtag/js?id=G-LQD1PB867E";
document.head.appendChild(analyticsScript);

document.addEventListener("DOMContentLoaded", () => {
  const loadPartial = (selector, filename) => {
    const placeholder = document.querySelector(selector);
    if (!placeholder) return Promise.resolve();

    const candidates = [
      filename,
      `/${filename}`,
      `pages/${filename}`
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
        "magazine-view": "magazine",
        "article-view": "article",
        "beyond-business": "beyond-business"
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
    .then(() => loadLatestFooterMagazines())
    .catch(error => console.error("Error loading footer:", error));
});

function loadLatestFooterMagazines() {
  const list = document.getElementById("footer-insights-list");
  if (!list) return Promise.resolve();

  return fetch(new URL("js/magazines.json", document.baseURI))
    .then(r => r.ok ? r.json() : fetch(new URL("../js/magazines.json", document.baseURI)).then(r2 => r2.json()))
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      list.innerHTML = "";
      data.filter(m => m.visible !== false).slice(0, 4).forEach(mag => {
        const link = document.createElement("a");
        link.className = "footer-insight-item";
        link.href = `/magazine/${encodeURIComponent(mag.id)}/read`;
        link.setAttribute("aria-label", `Read ${mag.title || mag.id}`);

        const meta = document.createElement("span");
        meta.className = "footer-insight-meta";

        const tag = document.createElement("span");
        tag.className = "footer-insight-tag";
        tag.textContent = mag.category || "Featured";

        const time = document.createElement("span");
        time.className = "footer-insight-time";
        time.textContent = mag.edition || mag.issue || "";

        const title = document.createElement("span");
        title.className = "footer-insight-title";
        title.textContent = mag.shortTitle || mag.title || mag.id;

        const arrow = document.createElement("i");
        arrow.className = "fas fa-arrow-right footer-insight-arrow";
        arrow.setAttribute("aria-hidden", "true");

        meta.append(tag, time);
        link.append(meta, title, arrow);
        list.appendChild(link);
      });
    })
    .catch(() => {});
}
