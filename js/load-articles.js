/**
 * Centralized Article Loader for The Empire Insight
 * Reads directly from js/articles.json to dynamically render article archives
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

  const fetchJson = (path) => fetch(new URL(path, document.baseURI));
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

      const visibleData = data.filter(a => a.visible !== false);

      // Update count badge if present
      const countEl = document.querySelector(".ed-stories-wrap .ed-section-link");
      if (countEl) {
        countEl.textContent = `${visibleData.length} Article${visibleData.length === 1 ? "" : "s"}`;
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
