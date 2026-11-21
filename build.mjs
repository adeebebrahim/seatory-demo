// Seatory Furniture — static site generator (no dependencies).
// Usage:  node build.mjs        → writes the complete site to ./dist
// Edit content in src/data/*.json, styles in src/assets/css, images in src/assets/images.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(SRC, 'data', f), 'utf8'));

const site = readJSON('site.json');
const categories = readJSON('categories.json');
const products = readJSON('products.json');
const projects = readJSON('projects.json');
const testimonials = readJSON('testimonials.json');

const warnings = [];
const pages = []; // { path, priority } for sitemap
const placeholderImages = new Map();
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
if (process.env.SITE_URL) site.url = process.env.SITE_URL;
const BASE = site.url.replace(/\/$/, '');
// When hosted in a sub-folder (e.g. GitHub Pages: https://user.github.io/repo-name), every root-relative
// link ("/products/") is rewritten to include that folder ("/repo-name/products/").
const BASE_PATH = new URL(BASE).pathname.replace(/\/$/, '');
const abs = (p) => BASE + p;
const PH = (label) => `<span class="ph" title="Placeholder: client to supply">[${esc(label)}]</span>`;
const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
const productBySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
const productUrl = (p) => `/products/${p.category}/${p.slug}/`;
const catUrl = (slug) => `/products/${slug}/`;

const waNumber = site.whatsapp || '91XXXXXXXXXX';
const wa = (text = `Hi ${site.name}, I'd like to know more about your furniture.`) =>
  `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
const waProduct = (p) => wa(`Hi ${site.name}, I'm interested in the ${p.name}. Please share price, finishes and availability.\n${abs(productUrl(p))}`);

const a = site.address;
const addressLine = `${a.street}, ${a.locality}, ${a.city}, ${a.region} ${a.postalCode}`;
const addressHTML = `<address class="nap">
  <strong>${esc(site.name)}</strong><br>
  ${esc(a.street)}<br>${esc(a.locality)}, ${esc(a.city)}<br>${esc(a.region)} ${esc(a.postalCode)}, India
  ${a.verified ? '' : `<br>${PH('Confirm exact address matches Google Business Profile')}`}
</address>`;
const phoneHTML = site.phone ? `<a href="tel:${esc(site.phone)}">${esc(site.phoneDisplay || site.phone)}</a>` : PH('Phone number');
const emailHTML = site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : PH('Email (optional)');
const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(site.mapsEmbedQuery)}&output=embed`;
const reviewUrl = site.googleReviewUrl || site.googleMapsUrl;
const years = site.yearsInBusiness ? `${site.yearsInBusiness}+ years` : PH('X years');

function hoursHTML() {
  if (!site.hours) return `<p>${PH('Business hours: to be confirmed from Google Business Profile')}</p>`;
  return `<table class="hours"><tbody>${site.hours
    .map((h) => `<tr><th scope="row">${esc(h.days.join(', '))}</th><td>${h.closed ? 'Closed' : `${esc(h.opens)} – ${esc(h.closes)}`}</td></tr>`)
    .join('')}</tbody></table>`;
}

/* Images: if src/assets/images/<dir>/<file> exists it is used; otherwise a labelled
   placeholder SVG is generated so the client can see exactly which file goes where. */
function img(dir, file, alt, { w = 1200, h = 900, eager = false, cls = '' } = {}) {
  let src = `/assets/images/${dir}/${file}`;
  if (!fs.existsSync(path.join(SRC, 'assets', 'images', dir, file))) {
    const svg = file.replace(/\.\w+$/, '.svg');
    src = `/assets/images/${dir}/${svg}`;
    placeholderImages.set(`${dir}/${svg}`, { file, w, h });
  }
  return `<img src="${src}" alt="${esc(alt)}" width="${w}" height="${h}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ''}>`;
}
const VIEWS = ['front view', 'side view', 'close-up detail'];
const productImages = (p) =>
  (p.images || VIEWS.map((v, i) => ({ file: `${p.slug}-mangalore-${i + 1}.webp`, alt: `${p.name} (${p.materials.join(' & ').toLowerCase()}), ${v}, Seatory Furniture Mangalore` })));

function placeholderSVG(file, w, h) {
  const cx = w / 2, cy = h / 2, s = Math.min(w, h) / 900;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
<rect width="100%" height="100%" fill="#ebe4d9"/>
<g transform="translate(${cx} ${cy - 40 * s}) scale(${s})" fill="none" stroke="#b5a48c" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
<path d="M-150 20v-90a30 30 0 0 1 30-30h240a30 30 0 0 1 30 30v90"/><path d="M-190 20h380v60h-380z"/><path d="M-170 80v50M170 80v50"/><path d="M-190 20v-30M190 20v-30"/></g>
<text x="${cx}" y="${cy + 150 * s}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${30 * s}" font-weight="600" fill="#8c7a62" letter-spacing="3">PHOTO PLACEHOLDER</text>
<text x="${cx}" y="${cy + 195 * s}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${22 * s}" fill="#8c7a62">Replace with ${esc(file)}</text></svg>`;
}

/* ------------------------------------------------------------------ schema */
function storeSchema() {
  const s = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${BASE}/#store`,
    name: site.name,
    url: `${BASE}/`,
    image: abs('/assets/images/og-default.jpg'),
    logo: abs('/assets/images/logo.png'),
    description: site.tagline,
    address: { '@type': 'PostalAddress', streetAddress: `${a.street}, ${a.locality}`, addressLocality: a.city, addressRegion: a.region, postalCode: a.postalCode, addressCountry: a.country },
    hasMap: site.googleMapsUrl,
    areaServed: ['Mangalore', 'Udupi', 'Dakshina Kannada', 'Karnataka'].map((n) => ({ '@type': 'Place', name: n })),
    sameAs: [site.instagram, site.googleMapsUrl, site.facebook].filter(Boolean),
  };
  if (site.geo.lat && site.geo.lng) s.geo = { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng };
  if (site.phone) s.telephone = site.phone;
  if (site.email) s.email = site.email;
  if (site.foundedYear) s.foundingDate = String(site.foundedYear);
  if (site.hours) s.openingHoursSpecification = site.hours.filter((h) => !h.closed).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes }));
  // Only emitted when real figures from Google are entered in site.json — never invented.
  if (site.rating.value && site.rating.count) s.aggregateRating = { '@type': 'AggregateRating', ratingValue: site.rating.value, reviewCount: site.rating.count, bestRating: 5 };
  return s;
}
const orgSchema = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', '@id': `${BASE}/#org`, name: site.name, url: `${BASE}/`,
  logo: abs('/assets/images/logo.png'), sameAs: [site.instagram, site.googleMapsUrl, site.facebook].filter(Boolean),
  ...(site.phone ? { contactPoint: { '@type': 'ContactPoint', telephone: site.phone, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['en', 'kn'] } } : {}),
});
const crumbSchema = (crumbs) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
});
function productSchema(p) {
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.slug, url: abs(productUrl(p)),
    image: productImages(p).map((i) => abs(`/assets/images/products/${i.file}`)),
    description: p.summary, category: catBySlug[p.category].name, material: p.materials.join(', '),
    brand: { '@type': 'Brand', name: site.name },
    ...(p.colours ? { color: p.colours } : {}),
    additionalProperty: [
      ...(p.dimensions ? [{ '@type': 'PropertyValue', name: 'Dimensions', value: p.dimensions }] : []),
      { '@type': 'PropertyValue', name: 'Size', value: p.size },
    ],
  };
}

