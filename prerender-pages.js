/**
 * The Empire Insight — Static Content Pre-Renderer & Site Builder
 * Injects 100% pre-rendered HTML into all pages, generates static magazine pages,
 * and updates sitemaps for instant search engine indexing with zero-JS crawling.
 *
 * Usage: node prerender-pages.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = fs.existsSync(path.join(__dirname, 'js', 'articles.json'))
  ? __dirname
  : (fs.existsSync(path.join(__dirname, 'magazine', 'js', 'articles.json'))
      ? path.join(__dirname, 'magazine')
      : __dirname);

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
  const trimmed = String(cover).trim();
  if (/^(?:https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return trimmed
    .replace(/^(\.\.\/)+/, '')
    .replace(/^\/+/, '')
    .replace(/^magazine\//, '')
    .replace(/article-pdf&cover/g, 'article-pdf%26cover');
}

function resolveAbsoluteCover(cover) {
  if (!cover) return `${SITE_URL}/images/article-pdf%26cover/article1.jpg`;
  const trimmed = String(cover).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const clean = trimmed
    .replace(/^(\.\.\/)+/, '')
    .replace(/^\/+/, '')
    .replace(/^magazine\//, '')
    .replace(/article-pdf&cover/g, 'article-pdf%26cover');
  return `${SITE_URL}/${clean}`;
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

// ── 3. Pre-render article.html (Featured Stories) ─────────────────────────────
const featuredArticles = articles.filter(a => a.section === 'featured-stories');
const articleHtmlPath = path.join(ROOT, 'article.html');
if (fs.existsSync(articleHtmlPath)) {
  let articleHtml = fs.readFileSync(articleHtmlPath, 'utf8');

  articleHtml = articleHtml.replace(/<link rel="canonical" href="[^"]*" \/>/, '<link rel="canonical" href="https://www.theempireinsight.com/article" />');
  articleHtml = articleHtml.replace(/<span class="ed-section-link">.*?<\/span>/, `<span class="ed-section-link">${featuredArticles.length} Articles</span>`);

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

    const link = `/article/${encodeURIComponent(article.slug)}`;

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
}

// ── 3b. Pre-render beyond-business.html ───────────────────────────────────────
const beyondArticles = articles.filter(a => a.section === 'beyond-business');
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

    const link = `/article/${encodeURIComponent(article.slug)}`;

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

  const articlesContainerRegex = /(<div class="ed-stories-grid" id="articles-container"[^>]*>)[\s\S]*?(<\/div>\s*<\/main>)/;
  if (articlesContainerRegex.test(beyondHtml)) {
    beyondHtml = beyondHtml.replace(articlesContainerRegex, `$1\n${beyondCardsHtml}\n    $2`);
    fs.writeFileSync(beyondHtmlPath, beyondHtml, 'utf8');
    console.log(`  ✔ Pre-rendered ${beyondArticles.length} beyond-business story cards directly into magazine/beyond-business.html`);
  }
}

// ── 4. Pre-render magazine.html ──────────────────────────────────────────────
const magazineHtmlPath = path.join(ROOT, 'magazine.html');
if (fs.existsSync(magazineHtmlPath)) {
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
            <a class="arc-card__cover" href="/magazine/${id}" aria-label="Preview ${title}">
              <img src="${cover}" alt="${title} cover" loading="lazy" itemprop="image" />
              ${badge ? `<span class="arc-card__badge">${escapeHtml(badge)}</span>` : ''}
              <span class="arc-card__peek">Preview Edition <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            </a>
            <div class="arc-card__body">
              <h3 class="arc-card__title" itemprop="name"><a href="/magazine/${id}">${title}</a></h3>
              ${date ? `<p class="arc-card__date">${escapeHtml(date)}</p>` : ''}
              <div class="arc-card__actions">
                <a class="arc-link" href="${mag.pdfUrl ? `/pdf-view?id=${id}` : `/magazine/${id}/read`}"${mag.pdfUrl ? ' target="_blank" rel="noopener noreferrer"' : ''}>Digital</a>
                <a class="arc-btn arc-btn--solid arc-btn--sm" href="/magazine/${id}/read">Read Online <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
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
}

// ── 5. Pre-render index.html (Featured Stories & Hero & Editions) ──────────────
const indexHtmlPath = path.join(ROOT, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // A. Featured Stories Grid (Top article as Main Feature, next 4 as Sidebar)
  if (articles.length > 0) {
    const mainArt = articles[0];
    const sideArts = articles.slice(1, 5);

    const mainCover = safeCoverPath(mainArt.cover);
    const mainLink = `/article/${encodeURIComponent(mainArt.slug)}`;
    const mainCat = escapeHtml(mainArt.category || 'Executive Insight');
    const mainTitle = escapeHtml(mainArt.title);
    const mainSub = escapeHtml(mainArt.subtitle || '');
    const mainExc = escapeHtml(mainArt.excerpt || mainArt.subtitle || '');

    const sideCardsHtml = sideArts.map(art => {
      const cover = safeCoverPath(art.cover);
      const link = `/article/${encodeURIComponent(art.slug)}`;
      const cat = escapeHtml(art.category || 'Insight');
      const title = escapeHtml(art.title);
      const sub = escapeHtml(art.subtitle || art.excerpt || '');
      return `          <a href="${link}" class="ed-feature-row" data-article-id="${escapeAttr(art.id)}">
            <img class="ed-feature-row-img" src="${cover}" alt="${escapeAttr(title)}" loading="lazy" />
            <div class="ed-feature-row-body">
              <span class="ed-feature-row-cat">${cat}</span>
              <p class="ed-feature-row-title">${title}</p>
              <p class="ed-feature-row-sub">${sub}</p>
            </div>
          </a>`;
    }).join('\n');

    const newFeaturesGridHtml = `<div class="ed-features-grid" id="features-grid">

        <!-- Main flagship feature (Newest top article from articles.json) -->
        <a href="${mainLink}" class="ed-feature-main" data-article-id="${escapeAttr(mainArt.id)}" aria-label="Read: ${escapeAttr(mainTitle)}">
          <img
            class="ed-feature-main-img"
            src="${mainCover}"
            alt="${escapeAttr(mainTitle)}"
            loading="lazy"
          />
          <span class="ed-cat-tag">${mainCat}</span>
          <h3 class="ed-feature-main-title">${mainTitle}</h3>
          ${mainSub ? `<p class="ed-feature-main-sub">${mainSub}</p>` : ''}
          ${mainExc ? `<p class="ed-feature-excerpt">${mainExc}</p>` : ''}
          <div class="ed-feature-footer">
            <span class="ed-read-link">Read Article <i class="fas fa-arrow-right" style="font-size:0.6rem"></i></span>
          </div>
        </a>

        <!-- Sidebar articles (Next 4 articles from articles.json) -->
        <div class="ed-features-sidebar" id="features-sidebar">
${sideCardsHtml}
        </div>

      </div>`;

    const featuresGridRegex = /<div class="ed-features-grid" id="features-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/;
    if (featuresGridRegex.test(indexHtml)) {
      indexHtml = indexHtml.replace(featuresGridRegex, `${newFeaturesGridHtml}\n    </div>\n  </section>`);
      console.log(`  ✔ Pre-rendered newest article "${mainArt.title.substring(0, 35)}..." as Main Feature on index.html`);
    }
  }

  // B. Pre-render editions grid on index.html
  const indexEditionsCardsHtml = magazines.map(m => {
    const cover = safeCoverPath(m.cover);
    const status = m.status || 'Published';
    const volInfo = `${m.volume || ''} &middot; ${m.issue || ''}`;
    const shortT = escapeHtml(m.shortTitle || m.title);
    const title  = escapeHtml(m.title);

    return `        <a href="/magazine/${encodeURIComponent(m.id)}" class="ed-edition-card" aria-label="Read ${title}">
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
    console.log(`  ✔ Pre-rendered ${magazines.length} editions cards directly into magazine/index.html`);
  }

  // C. Update Hero Cover Slides on index.html to match magazines.json
  if (magazines.length > 0) {
    const heroSlidesHtml = magazines.map((m, idx) => {
      const cover = safeCoverPath(m.cover);
      const activeClass = idx === 0 ? ' active' : '';
      return `            <div class="ed-hero-cover-slide${activeClass}" data-index="${idx}">
              <img
                class="ed-hero-cover-img"
                ${idx === 0 ? 'id="hero-cover"' : ''}
                src="${cover}"
                alt="${escapeAttr(m.title)} Cover"
                loading="${idx === 0 ? 'eager' : 'lazy'}"
              />
            </div>`;
    }).join('\n');

    const heroSlidesRegex = /(<div class="ed-hero-slides-wrapper" id="hero-slides-wrapper">)[\s\S]*?(<\/div>\s*<!-- Quick Navigation Chevrons)/;
    if (heroSlidesRegex.test(indexHtml)) {
      indexHtml = indexHtml.replace(heroSlidesRegex, `$1\n${heroSlidesHtml}\n          $2`);
    }

    // Update active hero text from top magazine
    const topMag = magazines[0];
    const topTitle = escapeHtml(topMag.title);
    const topSub = escapeHtml(topMag.subtitle || '');
    const topDesc = escapeHtml(topMag.description || topMag.preview || '');
    const topLabel = escapeHtml((topMag.volume || 'Vol. 01') + ' | ' + (topMag.edition || '2026') + ' \u2014 ' + (topMag.category || 'Leadership & Business'));
    const topVol = escapeHtml((topMag.volume || 'Vol. 01') + ' \u2014 ' + (topMag.edition || '2026'));
    const topPages = escapeHtml((topMag.pages || '68') + ' pages');
    const topRead = escapeHtml(topMag.readingTime || '45 min read');
    const topCat = escapeHtml(topMag.category || 'Leadership & Business');
    const topCaption = escapeHtml((topMag.volume || 'Vol. 01') + ' | 2026 &nbsp;|&nbsp; ' + (topMag.shortTitle || topMag.title));

    indexHtml = indexHtml.replace(/<span class="ed-hero-label-text" id="hero-label">[\s\S]*?<\/span>/, `<span class="ed-hero-label-text" id="hero-label">${topLabel}</span>`);
    indexHtml = indexHtml.replace(/<h1 class="ed-hero-headline" id="hero-headline">[\s\S]*?<\/h1>/, `<h1 class="ed-hero-headline" id="hero-headline">${topTitle}</h1>`);
    indexHtml = indexHtml.replace(/<p class="ed-hero-subtitle" id="hero-subtitle">[\s\S]*?<\/p>/, `<p class="ed-hero-subtitle" id="hero-subtitle">&ldquo;${topSub}&rdquo;</p>`);
    indexHtml = indexHtml.replace(/<p class="ed-hero-desc" id="hero-desc">[\s\S]*?<\/p>/, `<p class="ed-hero-desc" id="hero-desc">${topDesc}</p>`);
    indexHtml = indexHtml.replace(/<span class="ed-hero-badge" id="hero-vol">[\s\S]*?<\/span>/, `<span class="ed-hero-badge" id="hero-vol"><i class="fas fa-bookmark"></i> ${topVol}</span>`);
    indexHtml = indexHtml.replace(/<span class="ed-hero-badge" id="hero-pages">[\s\S]*?<\/span>/, `<span class="ed-hero-badge" id="hero-pages"><i class="fas fa-book-open"></i> ${topPages}</span>`);
    indexHtml = indexHtml.replace(/<span class="ed-hero-badge" id="hero-read">[\s\S]*?<\/span>/, `<span class="ed-hero-badge" id="hero-read"><i class="far fa-clock"></i> ${topRead}</span>`);
    indexHtml = indexHtml.replace(/<span class="ed-hero-badge ed-hero-badge-cat" id="hero-cat">[\s\S]*?<\/span>/, `<span class="ed-hero-badge ed-hero-badge-cat" id="hero-cat"><i class="fas fa-layer-group"></i> ${topCat}</span>`);
    indexHtml = indexHtml.replace(/href="magazine\/[^"]*\/read" class="btn-primary-ed" id="hero-cta"/, `href="/magazine/${encodeURIComponent(topMag.id)}/read" class="btn-primary-ed" id="hero-cta"`);
    indexHtml = indexHtml.replace(/<div class="ed-hero-cover-caption" id="hero-caption">[\s\S]*?<\/div>/, `<div class="ed-hero-cover-caption" id="hero-caption">${topCaption}</div>`);
    indexHtml = indexHtml.replace(/<link rel="preload" as="image" href="[^"]*" fetchpriority="high" \/>/, `<link rel="preload" as="image" href="${safeCoverPath(topMag.cover)}" fetchpriority="high" />`);
  }

  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
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
  const absoluteCover = resolveAbsoluteCover(mag.cover);
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
  <meta property="article:published_time" content="${mag.publishedDate || '2026-10-14'}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@The_45Empire" />
  <meta name="twitter:title" content="${escapeAttr(pageTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(metaDesc)}" />
  <meta name="twitter:image" content="${absoluteCover}" />

  <!-- Favicons -->
  <link rel="icon" type="image/png" href="/images/favicon.png" />
  <link rel="shortcut icon" type="image/png" href="/images/favicon.png" />
  <link rel="apple-touch-icon" href="/images/favicon.png" />

  <!-- Fonts & Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(pubIssueSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>

  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body { background: #0D0D0D; color: #FFFFFF; font-family: 'Inter', sans-serif; }
    .mag-landing-wrap { max-width: 1200px; margin: 0 auto; padding: 48px 24px 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
    @media (max-width: 900px) { .mag-landing-wrap { grid-template-columns: 1fr; } }
    .mag-landing-cover { width: 100%; max-width: 460px; margin: 0 auto; border-radius: 6px; box-shadow: 0 24px 60px rgba(0,0,0,0.6); display: block; border: 1px solid rgba(181,137,42,0.3); }
    .mag-landing-kicker { color: #B5892A; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; display: block; }
    .mag-landing-title { font-family: 'Playfair Display', serif; font-size: 2.4rem; color: #FFFFFF; line-height: 1.25; margin-bottom: 16px; }
    .mag-landing-sub { font-size: 1.1rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 24px; font-style: italic; }
    .mag-landing-desc { font-size: 0.98rem; color: rgba(255,255,255,0.7); line-height: 1.7; margin-bottom: 32px; }
    .mag-landing-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 36px; padding: 18px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); }
    .mag-landing-meta-item { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
    .mag-landing-meta-item strong { color: #FFFFFF; display: block; font-size: 1rem; margin-top: 4px; }
    .mag-landing-actions { display: flex; flex-wrap: wrap; gap: 16px; }
    .btn-read-now { background: #B5892A; color: #0D0D0D; padding: 14px 32px; font-weight: 700; text-decoration: none; border-radius: 3px; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
    .btn-read-now:hover { background: #d4a338; color: #000; }
    .btn-download-pdf { background: transparent; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.3); padding: 14px 28px; font-weight: 600; text-decoration: none; border-radius: 3px; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; transition: border-color 0.2s; }
    .btn-download-pdf:hover { border-color: #B5892A; color: #B5892A; }
    .mag-breadcrumb-nav { background: #141414; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .mag-breadcrumb-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; font-size: 0.82rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 8px; }
    .mag-breadcrumb-container a { color: rgba(255,255,255,0.7); text-decoration: none; }
    .mag-breadcrumb-container a:hover { color: #B5892A; }
    .mag-breadcrumb-container .current { color: #B5892A; }
  </style>
</head>
<body>
  <div id="navbar-placeholder">
${navbarHtml}
  </div>

  <nav class="mag-breadcrumb-nav" aria-label="Breadcrumb">
    <div class="mag-breadcrumb-container">
      <a href="/"><i class="fas fa-home"></i> Home</a>
      <span>/</span>
      <a href="/magazine">Magazines</a>
      <span>/</span>
      <span class="current">${escapeHtml(mag.shortTitle || mag.title)}</span>
    </div>
  </nav>

  <main class="mag-landing-wrap">
    <div>
      <img src="${/^(?:https?:)?\/\//i.test(coverSrc) ? coverSrc : `/${coverSrc.replace(/^\/+/, '')}`}" alt="${escapeAttr(mag.title)} Cover" class="mag-landing-cover" />
    </div>
    <div>
      <span class="mag-landing-kicker">${escapeHtml(mag.category || 'Executive Edition')}</span>
      <h1 class="mag-landing-title">${escapeHtml(mag.title)}</h1>
      ${mag.subtitle ? `<p class="mag-landing-sub">&ldquo;${escapeHtml(mag.subtitle)}&rdquo;</p>` : ''}
      <p class="mag-landing-desc">${escapeHtml(metaDesc)}</p>

      <div class="mag-landing-meta">
        ${badge ? `<div class="mag-landing-meta-item">Issue<strong>${escapeHtml(badge)}</strong></div>` : ''}
        ${mag.edition ? `<div class="mag-landing-meta-item">Edition<strong>${escapeHtml(mag.edition)}</strong></div>` : ''}
        ${mag.pages ? `<div class="mag-landing-meta-item">Pages<strong>${escapeHtml(mag.pages)}</strong></div>` : ''}
        ${mag.readingTime ? `<div class="mag-landing-meta-item">Reading Time<strong>${escapeHtml(mag.readingTime)}</strong></div>` : ''}
      </div>

      <div class="mag-landing-actions">
        <a href="/magazine/${encodeURIComponent(mag.id)}/read" class="btn-read-now"><i class="fas fa-book-open"></i> Read Online Free</a>
        ${mag.pdfUrl ? `<a href="${mag.pdfUrl}" class="btn-download-pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> Download PDF</a>` : ''}
      </div>
    </div>
  </main>

  <div id="footer-placeholder">
${footerHtml}
  </div>
  <script defer src="/js/include-nav-footer.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(magSlugDir, 'index.html'), landingHtml, 'utf8');

  // Build redirect / iframe view for /magazine/:id/read
  const readHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Read ${escapeHtml(mag.title)} | The Empire Insight</title>
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE_URL}/magazine/${mag.id}/read" />
  <meta http-equiv="refresh" content="0; url=/magazine-view?id=${encodeURIComponent(mag.id)}" />
  <script>window.location.replace("/magazine-view?id=" + encodeURIComponent("${mag.id}"));</script>
</head>
<body style="background:#0D0D0D;color:#FFF;font-family:sans-serif;text-align:center;padding:48px;">
  <p>Opening digital reader for <strong>${escapeHtml(mag.title)}</strong>...</p>
  <p><a href="/magazine-view?id=${encodeURIComponent(mag.id)}" style="color:#B5892A;">Click here if not redirected automatically &rarr;</a></p>
</body>
</html>`;

  fs.writeFileSync(path.join(magReadDir, 'index.html'), readHtml, 'utf8');
});

console.log(`  ✔ Generated static landing pages for ${magazines.length} magazine editions.`);
console.log('\nAll pages pre-rendered successfully!');
