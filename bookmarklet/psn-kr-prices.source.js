(async function psnKrPrices() {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────────
  const VERCEL_API = 'https://psn-tracker-chi.vercel.app/api/kr-search';

  const GENERIC_SUFFIXES = new Set([
    'GAME000000000000', 'ASIA000000000000', 'ASIAPLACEHOLDER1',
    'WELCOMPACK000000', 'EXTRALARGE000000', 'LARGE00000000000',
    'BASE000000000000', 'SMALL00000000000', 'MEDIUM0000000000',
    'DLCEXPANSION0001', 'DLCEXPANSION0002',
  ]);

  // Confirmés par Task 0.2
  const ITEM_SELECTOR = 'li[data-qa^="wishlist-list-item"]';
  const PRICE_SELECTOR = '[data-qa$="#price#display-price"]';
  const LS_KEY = 'psn-kr-links';

  // ── Module : parseWishlist ────────────────────────────────────────────────
  function parseWishlist() {
    const apollo = window.__NEXT_DATA__?.props?.apolloState ?? {};

    return Object.values(apollo)
      .filter(p =>
        p.id &&
        p.name &&
        Array.isArray(p.platforms) &&
        p.platforms.length > 0 &&
        !GENERIC_SUFFIXES.has(p.id.split('-').pop())
      )
      .map(p => ({
        id: p.id,
        suffix: p.id.split('-').pop(),
        name: p.name,
        frBasePrice: p.price?.basePrice ?? null,
        frDiscountedPrice: p.price?.discountedPrice ?? null,
        frPriceValue: parseFloat(
          (p.price?.discountedPrice ?? p.price?.basePrice ?? '0')
            .replace(/[^0-9,]/g, '').replace(',', '.')
        ),
      }));
  }

  // ── Module : searchKR ─────────────────────────────────────────────────────
  // Appelle le proxy Vercel (CORS ok depuis library.playstation.com)
  // Pour Tampermonkey : remplacé par GM_xmlhttpRequest dans le user.js
  async function searchKR(title) {
    try {
      const res = await fetch(
        `${VERCEL_API}?title=${encodeURIComponent(title)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products ?? []).map(p => ({
        id: p.id,
        suffix: p.suffix,
        name: p.name,
        coverUrl: p.coverUrl ?? null,
        krBasePrice: p.basePrice ?? null,
        krDiscountedPrice: p.discountedPrice ?? null,
        krPriceValue: parseInt(
          (p.discountedPrice ?? p.basePrice ?? '0').replace(/[^0-9]/g, ''), 10
        ),
      }));
    } catch {
      return [];
    }
  }

  // ── Module : matchSuffix ──────────────────────────────────────────────────
  function matchSuffix(frSuffix, krProducts) {
    const match = krProducts.find(k => k.suffix === frSuffix) ?? null;
    const candidates = match ? [] : krProducts;
    return { match, candidates };
  }

  // ── Module : getExchangeRate ──────────────────────────────────────────────
  async function getExchangeRate() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/KRW');
      const data = await res.json();
      if (data.result !== 'success') throw new Error();
      return data.rates.EUR;
    } catch {
      try {
        const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/KRW');
        const data2 = await res2.json();
        return data2.rates.EUR;
      } catch {
        return null;
      }
    }
  }

  // ── Module : localStorage ─────────────────────────────────────────────────
  function loadLinks() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); }
    catch { return {}; }
  }

  function saveLink(frId, krId) {
    const links = loadLinks();
    links[frId] = krId;
    localStorage.setItem(LS_KEY, JSON.stringify(links));
  }

  // ── Module : formatPrice ──────────────────────────────────────────────────
  function formatPrice(krw, rate) {
    if (!rate) return `${krw.toLocaleString('fr-FR')} ₩`;
    return (krw * rate).toLocaleString('fr-FR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' €';
  }

  // ── Module : injectBadge ──────────────────────────────────────────────────
  function injectBadge(itemEl, state, data) {
    itemEl.querySelector('.psn-kr-badge')?.remove();

    const badge = document.createElement('div');
    badge.className = 'psn-kr-badge';
    badge.style.cssText = 'font-size:12px;margin-top:4px;font-family:inherit;line-height:1.6;';

    if (state === 'loading') {
      badge.innerHTML = '<span style="color:#aaa">🇰🇷 …</span>';

    } else if (state === 'not_found') {
      badge.innerHTML = '<span style="color:#bbb">🇰🇷 —</span>';

    } else if (state === 'found') {
      const { krPriceValue, krDiscountedPrice, krBasePrice, frPriceValue, rate } = data;
      const activePriceKrw = krDiscountedPrice
        ? parseInt(krDiscountedPrice.replace(/[^0-9]/g, ''), 10)
        : krPriceValue;

      const saving = frPriceValue > 0 && rate
        ? Math.round((1 - (activePriceKrw * rate) / frPriceValue) * 100)
        : 0;
      const color = saving >= 5 ? '#1db954' : '#888';

      let priceHtml;
      if (krDiscountedPrice && krBasePrice !== krDiscountedPrice) {
        const basePriceKrw = parseInt(krBasePrice.replace(/[^0-9]/g, ''), 10);
        priceHtml = `<span style="text-decoration:line-through;color:#bbb;margin-right:4px">${formatPrice(basePriceKrw, rate)}</span>${formatPrice(activePriceKrw, rate)}`;
      } else {
        priceHtml = formatPrice(activePriceKrw, rate);
      }

      badge.innerHTML = `<span style="color:${color}">🇰🇷 ${priceHtml}${saving >= 5 ? ` <strong>−${saving}%</strong>` : ''}</span>`;

    } else if (state === 'ambiguous') {
      badge.innerHTML = '<span style="color:#aaa">🇰🇷 ? </span>'
        + '<button class="psn-kr-identify" style="font-size:11px;padding:2px 8px;border:1px solid #0070d1;background:none;color:#0070d1;border-radius:4px;cursor:pointer;font-family:inherit;">Identifier →</button>';
    }

    const priceEl = itemEl.querySelector(PRICE_SELECTOR);
    if (priceEl) priceEl.after(badge);
    else itemEl.appendChild(badge);

    return badge;
  }

  // ── Module : showDisambiguation ───────────────────────────────────────────
  function showDisambiguation(itemEl, candidates, frId, rate, frPriceValue, onChoice) {
    itemEl.querySelector('.psn-kr-disambig')?.remove();

    const panel = document.createElement('div');
    panel.className = 'psn-kr-disambig';
    panel.style.cssText = 'margin-top:6px;padding:8px 10px;background:#f7f7f7;border-radius:6px;font-family:inherit;font-size:12px;border:1px solid #e0e0e0;';

    const title = document.createElement('div');
    title.textContent = 'Plusieurs versions KR trouvées :';
    title.style.cssText = 'font-weight:600;margin-bottom:6px;color:#333;';
    panel.appendChild(title);

    candidates.slice(0, 4).forEach(c => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;border-radius:4px;';
      row.onmouseenter = () => row.style.background = '#efefef';
      row.onmouseleave = () => row.style.background = '';

      const priceKrw = c.krPriceValue;
      const priceStr = rate ? formatPrice(priceKrw, rate) : `${priceKrw.toLocaleString('fr-FR')} ₩`;

      row.innerHTML = `
        ${c.coverUrl ? `<img src="${c.coverUrl}" style="width:30px;height:30px;object-fit:cover;border-radius:3px;flex-shrink:0">` : '<div style="width:30px;height:30px;background:#ddd;border-radius:3px;flex-shrink:0"></div>'}
        <span style="flex:1;color:#333;">${c.name}</span>
        <span style="color:#555;white-space:nowrap;">${priceStr}</span>
      `;
      row.addEventListener('click', () => {
        saveLink(frId, c.id);
        panel.remove();
        onChoice(c);
      });
      panel.appendChild(row);
    });

    const noneRow = document.createElement('div');
    noneRow.textContent = 'Aucun de ces jeux';
    noneRow.style.cssText = 'color:#0070d1;cursor:pointer;padding:4px 4px;margin-top:4px;font-size:11px;border-top:1px solid #e8e8e8;padding-top:6px;';
    noneRow.addEventListener('click', () => {
      panel.remove();
      showManualLink(itemEl, candidates[0]?.name ?? '', frId, rate, frPriceValue, onChoice);
    });
    panel.appendChild(noneRow);

    itemEl.querySelector('.psn-kr-badge')?.after(panel);
  }

  // ── Module : showManualLink ───────────────────────────────────────────────
  function showManualLink(itemEl, gameName, frId, rate, frPriceValue, onLinked) {
    itemEl.querySelector('.psn-kr-manual')?.remove();

    const panel = document.createElement('div');
    panel.className = 'psn-kr-manual';
    panel.style.cssText = 'margin-top:6px;padding:8px 10px;background:#fff8e1;border-radius:6px;font-family:inherit;font-size:12px;border:1px solid #ffe082;';

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px;color:#333;">Coller l'URL du jeu KR :</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input class="psn-kr-url-input" type="text" placeholder="https://store.playstation.com/ko-kr/product/..."
          style="flex:1;padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;font-family:inherit;">
        <button class="psn-kr-link-btn" style="padding:4px 10px;background:#0070d1;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap;">Lier</button>
      </div>
      <div class="psn-kr-manual-error" style="color:#c0392b;font-size:11px;margin-top:4px;display:none;"></div>
    `;

    window.open(
      `https://store.playstation.com/ko-kr/search/${encodeURIComponent(gameName)}`,
      '_blank'
    );

    panel.querySelector('.psn-kr-link-btn').addEventListener('click', async () => {
      const url = panel.querySelector('.psn-kr-url-input').value.trim();
      const errorEl = panel.querySelector('.psn-kr-manual-error');

      const idMatch = url.match(/\/product\/([A-Z0-9_\-]+)/i);
      if (!idMatch) {
        errorEl.textContent = 'URL invalide — doit contenir /product/...';
        errorEl.style.display = 'block';
        return;
      }

      const targetId = idMatch[1];
      errorEl.style.display = 'none';

      const krProducts = await searchKR(gameName);
      const found = krProducts.find(p => p.id === targetId || p.suffix === targetId.split('-').pop());

      if (!found) {
        errorEl.textContent = 'Produit KR non trouvé. Essaie une autre URL.';
        errorEl.style.display = 'block';
        return;
      }

      saveLink(frId, found.id);
      panel.remove();
      onLinked(found);
    });

    itemEl.querySelector('.psn-kr-badge')?.after(panel);
  }

  // ── Orchestration : main() ────────────────────────────────────────────────
  async function main() {
    document.querySelectorAll('.psn-kr-badge, .psn-kr-disambig, .psn-kr-manual')
      .forEach(el => el.remove());

    const games = parseWishlist();
    const items = document.querySelectorAll(ITEM_SELECTOR);

    if (games.length === 0 || items.length === 0) {
      console.warn('[PSN KR] Aucun jeu ou item trouvé. La page est-elle chargée ?');
      return;
    }

    console.log(`[PSN KR] ${games.length} jeux, ${items.length} items DOM`);

    // Badges "chargement" immédiats
    items.forEach(el => injectBadge(el, 'loading', {}));

    const [rate, links] = await Promise.all([
      getExchangeRate(),
      Promise.resolve(loadLinks()),
    ]);

    // Construire un index productId → itemEl via data-telemetry-meta
    const itemMap = new Map();
    items.forEach(el => {
      const telEl = el.querySelector('[data-telemetry-meta]');
      if (!telEl) return;
      try {
        const meta = JSON.parse(telEl.dataset.telemetryMeta);
        if (meta.productId) itemMap.set(meta.productId, el);
      } catch { /* ignore */ }
    });

    await Promise.all(games.map(async game => {
      const itemEl = itemMap.get(game.id);
      if (!itemEl) return;

      // Cache localStorage
      if (game.id in links) {
        const cachedKrId = links[game.id];
        if (cachedKrId === null) {
          injectBadge(itemEl, 'not_found', {});
          return;
        }
        const krProducts = await searchKR(game.name);
        const cached = krProducts.find(p => p.id === cachedKrId);
        if (cached) {
          injectBadge(itemEl, 'found', { ...cached, frPriceValue: game.frPriceValue, rate });
          return;
        }
      }

      const krProducts = await searchKR(game.name);
      const { match, candidates } = matchSuffix(game.suffix, krProducts);

      if (match) {
        injectBadge(itemEl, 'found', { ...match, frPriceValue: game.frPriceValue, rate });
      } else if (candidates.length === 0) {
        injectBadge(itemEl, 'not_found', {});
      } else {
        injectBadge(itemEl, 'ambiguous', {});
        itemEl.querySelector('.psn-kr-identify')?.addEventListener('click', () => {
          showDisambiguation(itemEl, candidates, game.id, rate, game.frPriceValue, chosen => {
            injectBadge(itemEl, 'found', { ...chosen, frPriceValue: game.frPriceValue, rate });
          });
        });
      }
    }));

    console.log('[PSN KR] Terminé');
  }

  main();
})();
