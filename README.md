# The Empire Insights

A responsive magazine website built with HTML, CSS, and vanilla JavaScript. Content is loaded from JSON files, so the site can be deployed without a build step.

## Run locally

Serve the repository over HTTP so browser `fetch()` requests work:

```powershell
php -S localhost:8000
```

Then open <http://localhost:8000/>. XAMPP users can place this folder in `htdocs` and open `http://localhost/magazine/`.

Opening HTML files directly with `file://` is not supported because browsers block local JSON and partial-file requests.

## Deploy

Upload the complete repository to any static host such as GitHub Pages, Netlify, or Cloudflare Pages. The root `index.html` forwards visitors to `pages/index.html`, and all assets use relative paths so the site also works when hosted beneath a repository or subdirectory path.

There are no build or install steps. The site uses CDN-hosted Font Awesome, Google Fonts, Swiper, and a few external article images, so the deployed site needs outbound HTTPS access for those resources.

## Contact form

The contact form uses a `mailto:` action and therefore works on static hosting by opening the visitor's configured email client. A PHP mail handler can be added later for server-side delivery; `pages/sendmail.php` is kept as the optional backend entry point for PHP hosting.
