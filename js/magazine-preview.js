document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magazineId = urlParams.get("id");
  const assetBaseUrl = new URL("js/magazines.json", document.baseURI);

  const fetchJson = (path) => fetch(new URL(path, document.baseURI));
  const resolveMagazineAsset = (path) => path ? new URL(path, assetBaseUrl).href : "";
  (fetchJson("js/magazines.json").then(r => r.ok ? r : Promise.reject()))
    .catch(() => fetchJson("../js/magazines.json"))
    .then(res => {
      if (!res.ok) throw new Error("Could not load magazines data");
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No magazine data available");
      }

      // Find magazine by id or slug; default to first if unspecified
      let magazine = null;
      if (magazineId) {
        magazine = data.find(m => m.id === magazineId || m.slug === magazineId);
      }
      if (!magazine) {
        magazine = data[0];
      }

      // Update SEO and Schema
      if (typeof updateMagazineSEO === "function") {
        updateMagazineSEO(magazine, { pageType: "preview" });
      }

      // Breadcrumbs
      const breadcrumbEl = document.getElementById("mag-breadcrumb-current");
      if (breadcrumbEl) {
        breadcrumbEl.textContent = magazine.shortTitle || magazine.title;
      }

      // Hero Elements
      document.getElementById("mag-preview-title").textContent = magazine.title;
      const subtitleEl = document.getElementById("mag-preview-subtitle");
      if (subtitleEl) {
        subtitleEl.textContent = magazine.subtitle || "";
        subtitleEl.style.display = magazine.subtitle ? "" : "none";
      }
      
      const coverImg = document.getElementById("mag-preview-image");
      coverImg.src = resolveMagazineAsset(magazine.cover);
      coverImg.alt = `${magazine.title} Official Cover`;

      // Category & Date
      const catEl = document.getElementById("mag-preview-category");
      if (catEl) {
        catEl.textContent = magazine.category || "";
        catEl.style.display = magazine.category ? "" : "none";
      }

      const dateEl = document.getElementById("mag-preview-date");
      if (dateEl) {
        const formattedDate = magazine.publishedDate
          ? new Date(magazine.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "long" })
          : magazine.edition || "";
        dateEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${formattedDate}`;
        dateEl.style.display = formattedDate ? "" : "none";
      }

      // Summary
      const summaryEl = document.getElementById("mag-preview-summary");
      const summaryBox = summaryEl ? summaryEl.closest(".mag-exec-summary-box") : null;
      if (summaryEl) {
        const summary = magazine.executiveSummary || magazine.preview || "";
        summaryEl.textContent = summary;
        if (summaryBox) summaryBox.style.display = summary ? "" : "none";
      }

      // Badges
      const badgesContainer = document.getElementById("mag-cover-badges");
      if (badgesContainer) {
        badgesContainer.innerHTML = "";
        if (magazine.featured) {
          badgesContainer.insertAdjacentHTML("beforeend", `<span class="mag-badge-featured"><i class="fas fa-star"></i> Featured Issue</span>`);
        }
        if (magazine.issue) {
          badgesContainer.insertAdjacentHTML("beforeend", `<span class="mag-badge-issue">${magazine.volume ? magazine.volume + " • " : ""}${magazine.issue}</span>`);
        }
      }

      // Quick Specs: hide each item when its source data is unavailable.
      const specs = [
        ["spec-issue", magazine.volume || magazine.issue ? `${magazine.volume || ""}${magazine.volume && magazine.issue ? ", " : ""}${magazine.issue || ""}` : ""],
        ["spec-reading", magazine.readingTime || ""],
        ["spec-pages", magazine.pageCount ? `${magazine.pageCount} Pages` : ""],
        ["spec-issn", magazine.issn || ""]
      ];
      specs.forEach(([id, value]) => {
        const valueEl = document.getElementById(id);
        const item = valueEl ? valueEl.closest(".mag-spec-item") : null;
        if (valueEl) valueEl.textContent = value;
        if (item) item.style.display = value ? "" : "none";
      });
      const specsGrid = document.getElementById("mag-specs-grid");
      if (specsGrid) {
        specsGrid.style.display = specs.some(([, value]) => value) ? "" : "none";
      }

      // Buttons
      const readMoreBtn = document.getElementById("mag-read-more");
      if (readMoreBtn) {
        readMoreBtn.href = `magazine-view.html?id=${encodeURIComponent(magazine.id)}`;
      }

      const pdfBtn = document.getElementById("mag-download-pdf");
      if (pdfBtn) {
        if (magazine.pdfUrl) {
          pdfBtn.href = resolveMagazineAsset(magazine.pdfUrl);
          pdfBtn.style.display = "inline-flex";
        } else {
          pdfBtn.style.display = "none";
        }
      }

      const shareBtn = document.getElementById("mag-share-btn");
      if (shareBtn) {
        shareBtn.addEventListener("click", () => {
          if (typeof shareMagazine === "function") {
            shareMagazine(magazine.title, magazine.preview, window.location.href);
          }
        });
      }

      // Table of Contents
      const tocSection = document.getElementById("mag-toc-section");
      const tocGrid = document.getElementById("mag-toc-grid");
      if (tocSection && tocGrid && Array.isArray(magazine.tableOfContents) && magazine.tableOfContents.length > 0) {
        tocSection.style.display = "block";
        tocGrid.innerHTML = "";
        magazine.tableOfContents.forEach(item => {
          tocGrid.insertAdjacentHTML("beforeend", `
            <div class="mag-toc-card">
              <div class="mag-toc-page">Page ${item.page || "•"}</div>
              <div class="mag-toc-details">
                <span class="mag-toc-cat">${item.category || "Feature"}</span>
                <h4>${item.title}</h4>
                <p class="mag-toc-snippet">${item.snippet || ""}</p>
                <span class="mag-toc-author"><i class="fas fa-pen-nib"></i> By ${item.author || "Editorial Team"}</span>
              </div>
            </div>
          `);
        });
      }

      // Visionary Quotes
      const quotesSection = document.getElementById("mag-quotes-section");
      const quotesGrid = document.getElementById("mag-quotes-grid");
      if (quotesSection && quotesGrid && Array.isArray(magazine.featuredQuotes) && magazine.featuredQuotes.length > 0) {
        quotesSection.style.display = "block";
        quotesGrid.innerHTML = "";
        magazine.featuredQuotes.forEach(q => {
          quotesGrid.insertAdjacentHTML("beforeend", `
            <blockquote class="mag-quote-card">
              <div class="mag-quote-mark">“</div>
              <p class="mag-quote-text">${q.quote}</p>
              <footer class="mag-quote-author">
                <strong>${q.author}</strong>
                <span>${q.role || ""}</span>
              </footer>
            </blockquote>
          `);
        });
      }

      // Related / Other Editions
      const relatedGrid = document.getElementById("mag-related-grid");
      if (relatedGrid) {
        relatedGrid.innerHTML = "";
        const others = data.filter(m => m.id !== magazine.id).slice(0, 4);
        others.forEach(m => {
          const category = m.category ? `<span class="mag-tag">${m.category}</span>` : "";
          const preview = m.preview
            ? `<p>${m.preview.substring(0, 90)}...</p>`
            : "";
          relatedGrid.insertAdjacentHTML("beforeend", `
            <a href="magazine-preview.html?id=${encodeURIComponent(m.id)}" class="mag-related-card">
              <img src="${resolveMagazineAsset(m.cover)}" alt="${m.title} Cover" loading="lazy" />
              <div class="mag-related-info">
                ${category}
                <h4>${m.title}</h4>
                ${preview}
              </div>
            </a>
          `);
        });
      }
    })
    .catch(err => {
      console.error(err);
      const container = document.getElementById("mag-preview-main");
      if (container) {
        container.innerHTML = `
          <div class="mag-error-msg" style="max-width: 600px; margin: 80px auto; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e52e71; margin-bottom: 15px;"></i>
            <h3>Edition Not Found</h3>
            <p>The requested magazine edition could not be loaded or does not exist.</p>
            <br>
            <a href="magazine.html" class="mag-btn-primary">Browse All Magazines</a>
          </div>
        `;
      }
    });
});
