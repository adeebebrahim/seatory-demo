# Seatory Furniture: demo website

A fast, static, SEO-ready showcase site for Seatory Furniture (Kallapu, Mangalore).
There is no checkout. Every product CTA is **Enquire on WhatsApp** or **Visit Showroom**.

- **Stack:** plain HTML + CSS + ~3 KB of vanilla JS, produced by a dependency-free Node build script.
- **Output:** `dist/` is a folder of static files you can host on Netlify, Vercel, Cloudflare Pages, GitHub Pages or any cPanel host.
- **Performance:** no frameworks, no web fonts, no tracking scripts. Images are lazy-loaded with fixed width and height (no layout shift), the hero image loads with high priority, and the map iframe lazy-loads.

## Build and preview

```bash
node build.mjs                                     # writes dist/ and prints an SEO + placeholder report
python -m http.server 8080 --directory dist        # preview at http://localhost:8080
```

You need Node 18 or later. After editing anything in `src/`, run the build again. It fails with a warning list if a title is over 60 characters, a description is over 160, or a page doesn't have exactly one `<h1>`.

## File tree

```
seatory-site/
├── build.mjs                  # static site generator (all page templates, schema, sitemap, robots)
├── README.md
├── src/
│   ├── data/
│   │   ├── site.json          # NAP, WhatsApp, hours, rating, URLs: the single source of truth
│   │   ├── categories.json    # category names, SEO titles, descriptions, intros
│   │   ├── products.json      # 18 real products from Instagram + 9 SAMPLE listings
│   │   ├── projects.json      # finished-look projects (placeholders)
│   │   └── testimonials.json  # testimonials (empty placeholders)
│   └── assets/
│       ├── css/styles.css
│       ├── js/main.js         # menu, gallery, project filter, WhatsApp enquiry form
│       ├── js/catalogue.js    # search, filters, sort (URL-shareable)
│       └── images/            # drop real .webp photos here (see "Images")
│           ├── logo.png, seatory-emblem-96/192 (from the Instagram profile logo), apple-touch-icon.png, og-default.jpg
│           ├── hero/ products/ categories/ projects/ instagram/ about/ testimonials/
└── dist/                      # generated site (do not edit by hand)
    ├── index.html
    ├── products/index.html                              # catalogue with filters
    ├── products/{sofas,beds,dining,office,cafe,storage}/index.html
    ├── products/<category>/<product-slug>/index.html    # 13 product pages
    ├── projects/  about/  testimonials/  contact/
    ├── furniture-shop-mangalore/  furniture-shop-udupi/  # location landing pages
    ├── 404.html  sitemap.xml  robots.txt
```

## URL structure

| Page | URL |
|---|---|
| Home | `/` |
| Catalogue | `/products/` (filters kept in `?q=&cat=&type=&mat=&sort=`, and the canonical URL stays `/products/`) |
| Category | `/products/sofas/` |
| Product | `/products/sofas/l-shaped-fabric-sofa/` |
| Finished looks | `/projects/` |
| About, Reviews, Visit Us | `/about/`, `/testimonials/`, `/contact/` |
| Location pages | `/furniture-shop-mangalore/`, `/furniture-shop-udupi/` |

## Placeholders: everything is in `src/data/site.json`

Anything missing shows on the site as a yellow dashed **[placeholder]** chip, and the build prints the list.

| Field | What to enter | Where it appears |
|---|---|---|
| `url` | Live domain, e.g. `https://www.seatoryfurniture.in` | canonicals, OG tags, sitemap, schema |
| `allowIndexing` | `false` for the demo. Set to `true` **at launch** | `robots.txt` and meta robots (demo is `noindex`) |
| `whatsapp` | Digits only with country code, e.g. `919876543210` | every WhatsApp button (now `wa.me/91XXXXXXXXXX`) |
| `phone` / `phoneDisplay` | `+919876543210` / `+91 98765 43210` | header/footer, contact, schema |
| `email` | optional | contact page, schema |
| `hours` | `[{"days":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"opens":"10:00","closes":"20:30"},{"days":["Sunday"],"closed":true}]` | footer, contact, schema `openingHoursSpecification` |
| `geo.lat` / `geo.lng` | From Google Maps (right-click the pin → copy coordinates) | schema `GeoCoordinates` |
| `address` | Confirm the street line exactly as on Google Business Profile, then set `"verified": true` | site-wide NAP + schema |
| `rating.value` / `rating.count` | Current Google rating and review count | reviews block + `aggregateRating` (omitted while empty) |
| `googleReviewUrl` | GBP → "Ask for reviews" link (`https://g.page/r/.../review`) | "Write a review" buttons |
| `yearsInBusiness`, `foundedYear` | numbers | About page, schema `foundingDate` |
| `facebook` | optional URL | footer, `sameAs` |