/* ------------------------------------------------------------------ layout */
const NAV = [
  ['/', 'Home'], ['/products/', 'Products'], ['/projects/', 'Finished Looks'],
  ['/about/', 'About'], ['/testimonials/', 'Reviews'], ['/contact/', 'Visit Us'],
];
const waIcon = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.3A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 6.9 3.8Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>`;

function header(current) {
  const links = NAV.map(([href, label]) => {
    const on = href === '/' ? current === '/' : current.startsWith(href);
    return `<li><a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap hdr">
    <a class="logo" href="/" aria-label="${esc(site.name)}, home"><img class="logo-emblem" src="/assets/images/seatory-emblem-96.webp" alt="" width="44" height="44"><span class="logo-text"><span class="logo-mark">SEATORY</span><span class="logo-sub">Furniture · Mangalore</span></span></a>
    <nav class="nav" id="nav" aria-label="Main"><ul>${links}</ul></nav>
    <a class="btn btn-wa hdr-wa" href="${wa()}" target="_blank" rel="noopener">${waIcon}<span>WhatsApp</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav"><span class="bars" aria-hidden="true"></span><span class="sr">Menu</span></button>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <p class="logo logo-foot"><img class="logo-emblem" src="/assets/images/seatory-emblem-96.webp" alt="" width="56" height="56" loading="lazy"><span class="logo-text"><span class="logo-mark">SEATORY</span><span class="logo-sub">Furniture · Mangalore</span></span></p>
      ${addressHTML}
      <p>Phone: ${phoneHTML}<br>WhatsApp: <a href="${wa()}" target="_blank" rel="noopener">Chat with us</a></p>
    </div>
    <div>
      <h2 class="foot-h">Shop by category</h2>
      <ul>${categories.map((c) => `<li><a href="${catUrl(c.slug)}">${esc(c.name)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="foot-h">Visit</h2>
      <ul>
        <li><a href="/furniture-shop-mangalore/">Furniture shop in Mangalore</a></li>
        <li><a href="/furniture-shop-udupi/">Furniture for Udupi customers</a></li>
        <li><a href="/contact/">Showroom & directions</a></li>
        <li><a href="/projects/">Finished looks</a></li>
        <li><a href="/about/">About us</a></li>
      </ul>
    </div>
    <div>
      <h2 class="foot-h">Hours</h2>
      ${hoursHTML()}
      <h2 class="foot-h">Follow</h2>
      <ul class="social">
        <li><a href="${site.instagram}" target="_blank" rel="noopener">Instagram @${esc(site.instagramHandle)}</a></li>
        <li><a href="${site.googleMapsUrl}" target="_blank" rel="noopener">Google Maps & reviews</a></li>
        ${site.facebook ? `<li><a href="${site.facebook}" target="_blank" rel="noopener">Facebook</a></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="wrap foot-base"><p>© <span data-year>${new Date().getFullYear()}</span> ${esc(site.name)}, Mangalore. Online purchase is not available yet: enquire on WhatsApp or visit our showroom.</p></div>
</footer>
<a class="wa-float" href="${wa()}" target="_blank" rel="noopener" aria-label="Chat with ${esc(site.name)} on WhatsApp">${waIcon}</a>`;
}

function crumbsHTML(crumbs) {
  return `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${crumbs
    .map((c, i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.path}">${esc(c.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

function render({ path: p, title, description, body, schema = [], crumbs, ogType = 'website', ogImage = '/assets/images/og-default.jpg', scripts = [], priority = 0.7 }) {
  if (title.length > 60) warnings.push(`Title over 60 chars (${title.length}) on ${p}: ${title}`);
  if (description.length > 160) warnings.push(`Meta description over 160 chars (${description.length}) on ${p}`);
  const all = [...schema];
  if (crumbs) all.push(crumbSchema(crumbs));
  const html = `<!doctype html>
<html lang="en-IN" class="no-js">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.remove('no-js')</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(p)}">
<meta name="robots" content="${site.allowIndexing ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
<meta name="geo.region" content="IN-KA"><meta name="geo.placename" content="Mangalore">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(p)}">
<meta property="og:image" content="${abs(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${abs(ogImage)}">
<meta name="theme-color" content="#0f0e0d">
<link rel="icon" href="/assets/images/seatory-emblem-96.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/css/styles.css">
${all.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
${header(p)}
<main id="main">
${crumbs ? crumbsHTML(crumbs) : ''}
${body}
</main>
${footer()}
<script src="/assets/js/main.js" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) warnings.push(`${p} has ${h1s} <h1> elements (should be 1)`);
  const file = path.join(OUT, p, p.endsWith('.html') ? '' : 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, BASE_PATH ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE_PATH}/`) : html);
  if (!p.endsWith('.html')) pages.push({ path: p, priority });
}

/* ------------------------------------------------------------------ components */
function productCard(p, { hLevel = 3 } = {}) {
  const imgs = productImages(p);
  const h = `h${hLevel}`;
  const search = [p.name, p.type, catBySlug[p.category].name, ...p.materials, p.summary].join(' ').toLowerCase();
  return `<article class="card" data-cat="${p.category}" data-type="${esc(p.type)}" data-mat="${esc(p.materials.join('|'))}" data-added="${p.added}" data-name="${esc(p.name)}" data-search="${esc(search)}">
  <a class="card-media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">
    ${img('products', imgs[0].file, imgs[0].alt, { w: 900, h: 1200 })}
    ${imgs[1] ? img('products', imgs[1].file, imgs[1].alt, { w: 900, h: 1200, cls: 'alt-img' }) : ''}
    ${p.sample ? '<span class="badge">Sample listing</span>' : ''}
  </a>
  <div class="card-body">
    <p class="eyebrow">${esc(p.type)}</p>
    <${h} class="card-title"><a href="${productUrl(p)}">${esc(p.name)}</a></${h}>
    <p class="card-meta">${esc(p.materials.join(' · '))}${p.colours ? ` · ${esc(p.colours)}` : ` · ${esc(p.size)}`}</p>
    <p class="card-meta muted">${p.price ? `<span class="price">${esc(p.price)}</span>` : `${imgs.length} photo${imgs.length === 1 ? '' : 's'}${p.dimensions ? ` · ${esc(p.dimensions)}` : ''}`}</p>
    <a class="btn btn-wa btn-sm" href="${waProduct(p)}" target="_blank" rel="noopener">${waIcon}<span>Enquire on WhatsApp</span></a>
  </div>
</article>`;
}

function filtersHTML(list, { withCategory }) {
  const types = [...new Set(list.map((p) => p.type))].sort();
  const mats = [...new Set(list.flatMap((p) => p.materials))].sort();
  return `<form class="filters" id="filters" role="search" aria-label="Filter products">
  <div class="f-row">
    <label class="f-search"><span>Search</span><input type="search" id="f-q" name="q" placeholder="Search sofas, beds, chairs…" autocomplete="off"></label>
    ${withCategory ? `<label><span>Category</span><select id="f-cat" name="cat"><option value="">All categories</option>${categories.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    <label><span>Product type</span><select id="f-type" name="type"><option value="">All types</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
    <label><span>Sort</span><select id="f-sort" name="sort"><option value="new">Newest to oldest</option><option value="old">Oldest to newest</option><option value="az">Name A–Z</option></select></label>
  </div>
  <fieldset class="f-mats"><legend>Material</legend>${mats.map((m) => `<label class="chip"><input type="checkbox" name="mat" value="${esc(m)}"><span>${esc(m)}</span></label>`).join('')}</fieldset>
  <div class="f-foot"><p id="f-count" aria-live="polite">${list.length} products</p><button class="link-btn" type="reset">Clear filters</button></div>
</form>`;
}

function catalogueGrid(list) {
  const sorted = [...list].sort((x, y) => y.added.localeCompare(x.added));
  return `<h2 class="sr">Products</h2>
<div class="grid grid-products" id="grid">${sorted.map((p) => productCard(p)).join('')}</div>
<p class="empty" id="f-empty" hidden>No products match those filters. <a href="${wa('Hi Seatory Furniture, I am looking for something specific:')}" target="_blank" rel="noopener">Tell us what you need on WhatsApp</a> and we will check for you.</p>`;
}

const categoryTiles = (hLevel = 3) => `<ul class="cat-tiles">${categories
  .map((c) => `<li><a href="${catUrl(c.slug)}">${img('categories', `${c.slug}-furniture-mangalore.webp`, `${c.name} furniture at Seatory Furniture showroom, Mangalore`, { w: 600, h: 600 })}<h${hLevel} class="cat-name">${esc(c.name)}</h${hLevel}></a></li>`)
  .join('')}</ul>`;

function testimonialCard(t, i) {
  const quote = t.quote ? esc(t.quote) : PH('Customer testimonial: paste their exact words, with permission');
  const photo = t.photo ? img('testimonials', t.photo, `${t.name}, customer of Seatory Furniture`, { w: 96, h: 96, cls: 'avatar' }) : `<span class="avatar avatar-ph" aria-hidden="true">${i + 1}</span>`;
  return `<figure class="quote">
  <blockquote><p>${quote}</p></blockquote>
  <figcaption>${photo}<span><strong>${t.name ? esc(t.name) : PH('Customer name')}</strong><br><span class="muted">${t.location ? esc(t.location) : PH('Area, Mangalore')}${t.product ? ` · ${esc(t.product)}` : ''}</span></span></figcaption>
</figure>`;
}

function reviewsBlock() {
  const rating = site.rating.value && site.rating.count
    ? `<p class="rating"><span class="rating-num">${esc(site.rating.value)}</span><span class="stars" aria-hidden="true">★★★★★</span><span>from ${esc(site.rating.count)} Google reviews</span></p>`
    : `<p class="rating">${PH('Google rating, e.g. 4.8')} ${PH('number of Google reviews')}</p>`;
  return `<div class="reviews-box">
  <div>
    <h2>What customers say on Google</h2>
    ${rating}
    <p>Read verified reviews from our customers on our Google Business Profile, or leave one after your visit.</p>
  </div>
  <div class="cta-row">
    <a class="btn btn-dark" href="${site.googleMapsUrl}" target="_blank" rel="noopener">Read Google reviews</a>
    <a class="btn btn-outline" href="${reviewUrl}" target="_blank" rel="noopener">Write a review</a>
  </div>
</div>`;
}

const instagramBlock = () => `<section class="section wrap" aria-labelledby="ig-h">
  <div class="sec-head"><h2 id="ig-h">On Instagram</h2><a class="btn btn-outline" href="${site.instagram}" target="_blank" rel="noopener">Follow @${esc(site.instagramHandle)}</a></div>
  <ul class="ig-grid">${[1, 2, 3, 4, 5, 6]
    .map((n) => `<li><a href="${site.instagram}" target="_blank" rel="noopener">${img('instagram', `seatory-instagram-${n}.webp`, `Seatory Furniture Instagram post ${n}: chair from the Mangalore showroom collection`, { w: 600, h: 800 })}</a></li>`)
    .join('')}</ul>
  <p class="muted small">Selected posts from <a href="${site.instagram}" target="_blank" rel="noopener">@${esc(site.instagramHandle)}</a>. Follow us for new arrivals.</p>
</section>`;

function projectFigure(pr, hLevel = 3) {
  const used = pr.products.map((s) => productBySlug[s]).filter(Boolean);
  return `<figure class="project" data-kind="${esc(pr.kind)}">
  ${img('projects', `${pr.slug}-seatory-furniture-mangalore.webp`, `${pr.title}: ${used.map((u) => u.name).join(', ')} by Seatory Furniture, ${pr.kind.toLowerCase()} in Mangalore`, { w: 1200, h: 900 })}
  <figcaption>
    <span class="eyebrow">${esc(pr.kind)} · ${esc(pr.location)}</span>
    <h${hLevel} class="project-title">${esc(pr.title)}</h${hLevel}>
    <p>${esc(pr.caption)}</p>
    <p class="small">Products used: ${used.map((u) => `<a href="${productUrl(u)}">${esc(u.name)}</a>`).join(', ')}</p>
  </figcaption>
</figure>`;
}

const visitBlock = (heading = 'Visit our Mangalore showroom') => `<section class="section visit" aria-labelledby="visit-h">
  <div class="wrap visit-grid">
    <div>
      <h2 id="visit-h">${heading}</h2>
      <p>See finishes, test the comfort and get advice in person. We're at Kallapu, close to Thokkottu and Ullal on the Mangalore side.</p>
      ${addressHTML}
      ${hoursHTML()}
      <div class="cta-row">
        <a class="btn btn-light" href="${site.googleMapsUrl}" target="_blank" rel="noopener">Get directions</a>
        <a class="btn btn-wa" href="${wa('Hi Seatory Furniture, I would like to visit the showroom. When can I come?')}" target="_blank" rel="noopener">${waIcon}<span>Plan a visit</span></a>
      </div>
    </div>
    <div class="map-wrap"><iframe title="Map showing ${esc(site.name)} in Kallapu, Mangalore" src="${mapsEmbed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
  </div>
</section>`;

/* ------------------------------------------------------------------ pages */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });

const byNewest = [...products].sort((x, y) => y.added.localeCompare(x.added));
const featured = products.filter((p) => p.featured).slice(0, 4);

// Home
render({
  path: '/',
  title: 'Seatory Furniture | Premium Furniture in Mangalore',
  description: 'Seatory Furniture, Kallapu, Mangalore: sofa sets, beds, dining tables, office and café furniture. Visit the showroom or enquire on WhatsApp.',
  schema: [storeSchema(), orgSchema(), { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${BASE}/#web`, name: site.name, url: `${BASE}/` }],
  priority: 1.0,
  body: `<section class="hero">
  <div class="hero-media">${img('hero', 'seatory-furniture-showroom-mangalore-hero.webp', 'Living room furniture on display at the Seatory Furniture showroom in Kallapu, Mangalore', { w: 1600, h: 1000, eager: true })}</div>
  <div class="wrap hero-inner">
    <p class="eyebrow eyebrow-light">Kallapu · Mangalore · Serving Udupi & coastal Karnataka</p>
    <h1>Premium furniture for Mangalore homes, offices & cafés</h1>
    <p class="lead">Sofa sets, beds, dining, workstations and café seating with modern designs and real comfort. Browse online, then see it in person at our Mangalore showroom.</p>
    <div class="cta-row">
      <a class="btn btn-light" href="/products/">Browse the catalogue</a>
      <a class="btn btn-wa" href="${wa()}" target="_blank" rel="noopener">${waIcon}<span>Enquire on WhatsApp</span></a>
    </div>
  </div>
</section>

<section class="section wrap" aria-labelledby="cat-h">
  <div class="sec-head"><h2 id="cat-h">Shop by room</h2><a href="/products/">View all products →</a></div>
  ${categoryTiles()}
</section>

<section class="section wrap" aria-labelledby="feat-h">
  <div class="sec-head"><h2 id="feat-h">Featured furniture</h2><a href="/products/">Full catalogue →</a></div>
  <div class="grid grid-products">${featured.map((p) => productCard(p)).join('')}</div>
</section>

<section class="section section-tint" aria-labelledby="new-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="new-h">New arrivals</h2><a href="/products/?sort=new">See what's new →</a></div>
    <div class="grid grid-products">${byNewest.slice(0, 4).map((p) => productCard(p)).join('')}</div>
  </div>
</section>

<section class="section wrap" aria-labelledby="looks-h">
  <div class="sec-head"><h2 id="looks-h">Finished looks</h2><a href="/projects/">All projects →</a></div>
  <div class="grid grid-projects">${projects.slice(0, 3).map((pr) => projectFigure(pr)).join('')}</div>
</section>

<section class="section section-tint" aria-labelledby="why-h">
  <div class="wrap">
    <h2 id="why-h">Why shop with Seatory in Mangalore</h2>
    <ul class="usp">
      <li><h3>See it before you buy</h3><p>Visit our Kallapu showroom to sit, touch and compare finishes. No guesswork.</p></li>
      <li><h3>Home, office & café ranges</h3><p>Lounge chairs, dining and café chairs, bar chairs and imported mesh office chairs, all in one showroom.</p></li>
      <li><h3>Quick answers on WhatsApp</h3><p>Send us a photo of your room or a product you like and we'll suggest options.</p></li>
      <li><h3>Local delivery</h3><p>Delivery across ${PH('confirm areas: Mangalore, Udupi, …')}. ${PH('Confirm delivery and installation terms')}</p></li>
    </ul>
  </div>
</section>

<section class="section wrap" aria-labelledby="t-h">
  <div class="sec-head"><h2 id="t-h">Customer stories</h2><a href="/testimonials/">More reviews →</a></div>
  <div class="grid grid-quotes">${testimonials.slice(0, 3).map(testimonialCard).join('')}</div>
</section>

<section class="section wrap">${reviewsBlock()}</section>
${instagramBlock()}
${visitBlock()}`,
});

