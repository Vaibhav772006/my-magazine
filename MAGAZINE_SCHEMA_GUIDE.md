# Centralized Magazine Architecture & Editor's Guide

This website uses a **centralized JSON architecture** (`js/magazines.json`) to manage all magazine issues, previews, reader views, and homepage showcases without requiring a database or build step.

---

## 1. How the Centralized System Works

```
                        ┌────────────────────────┐
                        │   js/magazines.json    │
                        │  (Single Source of     │
                        │        Truth)          │
                        └──────────┬─────────────┘
                                   │
         ┌─────────────────────────┼────────────────────────┐
         ▼                         ▼                        ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ pages/index.html  │    │pages/magazine.html│    │ pages/magazine-   │
│(Dynamic Showcase) │    │ (Archive + Filter)│    │  preview.html     │
└───────────────────┘    └───────────────────┘    └─────────┬─────────┘
                                                            │
                                                  ┌─────────▼─────────┐
                                                  │ pages/magazine-   │
                                                  │    view.html      │
                                                  │ (Full Reader View)│
                                                  └───────────────────┘
```

When you add or update an edition in `js/magazines.json`:
1. **Homepage (`pages/index.html`)** automatically features the newest editions.
2. **Archive Page (`pages/magazine.html`)** instantly displays it in the search & category filters.
3. **Preview Page (`pages/magazine-preview.html?id=YOUR_ID`)** renders the executive summary, table of contents, and quick specs.
4. **Reader View (`pages/magazine-view.html?id=YOUR_ID`)** renders the full editorial article, quote spotlights, and PDF download options.
5. **SEO & Social Graph (`js/seo-helper.js`)** automatically configures:
   - Dynamic page title and canonical URLs.
   - Meta description and search keywords.
   - Open Graph tags (`og:title`, `og:image`, `og:description`) for LinkedIn, Facebook, and WhatsApp.
   - Twitter Summary Large Image cards.
   - **Schema.org JSON-LD Structured Data** (`PublicationIssue` and `BreadcrumbList`) for Google Rich Results.

---

## 2. Standard Magazine Schema Specification

Each object in `js/magazines.json` supports the following standardized schema:

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | string | **Yes** | Unique identifier used in URL query params | `"july2025"` or `"fintech-oct-2025"` |
| `slug` | string | Optional | SEO-friendly URL slug | `"empire-leadership-july-2025"` |
| `title` | string | **Yes** | Full official title of the edition | `"Empire Leadership: Empowering Minds"` |
| `shortTitle`| string | Optional | Concise title for badges & cards | `"Empire Leadership"` |
| `subtitle` | string | Optional | Subtitle or edition tagline | `"Empowering Minds, Building Futures"` |
| `volume` | string | Optional | Publication volume | `"Vol. 1"` |
| `issue` | string | Optional | Issue number | `"Issue 1"` |
| `edition` | string | **Yes** | Month and year of release | `"July 2025"` |
| `publishedDate`| string (ISO)| **Yes** | ISO-8601 date for SEO structured data | `"2025-07-15"` |
| `category` | string | **Yes** | Category for filtering pills | `"Leadership & Business"`, `"Technology & AI"`, `"Finance & Markets"`, `"Sustainability & ESG"`, `"Workplace & Culture"` |
| `tags` | string[] | Optional | Array of topic tags for search & SEO | `["Leadership", "Strategy", "Culture"]` |
| `cover` | string | **Yes** | Path or URL to high-resolution cover image | `"../images/Magazine-cover/demo1.jpg"` |
| `pdfUrl` | string | Optional | Path to downloadable PDF copy | `"../images/article-pdf&cover/Article No 1.pdf"` |
| `featured` | boolean | Optional | Highlights issue with a star badge | `true` or `false` |
| `status` | string | Optional | Publication state | `"Published"` or `"Upcoming"` |
| `readingTime`| string | Optional | Estimated reader time | `"35 min read"` |
| `pageCount` | number | Optional | Number of printed/digital pages | `54` |
| `issn` | string | Optional | Official periodical ISSN | `"2834-9121"` |
| `preview` | string | **Yes** | 150-160 character teaser for search snippets | `"The July 2025 edition explores stories of resilience and leadership..."` |
| `executiveSummary` | string | Optional | High-level takeaway for executive readers | `"This flagship edition brings together practical frameworks..."` |
| `editor` | object | Optional | Byline credit with `name` and `role` | `{"name": "David Sterling", "role": "Editor-in-Chief"}` |
| `tableOfContents`| array | Optional | Curated articles list inside this issue | See example below |
| `featuredQuotes` | array | Optional | Visionary quotes with `quote`, `author`, `role` | See example below |
| `seo` | object | Optional | Explicit meta tag overrides | See example below |
| `content` | HTML string | Optional | Full editorial and cover feature HTML | `"<p>Editorial letter...</p>"` |

---

## 3. Step-by-Step: Adding a New Magazine Edition

To add a new magazine, open `js/magazines.json` and insert a new object at the top of the array:

```json
{
  "id": "december2025",
  "slug": "healthcare-innovation-december-2025",
  "title": "BioHealth Frontiers: The AI Medical Revolution",
  "shortTitle": "BioHealth Frontiers",
  "subtitle": "Precision Medicine, Biotech Capital, and Healthcare Longevity",
  "volume": "Vol. 1",
  "issue": "Issue 6",
  "edition": "December 2025",
  "publishedDate": "2025-12-01",
  "category": "Technology & AI",
  "tags": ["Biotech", "Artificial Intelligence", "Healthcare", "Innovation"],
  "cover": "../images/assets/hero1.jpeg",
  "pdfUrl": "../images/article-pdf&cover/Article No 1.pdf",
  "featured": true,
  "status": "Published",
  "readingTime": "38 min read",
  "pageCount": 58,
  "issn": "2834-9121",
  "editor": {
    "name": "Dr. Aris Thorne",
    "role": "Medical & Tech Editor"
  },
  "preview": "Discover how generative biology, algorithmic diagnostics, and robotic surgery are rewriting patient care paradigms.",
  "executiveSummary": "This issue analyzes clinical AI validation, bio-ethics frameworks, and venture capital flows into next-generation therapeutics.",
  "tableOfContents": [
    {
      "page": 8,
      "title": "Generative Biology and Drug Discovery",
      "author": "Dr. Sarah Chen",
      "category": "Biotech",
      "snippet": "Compressing decade-long molecular research into weeks."
    }
  ],
  "featuredQuotes": [
    {
      "quote": "The intersection of biology and computation is the most profound frontier of human health.",
      "author": "Dr. Sarah Chen",
      "role": "Chief Science Officer"
    }
  ],
  "seo": {
    "metaTitle": "BioHealth Frontiers December 2025 | The Empire Insights Magazine",
    "metaDescription": "Explore BioHealth Frontiers December 2025. In-depth analysis of AI in healthcare, biotechnology investments, and medical longevity.",
    "keywords": ["health tech magazine", "AI medicine", "biotech insights", "december 2025 issue"]
  },
  "content": "<div class=\"editorial-intro\"><h3>The Computational Era of Medicine</h3><p>Welcome to our December 2025 issue focusing on the unprecedented convergence of machine intelligence and life sciences...</p></div>"
}
```

Save the file. Your new edition is instantly live across the entire website!
