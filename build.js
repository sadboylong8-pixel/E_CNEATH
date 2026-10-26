/**
 * Lumière Skincare — Static Site Generator (SSG)
 * Run:  node build.js
 * Output: ./docs  (deploy this folder to GitHub Pages / Netlify / any static host)
 */
const fs = require('fs');
const path = require('path');

const products = require('./products.json');
const OUT = path.join(__dirname, 'docs');
const SRC = path.join(__dirname, 'src');

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + n.toFixed(2);
const pctOff = (p) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
const stars = (r) => {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};
function mix(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const m = (c) => Math.round(c + (255 - c) * p);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => m(c).toString(16).padStart(2, '0')).join('');
}
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const m = (c) => Math.round(c * (1 - p));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => m(c).toString(16).padStart(2, '0')).join('');
}
function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }
function write(rel, content) {
  const full = path.join(OUT, rel);
  mkdir(path.dirname(full));
  fs.writeFileSync(full, content);
}

/* ---------- inline SVG product art (no external images needed) ---------- */
function label(x, y, w, h, c) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#fff" opacity=".93"/>
  <rect x="${x + 8}" y="${y + 10}" width="${w - 16}" height="5" rx="2" fill="${c}" opacity=".85"/>
  <rect x="${x + 8}" y="${y + 20}" width="${Math.round((w - 16) * 0.6)}" height="4" rx="2" fill="${c}" opacity=".45"/>
  <circle cx="${x + w / 2}" cy="${y + h - 14}" r="6" fill="${c}" opacity=".7"/>`;
}
function drawBottle(p) {
  const c = p.color, light = mix(c, 0.82), dark = shade(c, 0.28);
  let shape = '';
  if (p.shape === 'tube') {
    shape = `<path d="M70 50h60l-3 14H73z" fill="${dark}"/>
    <path d="M68 64h64l6 124H62z" fill="${c}"/>
    <rect x="76" y="188" width="48" height="12" rx="3" fill="${dark}"/>
    <rect x="76" y="70" width="8" height="112" fill="#fff" opacity=".22"/>
    ${label(78, 100, 44, 58, c)}`;
  } else if (p.shape === 'bottle') {
    shape = `<rect x="64" y="92" width="72" height="106" rx="16" fill="${c}"/>
    <rect x="90" y="76" width="20" height="16" fill="${dark}"/>
    <rect x="86" y="58" width="28" height="18" rx="4" fill="${dark}"/>
    <rect x="110" y="60" width="24" height="7" rx="3" fill="${dark}"/>
    <rect x="72" y="100" width="8" height="90" rx="3" fill="#fff" opacity=".22"/>
    ${label(74, 118, 52, 58, c)}`;
  } else if (p.shape === 'jar') {
    shape = `<rect x="46" y="112" width="108" height="26" rx="8" fill="${dark}"/>
    <rect x="50" y="138" width="100" height="60" rx="14" fill="${c}"/>
    <rect x="58" y="142" width="8" height="48" rx="3" fill="#fff" opacity=".22"/>
    ${label(70, 150, 60, 36, c).replace(/<circle[^>]*>/, '')}`;
  } else {
    shape = `<rect x="90" y="48" width="20" height="40" rx="10" fill="${dark}"/>
    <rect x="82" y="86" width="36" height="16" rx="3" fill="${shade(c, 0.45)}"/>
    <rect x="66" y="102" width="68" height="96" rx="16" fill="${c}"/>
    <rect x="73" y="110" width="8" height="80" rx="3" fill="#fff" opacity=".22"/>
    ${label(76, 122, 48, 52, c)}`;
  }
  return `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.name)}">
  <circle cx="100" cy="112" r="92" fill="${light}"/>
  <ellipse cx="100" cy="200" rx="54" ry="7" fill="#000" opacity=".09"/>
  ${shape}
</svg>`;
}

/* product picture: real photo if p.image is set in products.json, else the drawn bottle */
function bottle(p, base = '') {
  if (p.image) return `<img class="photo" src="${base}images/${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
  return drawBottle(p);
}