// Catalogue
render({
  path: '/products/',
  title: 'Furniture Catalogue Mangalore | Seatory Furniture',
  description: 'Browse sofas, beds, dining sets, office and café furniture from Seatory Furniture, Mangalore. Filter by category, type and material.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Products', path: '/products/' }],
  scripts: ['/assets/js/catalogue.js'],
  priority: 0.9,
  body: `<section class="wrap page-head">
  <h1>Furniture catalogue</h1>
  <p class="lead">Explore our range for homes, offices and cafés in Mangalore and Udupi. Online purchase isn't available yet: enquire on WhatsApp for price and availability, or visit our showroom.</p>
  <nav class="cat-links" aria-label="Categories"><ul>${categories.map((c) => `<li><a href="${catUrl(c.slug)}">${esc(c.name)}</a></li>`).join('')}</ul></nav>
</section>
<section class="wrap section-sm">
  ${filtersHTML(products, { withCategory: true })}
  ${catalogueGrid(products)}
</section>`,
});

// Category pages
for (const c of categories) {
  const list = products.filter((p) => p.category === c.slug);
  const others = categories.filter((o) => o.slug !== c.slug);
  render({
    path: catUrl(c.slug),
    title: c.seoTitle,
    description: c.metaDescription,
    crumbs: [{ name: 'Home', path: '/' }, { name: 'Products', path: '/products/' }, { name: c.name, path: catUrl(c.slug) }],
    scripts: ['/assets/js/catalogue.js'],
    schema: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.h1, url: abs(catUrl(c.slug)), hasPart: list.map((p) => ({ '@type': 'Product', name: p.name, url: abs(productUrl(p)) })) }],
    priority: 0.8,
    body: `<section class="wrap page-head">
  <h1>${esc(c.h1)}</h1>
  <p class="lead">${esc(c.intro)}</p>
</section>
<section class="wrap section-sm">
  ${filtersHTML(list, { withCategory: false })}
  ${catalogueGrid(list)}
</section>
<section class="wrap section-sm">
  <h2>Explore other categories</h2>
  <ul class="cat-links-inline">${others.map((o) => `<li><a href="${catUrl(o.slug)}">${esc(o.name)} in Mangalore</a></li>`).join('')}</ul>
</section>
${visitBlock(`See our ${esc(c.name.toLowerCase())} range in person`)}`,
  });
}

