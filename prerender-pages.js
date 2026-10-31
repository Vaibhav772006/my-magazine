/**
 * The Empire Insight — Static Content Pre-Renderer & Site Builder
 * Injects 100% pre-rendered HTML into all pages, generates static magazine pages,
 * and updates sitemaps for instant search engine indexing with zero-JS crawling.
 *
 * Usage: node prerender-pages.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, 'magazine');
const SITE_URL = 'https://www.theempireinsight.com';

// ── 1. Read Data ──────────────────────────────────────────────────────────────
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'articles.json'), 'utf8').replace(/^\uFEFF/, ''))
  .filter(a => a.visible !== false);

const magazines = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'magazines.json'), 'utf8').replace(/^\uFEFF/, ''))
  .filter(m => m.visible !== false);

const navbarHtml = fs.readFileSync(path.join(ROOT, 'navbar.html'), 'utf8').trim();
const footerHtml = fs.readFileSync(path.join(ROOT, 'footer.html'), 'utf8').trim();

console.log(`Loaded ${articles.length} visible articles, ${magazines.length} visible magazines.`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch(e) { return dateStr; }
}

function safeCoverPath(cover, fallback = 'images/article-pdf%26cover/article1.jpg') {
  if (!cover) return fallback;
  return cover.replace(/^(\.\.\/)*/, '').replace(/article-pdf&cover/g, 'article-pdf%26cover');
}

