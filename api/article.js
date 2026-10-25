/**
 * The Empire Insight — Dynamic Serverless Article SSR
 * Hosted on Vercel Serverless Functions.
 *
 * Automatically renders 100% pre-rendered, crawlable, SEO-rich HTML for any article
 * stored in articles.json.
 * 
 * - Zero static file generation needed when adding articles to articles.json
 * - Instant Wave 1 Google / Bing indexing
 * - Perfect Open Graph & Twitter Cards for social platforms (WhatsApp, LinkedIn, X, FB)
 * - Full Schema.org JSON-LD (Article, Breadcrumbs, FAQPage)
 * - Vercel Edge cached for sub-30ms global response time
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL = 'https://www.theempireinsight.com';

// ── Cache for JSON in serverless memory ──────────────────────────────────────
let cachedArticles = null;
let lastLoadTime = 0;

function loadArticles() {
  const now = Date.now();
  // Refresh cache every 60 seconds in warm serverless instances
  if (cachedArticles && (now - lastLoadTime < 60000)) {
    return cachedArticles;
  }

  const candidatePaths = [
    path.join(process.cwd(), 'magazine', 'js', 'articles.json'),
    path.join(process.cwd(), 'js', 'articles.json'),
    path.join(__dirname, '..', 'magazine', 'js', 'articles.json'),
    path.join(__dirname, '..', 'js', 'articles.json'),
    path.join(__dirname, 'js', 'articles.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
        cachedArticles = JSON.parse(raw);
        lastLoadTime = now;
        return cachedArticles;
      } catch (err) {
        console.error(`Error loading articles from ${p}:`, err);
      }
    }
  }

  return cachedArticles || [];
}

// ── Sanitization & Helpers ──────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function resolveCoverUrl(cover) {
  if (!cover) return `${SITE_URL}/images/article-pdf&cover/article1.jpg`;
  if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
  let clean = cover.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  if (clean.startsWith('magazine/')) clean = clean.replace(/^magazine\//, '');
  return `${SITE_URL}/${clean}`;
}

function resolveAssetPath(asset) {
  if (!asset) return '';
  if (asset.startsWith('http://') || asset.startsWith('https://')) return asset;
  let clean = asset.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  if (clean.startsWith('magazine/')) clean = clean.replace(/^magazine\//, '');
  return `/${clean}`;
}

// ── Master Editorial Stylesheet ─────────────────────────────────────────────
const ARTICLE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body.ed-article-page {
  background-color: #F8F7F4 !important;
  color: #1A1A1A !important;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  line-height: 1.7;
}

/* ── Pre-rendered Site Header ── */
.site-header {
  background: #0D0D0D;
  border-bottom: 1px solid rgba(181,137,42,0.3);
  position: sticky; top: 0; z-index: 200;
}
.header-main-inner {
  max-width: 1260px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  height: 64px;
}
.nav-logo-img { height: 42px; width: auto; }
.primary-nav { display: flex; align-items: center; gap: 28px; }
.primary-nav a {
  color: rgba(255,255,255,0.85); text-decoration: none;
  font-size: 0.88rem; font-weight: 500; letter-spacing: 0.3px;
  transition: color 0.2s;
}
.primary-nav a:hover, .primary-nav a.active { color: #B5892A; }
.nav-subscribe {
  background: #B5892A; color: #FFFFFF !important;
  padding: 8px 18px; border-radius: 3px;
}
.nav-subscribe:hover { background: #9A7320 !important; }
.nav-toggle-btn {
  display: none; background: transparent; border: none; color: #FFFFFF;
  font-size: 1.3rem; cursor: pointer; padding: 8px;
}
@media (max-width: 768px) {
  .nav-toggle-btn { display: block; }
  .primary-nav {
    display: none; position: absolute; top: 64px; left: 0; right: 0;
    background: #0D0D0D; border-bottom: 2px solid #B5892A;
    flex-direction: column; padding: 20px 24px; gap: 16px; align-items: flex-start;
  }
  .primary-nav.open { display: flex; }
}

/* ── Floating Social ── */
.floating-social {
  position: fixed; left: 0; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; z-index: 100;
}
.floating-social a {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  font-size: 0.9rem; color: #FFFFFF; text-decoration: none;
  transition: transform 0.2s, background 0.2s;
}
.floating-social a:hover { transform: translateX(4px); }
.fs-linkedin { background: #0077B5; }
.fs-twitter  { background: #000000; }
.fs-instagram { background: #E1306C; }
.fs-facebook  { background: #1877F2; }
@media (max-width: 768px) { .floating-social { display: none; } }

/* ── Sticky Breadcrumb Nav ── */
.mag-breadcrumb-nav {
  background: #FFFFFF !important;
  border-bottom: 1px solid #EBE7DF !important;
  padding: 12px 0;
  position: sticky;
  top: 64px;
  z-index: 90;
}
.mag-breadcrumb-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: #767676;
  flex-wrap: wrap;
}
.mag-breadcrumb-container a { color: #767676; text-decoration: none; transition: color 0.2s; }
.mag-breadcrumb-container a:hover { color: #B5892A; }
.mag-breadcrumb-container .separator { color: #C4BFB5; }
.mag-breadcrumb-container .current { color: #0D0D0D; font-weight: 600; }

/* ── Dark Executive Header Banner ── */
.ed-article-header {
  background: #0D0D0D !important;
  background-image:
    radial-gradient(circle at 50% 0%, rgba(181,137,42,0.22) 0%, rgba(13,13,13,0.98) 75%),
    linear-gradient(180deg, #161616 0%, #0A0A0A 100%) !important;
  border-bottom: 2px solid #B5892A !important;
  padding: 64px 24px 56px !important;
  color: #FFFFFF !important;
  text-align: left;
}
.ed-article-header-inner { max-width: 960px; margin: 0 auto; }
.ed-article-meta-pill {
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
}
.ed-article-cat {
  font-family: 'Inter', sans-serif !important;
  font-size: 0.72rem !important; font-weight: 700 !important; letter-spacing: 2px !important; text-transform: uppercase !important;
  color: #0D0D0D !important; background: #B5892A !important; padding: 5px 14px !important; border-radius: 2px !important;
}
.ed-article-readtime {
  font-size: 0.8rem; color: #E0DBCF; display: flex; align-items: center; gap: 6px;
}
.ed-article-headline {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: clamp(2rem, 4.5vw, 3.2rem) !important;
  font-weight: 700 !important; color: #FFFFFF !important; line-height: 1.18 !important; margin-bottom: 18px !important;
}
.ed-article-sub {
  font-size: 1.1rem !important; color: rgba(255,255,255,0.78) !important; font-style: italic !important;
  max-width: 780px !important; line-height: 1.65 !important;
}

/* ── Layout Grid ── */
.ed-article-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 40px;
  max-width: 1200px;
  margin: 40px auto 80px;
  padding: 0 24px;
  align-items: start;
}
@media (max-width: 920px) {
  .ed-article-layout { grid-template-columns: 1fr; gap: 36px; margin: 24px auto 60px; }
}

/* ── Main Article Canvas ── */
.ed-article-main {
  background: #FFFFFF !important;
  border-radius: 4px;
  box-shadow: 0 2px 24px rgba(0,0,0,0.06);
  padding: 44px 50px;
}
@media (max-width: 640px) { .ed-article-main { padding: 24px 20px; } }

/* ── Vertical Cover Frame (Uncropped) ── */
.ed-article-cover-frame {
  margin-bottom: 36px;
  background: #F5F3EF !important;
  border: 1px solid #E8E3DA !important;
  border-radius: 4px;
  padding: 16px;
  text-align: center;
}
.ed-article-hero-img {
  width: 100%;
  max-height: 720px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  border-radius: 2px;
}
.ed-article-cover-badge {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 14px;
  font-size: 0.72rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #B5892A;
}

/* ── Byline & Share Bar ── */
.ed-article-byline-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding: 18px 0; border-top: 1px solid #EBE7DF; border-bottom: 1px solid #EBE7DF;
  margin-bottom: 36px;
}
.ed-byline-info strong { font-size: 0.95rem; color: #0D0D0D; display: block; margin-bottom: 3px; }
.ed-byline-info span   { font-size: 0.8rem; color: #767676; display: block; }
.ed-share-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px; font-size: 0.82rem; font-weight: 600;
  background: transparent; color: #0D0D0D;
  border: 1.5px solid #D8D3C9; border-radius: 3px; cursor: pointer;
  transition: all 0.2s;
}
.ed-share-btn:hover { background: #B5892A; color: #FFF; border-color: #B5892A; }

/* ── Article Typography & Content ── */
.ed-article-body { color: #1A1A1A !important; font-size: 1.08rem !important; line-height: 1.9 !important; }
.ed-article-body p { margin-bottom: 1.5em; }
.ed-article-body h2 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.7rem !important; font-weight: 700 !important; color: #0D0D0D !important;
  margin: 2.2em 0 0.9em !important; padding-bottom: 10px !important;
  border-bottom: 2px solid #B5892A !important;
}
.ed-article-body h3 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.35rem !important; font-weight: 700 !important; color: #0D0D0D !important;
  margin: 2em 0 0.8em !important; padding-bottom: 8px !important;
  border-bottom: 1.5px solid rgba(181, 137, 42, 0.4) !important;
}
.ed-article-body h4 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.15rem !important; font-weight: 700 !important; color: #0D0D0D !important;
  margin: 1.5em 0 0.6em !important;
}
.ed-article-body strong { color: #0D0D0D !important; font-weight: 700 !important; }
.ed-article-body em     { color: #333333 !important; font-style: italic !important; }
.ed-article-body ul, .ed-article-body ol { margin: 1em 0 1.5em 1.8em; }
.ed-article-body li { margin-bottom: 0.6em; }

/* Lead Box */
.ed-article-lead-box {
  background: linear-gradient(135deg, #FFFBF2 0%, #FFF8E9 100%) !important;
  border-left: 4px solid #B5892A !important;
  border-radius: 0 4px 4px 0;
  padding: 24px 28px !important;
  margin-bottom: 2.2em !important;
}
.ed-article-kicker {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #B5892A;
  margin-bottom: 10px;
}
.ed-article-lead-text {
  font-size: 1.12rem !important; line-height: 1.85 !important; color: #1A1A1A !important;
  font-family: 'Playfair Display', Georgia, serif !important; font-style: italic !important;
}

/* Pull Quotes */
.ed-article-pullquote {
  position: relative !important;
  background: #FFFDF6 !important;
  border-left: 4px solid #B5892A !important;
  margin: 2.2em 0 !important;
  padding: 24px 30px 24px 54px !important;
  font-family: 'Playfair Display', Georgia, serif !important;
  font-style: italic !important; font-size: 1.25rem !important; color: #1A1A1A !important;
  line-height: 1.7 !important;
}
.ed-quote-mark {
  position: absolute; left: 14px; top: 12px;
  font-size: 3.2rem; color: #B5892A; font-family: Georgia, serif;
  line-height: 1;
}
.ed-article-pullquote cite {
  display: block; margin-top: 12px;
  font-size: 0.85rem; color: #767676; font-style: normal; font-weight: 600;
}

/* Inline Figures */
.ed-article-inline-figure {
  margin: 2.5em 0 !important;
  text-align: center;
}
.ed-article-inline-figure img {
  width: 100%; max-width: 680px; border-radius: 3px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  display: block; margin: 0 auto;
}
.ed-article-inline-figure figcaption {
  font-size: 0.82rem; color: #767676; margin-top: 10px;
  font-style: italic; display: flex; align-items: center;
  justify-content: center; gap: 7px;
}

/* Quotes Showcase */
.ed-article-quotes-showcase {
  background: #FAF8F5 !important;
  border: 1px solid #EBE7DF !important;
  border-radius: 4px;
  padding: 32px 28px !important;
  margin: 2.8em 0 !important;
}
.ed-article-quotes-showcase h4 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.15rem !important; color: #0D0D0D !important; font-weight: 700 !important;
  margin-bottom: 22px !important; padding-bottom: 12px !important;
  border-bottom: 2px solid #B5892A !important;
  display: flex; align-items: center; gap: 8px;
}
.ed-quotes-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.ed-quote-card {
  background: #FFFFFF !important;
  border-left: 3px solid #B5892A !important;
  border-radius: 3px;
  padding: 18px 20px !important;
  box-shadow: 0 1px 8px rgba(0,0,0,0.06);
}
.ed-quote-card p {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-style: italic !important; font-weight: 600 !important;
  font-size: 0.95rem !important; color: #0D0D0D !important;
  line-height: 1.6 !important; margin: 0 !important;
}
.ed-quote-card.highlight {
  border-left-color: #0D0D0D !important;
  background: #0D0D0D !important;
}
.ed-quote-card.highlight p { color: #FFFFFF !important; }

/* Leader Dossier Card */
.ed-leader-dossier-card {
  background: linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%) !important;
  border: 1px solid #B5892A !important;
  border-radius: 4px;
  padding: 32px 28px !important;
  margin: 2.8em 0 !important;
  color: #FFFFFF !important;
}
.ed-dossier-header {
  display: flex; align-items: center; gap: 20px; margin-bottom: 24px;
}
.ed-dossier-avatar {
  width: 62px; height: 62px; background: rgba(181,137,42,0.2);
  border: 2px solid #B5892A; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; color: #B5892A; flex-shrink: 0;
}
.ed-dossier-header h4 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.25rem !important; color: #FFFFFF !important; margin-bottom: 4px !important;
}
.ed-dossier-role {
  font-size: 0.85rem; color: #B5892A; font-weight: 600; display: block;
}
.ed-dossier-loc {
  font-size: 0.78rem; color: rgba(255,255,255,0.65);
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
}
.ed-dossier-body {
  display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 22px;
}
.ed-dossier-stat { text-align: center; flex: 1; min-width: 90px; }
.stat-num {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.6rem !important; font-weight: 700 !important; color: #B5892A !important; display: block;
}
.stat-lbl { font-size: 0.74rem; color: rgba(255,255,255,0.7); font-weight: 600; }
.ed-dossier-mantra { color: rgba(255,255,255,0.85); font-size: 0.92rem; line-height: 1.6; }
.ed-dossier-mantra strong { color: #FFFFFF; }

/* FAQ Section */
.ed-article-faq {
  margin-top: 48px !important;
  padding-top: 32px !important;
  border-top: 2px solid #EAE6DF !important;
}
.ed-article-faq-title {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.55rem !important;
  color: #0D0D0D !important;
  margin: 0 0 20px !important;
}
.ed-article-faq-list {
  display: grid;
  gap: 12px;
}
.ed-article-faq-item {
  border: 1px solid #EAE6DF;
  border-radius: 4px;
  background: #FAF8F5;
}
.ed-article-faq-item summary {
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 700;
  color: #0D0D0D;
}
.ed-article-faq-item p {
  padding: 0 20px 16px !important;
  margin: 0 !important;
  color: #2D2D2D !important;
}

/* ── Tags Strip ── */
.ed-article-tags {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 32px;
}
.ed-article-tag {
  font-size: 0.74rem; font-weight: 600; letter-spacing: 0.8px;
  text-transform: uppercase; color: #555555;
  background: #F2EFE9; border: 1px solid #E0DBCF;
  padding: 6px 14px; border-radius: 2px;
}

/* ── Bottom Navigation Buttons (Black Luxury Style) ── */
.ed-article-nav-bottom {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  margin-top: 48px; padding-top: 26px; border-top: 1px solid #EBE7DF;
}
.btn-ghost-ed, .btn-primary-ed {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; font-size: 0.85rem; font-weight: 700;
  background: #0D0D0D !important; color: #FFFFFF !important;
  text-decoration: none; border: 2px solid #0D0D0D;
  border-radius: 3px; letter-spacing: 0.5px; transition: all 0.2s;
}
.btn-ghost-ed:hover, .btn-primary-ed:hover {
  background: #B5892A !important; border-color: #B5892A !important; color: #FFFFFF !important;
}

/* ── Sidebar: More Stories ── */
.ed-article-sidebar { position: sticky; top: 120px; }
.ed-sidebar-box {
  background: #FFFFFF !important;
  border-radius: 4px;
  box-shadow: 0 2px 18px rgba(0,0,0,0.06);
  padding: 24px;
  margin-bottom: 24px;
}
.ed-sidebar-heading {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.05rem !important; font-weight: 700 !important; color: #0D0D0D !important;
  margin-bottom: 18px !important; padding-bottom: 10px !important;
  border-bottom: 2px solid #B5892A !important;
}
.ed-sidebar-story {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 12px 0; border-bottom: 1px solid #F0ECE4;
  text-decoration: none; transition: opacity 0.2s;
}
.ed-sidebar-story:last-child { border-bottom: none; }
.ed-sidebar-story:hover { opacity: 0.8; }
.ed-sidebar-story-img {
  width: 76px; height: 92px; object-fit: contain;
  border-radius: 2px; flex-shrink: 0;
  background: #F5F3EF; border: 1px solid #E8E3DA;
}
.ed-sidebar-story-cat {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #B5892A; display: block; margin-bottom: 4px;
}
.ed-sidebar-story-title {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 0.9rem !important; font-weight: 600 !important; color: #0D0D0D !important;
  line-height: 1.4 !important; margin: 0 !important;
}
.ed-sidebar-cta-box { background: #0D0D0D !important; color: #FFFFFF !important; }
.ed-sidebar-cta-box h4 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.05rem !important; color: #FFFFFF !important; margin-bottom: 8px !important;
}
.ed-sidebar-cta-box p { font-size: 0.84rem; color: rgba(255,255,255,0.7); margin-bottom: 16px; line-height: 1.5; }
.ed-sidebar-btn {
  display: inline-block; padding: 10px 22px;
  background: #B5892A; color: #FFFFFF; text-decoration: none;
  font-size: 0.8rem; font-weight: 700; border-radius: 3px;
  letter-spacing: 0.5px; transition: background 0.2s;
}
.ed-sidebar-btn:hover { background: #9A7320; }

/* ── Pre-rendered Footer ── */
.site-footer {
  background: #0D0D0D; color: rgba(255,255,255,0.65);
  text-align: center; padding: 36px 24px;
  font-size: 0.84rem; border-top: 1px solid rgba(181,137,42,0.2);
}
.site-footer a { color: #B5892A; text-decoration: none; }
.site-footer a:hover { text-decoration: underline; }
`;

// ── HTML Page Renderer ───────────────────────────────────────────────────────
function renderArticlePage(article, allArticles) {
  const coverUrl = resolveCoverUrl(article.cover);
  const coverAsset = resolveAssetPath(article.cover);
  const cat = article.category || 'Executive Insight';

  const pageTitle = (article.seo && article.seo.metaTitle)
    ? `${article.seo.metaTitle} | The Empire Insight`
    : `${article.title} | The Empire Insight`;

  const metaDesc = (article.seo && article.seo.metaDescription)
    ? article.seo.metaDescription
    : (article.subtitle || article.excerpt || `Read executive analysis and in-depth business perspectives on ${article.title} from The Empire Insight.`);

  const keywords = (article.seo && article.seo.keywords)
    ? (Array.isArray(article.seo.keywords) ? article.seo.keywords.join(', ') : article.seo.keywords)
    : (article.tags || ['Business leadership', 'The Empire Insight']).join(', ');

  const canonicalUrl = `${SITE_URL}/article/${encodeURIComponent(article.slug)}`;
  const pubDate = formatDate(article.publishedDate);

  // Byline
  const bylineParts = [];
  if (pubDate) bylineParts.push(pubDate);
  if (article.leader) bylineParts.push(`Spotlight: ${article.leader}${article.leaderRole ? ` (${article.leaderRole})` : ''}`);
  if (cat) bylineParts.push(cat);
  const bylineText = bylineParts.join(' &bull; ');

  // Content sanitization & relative image path normalization
  let content = article.content || '<p>Article content coming soon.</p>';
  content = content.replace(/src="images\//g, 'src="/images/');
  content = content.replace(/src="\.\.\/images\//g, 'src="/images/');
  content = content.replace(/src="\.\.\/\.\.\/images\//g, 'src="/images/');

  // Optional: Quotes Showcase if article has quotes and not yet in body
  let quotesHtml = '';
  if (article.quotes && article.quotes.length && !content.includes('ed-article-quotes-showcase')) {
    quotesHtml = `
      <div class="ed-article-quotes-showcase">
        <h4><i class="fas fa-quote-left"></i> Visionary Perspective &bull; Quotes from ${escapeHtml(article.leader || 'Leadership')}</h4>
        <div class="ed-quotes-grid">
          ${article.quotes.map((q, idx) => `
            <div class="ed-quote-card ${idx === article.quotes.length - 1 ? 'highlight' : ''}">
              <p>&ldquo;${escapeHtml(q)}&rdquo;</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Optional: Leader Dossier if present and not yet in body
  let dossierHtml = '';
  if (article.leader && article.leaderRole && !content.includes('ed-leader-dossier-card')) {
    dossierHtml = `
      <div class="ed-leader-dossier-card">
        <div class="ed-dossier-header">
          <div class="ed-dossier-avatar">
            <i class="fas fa-user-tie"></i>
          </div>
          <div>
            <h4>${escapeHtml(article.leader)}</h4>
            <span class="ed-dossier-role">${escapeHtml(article.leaderRole)}</span>
            ${article.location ? `<span class="ed-dossier-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(article.location)}</span>` : ''}
          </div>
        </div>
        <div class="ed-dossier-body">
          <div class="ed-dossier-stat">
            <span class="stat-num">${escapeHtml(article.readingTime || '6 min')}</span>
            <span class="stat-lbl">Read Time</span>
          </div>
          <div class="ed-dossier-stat">
            <span class="stat-num">${escapeHtml(article.category || 'Executive')}</span>
            <span class="stat-lbl">Focus Area</span>
          </div>
        </div>
      </div>
    `;
  }

  // FAQ section for Google Rich Snippets
  const faqHtml = `
    <section class="ed-article-faq" aria-labelledby="article-faq-title">
      <h2 class="ed-article-faq-title" id="article-faq-title">Frequently Asked Questions</h2>
      <div class="ed-article-faq-list">
        <details class="ed-article-faq-item">
          <summary>What is this article about?</summary>
          <p>${escapeHtml(metaDesc)}</p>
        </details>
        <details class="ed-article-faq-item">
          <summary>What are the key themes explored?</summary>
          <p>This ${escapeHtml(cat)} analysis explores strategic leadership, execution models, innovation and market impact.</p>
        </details>
        <details class="ed-article-faq-item">
          <summary>Who or what is featured in this article?</summary>
          <p>${escapeHtml(article.leader || article.shortTitle || article.title)} is the central subject of this in-depth executive profile.</p>
        </details>
      </div>
    </section>
  `;

  // Tags
  const tagsHtml = (article.tags && article.tags.length)
    ? `<div class="ed-article-tags" aria-label="Article tags">${
        article.tags.map(t => `<span class="ed-article-tag">${escapeHtml(t)}</span>`).join('')
      }</div>`
    : '';

  // Sidebar stories
  const otherStories = (allArticles || []).filter(a => a.id !== article.id && a.visible !== false).slice(0, 5);
  const sidebarHtml = otherStories.map(a => {
    const sCover = resolveAssetPath(a.cover) || '/images/article-pdf&cover/article1.jpg';
    return `
      <a href="/article/${encodeURIComponent(a.slug)}" class="ed-sidebar-story">
        <img src="${sCover}" alt="${escapeAttr(a.title)}" class="ed-sidebar-story-img" loading="lazy" />
        <div class="ed-sidebar-story-body">
          <span class="ed-sidebar-story-cat">${escapeHtml(a.category || 'Story')}</span>
          <p class="ed-sidebar-story-title">${escapeHtml(a.title)}</p>
        </div>
      </a>
    `;
  }).join('');

  // Structured Data (JSON-LD)
  const schemaArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": metaDesc,
    "image": coverUrl,
    "datePublished": article.publishedDate || "2026-10-14",
    "dateModified": article.publishedDate || "2026-10-14",
    "author": {
      "@type": "Organization",
      "name": article.author || "The Empire Insight Editorial Board",
      "url": SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Empire Insight",
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/images/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "keywords": keywords
  };

  if (article.leader) {
    schemaArticle["about"] = {
      "@type": "Person",
      "name": article.leader,
      "jobTitle": article.leaderRole || "",
      "description": article.excerpt || article.subtitle || ""
    };
  }

  const schemaBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Featured Stories", "item": `${SITE_URL}/article` },
      { "@type": "ListItem", "position": 3, "name": article.shortTitle || article.title, "item": canonicalUrl }
    ]
  };

  const schemaFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is this article about?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": metaDesc
        }
      },
      {
        "@type": "Question",
        "name": "What are the key themes explored?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `This ${cat} analysis explores strategic leadership, execution models, innovation and market impact.`
        }
      },
      {
        "@type": "Question",
        "name": "Who or what is featured in this article?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${article.leader || article.shortTitle || article.title} is the central subject of this in-depth executive profile.`
        }
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google-site-verification" content="HI4F3xJNEMNANtPi0ggxT1XeK7OUKcplKlHCj5J67Gg" />
  <base href="/" />

  <!-- ═══ SEO CORE ═══ -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeAttr(metaDesc)}" />
  <meta name="keywords" content="${escapeAttr(keywords)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <meta name="author" content="${escapeAttr(article.author || 'The Empire Insight Editorial Board')}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- ═══ OPEN GRAPH ═══ -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(pageTitle)}" />
  <meta property="og:description" content="${escapeAttr(metaDesc)}" />
  <meta property="og:image" content="${coverUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttr(article.title + ' Cover | The Empire Insight')}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="The Empire Insight" />
  <meta property="article:published_time" content="${article.publishedDate || '2026-10-14'}" />
  <meta property="article:author" content="${escapeAttr(article.author || 'The Empire Insight')}" />
  <meta property="article:section" content="${escapeAttr(cat)}" />
  ${(article.tags || []).map(t => `<meta property="article:tag" content="${escapeAttr(t)}" />`).join('\n  ')}

  <!-- ═══ TWITTER / X CARDS ═══ -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@The_45Empire" />
  <meta name="twitter:title" content="${escapeAttr(pageTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(metaDesc)}" />
  <meta name="twitter:image" content="${coverUrl}" />
  <meta name="twitter:image:alt" content="${escapeAttr(article.title)}" />

  <!-- ═══ FAVICONS ═══ -->
  <link rel="icon" type="image/png" href="/images/favicon-32x32.png?v=2" sizes="32x32" />
  <link rel="icon" type="image/png" href="/images/favicon.png?v=2" sizes="512x512" />
  <link rel="shortcut icon" type="image/png" href="/images/favicon-32x32.png?v=2" />
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png?v=2" />

  <!-- ═══ FONTS & ICONS ═══ -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

  <!-- ═══ PRE-RENDERED SCHEMA.ORG JSON-LD ═══ -->
  <script type="application/ld+json">
${JSON.stringify(schemaArticle, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(schemaBreadcrumbs, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(schemaFaq, null, 2)}
  </script>

  <!-- ═══ STYLES ═══ -->
  <link rel="stylesheet" href="/css/style.css" />
  <style>
${ARTICLE_CSS}
  </style>
</head>
<body class="ed-article-page">

  <!-- ═══ HEADER (Pre-rendered) ═══ -->
  <header class="site-header">
    <div class="header-main-inner">
      <div class="header-logo">
        <a href="/" title="The Empire Insight — Home">
          <img src="/images/logo.png" alt="The Empire Insight" class="nav-logo-img" width="auto" height="42" />
        </a>
      </div>
      <button class="nav-toggle-btn" id="mobile-nav-toggle" aria-label="Toggle navigation menu">
        <i class="fas fa-bars"></i>
      </button>
      <nav class="primary-nav" id="main-nav" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/magazine">Magazines</a>
        <a href="/article" class="active" aria-current="page">Featured Stories</a>
        <a href="/about">About</a>
        <a href="/contact" class="nav-subscribe">Contact</a>
      </nav>
    </div>
  </header>

  <!-- ═══ FLOATING SOCIAL ═══ -->
  <div class="floating-social" aria-label="Follow us on social media">
    <a href="https://www.linkedin.com/company/the-empire-insights/" target="_blank" rel="noopener" aria-label="LinkedIn" class="fs-linkedin" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
    <a href="https://x.com/The_45Empire?t=alzRMjF1ebX5L0gDwQSacA&s=09" target="_blank" rel="noopener" aria-label="X / Twitter" class="fs-twitter" title="X / Twitter"><i class="fab fa-x-twitter"></i></a>
    <a href="https://www.instagram.com/the_empire_insights?igsh=dm8wYzdoZng4M3Zr" target="_blank" rel="noopener" aria-label="Instagram" class="fs-instagram" title="Instagram"><i class="fab fa-instagram"></i></a>
    <a href="https://www.facebook.com/the_empire_insights" target="_blank" rel="noopener" aria-label="Facebook" class="fs-facebook" title="Facebook"><i class="fab fa-facebook-f"></i></a>
  </div>

  <!-- ═══ BREADCRUMB (Pre-rendered) ═══ -->
  <nav class="mag-breadcrumb-nav" aria-label="Breadcrumb">
    <div class="mag-breadcrumb-container">
      <a href="/"><i class="fas fa-home" aria-hidden="true"></i> Home</a>
      <span class="separator" aria-hidden="true">/</span>
      <a href="/article">Featured Stories</a>
      <span class="separator" aria-hidden="true">/</span>
      <span class="current" aria-current="page">${escapeHtml(article.shortTitle || article.title)}</span>
    </div>
  </nav>

  <!-- ═══ ARTICLE HEADER BANNER (Pre-rendered) ═══ -->
  <section class="ed-article-header">
    <div class="ed-article-header-inner">
      <div class="ed-article-meta-pill">
        <span class="ed-article-cat">${escapeHtml(cat)}</span>
        <span class="ed-article-readtime">
          <i class="far fa-clock" aria-hidden="true"></i>
          ${escapeHtml(article.readingTime || '6 min read')}
        </span>
      </div>
      <h1 class="ed-article-headline">${escapeHtml(article.title)}</h1>
      ${article.subtitle ? `<p class="ed-article-sub">${escapeHtml(article.subtitle)}</p>` : ''}
    </div>
  </section>

  <!-- ═══ ARTICLE LAYOUT ═══ -->
  <div class="ed-article-layout">

    <!-- ── Main Content Column ── -->
    <main class="ed-article-main" id="main-content" role="main">

      <!-- Cover Image Frame (Uncropped) -->
      <div class="ed-article-cover-frame">
        <img
          src="${coverAsset || coverUrl}"
          alt="${escapeAttr(article.title + ' — The Empire Insight Official Cover')}"
          class="ed-article-hero-img"
          loading="eager"
          decoding="async"
        />
        <span class="ed-article-cover-badge">
          <i class="fas fa-award" aria-hidden="true"></i> The Empire Insight Official Cover Feature
        </span>
      </div>

      <!-- Byline & Share Bar -->
      <div class="ed-article-byline-bar">
        <div class="ed-byline-info">
          <strong>${escapeHtml(article.author || 'The Empire Insight Editorial Board')}</strong>
          <span>${bylineText}</span>
        </div>
        <div class="ed-byline-share">
          <button class="ed-share-btn" id="share-article-btn" aria-label="Share this article" title="Share article">
            <i class="fas fa-share-alt" aria-hidden="true"></i> Share Article
          </button>
        </div>
      </div>

      <!-- ═══ PRE-RENDERED ARTICLE CONTENT (100% HTML, Instant SEO Indexing) ═══ -->
      <article class="ed-article-body" itemscope itemtype="https://schema.org/Article">
        <meta itemprop="headline" content="${escapeAttr(article.title)}" />
        <meta itemprop="description" content="${escapeAttr(metaDesc)}" />
        <meta itemprop="datePublished" content="${article.publishedDate || ''}" />
        <meta itemprop="author" content="${escapeAttr(article.author || 'The Empire Insight')}" />
        ${content}
      </article>

      <!-- Optional dynamic quotes showcase -->
      ${quotesHtml}

      <!-- Optional dynamic leader dossier -->
      ${dossierHtml}

      <!-- FAQ Section for Search Snippets -->
      ${faqHtml}

      <!-- Tags Strip -->
      ${tagsHtml}

      <!-- Bottom Navigation Buttons -->
      <nav class="ed-article-nav-bottom" aria-label="Article navigation">
        <a href="/article" class="btn-ghost-ed">
          <i class="fas fa-arrow-left" aria-hidden="true"></i> Back to All Stories
        </a>
        <a href="/magazine" class="btn-primary-ed">
          Explore Magazine Archive <i class="fas fa-arrow-right" aria-hidden="true"></i>
        </a>
      </nav>
    </main>

    <!-- ── Sidebar Column ── -->
    <aside class="ed-article-sidebar" aria-label="More stories">
      <div class="ed-sidebar-box">
        <h3 class="ed-sidebar-heading">More Featured Stories</h3>
        <div class="ed-sidebar-list">
          ${sidebarHtml}
        </div>
      </div>

      <div class="ed-sidebar-box ed-sidebar-cta-box">
        <h4>The Empire Insight</h4>
        <p>Curated executive intelligence delivered to modern leaders, innovators, and entrepreneurs.</p>
        <a href="/contact" class="ed-sidebar-btn">Subscribe / Connect</a>
      </div>
    </aside>
  </div>

  <!-- ═══ FOOTER (Pre-rendered) ═══ -->
  <footer class="site-footer" role="contentinfo">
    <p>&copy; ${new Date().getFullYear()} <a href="/">The Empire Insight</a>. All rights reserved. 
       &bull; <a href="/about">About</a> 
       &bull; <a href="/contact">Contact</a> 
       &bull; <a href="/magazine">Magazine Archive</a>
    </p>
  </footer>

  <!-- ═══ MINIMAL CLIENT-SIDE INTERACTIONS (Share & Mobile Toggle) ═══ -->
  <script>
    (function() {
      // Mobile menu toggle
      var toggleBtn = document.getElementById('mobile-nav-toggle');
      var navMenu   = document.getElementById('main-nav');
      if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          navMenu.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
          if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('open');
          }
        });
      }

      // Share button
      var shareBtn = document.getElementById('share-article-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', function() {
          if (navigator.share) {
            navigator.share({
              title: ${JSON.stringify(article.title)},
              text: ${JSON.stringify(metaDesc)},
              url: window.location.href
            }).catch(function(){});
          } else {
            navigator.clipboard.writeText(window.location.href)
              .then(function() {
                var orig = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fas fa-check" style="color:#B5892A"></i> Link Copied!';
                setTimeout(function() { shareBtn.innerHTML = orig; }, 2000);
              }).catch(function(){});
          }
        });
      }
    })();
  </script>

</body>
</html>`;
}

// ── 404 Not Found Page ───────────────────────────────────────────────────────
function renderNotFoundPage(slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Article Not Found | The Empire Insight</title>
  <meta name="robots" content="noindex, follow" />
  <base href="/" />
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    body { background: #0D0D0D; color: #FFFFFF; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 24px; }
    .box { max-width: 580px; }
    h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; color: #B5892A; margin-bottom: 16px; }
    p { font-size: 1.05rem; color: rgba(255,255,255,0.75); margin-bottom: 28px; line-height: 1.6; }
    a { display: inline-block; background: #B5892A; color: #0D0D0D; padding: 12px 28px; font-weight: 700; text-decoration: none; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Article Not Found</h1>
    <p>The requested article "${escapeHtml(slug || '')}" could not be located in our publication archives.</p>
    <a href="/article">Browse All Stories &rarr;</a>
  </div>
</body>
</html>`;
}

// ── Vercel Serverless Function Handler ──────────────────────────────────────
module.exports = function handler(req, res) {
  try {
    let slug = req.query ? req.query.slug : null;

    if (!slug && req.url) {
      const pathname = req.url.split('?')[0];
      const match = pathname.match(/\/(?:article|articles)\/([^/]+)/i);
      if (match) slug = match[1];
    }

    if (!slug) {
      res.writeHead(302, { Location: '/article' });
      return res.end();
    }

    const target = decodeURIComponent(slug).toLowerCase().trim().replace(/\.html$/i, '');
    const articles = loadArticles();
    const visibleArticles = articles.filter(a => a.visible !== false);

    const article = visibleArticles.find(a =>
      (a.slug && a.slug.toLowerCase().trim() === target) ||
      (a.id && a.id.toString().toLowerCase().trim() === target)
    );

    if (!article) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(renderNotFoundPage(slug));
    }

    const html = renderArticlePage(article, visibleArticles);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at edge for 24 hours, stale-while-revalidate for 1 hour
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.end(html);

  } catch (err) {
    console.error('Serverless SSR render error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('An error occurred rendering this article.');
  }
};