// Product detail pages
const MATERIAL_NOTES = {
  Wood: 'Wooden frames and surfaces bring warmth and longevity. Keep away from direct sun and standing water, and wipe with a soft dry cloth. [Confirm wood species and finish with client]',
  'Engineered wood': 'Engineered wood (e.g. MDF/particle board with laminate or veneer) is stable and cost-effective. Avoid prolonged moisture on edges. [Confirm board type and laminate brand]',
  Fabric: 'Upholstery fabric is soft and breathable. Vacuum regularly and blot spills quickly. [Confirm fabric range and whether covers are removable]',
  Leatherette: 'Leatherette is a durable, easy-wipe alternative to leather, popular for offices and busy homes. Clean with a damp cloth. [Confirm grade]',
  Metal: 'Metal frames and bases add strength and a modern profile. Powder-coated finishes resist everyday scratches. [Confirm finish and coating]',
  Marble: 'Marble or marble-finish tops are elegant and easy to wipe clean. Use coasters for acidic drinks. [Confirm natural marble vs. marble finish]',
  Glass: 'Glass and mirror panels open up a room visually. Clean with a non-abrasive glass cleaner. [Confirm glass thickness]',
  Mesh: 'Breathable mesh keeps you cool during long work hours. Dust with a soft brush or vacuum attachment.',
  Nylon: 'A nylon star base with castors is light, strong and rolls smoothly on most floors.',
  Cane: 'Cane backs add natural texture and airflow. Dust gently and keep away from prolonged damp.',
  Upholstery: 'Cushioned upholstery for everyday comfort. Vacuum regularly and blot spills quickly. [Confirm upholstery type]',
  Fibre: 'A moulded fibre body is light, sturdy and easy to wipe clean, well suited to cafés and home bars.',
};
for (const p of products) {
  const c = catBySlug[p.category];
  const imgs = productImages(p);
  const related = [...products.filter((o) => o.category === p.category && o.slug !== p.slug), ...products.filter((o) => o.category !== p.category)].slice(0, 4);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Products', path: '/products/' }, { name: c.name, path: catUrl(c.slug) }, { name: p.name, path: productUrl(p) }];
  let title = `${p.name} in Mangalore | Seatory Furniture`;
  if (title.length > 60) title = `${p.name} | Seatory Furniture`;
  if (title.length > 60) title = `${p.name} | Seatory`;
  let desc = `${p.summary} ${p.materials.join(' & ')}. Enquire on WhatsApp or visit Seatory Furniture, Mangalore.`;
  if (desc.length > 160) desc = `${p.name} in ${p.materials.join(' & ').toLowerCase()}. Enquire on WhatsApp or see it at Seatory Furniture's Mangalore showroom.`;
  if (desc.length > 160) desc = desc.slice(0, 157) + '…';
  render({
    path: productUrl(p),
    title,
    description: desc,
    crumbs,
    ogType: 'product',
    // Social previews are most reliable with JPG: add <slug>-mangalore-1.jpg next to the WebP to use it.
    ogImage: fs.existsSync(path.join(SRC, 'assets/images/products', imgs[0].file.replace(/\.webp$/, '.jpg')))
      ? `/assets/images/products/${imgs[0].file.replace(/\.webp$/, '.jpg')}` : '/assets/images/og-default.jpg',
    schema: [productSchema(p)],
    priority: 0.7,
    body: `<article class="wrap pdp">
  <div class="pdp-grid">
    <div class="gallery" data-gallery>
      <div class="gallery-main">${img('products', imgs[0].file, imgs[0].alt, { w: 900, h: 1200, eager: true })}</div>
      ${imgs.length > 1 ? `<ul class="thumbs" aria-label="More photos">${imgs
        .map((im, i) => `<li><button type="button" data-alt="${esc(im.alt)}"${i === 0 ? ' aria-current="true"' : ''} aria-label="Show photo ${i + 1}">${img('products', im.file, '', { w: 900, h: 1200 })}</button></li>`)
        .join('')}</ul>` : `<p class="small muted">${PH('Add more photos: side view, close-up, in a room')}</p>`}
    </div>
    <div class="pdp-info">
      ${p.sample ? `<p class="badge badge-inline">Sample listing: replace with real product details</p>` : ''}
      <p class="eyebrow"><a href="${catUrl(c.slug)}">${esc(c.name)}</a></p>
      <h1>${esc(p.name)}</h1>
      <p class="lead">${esc(p.summary)}</p>
      <dl class="quick">
        ${p.price ? `<div><dt>Price</dt><dd><span class="price">${esc(p.price)}</span><br><span class="small muted">As listed on our Instagram; please confirm on enquiry</span></dd></div>` : ''}
        <div><dt>Material</dt><dd>${esc(p.materials.join(', '))}</dd></div>
        ${p.colours ? `<div><dt>Colours</dt><dd>${esc(p.colours)}</dd></div>` : ''}
        <div><dt>Dimensions</dt><dd>${p.dimensions ? esc(p.dimensions) : PH('Dimensions')}</dd></div>
      </dl>
      <div class="cta-row">
        <a class="btn btn-wa" href="${waProduct(p)}" target="_blank" rel="noopener">${waIcon}<span>Enquire on WhatsApp</span></a>
        <a class="btn btn-outline" href="/contact/">Visit showroom</a>
      </div>
      <p class="small muted">${p.price ? 'Final price, stock and delivery on enquiry.' : 'Price, finishes and availability on enquiry.'} Online purchase is not available yet.</p>
    </div>
  </div>

  <div class="pdp-details">
    <section aria-labelledby="spec-h">
      <h2 id="spec-h">Specifications</h2>
      <table class="spec"><tbody>
        <tr><th scope="row">Category</th><td><a href="${catUrl(c.slug)}">${esc(c.name)}</a></td></tr>
        <tr><th scope="row">Product type</th><td>${esc(p.type)}</td></tr>
        <tr><th scope="row">Materials</th><td>${esc(p.materials.join(', '))}</td></tr>
        <tr><th scope="row">Dimensions</th><td>${p.dimensions ? esc(p.dimensions) : PH('Dimensions (W × D × H)')}</td></tr>
        <tr><th scope="row">Size / seating</th><td>${esc(p.size)}</td></tr>
        <tr><th scope="row">Colours & finishes</th><td>${p.colours ? esc(p.colours) : p.finishes ? esc(p.finishes) : PH('Available finishes')}</td></tr>
        ${p.price ? `<tr><th scope="row">Listed price</th><td>${esc(p.price)}</td></tr>` : ''}
        <tr><th scope="row">Warranty</th><td>${p.warranty ? esc(p.warranty) : PH('Warranty terms, if any')}</td></tr>
        <tr><th scope="row">Delivery</th><td>${p.leadTime ? esc(p.leadTime) : PH('Typical delivery time')}</td></tr>
      </tbody></table>
    </section>
    <section aria-labelledby="mat-h">
      <h2 id="mat-h">Material details & care</h2>
      ${p.materials.map((m) => `<h3>${esc(m)}</h3><p>${esc(MATERIAL_NOTES[m] || '[Material notes]')}</p>`).join('')}
    </section>
    <section aria-labelledby="feat-h">
      <h2 id="feat-h">Highlights</h2>
      <ul class="ticks">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </section>
  </div>
</article>

<section class="section wrap" aria-labelledby="rel-h">
  <div class="sec-head"><h2 id="rel-h">You may also like</h2><a href="${catUrl(c.slug)}">More ${esc(c.name.toLowerCase())} →</a></div>
  <div class="grid grid-products">${related.map((r) => productCard(r)).join('')}</div>
</section>
${visitBlock(`See the ${esc(p.name)} in our Mangalore showroom`)}`,
  });
}

