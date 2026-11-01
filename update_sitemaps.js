/**
 * Automatic Dynamic Sitemap Generator for The Empire Insight
 * Reads all visible articles and magazines directly from JSON and generates clean canonical sitemaps.
 *
 * Usage: node update_sitemaps.js
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL = 'https://www.theempireinsight.com';
const today    = new Date().toISOString().split('T')[0];

const ROOT = fs.existsSync(path.join(__dirname, 'js', 'articles.json'))
  ? __dirname
  : (fs.existsSync(path.join(__dirname, 'magazine', 'js', 'articles.json'))
      ? path.join(__dirname, 'magazine')
      : __dirname);

const articlesPath  = path.join(ROOT, 'js', 'articles.json');
const magazinesPath = path.join(ROOT, 'js', 'magazines.json');

const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8').replace(/^\uFEFF/, ''))
  .filter(a => a.visible !== false);

const magazines = JSON.parse(fs.readFileSync(magazinesPath, 'utf8').replace(/^\uFEFF/, ''))
  .filter(m => m.visible !== false);

// ── Build XML ────────────────────────────────────────────────────────────────
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Primary Website Pages -->
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
    <loc>${SITE_URL}/beyond-business</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.90</priority>
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

  <!-- Published Magazine Editions (${magazines.length} editions) -->
`;

magazines.forEach(m => {
  const modDate = m.modifiedDate || m.publishedDate || today;
  xml += `  <url>
    <loc>${SITE_URL}/magazine/${encodeURIComponent(m.id)}</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${SITE_URL}/magazine/${encodeURIComponent(m.id)}/read</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>
`;
});

xml += `\n  <!-- Published Articles (${articles.length} stories) -->\n`;

articles.forEach(a => {
  const modDate = a.publishedDate || today;
  xml += `  <url>
    <loc>${SITE_URL}/article/${encodeURIComponent(a.slug)}</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
`;
});

xml += `\n</urlset>\n`;

// Write to ROOT sitemap.xml
const targetPaths = [
  path.join(ROOT, 'sitemap.xml'),
  path.join(__dirname, 'sitemap.xml')
];

const written = new Set();
targetPaths.forEach(p => {
  if (!written.has(p)) {
    fs.writeFileSync(p, xml, 'utf8');
    written.add(p);
    console.log(`  ✔ Generated sitemap at: ${p} (${articles.length} articles, ${magazines.length} magazines)`);
  }
});
