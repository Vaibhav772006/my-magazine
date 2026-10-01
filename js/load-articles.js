document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("articles-container");
  if (!container) return;

  const categories = {
    "1": "Leadership",
    "2": "Culture",
    "3": "Strategy",
    "4": "Finance",
    "5": "Agility"
  };

  fetch("../js/articles.json")
    .then(res => {
      if (!res.ok) throw new Error("Could not load articles");
      return res.json();
    })
    .then(data => {
      container.innerHTML = "";
      data.forEach(article => {
        const cat = categories[article.id] || "Insight";
        const card = document.createElement("article");
        card.className = "ed-story-card";

        card.innerHTML = `
          <a href="article-view.html?id=${encodeURIComponent(article.id)}" class="ed-story-cover-link" aria-label="Read ${article.title}">
            <img src="${article.cover}" alt="${article.title}" class="ed-story-cover" loading="lazy" />
          </a>
          <div class="ed-story-body">
            <span class="ed-story-cat">${cat}</span>
            <h3 class="ed-story-title">
              <a href="article-view.html?id=${encodeURIComponent(article.id)}">${article.title}</a>
            </h3>
            <p class="ed-story-subtitle">${article.subtitle || ""}</p>
            <div class="ed-story-footer">
              <a href="article-view.html?id=${encodeURIComponent(article.id)}" class="ed-story-link">
                Read Story &rarr;
              </a>
            </div>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="ed-error-text">Articles are temporarily unavailable.</p>';
    });
});