// Projects
const kinds = [...new Set(projects.map((p) => p.kind))];
render({
  path: '/projects/',
  title: 'Furniture Projects & Finished Looks | Seatory',
  description: 'See Seatory Furniture installed in homes, offices and cafés around Mangalore and Udupi, with the products used in each space.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Finished Looks', path: '/projects/' }],
  priority: 0.7,
  body: `<section class="wrap page-head">
  <h1>Finished looks: our furniture in real spaces</h1>
  <p class="lead">Homes, offices and cafés furnished by Seatory around Mangalore. Each project lists the products used, so you can find the same pieces.</p>
  <div class="chips" role="group" aria-label="Filter projects"><button class="chip-btn" type="button" data-filter="" aria-pressed="true">All</button>${kinds.map((k) => `<button class="chip-btn" type="button" data-filter="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}</div>
</section>
<section class="wrap section-sm"><h2 class="sr">Projects</h2><div class="grid grid-projects" id="projects">${projects.map((pr) => projectFigure(pr)).join('')}</div></section>
<section class="section wrap"><div class="cta-band"><h2>Planning a room, office or café?</h2><p>Send us your floor plan or photos and we'll suggest pieces that fit.</p><a class="btn btn-wa" href="${wa('Hi Seatory Furniture, I am planning a project and would like suggestions.')}" target="_blank" rel="noopener">${waIcon}<span>Share your project on WhatsApp</span></a></div></section>`,
});