**Products** (`products.json`):
- **18 real products** were taken from the client's Instagram posts (lounge chairs, café/dining/cane chairs, bar chairs, mesh office chairs). Name, features, colours and price are copied from each poster, and `source` links to the original post. **Dimensions are not on the posters**, so they show as placeholders. The "Price" shown is the MRP or flat price printed on the poster, labelled "as listed on our Instagram". Ask the client to confirm prices are still current, or delete the `price` field to hide them.
- **9 sample listings** (sofas, beds, dining sets, wardrobe, workstation, café table) are kept for the categories the Instagram doesn't cover yet. Their names, sizes and dimensions are illustrative only.
- The Instagram has ~25 more office-chair posters (Fashion, Swift, Tango, Eros, Puma, Novaa, Idea, Fanta, Max, Martin, Flipper, Perfect, Spykar, Focus, Aldo, Zopper, Oxy, Canto, Kiwi, Rado, Della) and more café chairs (Nova, Harry, Kane, Zuri) that can be added the same way. Each product has `slug`, `name`, `category`, `type`, `materials[]`, `dimensions`, `size`, `added` (YYYY-MM-DD, drives newest/oldest sort), `featured`, `summary` and `features[]`, plus optional `finishes`, `warranty` and `leadTime`. Remove `"sample": true` once it's real.

**Testimonials** (`testimonials.json`): fill in `quote`, `name`, `location`, and optionally `product` and `photo` (a file in `images/testimonials/`). Only use real customer words, with their permission.

**Projects** (`projects.json`): real location type (e.g. "3BHK apartment, Kadri"), caption, and products used.

**About page copy:** the story and years are placeholders. The mission line is a draft for the client to approve. Material care notes on product pages include `[Confirm …]` prompts.

## Images

The build looks for each image under `src/assets/images/<folder>/<file>.webp`. If the file isn't there, it generates a labelled placeholder that shows the exact filename to supply. File names are already descriptive and SEO-friendly:

- `hero/seatory-furniture-showroom-mangalore-hero.webp`: 1600×1000
- `products/<slug>-mangalore-1.webp`, `-2`, `-3`: 1200×900 (4:3). Optionally add `<slug>-mangalore-1.jpg` for social previews.
- `categories/<category>-furniture-mangalore.webp`: 600×600
- `projects/<project-slug>-seatory-furniture-mangalore.webp`: 1200×900
- `instagram/seatory-instagram-1..6.webp`: 600×600
- `about/seatory-furniture-showroom-kallapu-mangalore.webp`: 1000×1200

