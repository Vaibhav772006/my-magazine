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
    .then(() => loadLatestFooterMagazines())
    .catch(error => console.error("Error loading footer:", error));
});

function loadLatestFooterMagazines() {
  const list = document.getElementById("footer-insights-list");
  if (!list) return Promise.resolve();

  return fetch(new URL("js/magazines.json", document.baseURI))
    .then(response => {
      if (!response.ok) throw new Error("Unable to load magazine editions");
      return response.json();
    })
    .then(magazines => {
      const visibleMagazines = magazines
        .filter(magazine => magazine.visible !== false)
        .sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));

      list.replaceChildren();
      visibleMagazines.forEach(magazine => {
        const link = document.createElement("a");
        link.className = "footer-insight-item";
        link.href = `/magazine/${encodeURIComponent(magazine.id)}/read`;

        const meta = document.createElement("div");
        meta.className = "footer-insight-meta";

        const tag = document.createElement("span");
        tag.className = "footer-insight-tag";
        tag.textContent = magazine.category || (magazine.tags && magazine.tags[0]) || "Leadership";

        const date = document.createElement("span");
        date.className = "footer-insight-time";
        date.textContent = magazine.edition || "Digital Edition";

        const title = document.createElement("h4");
        title.className = "footer-insight-title";
        title.textContent = magazine.title;

        const arrow = document.createElement("span");
        arrow.className = "footer-insight-arrow";
        arrow.innerHTML = "&rarr;";

        meta.append(tag, date);
        link.append(meta, title, arrow);
        list.appendChild(link);
      });
    })
    .catch(error => {
      console.error("Error loading footer magazines:", error);
      list.innerHTML = '<span class="footer-insight-time">Latest editions are temporarily unavailable.</span>';
    });
}