// ── 2. Helper: Inject Navbar & Footer Into Static Pages ────────────────────────
function injectNavAndFooter(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Cleanly replace the entire navbar block without duplicating
  const navStartRegex = /<div id=["']navbar-placeholder["']>|<header id=["']navbar-placeholder["']><\/header>/;
  const navMatch = html.match(navStartRegex);
  if (navMatch) {
    const navStartIdx = navMatch.index;
    const contentAfterNav = html.slice(navStartIdx);
    const nextSectionMatch = contentAfterNav.match(/\n\s*<(?:main|section|nav class=["'](?:mag|article)-breadcrumb|div class=["']ed-article-top-bar)/);
    if (nextSectionMatch) {
      const navEndIdx = navStartIdx + nextSectionMatch.index;
      html = html.slice(0, navStartIdx) +
        `<div id="navbar-placeholder">\n${navbarHtml}\n</div>\n` +
        html.slice(navEndIdx);
    }
  }

  // 2. Cleanly replace the entire footer block without duplicating
  const footerStartRegex = /<div id=["']footer-placeholder["']>|<footer id=["']footer-placeholder["']><\/footer>/;
  const footerMatch = html.match(footerStartRegex);
  if (footerMatch) {
    const footerStartIdx = footerMatch.index;
    const contentAfterFooter = html.slice(footerStartIdx);
    const nextScriptMatch = contentAfterFooter.match(/\n\s*<script/);
    if (nextScriptMatch) {
      const footerEndIdx = footerStartIdx + nextScriptMatch.index;
      html = html.slice(0, footerStartIdx) +
        `<div id="footer-placeholder">\n${footerHtml}\n</div>\n` +
        html.slice(footerEndIdx);
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

// ── 3. Pre-render article.html (Featured Stories) ───────────────────────────
const featuredArticles = articles.filter(a => a.section === 'featured-stories');
const articleHtmlPath = path.join(ROOT, 'article.html');
let articleHtml = fs.readFileSync(articleHtmlPath, 'utf8');

articleHtml = articleHtml.replace('<link rel="canonical" href="article" />', '<link rel="canonical" href="https://www.theempireinsight.com/article" />');
articleHtml = articleHtml.replace('<a href="index.html"><i class="fas fa-home"></i> Home</a>', '<a href="/"><i class="fas fa-home"></i> Home</a>');
articleHtml = articleHtml.replace(/<span class="ed-section-link">\d+ Articles<\/span>/, `<span class="ed-section-link">${featuredArticles.length} Articles</span>`);

const articleCardsHtml = featuredArticles.map(article => {
  const cat = article.category || "Executive Insight";
  const coverSrc = safeCoverPath(article.cover);
  const readTime = article.readingTime || "6 min read";
  const dateFormatted = article.publishedDate 
    ? new Date(article.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) 
    : "";

  const leaderBadge = article.leader 
    ? `<span class="ed-story-leader"><i class="fas fa-user-tie"></i> ${escapeHtml(article.leader)}</span>`
    : "";

  const link = `article/${encodeURIComponent(article.slug)}`;

  return `      <article class="ed-story-card" itemscope itemtype="https://schema.org/Article">
        <a href="${link}" class="ed-story-cover-link" aria-label="Read ${escapeAttr(article.title)}">
          <img src="${coverSrc}" alt="${escapeAttr(article.title)}" class="ed-story-cover" loading="lazy" itemprop="image" />
        </a>
        <div class="ed-story-body">
          <div class="ed-story-meta-row">
            <span class="ed-story-cat">${escapeHtml(cat)}</span>
            ${dateFormatted ? `<span class="ed-story-date" itemprop="datePublished">${escapeHtml(dateFormatted)}</span>` : ""}
          </div>
          ${leaderBadge}
          <h3 class="ed-story-title" itemprop="headline">
            <a href="${link}">${escapeHtml(article.title)}</a>
          </h3>
          <p class="ed-story-subtitle" itemprop="description">${escapeHtml(article.subtitle || article.excerpt || "")}</p>
          <div class="ed-story-footer">
            <span class="ed-story-readtime"><i class="far fa-clock"></i> ${escapeHtml(readTime)}</span>
            <a href="${link}" class="ed-story-link">Read Story &rarr;</a>
          </div>
        </div>
      </article>`;
}).join('\n');

const articlesContainerRegex = /(<div class="ed-stories-grid" id="articles-container"[^>]*>)[\s\S]*?(<\/div>\s*<\/main>)/;
if (articlesContainerRegex.test(articleHtml)) {
  articleHtml = articleHtml.replace(articlesContainerRegex, `$1\n${articleCardsHtml}\n    $2`);
  fs.writeFileSync(articleHtmlPath, articleHtml, 'utf8');
  console.log(`  ✔ Pre-rendered ${featuredArticles.length} featured story cards directly into magazine/article.html`);
}

// ── 3b. Pre-render beyond-business.html ───────────────────────────────────────
const beyondArticles = articles.filter(a => a.section === 'beyond-business' || (!a.section && !a.leader));
const beyondHtmlPath = path.join(ROOT, 'beyond-business.html');
if (fs.existsSync(beyondHtmlPath)) {
  let beyondHtml = fs.readFileSync(beyondHtmlPath, 'utf8');
  beyondHtml = beyondHtml.replace(/<span class="ed-section-link">\d+ Articles<\/span>/, `<span class="ed-section-link">${beyondArticles.length} Articles</span>`);

  const beyondCardsHtml = beyondArticles.map(article => {
    const cat = article.category || "Beyond Business";
    const coverSrc = safeCoverPath(article.cover);
    const readTime = article.readingTime || "5 min read";
    const dateFormatted = article.publishedDate 
      ? new Date(article.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) 
      : "";

    const link = `article/${encodeURIComponent(article.slug)}`;

    return `      <article class="ed-story-card" itemscope itemtype="https://schema.org/Article">
        <a href="${link}" class="ed-story-cover-link" aria-label="Read ${escapeAttr(article.title)}">
          <img src="${coverSrc}" alt="${escapeAttr(article.title)}" class="ed-story-cover" loading="lazy" itemprop="image" />
        </a>
        <div class="ed-story-body">
          <div class="ed-story-meta-row">
            <span class="ed-story-cat">${escapeHtml(cat)}</span>
            ${dateFormatted ? `<span class="ed-story-date" itemprop="datePublished">${escapeHtml(dateFormatted)}</span>` : ""}
          </div>
          <h3 class="ed-story-title" itemprop="headline">
            <a href="${link}">${escapeHtml(article.title)}</a>
          </h3>
          <p class="ed-story-subtitle" itemprop="description">${escapeHtml(article.subtitle || article.excerpt || "")}</p>
          <div class="ed-story-footer">
            <span class="ed-story-readtime"><i class="far fa-clock"></i> ${escapeHtml(readTime)}</span>
            <a href="${link}" class="ed-story-link">Read Story &rarr;</a>
          </div>
        </div>
      </article>`;
  }).join('\n');

  if (articlesContainerRegex.test(beyondHtml)) {
    beyondHtml = beyondHtml.replace(articlesContainerRegex, `$1\n${beyondCardsHtml}\n    $2`);
    fs.writeFileSync(beyondHtmlPath, beyondHtml, 'utf8');
    console.log(`  ✔ Pre-rendered ${beyondArticles.length} beyond-business story cards directly into magazine/beyond-business.html`);
  }
}

// ── 4. Pre-render magazine.html ──────────────────────────────────────────────
const magazineHtmlPath = path.join(ROOT, 'magazine.html');
let magazineHtml = fs.readFileSync(magazineHtmlPath, 'utf8');

magazineHtml = magazineHtml.replace(/<span id="results-count" class="arc-count"[^>]*>.*?<\/span>/, `<span id="results-count" class="arc-count" aria-live="polite">Showing ${magazines.length} editions</span>`);

const magazineCardsHtml = magazines.map((mag, i) => {
  const id    = encodeURIComponent(mag.id);
  const title = escapeHtml(mag.title);
  const cover = safeCoverPath(mag.cover, 'images/Magazine-cover/cover-2026-alejandro-calle.jpg');
  const badge = [mag.volume, mag.issue].filter(Boolean).join(' • ');
  const date  = mag.publishedDate
    ? new Date(mag.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : (mag.edition || '');

  return `        <li style="--i:${i}">
          <article class="arc-card" itemscope itemtype="https://schema.org/PublicationIssue">
            <a class="arc-card__cover" href="magazine/${id}" aria-label="Preview ${title}">
              <img src="${cover}" alt="${title} cover" loading="lazy" itemprop="image" />
              ${badge ? `<span class="arc-card__badge">${escapeHtml(badge)}</span>` : ''}
              <span class="arc-card__peek">Preview Edition <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            </a>
            <div class="arc-card__body">
              <h3 class="arc-card__title" itemprop="name"><a href="magazine/${id}">${title}</a></h3>
              ${date ? `<p class="arc-card__date">${escapeHtml(date)}</p>` : ''}
              <div class="arc-card__actions">
                <a class="arc-link" href="${mag.pdfUrl ? `pdf-view.html?id=${id}` : `magazine/${id}/read`}"${mag.pdfUrl ? ' target="_blank" rel="noopener noreferrer"' : ''}>Digital</a>
                <a class="arc-btn arc-btn--solid arc-btn--sm" href="magazine/${id}/read">Read Online <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
              </div>
            </div>
          </article>
        </li>`;
}).join('\n');

const magazineListRegex = /(<ul class="arc-grid" id="magazine-list">)[\s\S]*?(<\/ul>)/;
if (magazineListRegex.test(magazineHtml)) {
  magazineHtml = magazineHtml.replace(magazineListRegex, `$1\n${magazineCardsHtml}\n      $2`);
  fs.writeFileSync(magazineHtmlPath, magazineHtml, 'utf8');
  console.log(`  ✔ Pre-rendered ${magazines.length} magazine cards directly into magazine/magazine.html`);
}

// ── 5. Pre-render index.html editions grid ───────────────────────────────────
const indexHtmlPath = path.join(ROOT, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const indexEditionsCardsHtml = magazines.map(m => {
  const cover = safeCoverPath(m.cover);
  const status = m.status || 'Published';
  const volInfo = `${m.volume || ''} &middot; ${m.issue || ''}`;
  const shortT = escapeHtml(m.shortTitle || m.title);
  const title  = escapeHtml(m.title);

  return `        <a href="magazine/${encodeURIComponent(m.id)}" class="ed-edition-card" aria-label="Read ${title}">
          <div class="ed-edition-cover-wrap">
            <img class="ed-edition-cover" src="${cover}" alt="${title} Cover" loading="lazy" />
            <div class="ed-edition-overlay"></div>
            <span class="ed-edition-badge">${status}</span>
            <span class="ed-edition-vol">${volInfo}</span>
          </div>
          <span class="ed-edition-cat">${escapeHtml(m.category || '')}</span>
          <p class="ed-edition-title">${shortT}</p>
          <span class="ed-edition-date">${escapeHtml(m.edition || '')}</span>
        </a>`;
}).join('\n');

const indexGridRegex = /(<div class="ed-editions-grid" id="editions-grid">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/;
if (indexGridRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(indexGridRegex, `$1\n${indexEditionsCardsHtml}\n      $2`);
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log(`  ✔ Pre-rendered ${magazines.length} editions cards directly into magazine/index.html`);
}

// ── 6. Inject Navbar & Footer Into All Core Static Pages ──────────────────────
const corePages = [
  'index.html',
  'about.html',
  'article.html',
  'magazine.html',
  'contact.html',
  'blog.html',
  'search.html',
  'beyond-business.html',
  'magazine-view.html',
  'article-view.html'
];

corePages.forEach(p => {
  const fullPath = path.join(ROOT, p);
  injectNavAndFooter(fullPath);
});
console.log(`  ✔ Inlined pre-rendered navbar and footer into ${corePages.length} core pages.`);

// ── 7. Generate Static Landing Pages For Each Magazine Edition ────────────────
const MAG_DIR = path.join(ROOT, 'magazine');
if (!fs.existsSync(MAG_DIR)) fs.mkdirSync(MAG_DIR, { recursive: true });

magazines.forEach(mag => {
  const magSlugDir = path.join(MAG_DIR, mag.id);
  const magReadDir = path.join(magSlugDir, 'read');
  if (!fs.existsSync(magSlugDir)) fs.mkdirSync(magSlugDir, { recursive: true });
  if (!fs.existsSync(magReadDir)) fs.mkdirSync(magReadDir, { recursive: true });

  const coverSrc = safeCoverPath(mag.cover);
  const absoluteCover = `${SITE_URL}/magazine/${coverSrc}`;
  const canonicalUrl = `${SITE_URL}/magazine/${mag.id}`;
  const rawTitle = (mag.seo && mag.seo.metaTitle) ? mag.seo.metaTitle : mag.title;
  const pageTitle = rawTitle.includes('The Empire Insight') ? rawTitle : `${rawTitle} | The Empire Insight`;
  const metaDesc = (mag.seo && mag.seo.metaDescription)
    ? mag.seo.metaDescription
    : (mag.description || mag.preview || mag.subtitle || `Official edition of The Empire Insight: ${mag.title}`);
  const keywords = (mag.seo && mag.seo.keywords)
    ? (Array.isArray(mag.seo.keywords) ? mag.seo.keywords.join(', ') : mag.seo.keywords)
    : 'Global Business Magazine, CEO Magazine, Business Leadership Insights, The Empire Insight';

  const badge = [mag.volume, mag.issue].filter(Boolean).join(' • ');

  const pubIssueSchema = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    "name": mag.title,
    "headline": mag.subtitle || mag.title,
    "issueNumber": mag.issue || "1",
    "volumeNumber": mag.volume || "1",
    "datePublished": mag.publishedDate || "2026-10-14",
    "description": metaDesc,
    "image": absoluteCover,
    "url": canonicalUrl,
    "isPartOf": {
      "@type": "Periodical",
      "name": "The Empire Insight",
      "url": SITE_URL
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Magazine Archive", "item": `${SITE_URL}/magazine` },
      { "@type": "ListItem", "position": 3, "name": mag.shortTitle || mag.title, "item": canonicalUrl }
    ]
  };

  // Build clean static landing page for /magazine/:id
  const landingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google-site-verification" content="HI4F3xJNEMNANtPi0ggxT1XeK7OUKcplKlHCj5J67Gg" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeAttr(metaDesc)}" />
  <meta name="keywords" content="${escapeAttr(keywords)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(pageTitle)}" />
  <meta property="og:description" content="${escapeAttr(metaDesc)}" />
  <meta property="og:image" content="${absoluteCover}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="The Empire Insight" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@The_45Empire" />
  <meta name="twitter:title" content="${escapeAttr(pageTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(metaDesc)}" />
  <meta name="twitter:image" content="${absoluteCover}" />

  <link rel="icon" type="image/png" href="/images/favicon.png" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/magazine-view.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

  <script type="application/ld+json">
${JSON.stringify(pubIssueSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>
</head>
<body class="magazine-reader-page">
  <div id="navbar-placeholder">
${navbarHtml}
  </div>

  <nav class="mag-breadcrumb-nav" aria-label="Breadcrumb">
    <div class="mag-breadcrumb-container">
      <a href="/"><i class="fas fa-home" aria-hidden="true"></i> Home</a>
      <span class="separator">/</span>
      <a href="/magazine">Magazines</a>
      <span class="separator">/</span>
      <span class="current" aria-current="page">${escapeHtml(mag.shortTitle || mag.title)}</span>
    </div>
  </nav>

  <main class="magazine-reader-shell" id="mag-view-main-layout">
    <div class="mag-reader-toolbar">
      <a class="mag-tool-btn" href="/magazine">
        <i class="fas fa-arrow-left" aria-hidden="true"></i> All Editions
      </a>
      <a class="mag-tool-btn" href="/magazine/${encodeURIComponent(mag.id)}/read">
        <i class="fas fa-book-open" aria-hidden="true"></i> Open Reader
      </a>
    </div>

    <article class="mag-reader-hero" itemscope itemtype="https://schema.org/PublicationIssue">
      <figure class="mag-view-figure">
        <a class="mag-cover-pdf-link" href="${mag.pdfUrl ? `/pdf-view.html?id=${encodeURIComponent(mag.id)}` : `/magazine/${encodeURIComponent(mag.id)}/read`}" ${mag.pdfUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="Read ${escapeAttr(mag.title)} ${mag.pdfUrl ? 'digital edition' : 'online'}">
          <img class="mag-view-cover" src="/${coverSrc}" alt="${escapeAttr(mag.title)} Cover" width="600" height="800" fetchpriority="high" itemprop="image" />
        </a>
      </figure>

      <div class="mag-reader-hero-content">
        <div class="mag-view-meta-top">
          ${badge ? `<span class="mag-badge-issue">${escapeHtml(badge)}</span>` : ''}
          ${mag.category ? `<span class="mag-category-tag">${escapeHtml(mag.category)}</span>` : ''}
          <time class="mag-date" itemprop="datePublished">${escapeHtml(mag.edition || '')}</time>
        </div>
        <h1 class="mag-view-title" itemprop="name">${escapeHtml(mag.title)}</h1>
        ${mag.subtitle ? `<p class="mag-view-subtitle">${escapeHtml(mag.subtitle)}</p>` : ''}
        <p class="mag-reader-hero-description" itemprop="description">${escapeHtml(mag.description || mag.preview || metaDesc)}</p>

        <div class="mag-reader-hero-actions" style="margin-top: 24px; display: flex; gap: 14px; flex-wrap: wrap;">
          ${mag.pdfUrl ? `
          <a class="arc-btn arc-btn--solid" href="/pdf-view.html?id=${encodeURIComponent(mag.id)}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-book-open" aria-hidden="true"></i> View Digital Magazine
          </a>
          <a class="arc-btn arc-btn--ghost" href="/magazine/${encodeURIComponent(mag.id)}/read">
            <i class="fas fa-file-alt" aria-hidden="true"></i> Read Online
          </a>` : `
          <a class="arc-btn arc-btn--solid" href="/magazine/${encodeURIComponent(mag.id)}/read">
            <i class="fas fa-book-open" aria-hidden="true"></i> Read Online
          </a>
          <a class="arc-btn arc-btn--ghost" href="/magazine">
            <i class="fas fa-layer-group" aria-hidden="true"></i> All Editions
          </a>`}
        </div>
      </div>
    </article>
  </main>

  <div id="footer-placeholder">
${footerHtml}
  </div>

  <script defer src="/js/include-nav-footer.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(magSlugDir, 'index.html'), landingHtml, 'utf8');

  // Also create a clean fallback /read/index.html that loads the reader
  const readerFallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=/magazine-view.html?id=${encodeURIComponent(mag.id)}" />
  <title>Read ${escapeHtml(mag.title)} | The Empire Insight</title>
  <link rel="canonical" href="${canonicalUrl}/read" />
</head>
<body>
  <p>Loading reader... <a href="/magazine-view.html?id=${encodeURIComponent(mag.id)}">Click here if not redirected</a>.</p>
  <script>window.location.replace("/magazine-view.html?id=${encodeURIComponent(mag.id)}");</script>
</body>
</html>`;

  fs.writeFileSync(path.join(magReadDir, 'index.html'), readerFallbackHtml, 'utf8');
  console.log(`  ✔ Generated magazine landing: magazine/${mag.id}/index.html`);
});

// ── 8. Generate Complete & Accurate Sitemap.xml ───────────────────────────────
const today = new Date().toISOString().split('T')[0];

let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Primary website pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/magazine</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${SITE_URL}/article</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/beyond-business</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${SITE_URL}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
  </url>

  <!-- Published magazine editions -->
${magazines.map(m => `  <url>
    <loc>${SITE_URL}/magazine/${m.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>${SITE_URL}/magazine/${m.id}/read</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n')}

  <!-- Published leadership articles -->
${articles.map(a => `  <url>
    <loc>${SITE_URL}/article/${a.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n')}

</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml, 'utf8');
console.log(`  ✔ Successfully generated sitemap.xml with ${8 + (magazines.length * 2) + articles.length} URLs.`);

console.log('\nAll core pages, magazine editions, and sitemaps are 100% pre-rendered and SEO-ready!');