To convert to WebP, use [Squoosh](https://squoosh.app) or `cwebp -q 78 in.jpg -o out.webp`. Keep product images under about 150 KB.
Alt text is generated from product name, material and view, for example "L-Shaped Fabric Sofa (fabric & wood), front view, Seatory Furniture Mangalore". To override it, add an `images` array to a product: `[{ "file": "...", "alt": "..." }]`.

**Instagram feed:** a live feed needs a Meta access token and app review. The site uses a static grid of 6 real posts (3:4) linking to the profile, which is the fastest option. Alternatives: download the 6 latest posts monthly as WebP, or add an embed widget (e.g. Behold or LightWidget) in `instagramBlock()` in `build.mjs`. Widgets add third-party JS and slow the page down.

## SEO implemented

- Unique title (≤ 60) and meta description (≤ 160) on every page, checked automatically at build.
- One H1 per page (checked), logical H2/H3 hierarchy, semantic `header` / `nav` / `main` / `article` / `figure` / `address` / `footer`.
- JSON-LD: `FurnitureStore` (address, geo, hours, phone, `sameAs` Instagram + Google Maps, `aggregateRating` once real figures are entered) on Home, About, Contact and the Mangalore page; `Organization` + `WebSite` on Home; `Product` on every product page; `CollectionPage` on categories; `BreadcrumbList` on every inner page.
- Open Graph + Twitter Card tags, canonical URLs, `sitemap.xml`, `robots.txt`, `lang="en-IN"`, geo meta.
- Identical NAP everywhere, rendered from one source (`site.json`). Keep it character-for-character identical to the Google Business Profile.
- Internal linking: category ↔ product ↔ related products ↔ projects ("products used") ↔ location pages ↔ footer category links.
- Target keywords placed naturally in titles, H1s, intros and anchor text: furniture in Mangalore, furniture shop Mangalore, sofa set Mangalore, bed dealers Mangalore, office furniture Mangalore, Seatory furniture, plus Udupi/Karnataka variants.
- Accessibility: skip link, visible focus, ARIA on menu/gallery/filters, AA-contrast buttons, `prefers-reduced-motion`.

Notes:
- Products have no prices, so Google won't show product rich results (it needs `offers` or reviews). The schema is still valid and helps understanding. Add `offers` later if prices go online.
- Google does not show star snippets for a business's own `aggregateRating` on LocalBusiness pages. The markup is still fine to include, and the rating must match what's visible on the page.
- The Udupi page doesn't claim a store in Udupi. It's written for Udupi shoppers visiting the Mangalore showroom. Only add delivery claims once confirmed.
- No page or file promises rankings. These are best-practice foundations; results depend on content, reviews, links and competition.

## Launch checklist (for the client)

1. [ ] Fill every field in `site.json`, replace sample products, photos, testimonials. Rebuild. The build report should have no open placeholders.
2. [ ] Set `url` to the live domain and `allowIndexing: true`, then rebuild and deploy `dist/`.
3. [ ] Enable HTTPS and redirect `http://` and the non-www (or www) version to one canonical host.
4. [ ] **Google Search Console:** add a Domain property, verify via DNS, submit `https://<domain>/sitemap.xml`, and use URL Inspection → Request indexing for the home page.
5. [ ] **Google Business Profile:** set the Website field to the new domain, check that name, address and phone exactly match the site, add the categories "Furniture store" (+ "Office furniture store" if relevant), hours, photos and products, and copy the "Ask for reviews" link into `googleReviewUrl`.
6. [ ] Validate schema with the [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema Markup Validator](https://validator.schema.org).
7. [ ] Run [PageSpeed Insights](https://pagespeed.web.dev) on Home, a category and a product page (mobile). Aim for LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
8. [ ] Test every WhatsApp button on a phone. It should open a chat with a prefilled message.
9. [ ] Add the website link to the Instagram bio and keep the NAP consistent on JustDial, IndiaMART, Facebook and Bing Places.
10. [ ] Optional: install privacy-friendly analytics (e.g. GA4 or Plausible) and set up Bing Webmaster Tools (it can import from Search Console).

## Information needed from the client

- WhatsApp number, phone, email (optional), and exact business hours
- Confirmed street address as on Google (link shows "UK Dream Center Building, Kallapu, Ullal, Karnataka 575017"), plus map coordinates
- Domain name and an original high-resolution / vector logo (the current one is the 1080px Instagram profile image; colours are black + gold taken from it)
- Dimensions for the 18 Instagram products, plain product photos (no poster text) from more angles, and confirmation of the listed prices
- Products for sofas, beds, dining sets and storage (or confirm those categories should be removed)
- Finished-project photos with location type and products used (with homeowners' permission)
- 3–6 real testimonials (name, area, quote, optional photo) with written consent
- Google rating, review count and review link; years in business or founding year; company story
- Delivery coverage (Mangalore and Udupi?), installation and warranty terms