// About
render({
  path: '/about/',
  title: 'About Seatory Furniture | Furniture Store Mangalore',
  description: 'Meet Seatory Furniture: a Mangalore furniture showroom at Kallapu offering modern living, dining, office and café furniture.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }],
  schema: [storeSchema()],
  priority: 0.6,
  body: `<section class="wrap page-head">
  <h1>About Seatory Furniture</h1>
  <p class="lead">A Mangalore furniture showroom for modern designs and premium comfort, for living rooms, dining spaces, offices and cafés.</p>
</section>
<section class="wrap section-sm about-grid">
  <div>
    <h2>Our story</h2>
    <p>${PH('Client to provide: how Seatory started, who runs it, and what makes it different. 2–3 short paragraphs.')}</p>
    <p>Today our showroom at Kallapu, Mangalore brings together lounge chairs, café and dining chairs, bar chairs and imported mesh office chairs, alongside our Workstation, Executive Series, Gaming Chair and Cushion Series ranges.</p>
    <h2>Our mission</h2>
    <p><em>Draft for client approval:</em> To make well-designed, comfortable furniture easy to see, try and buy for families and businesses in Mangalore and coastal Karnataka.</p>
    <h2>Experience</h2>
    <p>${years} of furnishing homes and businesses ${site.foundedYear ? `since ${esc(site.foundedYear)}` : PH('since year')}.</p>
  </div>
  <div>${img('about', 'seatory-furniture-showroom-kallapu-mangalore.webp', 'Inside the Seatory Furniture showroom in Kallapu, Mangalore', { w: 1000, h: 1200 })}</div>
</section>
<section class="section section-tint"><div class="wrap">
  <h2>What we offer</h2>
  <ul class="usp">${categories.map((c) => `<li><h3><a href="${catUrl(c.slug)}">${esc(c.name)}</a></h3><p>${esc(c.intro)}</p></li>`).join('')}</ul>
</div></section>
${visitBlock('Visit the showroom')}`,
});

