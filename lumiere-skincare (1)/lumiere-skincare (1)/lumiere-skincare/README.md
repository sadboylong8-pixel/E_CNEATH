# Lumière Skincare — SSG e-commerce front end

Midterm (group) front end built with **SSG (Static Site Generation)**.

## Pages

| Page | File | Notes |
|---|---|---|
| Catalog / home | `docs/index.html` | 10 products, category filter, search, sort, promo banners |
| Product detail | `docs/products/<slug>.html` | 10 pages, qty selector, ingredients, how to use, related products |
| Cart list | `docs/cart.html` | change qty, remove, promo code, free-shipping progress |
| Checkout | `docs/checkout.html` | shipping + card form with validation (Luhn, expiry, CVV) |
| Invoice | `docs/invoice.html` | printable / save as PDF |

Flow: **Catalog → Detail → Add to cart → Cart list → Checkout (card info) → Place order → Invoice**

## Discounts

- Sale prices on 4 products (shown with % off)
- `GLOW10` = 10% off · `WELCOME15` = 15% off · `FREESHIP` = free shipping
- Free shipping automatically over $50

## Demo card

`4242 4242 4242 4242`, any future expiry (e.g. `12/30`), any 3-digit CVV.
No payment is processed. Only the last 4 digits are kept, in the browser, for the invoice.

## How the SSG works

`build.js` reads `products.json` and writes every HTML page into `docs/` at build time.
The cart, checkout and invoice are static shells; `app.js` fills them from `localStorage`
because a front-end-only project has no server.

```bash
node build.js        # regenerate ./docs (Node 16+, no dependencies)
```

Edit products in `products.json`, styles in `src/style.css`, behaviour in `src/app.js`, then rebuild.

## Hosting (GitHub Pages)

1. Push this folder to a **public** GitHub repo.
2. Repo → Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/docs`.
3. Your site will be at `https://<user>.github.io/<repo>/`.

All links are relative, so it works under a sub-path. Netlify / Vercel also work (publish directory: `docs`).