/* ---------- shared layout ---------- */
function layout({ title, desc, base, body, page }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body data-base="${base}" data-page="${page}">
<div class="topbar">Free shipping over $50 &nbsp;·&nbsp; Use code <strong>GLOW10</strong> for 10% off your first order</div>
<header class="site-header">
  <div class="wrap header-in">
    <a class="logo" href="${base}index.html">Lumi<span>è</span>re</a>
    <nav>
      <a href="${base}index.html">Home</a>
      <a href="${base}index.html#shop">Shop</a>
      <a class="cart-link" href="${base}cart.html">Cart <span class="badge" data-cart-count>0</span></a>
    </nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p><strong>Lumière Skincare</strong> — gentle, effective skincare for every skin type.</p>
    <p class="muted">Student demo project. No real payments are processed and no data leaves your browser.</p>
  </div>
</footer>
<script src="${base}assets/products.js"></script>
<script src="${base}assets/app.js"></script>
</body>
</html>`;
}

/* ---------- cards ---------- */
function card(p, base) {
  const off = pctOff(p);
  return `<article class="card" data-name="${esc(p.name.toLowerCase())}" data-cat="${esc(p.category)}" data-price="${p.price}" data-rating="${p.rating}" data-order="${p.id}">
  <a class="card-img" href="${base}products/${p.slug}.html">
    ${off ? `<span class="tag tag-sale">-${off}%</span>` : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}
    ${bottle(p, base)}
  </a>
  <div class="card-body">
    <p class="cat">${esc(p.category)}</p>
    <h3><a href="${base}products/${p.slug}.html">${esc(p.name)}</a></h3>
    <p class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} <span class="muted">(${p.reviews})</span></p>
    <p class="price">${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ''}</p>
    <div class="card-actions">
      <a class="btn btn-ghost" href="${base}products/${p.slug}.html">Details</a>
      <button class="btn" data-add data-id="${p.id}">Add to cart</button>
    </div>
  </div>
</article>`;
}

/* ---------- pages ---------- */
function homePage() {
  const cats = ['All', ...new Set(products.map((p) => p.category))];
  const body = `
<section class="hero">
  <div class="wrap hero-in">
    <div>
      <p class="eyebrow">New season · Clean formulas</p>
      <h1>Skincare that loves your skin back.</h1>
      <p class="lead">Ten dermatologist-tested essentials for cleansing, treating, hydrating and protecting. Save up to 25% on selected best-sellers.</p>
      <p><a class="btn btn-lg" href="#shop">Shop now</a></p>
      <ul class="perks">
        <li>✔ Free shipping over $50</li>
        <li>✔ Code <strong>GLOW10</strong> = 10% off</li>
        <li>✔ 30-day returns</li>
      </ul>
    </div>
    <div class="hero-art">${bottle(products[3])}<div class="hero-art-2">${bottle(products[6])}</div></div>
  </div>
</section>

<section class="wrap promo-row">
  <div class="promo"><strong>GLOW10</strong><span>10% off your order</span></div>
  <div class="promo"><strong>WELCOME15</strong><span>15% off new customers</span></div>
  <div class="promo"><strong>FREESHIP</strong><span>Free shipping on any order</span></div>
</section>