// Testimonials
render({
  path: '/testimonials/',
  title: 'Customer Reviews | Seatory Furniture Mangalore',
  description: 'Read what customers in Mangalore and Udupi say about Seatory Furniture, and see our Google reviews.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Reviews', path: '/testimonials/' }],
  priority: 0.6,
  body: `<section class="wrap page-head">
  <h1>Customer reviews & testimonials</h1>
  <p class="lead">Feedback from customers who furnished their homes, offices and cafés with Seatory.</p>
</section>
<section class="wrap section-sm">${reviewsBlock()}</section>
<section class="wrap section-sm"><h2>Customer stories</h2><div class="grid grid-quotes">${testimonials.map(testimonialCard).join('')}</div></section>
<section class="section wrap"><div class="cta-band"><h2>Bought from Seatory?</h2><p>We'd love to hear how your furniture is working out.</p><a class="btn btn-light" href="${reviewUrl}" target="_blank" rel="noopener">Leave a Google review</a></div></section>`,
});

// Contact
render({
  path: '/contact/',
  title: 'Visit Our Furniture Showroom in Mangalore | Seatory',
  description: 'Find Seatory Furniture at Kallapu, Mangalore: address, map, phone, WhatsApp and showroom hours. Send us an enquiry today.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Visit Us', path: '/contact/' }],
  schema: [storeSchema()],
  priority: 0.8,
  body: `<section class="wrap page-head">
  <h1>Visit our furniture showroom in Mangalore</h1>
  <p class="lead">Drop by the showroom, call, or message us on WhatsApp. We usually reply fastest there.</p>
</section>
<section class="wrap section-sm contact-grid">
  <div class="contact-info">
    <h2>Showroom</h2>
    ${addressHTML}
    <p><strong>Phone:</strong> ${phoneHTML}<br><strong>WhatsApp:</strong> <a href="${wa()}" target="_blank" rel="noopener">${site.whatsapp ? '+' + esc(site.whatsapp) : 'Chat with us'}</a><br><strong>Email:</strong> ${emailHTML}</p>
    <h2>Business hours</h2>
    ${hoursHTML()}
    <h2>Follow us</h2>
    <ul class="social"><li><a href="${site.instagram}" target="_blank" rel="noopener">Instagram @${esc(site.instagramHandle)}</a></li><li><a href="${site.googleMapsUrl}" target="_blank" rel="noopener">Google Maps & reviews</a></li></ul>
    <p><a class="btn btn-dark" href="${site.googleMapsUrl}" target="_blank" rel="noopener">Get directions</a></p>
  </div>
  <div>
    <h2>Send an enquiry</h2>
    <form class="enquiry" id="enquiry" data-wa="${waNumber}">
      <label><span>Your name</span><input name="name" required autocomplete="name"></label>
      <label><span>Phone</span><input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
      <label><span>Area / city</span><input name="area" placeholder="e.g. Kadri, Mangalore" autocomplete="address-level2"></label>
      <label><span>Interested in</span><select name="interest"><option>General enquiry</option>${categories.map((c) => `<option>${esc(c.name)}</option>`).join('')}<option>Bulk / project order</option></select></label>
      <label><span>Message</span><textarea name="message" rows="4"></textarea></label>
      <button class="btn btn-wa" type="submit">${waIcon}<span>Send via WhatsApp</span></button>
      <p class="small muted">This opens WhatsApp with your message ready to send. Nothing is stored on this website.</p>
    </form>
  </div>
</section>
<section class="wrap section-sm"><h2>Map</h2><div class="map-wrap map-lg"><iframe title="Map showing ${esc(site.name)}, Kallapu, Mangalore" src="${mapsEmbed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></section>`,
});

