// ==UserScript==
// @name         PSN KR Prices
// @namespace    https://library.playstation.com
// @version      2.0
// @description  Prix KR sur la wishlist PSN + liaison depuis le store coréen
// @author       Paul Bindler
// @match        https://library.playstation.com/wishlist*
// @match        https://library.playstation.com/*/wishlist*
// @match        https://store.playstation.com/ko-kr/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      store.playstation.com
// @connect      open.er-api.com
// @connect      api.exchangerate-api.com
// ==/UserScript==


if (location.hostname === 'library.playstation.com') {
  // ── Wishlist ──────────────────────────────────────────────────────────────
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

  const ITEM_SELECTOR = 'li[data-qa^="wishlist-list-item"]';
  const PRICE_SELECTOR = '[data-qa$="#price#display-price"]';
  const LS_KEY = 'psn-kr-links';

  // ── Module : parseWishlist ────────────────────────────────────────────────
  function parseWishlist() {
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const apollo = win.__NEXT_DATA__?.props?.apolloState ?? {};
    return Object.values(apollo)
      .filter(p =>
        p.id && p.name &&
        Array.isArray(p.platforms) && p.platforms.length > 0 &&
        !GENERIC_SUFFIXES.has(p.id.split('-').pop())
      )
      .map(p => ({
        id: p.id,
        suffix: p.id.split('-').pop(),
        name: p.name,
        frPriceValue: parseFloat(
          (p.price?.discountedPrice ?? p.price?.basePrice ?? '0')
            .replace(/[^0-9,]/g, '').replace(',', '.')
        ),
        frBasePriceValue: p.price?.basePrice ? parseFloat(
          p.price.basePrice.replace(/[^0-9,]/g, '').replace(',', '.')
        ) : null,
      }));
  }

  // ── Module : parseLangs ───────────────────────────────────────────────────
  // Extrait les codes langue depuis le nom coréen du produit PSN
  function parseLangsFromKrName(name) {
    if (!name) return [];
    const map = [
      ['영어', 'EN'], ['프랑스어', 'FR'], ['한국어', 'KO'], ['독일어', 'DE'],
      ['스페인어', 'ES'], ['일본어', 'JA'], ['이탈리아어', 'IT'],
      ['포르투갈어', 'PT'], ['러시아어', 'RU'], ['중국어', 'ZH'],
    ];
    return map.filter(([kr]) => name.includes(kr)).map(([, code]) => code);
  }

    // ── Module : searchKR (GM_xmlhttpRequest — direct, pas de proxy) ──────────────
  async function searchKR(title) {
    return new Promise(resolve => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://store.playstation.com/ko-kr/search/' + encodeURIComponent(title),
        headers: { 'Accept-Language': 'ko-KR' },
        onload(res) {
          try {
            const tag = 'id="__NEXT_DATA__"';
            const idx = res.responseText.indexOf(tag);
            if (idx < 0) { resolve([]); return; }
            const jsonStart = res.responseText.indexOf('>', idx) + 1;
            const jsonEnd = res.responseText.indexOf('<' + '/script>', jsonStart);
            if (jsonStart <= 0 || jsonEnd < 0) { resolve([]); return; }
            const apollo = JSON.parse(res.responseText.slice(jsonStart, jsonEnd)).props?.apolloState ?? {};
            resolve(Object.values(apollo)
              .filter(p => p.id && p.name && Array.isArray(p.platforms) && p.platforms.length > 0)
              .filter(p => !GENERIC_SUFFIXES.has(p.id.split('-').pop()))
              .map(p => ({
                id: p.id,
                suffix: p.id.split('-').pop(),
                name: p.name,
                coverUrl: (p.media ?? []).find(m => m.role === 'MASTER')?.url ?? null,
                krBasePrice: p.price?.basePrice ?? null,
                krDiscountedPrice: p.price?.discountedPrice ?? null,
                krPriceValue: parseInt((p.price?.discountedPrice ?? p.price?.basePrice ?? '0').replace(/[^0-9]/g, ''), 10),
                languages: parseLangsFromKrName(p.name),
              })));
          } catch { resolve([]); }
        },
        onerror() { resolve([]); }
      });
    });
  }


  // ── Module : matchSuffix ──────────────────────────────────────────────────
  function matchSuffix(frSuffix, krProducts) {
    const match = krProducts.find(k => k.suffix === frSuffix) ?? null;
    return { match, candidates: match ? [] : krProducts };
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
        return (await res2.json()).rates.EUR;
      } catch { return null; }
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
  // Retourne deux spans (€ et ₩) contrôlés par le toggle CSS
  function formatPriceHTML(krw, rate) {
    const eur = rate
      ? (krw * rate).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
      : krw.toLocaleString('fr-FR') + ' ₩';
    const won = krw.toLocaleString('ko-KR') + ' ₩';
    return `<span class="psn-kr-price-eur">${eur}</span><span class="psn-kr-price-won">${won}</span>`;
  }

  // ── Module : styles globaux ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('psn-kr-styles')) return;
    const s = document.createElement('style');
    s.id = 'psn-kr-styles';
    s.textContent = [
      '.psn-kr-badge{pointer-events:none;display:block;font:inherit;margin-top:3px}',
      '.psn-kr-fr-flag{pointer-events:none}',
      '.psn-kr-menu-opt{pointer-events:auto!important}',
      '.psn-kr-price-won{display:none}',
      '.psn-kr-currency-won .psn-kr-price-eur{display:none}',
      '.psn-kr-currency-won .psn-kr-price-won{display:inline}',
      '.psn-kr-fr-won{display:none}',
      '.psn-kr-currency-won .psn-kr-fr-eur{display:none}',
      '.psn-kr-currency-won .psn-kr-fr-won{display:inline}',
      '.psn-kr-lang{display:inline-block;font-size:0.72em;font-weight:700;padding:1px 4px;border-radius:3px;background:#555;color:#fff;margin-left:4px;vertical-align:middle}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Module : toggle €/₩ ──────────────────────────────────────────────────
  function injectToggleButton() {
    if (document.getElementById('psn-kr-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'psn-kr-toggle';
    btn.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:99999',
      'background:#003791', 'color:#fff', 'border:none', 'border-radius:20px',
      'padding:8px 18px', 'cursor:pointer', 'font-size:13px', 'font-weight:700',
      'box-shadow:0 2px 8px rgba(0,0,0,0.25)', 'pointer-events:auto',
    ].join(';');
    const update = () => {
      btn.textContent = document.body.classList.contains('psn-kr-currency-won') ? '₩ → €' : '€ → ₩';
    };
    btn.addEventListener('click', () => {
      document.body.classList.toggle('psn-kr-currency-won');
      localStorage.setItem('psn-kr-currency',
        document.body.classList.contains('psn-kr-currency-won') ? 'KRW' : 'EUR');
      update();
    });
    if (localStorage.getItem('psn-kr-currency') === 'KRW') {
      document.body.classList.add('psn-kr-currency-won');
    }
    update();
    document.body.appendChild(btn);
  }

  // ── Module : injectBadge ──────────────────────────────────────────────────
  function injectBadge(itemEl, state, data) {
    itemEl.querySelector('.psn-kr-badge')?.remove();

    const priceEl = itemEl.querySelector(PRICE_SELECTOR);

    // Ajouter le flag 🇫🇷 devant le prix PSN natif (une seule fois)
    if (priceEl && !priceEl.querySelector('.psn-kr-fr-flag')) {
      const frFlag = document.createElement('span');
      frFlag.className = 'psn-kr-fr-flag';
      frFlag.textContent = '🇫🇷 ';
      priceEl.prepend(frFlag);
    }

    const badge = document.createElement('div');
    badge.className = 'psn-kr-badge';
    badge.style.cssText = 'display:block;font:inherit;margin-top:4px;';

    if (state === 'loading') {
      badge.innerHTML = '<span style="opacity:0.4">🇰🇷 …</span>';

    } else if (state === 'not_found') {
      badge.innerHTML = '<span style="opacity:0.35">🇰🇷 —</span>';

    } else if (state === 'ambiguous') {
      badge.innerHTML = '<span style="opacity:0.35">🇰🇷 ?</span>';

    } else if (state === 'found') {
      const { krPriceValue, krDiscountedPrice, krBasePrice, frPriceValue, rate, languages } = data;
      const activePriceKrw = krDiscountedPrice
        ? parseInt(krDiscountedPrice.replace(/[^0-9]/g, ''), 10)
        : krPriceValue;
      const basePriceKrw = krBasePrice ? parseInt(krBasePrice.replace(/[^0-9]/g, ''), 10) : 0;

      const krDiscount = (krDiscountedPrice && krBasePrice !== krDiscountedPrice && basePriceKrw > 0)
        ? Math.round((1 - activePriceKrw / basePriceKrw) * 100)
        : 0;

      const saving = frPriceValue > 0 && rate
        ? Math.round((1 - (activePriceKrw * rate) / frPriceValue) * 100)
        : 0;

      let pricesHtml = '';
      if (krDiscountedPrice && krBasePrice !== krDiscountedPrice) {
        pricesHtml += `<span style="text-decoration:line-through;opacity:0.45;margin-right:6px">${formatPriceHTML(basePriceKrw, rate)}</span>`;
      }
      pricesHtml += formatPriceHTML(activePriceKrw, rate);
      if (saving >= 5) {
        pricesHtml += ` <span style="color:#1db954;font-weight:700">−${saving}%</span>`;
      }

      // Badge langue : FR prioritaire, sinon EN, sinon KR rouge = pas de FR ni EN
      const langs = languages ?? [];
      let langBadge = '';
      if (langs.includes('FR')) {
        langBadge = ' <span class="psn-kr-lang" style="background:#0055a4">FR</span>';
      } else if (langs.includes('EN')) {
        langBadge = ' <span class="psn-kr-lang" style="background:#555">EN</span>';
      } else if (langs.length > 0) {
        langBadge = ' <span class="psn-kr-lang" style="background:#c0392b">KR</span>';
      }

      badge.innerHTML = `🇰🇷 ${pricesHtml}${langBadge}`;

      // Toggle ₩ : wrapper les prix FR pour pouvoir les remplacer par des ₩
      if (priceEl && rate && frPriceValue > 0 && !priceEl.querySelector('.psn-kr-fr-eur')) {
        const flag = priceEl.querySelector('.psn-kr-fr-flag');
        const nonFlagNodes = Array.from(priceEl.childNodes).filter(n => n !== flag);
        if (nonFlagNodes.length > 0) {
          const eurSpan = document.createElement('span');
          eurSpan.className = 'psn-kr-fr-eur';
          nonFlagNodes.forEach(n => eurSpan.appendChild(n));
          priceEl.appendChild(eurSpan);
          const wonSpan = document.createElement('span');
          wonSpan.className = 'psn-kr-fr-won';
          wonSpan.textContent = Math.round(frPriceValue / rate).toLocaleString('ko-KR') + ' ₩';
          priceEl.appendChild(wonSpan);
        }
      }

      // Prix de base barré (sibling de priceEl dans le container PSN, AVANT création de innerWrap)
      const priceContainer = priceEl.closest('[data-qa$="#price"]') ?? priceEl.parentElement;
      if (priceContainer && rate) {
        Array.from(priceContainer.children).forEach(child => {
          if (child === priceEl || child.classList.contains('psn-kr-badge')) return;
          if (child.querySelector('.psn-kr-fr-eur')) return;
          const cs = window.getComputedStyle(child);
          if (!cs.textDecorationLine.includes('line-through')) return;
          const baseNodes = Array.from(child.childNodes);
          if (baseNodes.length === 0) return;
          const baseEur = document.createElement('span');
          baseEur.className = 'psn-kr-fr-eur';
          baseNodes.forEach(n => baseEur.appendChild(n));
          child.appendChild(baseEur);
          const baseWon = document.createElement('span');
          baseWon.className = 'psn-kr-fr-won';
          const baseVal = data.frBasePriceValue ?? frPriceValue;
          baseWon.textContent = Math.round(baseVal / rate).toLocaleString('ko-KR') + ' ₩';
          child.appendChild(baseWon);
        });
      }
    }

    // Injecter dans le conteneur de prix :
    // On wrappe les éléments natifs PSN dans un flex-row pour les garder sur une ligne,
    // puis notre badge est un bloc en dessous — le badge PSN reste sur sa ligne FR.
    if (priceEl) {
      const container = priceEl.closest('[data-qa$="#price"]') ?? priceEl.parentElement;

      if (!container.querySelector('.psn-kr-price-inner')) {
        const inner = document.createElement('div');
        inner.className = 'psn-kr-price-inner';
        inner.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;';
        Array.from(container.childNodes).forEach(child => inner.appendChild(child));
        container.style.cssText += ';display:flex!important;flex-direction:column;align-items:flex-start;';
        container.appendChild(inner);
      }

      container.appendChild(badge);
    } else {
      itemEl.appendChild(badge);
    }

    return badge;
  }

  // ── Module : handleIncomingLink ───────────────────────────────────────────
  // Lit ?psn-kr-link=frId:krId transmis par le store KR, sauvegarde et nettoie l'URL
  function handleIncomingLink() {
    const param = new URLSearchParams(location.search).get('psn-kr-link');
    if (!param) return;
    const colon = param.indexOf(':');
    if (colon < 1) return;
    const frId = param.slice(0, colon);
    const krId = param.slice(colon + 1);
    if (frId && krId) {
      saveLink(frId, krId);
      const url = new URL(location.href);
      url.searchParams.delete('psn-kr-link');
      history.replaceState({}, '', url);
      console.log('[PSN KR] Lien reçu du store KR :', frId, '→', krId);
    }
  }

  // ── Module : menu "..." injection ────────────────────────────────────────
  let _menuCtx = null;

  function setupMenuObserver(itemMap, gamesById, links, rate) {
    itemMap.forEach((itemEl, productId) => {
      const btns = Array.from(itemEl.querySelectorAll('button'))
        .filter(b => !b.closest('.psn-kr-badge'));
      const moreBtn = btns.find(b =>
        b.getAttribute('aria-haspopup') ||
        (b.getAttribute('data-qa') ?? '').includes('context') ||
        (b.getAttribute('aria-label') ?? '').toLowerCase().includes('option')
      ) ?? btns[btns.length - 1];

      if (!moreBtn) return;
      moreBtn.addEventListener('click', () => {
        _menuCtx = { productId, itemEl, rate, links };
      }, true);
    });

    const observer = new MutationObserver(muts => {
      if (!_menuCtx) return;
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          const menuEl = findPsnMenu(node);
          if (!menuEl || menuEl.querySelector('.psn-kr-menu-opt')) continue;
          injectKrMenuOption(menuEl, _menuCtx, gamesById);
          _menuCtx = null;
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function findPsnMenu(node) {
    if (node.getAttribute?.('role') === 'menu') return node;
    const sub = node.querySelector?.('[role="menu"]');
    if (sub) return sub;
    if (node.textContent?.includes('Supprimer')) return node;
    return null;
  }

  function injectKrMenuOption(menuEl, { productId, links }, gamesById) {
    const game = gamesById.get(productId);
    if (!game) return;

    const isLinked = (productId in links) && links[productId] !== null;
    const label = isLinked ? 'Modifier la fiche KR' : 'Lier une fiche KR';

    // Cloner un item natif pour hériter de ses styles (classes CSS, data-qa…)
    const refItem = menuEl.querySelector('[role="menuitem"], li');
    const tagName = refItem?.tagName ?? 'LI';
    const el = document.createElement(tagName);

    if (refItem) {
      // Copier tous les attributs (classes hachées incluses)
      for (const attr of refItem.attributes) {
        if (attr.name !== 'id') el.setAttribute(attr.name, attr.value);
      }
      // Copier les propriétés visuelles calculées (padding, marges, typo)
      const cs = window.getComputedStyle(refItem);
      el.style.cssText = [
        `padding:${cs.padding}`,
        `margin:${cs.margin}`,
        `font-size:${cs.fontSize}`,
        `font-family:${cs.fontFamily}`,
        `font-weight:${cs.fontWeight}`,
        `color:${cs.color}`,
        `line-height:${cs.lineHeight}`,
        `display:${cs.display}`,
        `box-sizing:border-box`,
        `cursor:pointer`,
        `width:100%`,
        `background:transparent`,
        `border:none`,
        `text-align:left`,
      ].join(';');
    } else {
      el.style.cssText = 'cursor:pointer;padding:12px 16px;width:100%;display:block;text-align:left;border:none;background:transparent;';
    }

    el.classList.add('psn-kr-menu-opt');
    el.setAttribute('role', 'menuitem');
    el.textContent = label;

    el.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      (menuEl.closest('[aria-modal="true"], [data-qa*="dropdown"], [data-qa*="context"]') ?? menuEl.parentElement)?.remove();
      const url = new URL('https://store.playstation.com/ko-kr/search/' + encodeURIComponent(game.name));
      url.searchParams.set('psn-kr-fr', productId);
      url.searchParams.set('psn-kr-title', game.name);
      window.open(url.toString(), '_blank');
    });

    menuEl.appendChild(el);
  }

  // ── Orchestration : main() ────────────────────────────────────────────────
  async function main() {
    injectStyles();
    injectToggleButton();
    handleIncomingLink();

    document.querySelectorAll('.psn-kr-badge, .psn-kr-fr-flag, .psn-kr-fr-won').forEach(el => el.remove());
    document.querySelectorAll('.psn-kr-fr-eur').forEach(span => {
      const p = span.parentElement;
      if (p) { Array.from(span.childNodes).forEach(n => p.insertBefore(n, span)); span.remove(); }
    });
    // Unwrapper les conteneurs de prix modifiés (si re-run)
    document.querySelectorAll('.psn-kr-price-inner').forEach(inner => {
      const parent = inner.parentElement;
      if (!parent) return;
      Array.from(inner.childNodes).forEach(child => parent.insertBefore(child, inner));
      inner.remove();
      parent.style.display = '';
      parent.style.flexDirection = '';
      parent.style.alignItems = '';
    });

    // Attendre que les items PSN soient dans le DOM (React hydration peut être lente)
    let games = parseWishlist();
    let items = document.querySelectorAll(ITEM_SELECTOR);
    let attempts = 0;
    while ((games.length === 0 || items.length === 0) && attempts < 20) {
      await new Promise(r => setTimeout(r, 500));
      games = parseWishlist();
      items = document.querySelectorAll(ITEM_SELECTOR);
      attempts++;
    }

    if (games.length === 0 || items.length === 0) {
      console.warn('[PSN KR] Aucun jeu ou item trouvé après 10s. La page est-elle chargée ?');
      return;
    }

    console.log(`[PSN KR] ${games.length} jeux, ${items.length} items DOM`);

    items.forEach(el => injectBadge(el, 'loading', {}));

    const [rate, links] = await Promise.all([
      getExchangeRate(),
      Promise.resolve(loadLinks()),
    ]);

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

      if (game.id in links) {
        const cachedKrId = links[game.id];
        if (cachedKrId === null) { injectBadge(itemEl, 'not_found', {}); return; }
        const krProducts = await searchKR(game.name);
        const cached = krProducts.find(p => p.id === cachedKrId);
        if (cached) {
          injectBadge(itemEl, 'found', { ...cached, frPriceValue: game.frPriceValue, frBasePriceValue: game.frBasePriceValue, rate });
          return;
        }
      }

      const krProducts = await searchKR(game.name);
      const { match, candidates } = matchSuffix(game.suffix, krProducts);

      if (match) {
        injectBadge(itemEl, 'found', { ...match, frPriceValue: game.frPriceValue, frBasePriceValue: game.frBasePriceValue, rate });
      } else if (candidates.length === 0) {
        injectBadge(itemEl, 'not_found', {});
      } else {
        injectBadge(itemEl, 'ambiguous', {});
      }
    }));

    const gamesById = new Map(games.map(g => [g.id, g]));
    setupMenuObserver(itemMap, gamesById, links, rate);

    console.log('[PSN KR] Terminé');
  }

  main();
})();

} else if (location.hostname === 'store.playstation.com') {
  // ── Store KR ──────────────────────────────────────────────────────────────
  (function psnKrStoreLink() {
  'use strict';

  const SS_FR_ID    = 'psn-kr-pending-fr-id';
  const SS_FR_TITLE = 'psn-kr-pending-fr-title';

  // Lire depuis l'URL (ouverture depuis la wishlist) ou sessionStorage (navigation SPA interne)
  const urlParams      = new URLSearchParams(location.search);
  const frIdFromUrl    = urlParams.get('psn-kr-fr');
  const frTitleFromUrl = urlParams.get('psn-kr-title');

  if (frIdFromUrl) {
    sessionStorage.setItem(SS_FR_ID, frIdFromUrl);
    sessionStorage.setItem(SS_FR_TITLE, frTitleFromUrl ?? '');
  }

  const frId    = frIdFromUrl    || sessionStorage.getItem(SS_FR_ID);
  const frTitle = frTitleFromUrl || sessionStorage.getItem(SS_FR_TITLE);

  if (!frId) return;

  // ── Rendu de la bannière ──────────────────────────────────────────────────
  function krIdFromPath(pathname) {
    if (!pathname.includes('/product/')) return null;
    return pathname.split('/product/')[1]?.split('/')[0]?.split('?')[0] ?? null;
  }

  function renderBanner() {
    document.getElementById('psn-kr-banner')?.remove();
    document.body.style.marginTop = '';

    const krId = krIdFromPath(location.pathname);

    const banner = document.createElement('div');
    banner.id = 'psn-kr-banner';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#003791', 'color:#fff', 'padding:10px 20px',
      'font-size:13px', 'font-family:inherit',
      'display:flex', 'align-items:center', 'gap:10px', 'flex-wrap:wrap',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    ].join(';');

    const msg = document.createElement('span');
    if (krId) {
      msg.innerHTML = '🇰🇷 Fiche trouvée — lier à <strong>' + (frTitle ?? 'ma wishlist') + '</strong> ?';
    } else {
      msg.innerHTML = '🇰🇷 Mode liaison — <strong>' + (frTitle ?? 'jeu') + '</strong>' +
        ' — Navigue jusqu\'à la bonne fiche KR';
    }
    banner.appendChild(msg);

    if (krId) {
      const linkBtn = document.createElement('button');
      linkBtn.style.cssText = [
        'padding:6px 18px', 'background:#fff', 'color:#003791',
        'border:none', 'border-radius:4px', 'cursor:pointer',
        'font-size:13px', 'font-weight:700', 'white-space:nowrap',
      ].join(';');
      linkBtn.textContent = '✓ Lier ce jeu';
      linkBtn.addEventListener('click', () => {
        sessionStorage.removeItem(SS_FR_ID);
        sessionStorage.removeItem(SS_FR_TITLE);
        location.href =
          'https://library.playstation.com/wishlist?psn-kr-link=' +
          encodeURIComponent(frId + ':' + krId);
      });
      banner.appendChild(linkBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = [
      'margin-left:auto', 'padding:4px 14px',
      'border:1px solid rgba(255,255,255,0.5)', 'background:none', 'color:#fff',
      'border-radius:4px', 'cursor:pointer', 'font-size:12px', 'white-space:nowrap',
    ].join(';');
    cancelBtn.textContent = '✕ Annuler';
    cancelBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SS_FR_ID);
      sessionStorage.removeItem(SS_FR_TITLE);
      banner.remove();
      document.body.style.marginTop = '';
    });
    banner.appendChild(cancelBtn);

    document.body.prepend(banner);
    document.body.style.marginTop = banner.offsetHeight + 'px';
  }

  // ── Détecter la navigation SPA Next.js (pas de rechargement de page) ─────
  let lastPath = location.pathname;

  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      renderBanner();
    }
  }, 300);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();

}