<section class="wrap" id="shop">
  <div class="section-head">
    <h2>Shop all products</h2>
    <p class="muted"><span id="result-count">${products.length}</span> products</p>
  </div>
  <div class="toolbar">
    <div class="chips" id="chips">
      ${cats.map((c, i) => `<button class="chip${i === 0 ? ' active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div class="controls">
      <input id="search" type="search" placeholder="Search products…" aria-label="Search products">
      <select id="sort" aria-label="Sort products">
        <option value="featured">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="rating">Top rated</option>
      </select>
    </div>
  </div>
  <div class="grid" id="grid">
    ${products.map((p) => card(p, '')).join('\n')}
  </div>
  <p id="empty" class="muted center" hidden>No products match your search.</p>
</section>`;
  return layout({ title: 'Lumière Skincare — Shop skincare essentials', desc: 'Shop cleansers, serums, moisturizers and sunscreen. Free shipping over $50.', base: '', body, page: 'home' });
}

function productPage(p) {
  const base = '../';
  const off = pctOff(p);
  const related = products.filter((x) => x.id !== p.id && x.category === p.category).concat(products.filter((x) => x.id !== p.id && x.category !== p.category)).slice(0, 3);
  const body = `
<div class="wrap">
  <p class="crumbs"><a href="${base}index.html">Home</a> / <a href="${base}index.html#shop">${esc(p.category)}</a> / ${esc(p.name)}</p>
  <section class="detail">
    <div class="detail-img">${bottle(p, base)}</div>
    <div class="detail-info">
      <p class="cat">${esc(p.category)}</p>
      <h1>${esc(p.name)}</h1>
      <p class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} <span class="muted">· ${p.reviews} reviews</span></p>
      <p class="price price-lg">${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s> <span class="save">Save ${off}%</span>` : ''}</p>
      <p>${esc(p.short)}</p>
      <ul class="facts">
        <li><span>Size</span>${esc(p.size)}</li>
        <li><span>Best for</span>${esc(p.skinType)}</li>
        <li><span>Shipping</span>Free over $50</li>
      </ul>
      <div class="buy">
        <label class="qty">Qty
          <input id="qty" type="number" min="1" max="10" value="1">
        </label>
        <button class="btn btn-lg" data-add data-id="${p.id}" data-qty-input="#qty">Add to cart</button>
      </div>
      <details open><summary>Description</summary><p>${esc(p.description)}</p></details>
      <details><summary>Key ingredients</summary><ul>${p.ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></details>
      <details><summary>How to use</summary><p>${esc(p.howToUse)}</p></details>
    </div>
  </section>
  <section class="related">
    <h2>You may also like</h2>
    <div class="grid grid-3">${related.map((r) => card(r, base)).join('\n')}</div>
  </section>
</div>`;
  return layout({ title: `${p.name} — Lumière Skincare`, desc: p.short, base, body, page: 'product' });
}

function cartPage() {
  const body = `
<div class="wrap">
  <h1 class="page-title">Your cart</h1>
  <div id="cart-root"><noscript>Please enable JavaScript to view your cart.</noscript></div>
</div>`;
  return layout({ title: 'Your cart — Lumière Skincare', desc: 'Review the items in your cart.', base: '', body, page: 'cart' });
}

function checkoutPage() {
  const body = `
<div class="wrap">
  <h1 class="page-title">Checkout</h1>
  <div class="checkout">
    <form id="checkout-form" novalidate>
      <fieldset>
        <legend>1. Contact &amp; shipping</legend>
        <div class="row">
          <label>Full name<input name="name" required autocomplete="name"></label>
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
        </div>
        <div class="row">
          <label>Phone<input name="phone" required autocomplete="tel"></label>
          <label>Country<input name="country" required value="Cambodia"></label>
        </div>
        <label>Address<input name="address" required autocomplete="street-address"></label>
        <div class="row">
          <label>City<input name="city" required></label>
          <label>Postal code<input name="zip" required></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Payment (demo)</legend>
        <p class="muted small">Demo only — nothing is charged or stored. Test card: <code>4242 4242 4242 4242</code>, any future expiry, any 3-digit CVV.</p>
        <label>Name on card<input name="cardName" required autocomplete="cc-name"></label>
        <label>Card number<input name="cardNumber" required inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="19" autocomplete="cc-number"></label>
        <div class="row">
          <label>Expiry (MM/YY)<input name="expiry" required placeholder="MM/YY" maxlength="5" autocomplete="cc-exp"></label>
          <label>CVV<input name="cvv" required inputmode="numeric" maxlength="4" placeholder="123" autocomplete="cc-csc"></label>
        </div>
      </fieldset>
      <p id="form-error" class="error" role="alert" hidden></p>
      <button class="btn btn-lg btn-block" type="submit">Place order</button>
    </form>
    <aside class="summary" id="summary"><noscript>Please enable JavaScript.</noscript></aside>
  </div>
</div>`;
  return layout({ title: 'Checkout — Lumière Skincare', desc: 'Enter your shipping and card details to complete your order.', base: '', body, page: 'checkout' });
}

function invoicePage() {
  const body = `
<div class="wrap">
  <div id="invoice-root"><noscript>Please enable JavaScript to view your invoice.</noscript></div>
</div>`;
  return layout({ title: 'Invoice — Lumière Skincare', desc: 'Your order invoice.', base: '', body, page: 'invoice' });
}

/* ---------- build ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
mkdir(path.join(OUT, 'assets'));

write('index.html', homePage());
products.forEach((p) => write(`products/${p.slug}.html`, productPage(p)));
write('cart.html', cartPage());
write('checkout.html', checkoutPage());
write('invoice.html', invoicePage());

// data for client-side cart (id, name, price, thumbnail)
const clientData = products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price, oldPrice: p.oldPrice, size: p.size, svg: bottle(p) }));
write('assets/products.js', 'window.PRODUCTS = ' + JSON.stringify(clientData) + ';\n');
if (fs.existsSync(path.join(__dirname, 'images'))) fs.cpSync(path.join(__dirname, 'images'), path.join(OUT, 'images'), { recursive: true });
fs.copyFileSync(path.join(SRC, 'style.css'), path.join(OUT, 'assets/style.css'));
fs.copyFileSync(path.join(SRC, 'app.js'), path.join(OUT, 'assets/app.js'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`Built ${products.length} product pages + home, cart, checkout, invoice into ./docs`);
