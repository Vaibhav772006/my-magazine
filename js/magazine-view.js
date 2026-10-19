document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magId = urlParams.get("id");
  const assetBaseUrl = new URL("js/magazines.json", document.baseURI);

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const fetchJson = (path) => fetch(new URL(path, document.baseURI));
  const resolveMagazineAsset = (path) =>
    path ? new URL(path, assetBaseUrl).href : "";

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));

  const loadJsonWithFallback = (file, errorMessage) =>
    fetchJson(`js/${file}`)
      .then((r) => (r.ok ? r : Promise.reject(new Error(errorMessage))))
      .catch(() => fetchJson(`../js/${file}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(errorMessage))));

  const articlesPromise = loadJsonWithFallback(
    "articles.json",
    "Unable to fetch related articles"
  );

  const articleUrl = (article, customUrl) => {
    const path = customUrl || `article/${encodeURIComponent(article.slug)}`;
    return path.startsWith("/") ? path : `/${path}`;
  };

  /* ---------- cover: wrap image in a PDF link ---------- */
  function setupCover(mag, pdfUrl) {
    const img = $("mag-view-cover");
    if (!img) return;

    img.src = resolveMagazineAsset(mag.cover);
    img.alt = `${mag.title} official cover`;

    let link = $("mag-cover-pdf-link");
    if (!link) {
      link = document.createElement("a");
      link.id = "mag-cover-pdf-link";
      link.className = "mag-cover-pdf-link";
      img.parentNode.insertBefore(link, img);
      link.appendChild(img);
    }

    if (pdfUrl) {
      link.href = pdfUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Read ${mag.title} (opens in a new tab)`);
    } else {
      // no PDF: cover is just an image, so unwrap the link behaviour
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("aria-label");
      link.style.cursor = "default";
    }
  }

  /* ---------- featured article ---------- */
  function renderFeaturedArticle(mag) {
    const section = $("mag-reader-featured");
    const card = $("mag-reader-featured-card");
    if (!section || !card || !mag.featuredArticle) return;

    articlesPromise
      .then((articles) => {
        if (!Array.isArray(articles)) throw new Error("Invalid articles repository");

        const ref = mag.featuredArticle;
        const article = articles.find((a) => String(a.id) === String(ref.id));
        if (!article) return;

        card.href = articleUrl(article, ref.url);

        const img = $("mag-reader-featured-image");
        img.src = new URL(article.cover, document.baseURI).href;
        img.alt = ""; // title is already in the card text

        $("mag-reader-featured-category").textContent = article.category || "Feature";
        $("mag-reader-featured-title").textContent = article.title;
        $("mag-reader-featured-excerpt").textContent =
          article.excerpt || article.subtitle || "";

        section.hidden = false;
      })
      .catch((error) => console.error(error));
  }

  /* ---------- related articles (horizontal cards) ---------- */
  function renderRelatedArticles(mag) {
    const section = $("mag-reader-articles");
    const list = $("mag-reader-articles-list");
    if (
      !section || !list ||
      !Array.isArray(mag.relatedArticles) ||
      mag.relatedArticles.length === 0
    ) return;

    articlesPromise
      .then((articles) => {
        if (!Array.isArray(articles)) throw new Error("Invalid articles repository");

        const byId = new Map(articles.map((a) => [String(a.id), a]));
        const related = mag.relatedArticles
          .map((ref) => (typeof ref === "string" ? { id: ref } : ref))
          .map((ref) => ({ article: byId.get(String(ref.id)), url: ref.url }))
          .filter(({ article }) => article);

        if (related.length === 0) return;

        const fragment = document.createDocumentFragment();

        related.forEach(({ article, url }) => {
          const href = escapeHtml(articleUrl(article, url));
          const title = escapeHtml(article.title);
          const category = escapeHtml(article.category || "Feature");
          const excerpt = escapeHtml(article.excerpt || article.subtitle || "");
          const cover = escapeHtml(new URL(article.cover, document.baseURI).href);

          const li = document.createElement("li");
          li.innerHTML = `
            <article class="mag-article-card">
              <a class="mag-article-card__media" href="${href}" tabindex="-1" aria-hidden="true">
                <img src="${cover}" alt="" width="240" height="160" loading="lazy" />
              </a>
              <div class="mag-article-card__body">
                <span class="mag-article-card__category">${category}</span>
                <h3 class="mag-article-card__title"><a href="${href}">${title}</a></h3>
                <p class="mag-article-card__excerpt">${excerpt}</p>
                <a class="mag-read-more" href="${href}" aria-label="Read more: ${title}">
                  Read more <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>`;
          fragment.appendChild(li);
        });

        list.replaceChildren(fragment);
        section.hidden = false;
      })
      .catch((error) => console.error(error));
  }

  /* ---------- share ---------- */
  function setupShare(mag) {
    const btn = $("mag-share-view-btn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      if (typeof shareMagazine === "function") {
        shareMagazine(mag.title, mag.preview, window.location.href);
        return;
      }
      const data = { title: mag.title, text: mag.preview || "", url: window.location.href };
      try {
        if (navigator.share) {
          await navigator.share(data);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(data.url);
          btn.lastChild.textContent = " Link copied";
          setTimeout(() => (btn.lastChild.textContent = " Share"), 2000);
        }
      } catch (_) { /* user cancelled */ }
    });
  }

  /* ---------- main ---------- */
  loadJsonWithFallback("magazines.json", "Unable to fetch magazine repository")
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty magazine repository");
      }
      const visible = data.filter((m) => m.visible !== false);
      if (visible.length === 0) throw new Error("No visible magazines available");

      const mag =
        (magId && visible.find((m) => m.id === magId || m.slug === magId)) ||
        visible[0];

      if (typeof updateMagazineSEO === "function") {
        updateMagazineSEO(mag, { pageType: "view" });
      }

      // Breadcrumb
      const crumb = $("mag-breadcrumb-preview");
      if (crumb) {
        crumb.href = "magazine";
        crumb.textContent = mag.shortTitle || "Edition Archive";
      }

      // Title, subtitle, description
      $("mag-view-title").textContent = mag.title;

      const subtitleEl = $("mag-view-subtitle");
      if (subtitleEl) {
        subtitleEl.textContent = mag.subtitle || "";
        subtitleEl.hidden = !mag.subtitle;
      }

      const descEl = $("mag-view-description");
      if (descEl) {
        descEl.textContent = mag.executiveSummary || mag.preview || "";
        descEl.hidden = !descEl.textContent;
      }

      // Badges
      const issueBadge = $("mag-view-badge-issue");
      if (issueBadge) {
        issueBadge.textContent = [mag.volume, mag.issue].filter(Boolean).join(" • ");
        issueBadge.hidden = !issueBadge.textContent;
      }

      const catBadge = $("mag-view-category");
      if (catBadge) {
        catBadge.textContent = mag.category || "";
        catBadge.hidden = !mag.category;
      }

      // Date (<time> element)
      const dateEl = $("mag-view-date");
      if (dateEl) {
        let label = mag.edition || "";
        const parsed = mag.publishedDate ? new Date(mag.publishedDate) : null;
        if (parsed && !isNaN(parsed)) {
          label = parsed.toLocaleDateString("en-US", { year: "numeric", month: "long" });
          dateEl.dateTime = parsed.toISOString().slice(0, 10);
        }
        dateEl.innerHTML = label
          ? `<i class="far fa-calendar-alt" aria-hidden="true"></i> ${escapeHtml(label)}`
          : "";
        dateEl.hidden = !label;
      }

      // PDF buttons + cover link
      const pdfUrl = mag.pdfUrl ? resolveMagazineAsset(mag.pdfUrl) : "";

      const pdfBtn = $("mag-view-pdf-btn");
      if (pdfBtn) {
        if (pdfUrl) pdfBtn.href = pdfUrl;
        pdfBtn.hidden = !pdfUrl;
      }

      setupCover(mag, pdfUrl);
      setupShare(mag);
      renderFeaturedArticle(mag);
      renderRelatedArticles(mag);
    })
    .catch((err) => {
      console.error(err);
      const layout = $("mag-view-main-layout");
      if (layout) {
        layout.innerHTML = `
          <div class="mag-error-msg" role="alert" style="max-width:600px;margin:60px auto;text-align:center;">
            <i class="fas fa-exclamation-triangle" aria-hidden="true" style="font-size:2rem;color:#e52e71;margin-bottom:15px;"></i>
            <h2>Edition Not Available</h2>
            <p>The requested magazine could not be displayed. Please browse our archive for available editions.</p>
            <br>
            <a href="magazine.html" class="mag-btn-primary">Back to Magazine Archive</a>
          </div>`;
      }
    });
});