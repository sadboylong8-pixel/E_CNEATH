/* Lumière Skincare — client-side behaviour (cart, promo codes, checkout, invoice)
   Pages are pre-rendered by build.js (SSG); this script only adds interactivity. */
(function () {
  'use strict';

  var CART_KEY = 'lumiere_cart', PROMO_KEY = 'lumiere_promo', ORDER_KEY = 'lumiere_order';
  var SHIPPING = 4.99, FREE_SHIP_AT = 50, MAX_QTY = 10;
  var PROMOS = {
    GLOW10: { type: 'percent', value: 10, label: '10% off your order' },
    WELCOME15: { type: 'percent', value: 15, label: '15% off for new customers' },
    FREESHIP: { type: 'ship', label: 'Free shipping' }
  };
  var PRODUCTS = window.PRODUCTS || [];
  var base = document.body.getAttribute('data-base') || '';
  var page = document.body.getAttribute('data-page');

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + n.toFixed(2); }
  function byId(id) { return PRODUCTS.filter(function (p) { return p.id === Number(id); })[0]; }
  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  /* ---------- cart state ---------- */
  function getCart() {
    return read(CART_KEY, []).filter(function (i) { return byId(i.id); });
  }
  function saveCart(c) { write(CART_KEY, c); updateBadge(); }
  function addToCart(id, qty) {
    var cart = getCart();
    var found = cart.filter(function (i) { return i.id === Number(id); })[0];
    if (found) found.qty = Math.min(MAX_QTY, found.qty + qty);
    else cart.push({ id: Number(id), qty: Math.min(MAX_QTY, qty) });
    saveCart(cart);
  }
  function setQty(id, qty) {
    var cart = getCart();
    cart.forEach(function (i) { if (i.id === id) i.qty = qty; });
    saveCart(cart.filter(function (i) { return i.qty > 0; }));
  }
  function removeItem(id) { saveCart(getCart().filter(function (i) { return i.id !== id; })); }
  function updateBadge() {
    var n = getCart().reduce(function (s, i) { return s + i.qty; }, 0);
    $$('[data-cart-count]').forEach(function (el) { el.textContent = n; });
  }

  /* ---------- totals ---------- */
  function currentPromo() {
    var code = read(PROMO_KEY, null);
    return code && PROMOS[code] ? { code: code, def: PROMOS[code] } : null;
  }
  function totals(cart) {
    var subtotal = cart.reduce(function (s, i) { return s + byId(i.id).price * i.qty; }, 0);
    var promo = currentPromo();
    var discount = promo && promo.def.type === 'percent' ? subtotal * promo.def.value / 100 : 0;
    var after = subtotal - discount;
    var freeShip = (promo && promo.def.type === 'ship') || after >= FREE_SHIP_AT;
    var shipping = cart.length === 0 || freeShip ? 0 : SHIPPING;
    return {
      subtotal: subtotal, discount: discount, shipping: shipping, freeShip: freeShip,
      total: after + shipping, promo: promo, toFree: Math.max(0, FREE_SHIP_AT - after)
    };
  }
  function summaryRows(t) {
    return '<div class="sum-row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
      (t.promo && t.discount ? '<div class="sum-row"><span>Promo (' + esc(t.promo.code) + ')</span><span class="disc">-' + money(t.discount) + '</span></div>' : '') +
      '<div class="sum-row"><span>Shipping</span><span>' + (t.shipping ? money(t.shipping) : 'Free') + '</span></div>' +
      '<div class="sum-row total"><span>Total</span><span>' + money(t.total) + '</span></div>';
  }

  /* ---------- add to cart buttons (home, detail) -> redirect to cart list ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    var qty = 1, sel = btn.getAttribute('data-qty-input');
    if (sel) {
      qty = parseInt($(sel).value, 10);
      if (!qty || qty < 1) qty = 1;
    }
    addToCart(btn.getAttribute('data-id'), qty);
    window.location.href = base + 'cart.html';
  });

  /* ---------- home: filter / sort / search ---------- */
  function initCatalog() {
    var grid = $('#grid');
    if (!grid) return;
    var cards = $$('.card', grid), cat = 'All';
    function apply() {
      var q = $('#search').value.trim().toLowerCase(), sort = $('#sort').value, shown = 0;
      cards.sort(function (a, b) {
        if (sort === 'price-asc') return a.dataset.price - b.dataset.price;
        if (sort === 'price-desc') return b.dataset.price - a.dataset.price;
        if (sort === 'rating') return b.dataset.rating - a.dataset.rating;
        return a.dataset.order - b.dataset.order;
      }).forEach(function (c) {
        var ok = (cat === 'All' || c.dataset.cat === cat) && (!q || c.dataset.name.indexOf(q) > -1 || c.dataset.cat.toLowerCase().indexOf(q) > -1);
        c.hidden = !ok; if (ok) shown++;
        grid.appendChild(c);
      });
      $('#result-count').textContent = shown;
      $('#empty').hidden = shown !== 0;
    }
    $('#search').addEventListener('input', apply);
    $('#sort').addEventListener('change', apply);
    $('#chips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip'); if (!chip) return;
      $$('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active'); cat = chip.dataset.cat; apply();
    });
  }

  /* ---------- cart page ---------- */
  function renderCart() {
    var root = $('#cart-root');
    if (!root) return;
    var cart = getCart();
    if (!cart.length) {
      root.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p class="muted">Looks like you haven\'t added anything yet.</p><a class="btn" href="' + base + 'index.html#shop">Start shopping</a></div>';
      return;
    }
    var t = totals(cart), promo = t.promo;
    var rows = cart.map(function (i) {
      var p = byId(i.id);
      return '<div class="cart-row">' +
        '<div class="thumb">' + p.svg + '</div>' +
        '<div><p class="cat">' + esc(p.category) + '</p>' +
        '<h3><a href="' + base + 'products/' + p.slug + '.html">' + esc(p.name) + '</a></h3>' +
        '<span class="muted small">' + esc(p.size) + ' · ' + money(p.price) + ' each</span><br>' +
        '<div class="qty-ctl"><button data-dec="' + p.id + '" aria-label="Decrease">−</button><span>' + i.qty + '</span><button data-inc="' + p.id + '" aria-label="Increase">+</button></div><br>' +
        '<button class="link-btn" data-remove="' + p.id + '">Remove</button></div>' +
        '<div class="line-total">' + money(p.price * i.qty) + '</div></div>';
    }).join('');
    root.innerHTML = '<div class="cart-layout"><div class="cart-items">' + rows + '</div>' +
      '<aside class="summary"><h2>Order summary</h2>' +
      '<form class="promo-form" id="promo-form"><input id="promo-input" placeholder="Promo code" value="' + (promo ? esc(promo.code) : '') + '" aria-label="Promo code"><button class="btn btn-ghost" type="submit">Apply</button></form>' +
      '<p class="promo-msg ' + (promo ? 'ok' : '') + '" id="promo-msg">' + (promo ? '✔ ' + esc(promo.def.label) + ' applied' : 'Try GLOW10, WELCOME15 or FREESHIP') + '</p>' +
      summaryRows(t) +
      (t.freeShip ? '<div class="ship-note">🎉 You\'ve got free shipping!</div>' : '<div class="ship-note">Add ' + money(t.toFree) + ' more for free shipping</div>') +
      '<a class="btn btn-lg btn-block" href="' + base + 'checkout.html">Proceed to checkout</a>' +
      '<p class="center small"><a href="' + base + 'index.html#shop">← Continue shopping</a></p></aside></div>';
  }
  function initCart() {
    var root = $('#cart-root');
    if (!root) return;
    renderCart();
    root.addEventListener('click', function (e) {
      var t = e.target, id;
      if ((id = t.getAttribute('data-inc'))) { var a = getCart().filter(function (i) { return i.id === +id; })[0]; setQty(+id, Math.min(MAX_QTY, a.qty + 1)); renderCart(); }
      else if ((id = t.getAttribute('data-dec'))) { var b = getCart().filter(function (i) { return i.id === +id; })[0]; setQty(+id, b.qty - 1); renderCart(); }
      else if ((id = t.getAttribute('data-remove'))) { removeItem(+id); renderCart(); }
    });
    root.addEventListener('submit', function (e) {
      if (e.target.id !== 'promo-form') return;
      e.preventDefault();
      var code = $('#promo-input').value.trim().toUpperCase();
      if (!code) { del(PROMO_KEY); renderCart(); return; }
      if (PROMOS[code]) { write(PROMO_KEY, code); renderCart(); }
      else { var m = $('#promo-msg'); m.className = 'promo-msg error'; m.textContent = 'Sorry, that code is not valid.'; }
    });
  }

  /* ---------- checkout page ---------- */
  function luhn(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var d = parseInt(num.charAt(i), 10);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return num.length >= 13 && sum % 10 === 0;
  }
  function validExpiry(v) {
    var m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    var mo = +m[1], yr = 2000 + +m[2], now = new Date();
    if (mo < 1 || mo > 12) return false;
    return yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1);
  }
  function initCheckout() {
    var form = $('#checkout-form');
    if (!form) return;
    var F = form.elements;
    var cart = getCart();
    if (!cart.length) { window.location.replace(base + 'cart.html'); return; }
    var t = totals(cart);
    $('#summary').innerHTML = '<h2>Your order</h2>' + cart.map(function (i) {
      var p = byId(i.id);
      return '<div class="mini-item"><div class="thumb">' + p.svg + '</div><div class="grow">' + esc(p.name) + '<br><span class="muted">Qty ' + i.qty + '</span></div><strong>' + money(p.price * i.qty) + '</strong></div>';
    }).join('') + '<hr style="border:0;border-top:1px solid var(--line)">' + summaryRows(t) +
      '<p class="center small"><a href="' + base + 'cart.html">← Edit cart</a></p>';

    // live card formatting
    F.cardNumber.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 16);
      this.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
    F.expiry.addEventListener('input', function (e) {
      var v = this.value.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
      this.value = v;
    });
    F.cvv.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#form-error'), bad = [];
      $$('input', form).forEach(function (i) { i.classList.remove('invalid'); });
      function flag(name) { F[name].classList.add('invalid'); bad.push(name); }
      ['name', 'phone', 'country', 'address', 'city', 'zip', 'cardName'].forEach(function (n) { if (!F[n].value.trim()) flag(n); });
      if (!/^\S+@\S+\.\S+$/.test(F.email.value.trim())) flag('email');
      var digits = F.cardNumber.value.replace(/\s/g, '');
      if (!luhn(digits)) flag('cardNumber');
      if (!validExpiry(F.expiry.value)) flag('expiry');
      if (!/^\d{3,4}$/.test(F.cvv.value)) flag('cvv');
      if (bad.length) {
        err.hidden = false;
        err.textContent = 'Please check the highlighted fields' + (bad.indexOf('cardNumber') > -1 ? ' (card number looks invalid)' : '') + '.';
        F[bad[0]].focus();
        return;
      }
      err.hidden = true;

      var d = new Date(), stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      var order = {
        number: 'INV-' + stamp + '-' + Math.floor(1000 + Math.random() * 9000),
        date: d.toISOString(),
        customer: {
          name: F.name.value.trim(), email: F.email.value.trim(), phone: F.phone.value.trim(),
          address: F.address.value.trim(), city: F.city.value.trim(), zip: F.zip.value.trim(), country: F.country.value.trim()
        },
        // never store the full card number / CVV — only the last 4 digits
        payment: { method: 'Card •••• ' + digits.slice(-4), holder: F.cardName.value.trim() },
        items: cart.map(function (i) { var p = byId(i.id); return { name: p.name, size: p.size, price: p.price, qty: i.qty }; }),
        totals: { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total },
        promo: t.promo ? t.promo.code : null
      };
      write(ORDER_KEY, order);
      del(CART_KEY); del(PROMO_KEY);
      window.location.href = base + 'invoice.html';
    });
  }

  /* ---------- invoice page ---------- */
  function initInvoice() {
    var root = $('#invoice-root');
    if (!root) return;
    var o = read(ORDER_KEY, null);
    if (!o) {
      root.innerHTML = '<div class="empty"><h2>No recent order</h2><p class="muted">Place an order first to see your invoice.</p><a class="btn" href="' + base + 'index.html">Back to shop</a></div>';
      return;
    }
    var c = o.customer, d = new Date(o.date);
    var rows = o.items.map(function (i, n) {
      return '<tr><td>' + (n + 1) + '</td><td>' + esc(i.name) + '<br><span class="muted small">' + esc(i.size) + '</span></td><td class="num">' + money(i.price) + '</td><td class="num">' + i.qty + '</td><td class="num">' + money(i.price * i.qty) + '</td></tr>';
    }).join('');
    var tt = o.totals;
    root.innerHTML = '<section class="invoice">' +
      '<div class="inv-head"><div><h1>Invoice</h1><p class="muted" style="margin:0">' + esc(o.number) + '</p></div>' +
      '<div style="text-align:right"><div class="logo" style="font-size:1.4rem">Lumi<span>è</span>re</div><span class="paid">PAID</span></div></div>' +
      '<div class="inv-meta"><div><h4>Billed &amp; shipped to</h4><strong>' + esc(c.name) + '</strong><br>' + esc(c.address) + '<br>' + esc(c.city) + ' ' + esc(c.zip) + ', ' + esc(c.country) + '<br>' + esc(c.email) + '<br>' + esc(c.phone) + '</div>' +
      '<div><h4>Order details</h4>Date: ' + d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + '<br>Payment: ' + esc(o.payment.method) + '<br>Cardholder: ' + esc(o.payment.holder) + (o.promo ? '<br>Promo code: ' + esc(o.promo) : '') + '</div></div>' +
      '<table class="inv"><thead><tr><th>#</th><th>Item</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="inv-totals">' +
      '<div class="sum-row"><span>Subtotal</span><span>' + money(tt.subtotal) + '</span></div>' +
      (tt.discount ? '<div class="sum-row"><span>Discount</span><span class="disc">-' + money(tt.discount) + '</span></div>' : '') +
      '<div class="sum-row"><span>Shipping</span><span>' + (tt.shipping ? money(tt.shipping) : 'Free') + '</span></div>' +
      '<div class="sum-row total"><span>Total paid</span><span>' + money(tt.total) + '</span></div></div>' +
      '<p class="thank">Thank you for shopping with Lumière! 🌿</p>' +
      '<div class="inv-actions"><button class="btn" onclick="window.print()">Print / Save as PDF</button><a class="btn btn-ghost" href="' + base + 'index.html">Continue shopping</a></div></section>';
  }

  /* ---------- init ---------- */
  updateBadge();
  initCatalog();
  initCart();
  initCheckout();
  initInvoice();
})();
