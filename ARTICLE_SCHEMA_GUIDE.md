# Centralized Article Architecture & Bulk Upload Guide

This website uses a **centralized JSON architecture** (`magazine/js/articles.json`) to manage all editorial stories, executive profiles, cover stories, and homepage features without needing a backend database or build step.

---

## 1. How the Article System Works

```
                        ┌────────────────────────┐
                        │   js/articles.json     │
                        │  (Single Source of     │
                        │        Truth)          │
                        └──────────┬─────────────┘
                                   │
         ┌─────────────────────────┼────────────────────────┐
         ▼                         ▼                        ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ pages/index.html  │    │ pages/article.html│    │ pages/article-    │
│(Featured Stories  │    │(All Stories Grid  │    │    view.html      │
│     Section)      │    │  + Live Counter)  │    │(Full Reading View)│
└───────────────────┘    └───────────────────┘    └───────────────────┘
```

When you add or update an article in `js/articles.json`:
1. **Homepage (`index.html`)**: Automatically displays the newest article as the flagship hero feature in the "Featured Stories" section, and updates the sidebar stories dynamically.
2. **All Articles Archive (`article.html`)**: Instantly adds the story to the grid, displays its cover, category pill, reading time, published date, and auto-updates the article count badge.
3. **Reading Experience (`article-view.html?id=YOUR_ID`)**:
   - Shows the **full, uncropped vertical magazine cover** framed as an official cover feature.
   - Renders the executive byline, reading time, author, and date.
   - Formats pull quotes, inline photo galleries, and visionary quote cards.
   - Displays related stories in the sticky sidebar.
4. **Google SEO & Social Sharing**:
   - Updates page title, meta description, and target search keywords dynamically.
   - Populates Open Graph (`og:title`, `og:image`, `og:description`) for LinkedIn, Facebook, and WhatsApp.
   - Generates Schema.org `Article` JSON-LD structured data for Google Search rich snippets.

---

## 2. Standard Article Schema Reference

Each object inside the `js/articles.json` array supports the following fields:

| Field | Type | Required | Description | Example |
|---|---|---|---|---|
| `id` | string | **Yes** | Unique identifier used in URL query params (`?id=...`) | `"alejandro-calle-2026"` or `"6"` |
| `slug` | string | Optional | SEO-friendly URL slug (also works in `?id=slug`) | `"the-visionary-tech-entrepreneur-2026"` |
| `title` | string | **Yes** | Full article headline | `"The Visionary Tech Entrepreneur Bridging the Digital Divide, 2026"` |
| `shortTitle` | string | Optional | Concise title for breadcrumbs & sidebar cards | `"Bridging the Digital Divide"` |
| `subtitle` | string | Optional | Subtitle or editorial hook | `"How Alejandro Calle turned curiosity, compassion..."` |
| `category` | string | **Yes** | Subject category for badges and filtering | `"Technology & Entrepreneurship"`, `"Leadership"`, `"Culture"`, `"Strategy"` |
| `author` | string | Optional | Author or editorial board attribution | `"The Empire Insight Editorial Board"` |
| `leader` | string | Optional | Featured executive / leader name | `"Alejandro Calle"` |
| `leaderRole` | string | Optional | Executive title & organization | `"Founder & CEO, Tech In A Tux"` |
| `location` | string | Optional | City / Region of operation | `"City, Province, Canada"` |
| `publishedDate`| string (ISO)| **Yes** | ISO-8601 publication date | `"2026-10-14"` |
| `readingTime`| string | Optional | Estimated reading duration | `"8 min read"` |
| `featured` | boolean | Optional | Sets as premier story | `true` or `false` |
| `cover` | string | **Yes** | Path to the cover image (vertical or horizontal) | `"images/article-pdf&cover/alejandro-calle-cover.jpg"` |
| `gallery` | string[] | Optional | Array of additional inline images | `["images/article-pdf&cover/alejandro-calle-team.png"]` |
| `tags` | string[] | Optional | Array of topic tags for SEO | `["Tech Entrepreneurship", "AI", "Leadership"]` |
| `excerpt` | string | Optional | 1-2 sentence preview for cards & meta tags | `"Most people only think about their computer when it stops working..."` |
| `quotes` | string[] | Optional | Array of inspirational pull quotes from the leader | `["Don't wait until you know everything to begin.", ...]` |
| `content` | HTML string | **Yes** | Full article body HTML with headings and quotes | `"<p>Article content...</p>"` |
| `seo` | object | Optional | Explicit meta tag overrides | See template below |

---

## 3. Quick Copy-Paste Template for Adding a New Article

To add an article, open `magazine/js/articles.json` and paste this block at the top of the array:

```json
[
  {
    "id": "new-leader-slug-2026",
    "slug": "new-leader-slug-2026",
    "title": "Your Full Article Headline Here",
    "shortTitle": "Short Title",
    "subtitle": "A compelling subtitle explaining the transformation or achievement.",
    "category": "Technology & AI",
    "author": "The Empire Insight Editorial Board",
    "leader": "Executive Name",
    "leaderRole": "CEO & Founder, Enterprise Name",
    "location": "New York, USA",
    "publishedDate": "2026-10-20",
    "readingTime": "6 min read",
    "featured": true,
    "cover": "images/article-pdf&cover/your-cover-image.jpg",
    "gallery": [
      "images/article-pdf&cover/your-inline-photo.png"
    ],
    "tags": [
      "Global Business Leaders",
      "Executive Strategy",
      "Technology & AI"
    ],
    "excerpt": "A short 1-2 sentence summary of the article for preview cards and search engines.",
    "quotes": [
      "Leadership is about creating the conditions for others to succeed.",
      "Innovation begins where convention ends."
    ],
    "content": "<h3>The Journey Behind the Achievement</h3><p>First paragraph of the article narrative goes here.</p><blockquote class=\"ed-article-pullquote\"><span class=\"ed-quote-mark\">&ldquo;</span>Leadership is about creating the conditions for others to succeed.<cite>&mdash; Executive Name</cite></blockquote><h3>Scaling with Purpose</h3><p>Second section narrative exploring strategy and human impact.</p><figure class=\"ed-article-inline-figure\"><img src=\"images/article-pdf&cover/your-inline-photo.png\" alt=\"Executive in action\" loading=\"lazy\" /><figcaption><i class=\"fas fa-camera\"></i> Executive Name collaborating with teams.</figcaption></figure><h3>Looking Ahead</h3><p>Conclusion discussing future outlook and industry implications.</p>",
    "seo": {
      "metaTitle": "Executive Name: Article Headline | The Empire Insight",
      "metaDescription": "Discover how Executive Name is leading innovation and building sustainable enterprise growth.",
      "keywords": [
        "Executive Name",
        "Global Business Magazine",
        "Best CEO Magazine",
        "CEO leadership stories",
        "The Empire Insight"
      ]
    }
  }
]
```

---

## 4. How to Upload in Bulk

1. **Place your images** inside `magazine/images/article-pdf&cover/`.
2. Open `magazine/js/articles.json`.
3. Add as many article objects as you want to the JSON array.
4. That's it!
   - Every article is immediately readable at `article-view.html?id=YOUR_ID`.
   - The archive page `article.html` automatically renders all articles and updates the total counter.
   - The homepage `index.html` automatically presents the latest article in the featured hero spotlight.
