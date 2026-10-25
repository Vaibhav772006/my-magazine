/**
 * Centralized Article Loader for The Empire Insight
 * Reads directly from js/articles.json to dynamically render article archives
 * Supports section filtering: "featured-stories" vs "beyond-business"
 */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("articles-container");
  if (!container) return;

  const fallbackCategories = {
    "1": "Transformational Leadership",
    "2": "Organizational Culture",
    "3": "Executive Strategy",
    "4": "Metrics & Governance",
    "5": "Strategic Agility"
  };

  function resolveCover(cover) {
    if (!cover) return "images/article-pdf&cover/article1.jpg";
    if (cover.startsWith("http://") || cover.startsWith("https://") || cover.startsWith("/")) {
      return cover;
    }
    return cover.replace(/^\.\.\//, "");
  }

  // Determine target section
  const urlParams = new URLSearchParams(window.location.search);
  const paramSection = urlParams.get("section");
  const path = window.location.pathname.toLowerCase();

  let targetSection = container.getAttribute("data-section") || paramSection;
  if (!targetSection) {
    if (path.includes("beyond-business")) {
      targetSection = "beyond-business";
    } else if (path.includes("article")) {
      targetSection = "featured-stories";
    }
  }

  const isMatchingSection = (article, sec) => {
    if (!sec) return true;
    const aSec = String(article.section || "").toLowerCase().trim();
    if (sec === "beyond-business") {
      return aSec === "beyond-business" || aSec === "beyond business" || (!aSec && !article.leader);
    }
    if (sec === "featured-stories") {
      return aSec === "featured-stories" || aSec === "featured stories" || (!aSec && Boolean(article.leader));
    }
    return true;
  };

  const fetchJson = (p) => fetch(new URL(p, document.baseURI));
  (fetchJson("js/articles.json").then(r => r.ok ? r : Promise.reject()))
    .catch(() => fetchJson("../js/articles.json"))
    .then(res => {
      if (!res.ok) throw new Error("Could not load articles");
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p class="ed-empty-text">No articles published yet.</p>';
        return;
      }

      const visibleData = data
        .filter(a => a.visible !== false)
        .filter(a => isMatchingSection(a, targetSection));

      // Update count badge if present
      const countEl = document.querySelector(".ed-stories-wrap .ed-section-link");
      if (countEl) {
        countEl.textContent = `${visibleData.length} Article${visibleData.length === 1 ? "" : "s"}`;
      }

      if (visibleData.length === 0) {
        container.innerHTML = '<p class="ed-empty-text">No articles found in this section yet.</p>';
        return;
      }

      container.innerHTML = "";
      visibleData.forEach(article => {
        const cat = article.category || fallbackCategories[article.id] || "Executive Insight";
        const coverSrc = resolveCover(article.cover);
        const readTime = article.readingTime || "5 min read";
        const dateFormatted = article.publishedDate 
          ? new Date(article.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) 
          : "";

        const card = document.createElement("article");
        card.className = "ed-story-card";

        const leaderBadge = article.leader 
          ? `<span class="ed-story-leader"><i class="fas fa-user-tie"></i> ${article.leader}</span>`
          : "";

        card.innerHTML = `
          <a href="/article/${encodeURIComponent(article.slug)}" class="ed-story-cover-link" aria-label="Read ${article.title}">
            <img src="${coverSrc}" alt="${article.title}" class="ed-story-cover" loading="lazy" onerror="this.onerror=null;this.src='images/assets/bg.jpg';" />
          </a>
          <div class="ed-story-body">
            <div class="ed-story-meta-row">
              <span class="ed-story-cat">${cat}</span>
              ${dateFormatted ? `<span class="ed-story-date">${dateFormatted}</span>` : ""}
            </div>
            ${leaderBadge}
            <h3 class="ed-story-title">
              <a href="/article/${encodeURIComponent(article.slug)}">${article.title}</a>
            </h3>
            <p class="ed-story-subtitle">${article.subtitle || article.excerpt || ""}</p>
            <div class="ed-story-footer">
              <span class="ed-story-readtime"><i class="far fa-clock"></i> ${readTime}</span>
              <a href="/article/${encodeURIComponent(article.slug)}" class="ed-story-link">
                Read Story &rarr;
              </a>
            </div>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Error loading articles:", err);
      container.innerHTML = '<p class="ed-error-text">Articles are temporarily unavailable. Please check back shortly.</p>';
    });
});
