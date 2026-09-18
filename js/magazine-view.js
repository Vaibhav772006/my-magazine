document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const magId = urlParams.get("id");

  fetch("../js/magazines.json")
    .then(res => {
      if (!res.ok) throw new Error("Unable to fetch magazine repository");
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty magazine repository");
      }

      // Find magazine by id or slug; default to first
      let mag = null;
      if (magId) {
        mag = data.find(m => m.id === magId || m.slug === magId);
      }
      if (!mag) {
        mag = data[0];
      }

      // Update SEO and Schema.org Structured Data
      if (typeof updateMagazineSEO === "function") {
        updateMagazineSEO(mag, { pageType: "view" });
      }

      // Breadcrumbs
      const breadcrumbPreview = document.getElementById("mag-breadcrumb-preview");
      if (breadcrumbPreview) {
        breadcrumbPreview.href = `magazine-preview.html?id=${encodeURIComponent(mag.id)}`;
        breadcrumbPreview.textContent = mag.shortTitle || "Edition Preview";
      }

      // Banner Elements
      document.getElementById("mag-view-title").textContent = mag.title;
      document.getElementById("mag-view-subtitle").textContent = mag.subtitle || "";

      const issueBadge = document.getElementById("mag-view-badge-issue");
      if (issueBadge && mag.issue) {
        issueBadge.textContent = `${mag.volume ? mag.volume + " • " : ""}${mag.issue}`;
      }

      const catBadge = document.getElementById("mag-view-category");
      if (catBadge) {
        catBadge.textContent = mag.category || "Executive Edition";
      }

      const dateBadge = document.getElementById("mag-view-date");
      if (dateBadge) {
        const formatted = mag.publishedDate 
          ? new Date(mag.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "long" })
          : (mag.edition || "");
        dateBadge.innerHTML = `<i class="far fa-calendar-alt"></i> ${formatted}`;
      }

      // Top Toolbar Buttons
      const shareBtn = document.getElementById("mag-share-view-btn");
      if (shareBtn) {
        shareBtn.addEventListener("click", () => {
          if (typeof shareMagazine === "function") {
            shareMagazine(mag.title, mag.preview, window.location.href);
          }
        });
      }

      const pdfTopBtn = document.getElementById("mag-view-pdf-btn");
      if (pdfTopBtn) {
        if (mag.pdfUrl) {
          pdfTopBtn.href = mag.pdfUrl;
          pdfTopBtn.style.display = "inline-flex";
        } else {
          pdfTopBtn.style.display = "none";
        }
      }

      // Cover & Editorial Content
      const coverEl = document.getElementById("mag-view-cover");
      if (coverEl) {
        coverEl.src = mag.cover;
        coverEl.alt = `${mag.title} Official Feature Cover`;
      }

      const contentEl = document.getElementById("mag-view-content");
      if (contentEl) {
        contentEl.innerHTML = mag.content || `<p>${mag.preview || ""}</p>`;
      }

      // Reader Table of Contents
      const readerToc = document.getElementById("mag-reader-toc");
      const readerTocList = document.getElementById("mag-reader-toc-list");
      if (readerToc && readerTocList && Array.isArray(mag.tableOfContents) && mag.tableOfContents.length > 0) {
        readerToc.style.display = "block";
        readerTocList.innerHTML = "";
        mag.tableOfContents.forEach(item => {
          readerTocList.insertAdjacentHTML("beforeend", `
            <div class="mag-reader-toc-item">
              <span class="toc-num">P. ${item.page || "•"}</span>
              <div class="toc-text">
                <strong>${item.title}</strong>
                <p>${item.snippet || ""}</p>
                <small><i class="fas fa-user-edit"></i> ${item.author || "Editorial Board"}</small>
              </div>
            </div>
          `);
        });
      }

      // Visionary Quotes
      const quotesSection = document.getElementById("mag-reader-quotes");
      const quotesContainer = document.getElementById("mag-reader-quote-container");
      if (quotesSection && quotesContainer && Array.isArray(mag.featuredQuotes) && mag.featuredQuotes.length > 0) {
        quotesSection.style.display = "block";
        quotesContainer.innerHTML = "";
        mag.featuredQuotes.forEach(q => {
          quotesContainer.insertAdjacentHTML("beforeend", `
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

      // Editor Byline
      if (mag.editor) {
        const editorName = document.getElementById("mag-editor-name");
        const editorRole = document.getElementById("mag-editor-role");
        if (editorName) editorName.textContent = mag.editor.name;
        if (editorRole) editorRole.textContent = mag.editor.role;
      }

      // Tags
      const tagsContainer = document.getElementById("mag-view-tags");
      if (tagsContainer && Array.isArray(mag.tags)) {
        tagsContainer.innerHTML = "";
        mag.tags.forEach(t => {
          tagsContainer.insertAdjacentHTML("beforeend", `<span class="mag-tag">${t}</span>`);
        });
      }

      // Sidebar Specs
      document.getElementById("sidebar-edition").textContent = mag.edition || "Current Edition";
      document.getElementById("sidebar-date").textContent = mag.publishedDate || "2025";
      document.getElementById("sidebar-volume").textContent = `${mag.volume || "Vol. 1"}, ${mag.issue || "Issue 1"}`;
      document.getElementById("sidebar-issn").textContent = mag.issn || "2834-9121";
      document.getElementById("sidebar-pages").textContent = mag.pageCount ? `${mag.pageCount} Pages` : "48 Pages";
      document.getElementById("sidebar-reading").textContent = mag.readingTime || "30 min read";

      // Sidebar PDF Download
      const sidebarPdfCard = document.getElementById("sidebar-pdf-card");
      const sidebarPdfLink = document.getElementById("sidebar-pdf-link");
      if (sidebarPdfCard && sidebarPdfLink) {
        if (mag.pdfUrl) {
          sidebarPdfCard.style.display = "block";
          sidebarPdfLink.href = mag.pdfUrl;
        } else {
          sidebarPdfCard.style.display = "none";
        }
      }

      // Sidebar Latest Issues
      const latestContainer = document.getElementById("mag-latest-container");
      if (latestContainer) {
        latestContainer.innerHTML = "";
        const latestMags = data.filter(m => m.id !== mag.id).slice(0, 5);

        latestMags.forEach(m => {
          const card = document.createElement("a");
          card.href = `magazine-preview.html?id=${encodeURIComponent(m.id)}`;
          card.className = "mag-latest-card";
          card.innerHTML = `
            <img src="${m.cover}" alt="${m.title}" class="mag-latest-img" loading="lazy" />
            <div class="mag-latest-info">
              <span class="mag-tag-micro">${m.category || "Issue"}</span>
              <h4>${m.shortTitle || m.title}</h4>
              <p>${m.edition || ""}</p>
            </div>
          `;
          latestContainer.appendChild(card);
        });
      }
    })
    .catch(err => {
      console.error(err);
      const layout = document.getElementById("mag-view-main-layout");
      if (layout) {
        layout.innerHTML = `
          <div class="mag-error-msg" style="max-width: 600px; margin: 60px auto; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e52e71; margin-bottom: 15px;"></i>
            <h3>Edition Not Available</h3>
            <p>The requested magazine could not be displayed. Please browse our archive for available editions.</p>
            <br>
            <a href="magazine.html" class="mag-btn-primary">Back to Magazine Archive</a>
          </div>
        `;
      }
    });
});