// Location landing pages
render({
  path: '/furniture-shop-mangalore/',
  title: 'Furniture Shop in Mangalore, Kallapu | Seatory',
  description: 'Looking for a furniture shop in Mangalore? Visit Seatory Furniture at Kallapu for sofa sets, beds, dining, office and café furniture.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Furniture Shop Mangalore', path: '/furniture-shop-mangalore/' }],
  schema: [storeSchema()],
  priority: 0.8,
  body: `<section class="wrap page-head">
  <h1>Furniture shop in Mangalore</h1>
  <p class="lead">Seatory Furniture's showroom at Kallapu is a convenient stop for customers from Thokkottu, Ullal, Deralakatte, Kotekar and the rest of Mangalore.</p>
</section>
<section class="wrap section-sm prose">
  <h2>Everything for your home, office or café</h2>
  <p>Whether you're furnishing a new flat, refreshing a living room or setting up an office, our showroom lets you compare pieces side by side:</p>
  <ul>
    <li><a href="${catUrl('sofas')}">Sofa sets & lounge chairs in Mangalore</a>, including swivel lounge chairs</li>
    <li><a href="${catUrl('beds')}">Beds</a>: king, queen and storage beds</li>
    <li><a href="${catUrl('dining')}">Dining tables and sets</a> for 4 to 6 people</li>
    <li><a href="${catUrl('office')}">Office furniture in Mangalore</a>: imported mesh office chairs and workstations</li>
    <li><a href="${catUrl('cafe')}">Café, dining and bar chairs</a> for homes, cafés and restaurants</li>
    <li><a href="${catUrl('storage')}">Wardrobes and storage</a></li>
  </ul>
  <h2>How to buy</h2>
  <p>Online checkout isn't available yet. Browse the <a href="/products/">catalogue</a>, message us on WhatsApp with what you like, and visit the showroom to finalise finishes. Delivery: ${PH('confirm Mangalore delivery and installation terms')}.</p>
</section>
<section class="section wrap"><div class="sec-head"><h2>Popular in Mangalore</h2><a href="/products/">View all →</a></div><div class="grid grid-products">${featured.map((p) => productCard(p)).join('')}</div></section>
${visitBlock('Find us in Kallapu, Mangalore')}`,
});

render({
  path: '/furniture-shop-udupi/',
  title: 'Furniture for Udupi Homes & Offices | Seatory',
  description: 'Shopping for furniture from Udupi? See Seatory Furniture\'s sofas, beds, dining and office range online, then visit our Mangalore showroom.',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Furniture for Udupi', path: '/furniture-shop-udupi/' }],
  priority: 0.6,
  body: `<section class="wrap page-head">
  <h1>Furniture for Udupi customers</h1>
  <p class="lead">Our showroom is in Mangalore, and customers from Udupi, Manipal and nearby towns can browse here first, shortlist on WhatsApp, and plan one visit.</p>
</section>
<section class="wrap section-sm prose">
  <h2>Shop smart from Udupi</h2>
  <ol>
    <li>Browse the <a href="/products/">furniture catalogue</a> and save the pieces you like.</li>
    <li>Send them to us on <a href="${wa('Hi Seatory Furniture, I am in Udupi and interested in:')}" target="_blank" rel="noopener">WhatsApp</a>. We'll confirm price, finishes and availability.</li>
    <li>Visit our Mangalore showroom to see them in person.</li>
  </ol>
  <h2>Delivery to Udupi</h2>
  <p>${PH('Confirm whether delivery to Udupi / Manipal is offered, and any charges or lead times')}</p>
  <h2>Popular categories</h2>
  <ul class="cat-links-inline">${categories.map((c) => `<li><a href="${catUrl(c.slug)}">${esc(c.name)}</a></li>`).join('')}</ul>
</section>
${visitBlock('Our showroom: Kallapu, Mangalore')}`,
});

// 404
render({
  path: '/404.html',
  title: 'Page Not Found | Seatory Furniture',
  description: 'This page could not be found. Browse the Seatory Furniture catalogue or contact our Mangalore showroom.',
  body: `<section class="wrap page-head"><h1>Sorry, we couldn't find that page</h1><p class="lead">Try the <a href="/products/">catalogue</a>, go <a href="/">home</a>, or <a href="${wa()}">ask us on WhatsApp</a>.</p></section>`,
});

/* ------------------------------------------------------------------ sitemap, robots, placeholders */
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), site.allowIndexing
  ? `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`
  : `# Demo mode: indexing disabled. Set "allowIndexing": true in src/data/site.json at launch.\nUser-agent: *\nDisallow: /\n`);

for (const [rel, { file, w, h }] of placeholderImages) {
  const out = path.join(OUT, 'assets', 'images', rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, placeholderSVG(file, w, h));
}

/* ------------------------------------------------------------------ report */
const missing = [];
if (site.url.includes('YOUR-DOMAIN')) missing.push('site.url (live domain)');
if (!site.whatsapp) missing.push('WhatsApp number');
if (!site.phone) missing.push('phone');
if (!site.hours) missing.push('business hours');
if (!site.geo.lat) missing.push('geo coordinates');
if (!site.rating.value) missing.push('Google rating & review count');
if (!site.googleReviewUrl) missing.push('Google "write a review" link');
if (!site.address.verified) missing.push('address verification');
if (!site.yearsInBusiness) missing.push('years in business');
if (!fs.existsSync(path.join(SRC, 'assets/images/og-default.jpg'))) missing.push('og-default.jpg (1200×630 social share image)');
if (products.some((p) => p.sample)) missing.push(`${products.filter((p) => p.sample).length} sample products to replace`);
if (testimonials.some((t) => !t.quote)) missing.push('testimonials');

console.log(`Built ${pages.length + 1} pages into dist/  (indexing ${site.allowIndexing ? 'ON' : 'OFF: demo mode'})`);
console.log(`${placeholderImages.size} placeholder images generated (drop real .webp files into src/assets/images/ to replace them)`);
if (missing.length) console.log(`\nClient placeholders still open:\n  - ${missing.join('\n  - ')}`);
if (warnings.length) { console.log(`\nSEO warnings:\n  - ${warnings.join('\n  - ')}`); process.exitCode = 1; }
else console.log('\nSEO checks passed: titles ≤ 60, descriptions ≤ 160, one H1 per page.');
