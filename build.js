/**
 * The Empire Insight — Master Automated Build Script
 * 
 * Orchestrates:
 * 1. Static Article SSG (100% pre-rendered HTML for all articles)
 * 2. Static Content Pre-Renderer (Home featured stories, magazine editions, navbar & footer)
 * 3. Canonical Sitemap Generator (Full XML sitemap for Google & Bing)
 *
 * Runs automatically on every Vercel deployment and local build.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;

console.log('====================================================');
console.log('  The Empire Insight — Building Static Assets & SEO');
console.log('====================================================\n');

try {
  // Step 1: Generate Articles
  console.log('[1/3] Running Static Article SSG (generate-articles.js)...');
  execSync(`node "${path.join(ROOT, 'generate-articles.js')}"`, { stdio: 'inherit', cwd: ROOT });

  // Step 2: Pre-render Pages
  console.log('\n[2/3] Running Page Pre-Renderer (prerender-pages.js)...');
  execSync(`node "${path.join(ROOT, 'prerender-pages.js')}"`, { stdio: 'inherit', cwd: ROOT });

  // Step 3: Update Sitemaps
  console.log('\n[3/3] Generating Canonical XML Sitemaps (update_sitemaps.js)...');
  execSync(`node "${path.join(ROOT, 'update_sitemaps.js')}"`, { stdio: 'inherit', cwd: ROOT });

  console.log('\n====================================================');
  console.log('  ✔ BUILD SUCCESSFUL: Site ready for deployment!');
  console.log('====================================================');
} catch (error) {
  console.error('\n✖ Build failed:', error.message);
  process.exit(1);
}
