/**
 * SEO & Structured Data Helper for The Empire Insights Magazines
 * Centralizes meta tag updates, Open Graph, Twitter Cards, and Schema.org JSON-LD
 */

function setMetaTag(name, content, isProperty = false) {
  if (!content) return;
  const attribute = isProperty ? "property" : "name";
  let tag = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

function toAbsoluteUrl(relativeOrAbsolute) {
  try {
    return new URL(relativeOrAbsolute, window.location.href).href;
  } catch (e) {
    return relativeOrAbsolute;
  }
}

/**
 * Updates full SEO suite for a given magazine edition
 * @param {Object} mag - The magazine data object
 * @param {Object} options - Optional overrides (pageType: 'preview' | 'view' | 'archive')
 */
function updateMagazineSEO(mag, options = {}) {
  if (!mag) return;

  const currentUrl = window.location.href;
  const pageTitle = mag.seo?.metaTitle || `${mag.title} | The Empire Insights`;
  const metaDesc = mag.seo?.metaDescription || mag.preview || mag.subtitle;
  const keywords = Array.isArray(mag.seo?.keywords) 
    ? mag.seo.keywords.join(", ") 
    : (mag.tags ? mag.tags.join(", ") : "magazine, business, leadership");
  const coverUrl = toAbsoluteUrl(mag.cover || "../images/logo.png");

  // Document Title
  document.title = pageTitle;

  // Canonical Tag
  setCanonical(currentUrl);

  // Standard Meta Tags
  setMetaTag("description", metaDesc);
  setMetaTag("keywords", keywords);
  setMetaTag("robots", "index, follow, max-snippet:-1, max-image-preview:large");
  setMetaTag("author", mag.editor?.name || "The Empire Insights Editorial Board");

  // Open Graph (Facebook / LinkedIn)
  setMetaTag("og:title", pageTitle, true);
  setMetaTag("og:description", metaDesc, true);
  setMetaTag("og:type", "article", true);
  setMetaTag("og:url", currentUrl, true);
  setMetaTag("og:image", coverUrl, true);
  setMetaTag("og:site_name", "The Empire Insights", true);

  // Twitter Cards
  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", pageTitle);
  setMetaTag("twitter:description", metaDesc);
  setMetaTag("twitter:image", coverUrl);

  // Schema.org JSON-LD (PublicationIssue + Periodical)
  const publicationIssueSchema = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    "name": mag.title,
    "headline": mag.subtitle || mag.title,
    "issueNumber": mag.issue || "1",
    "volumeNumber": mag.volume || "1",
    "datePublished": mag.publishedDate || new Date().toISOString().split("T")[0],
    "description": metaDesc,
    "image": coverUrl,
    "url": currentUrl,
    "inLanguage": "en-US",
    "issn": mag.issn || "2834-9121",
    "pageCount": mag.pageCount || 50,
    "isPartOf": {
      "@type": "Periodical",
      "name": "The Empire Insights",
      "issn": mag.issn || "2834-9121",
      "publisher": {
        "@type": "Organization",
        "name": "The Empire Insights",
        "logo": {
          "@type": "ImageObject",
          "url": toAbsoluteUrl("../images/logo.png")
        }
      }
    }
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": toAbsoluteUrl("index.html")
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Magazines",
        "item": toAbsoluteUrl("magazine.html")
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": mag.shortTitle || mag.title,
        "item": currentUrl
      }
    ]
  };

  setJsonLd("magazine-schema", publicationIssueSchema);
  setJsonLd("breadcrumb-schema", breadcrumbSchema);
}

/**
 * Share utility with native Web Share API & toast fallback
 */
function shareMagazine(title, text, url) {
  const shareData = {
    title: title || document.title,
    text: text || "Check out this edition of The Empire Insights Magazine:",
    url: url || window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareData.url).then(() => {
      showToast("Link copied to clipboard!");
    }).catch(() => {
      prompt("Copy magazine link:", shareData.url);
    });
  }
}

/**
 * Lightweight Toast notification
 */
function showToast(message) {
  let toast = document.getElementById("magazine-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "magazine-toast";
    toast.className = "magazine-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
