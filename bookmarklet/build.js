#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'psn-kr-prices.source.js'), 'utf8');

// ── Tampermonkey : header + remplacement searchKR par GM_xmlhttpRequest ────
const userscriptHeader = `// ==UserScript==
// @name         PSN KR Prices
// @namespace    https://library.playstation.com
// @version      1.0
// @description  Affiche les prix du store PSN Corée sur ta wishlist
// @author       Paul Bindler
// @match        https://library.playstation.com/wishlist*
// @match        https://library.playstation.com/*/wishlist*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      store.playstation.com
// @connect      open.er-api.com
// @connect      api.exchangerate-api.com
// ==/UserScript==
`;

// Pour Tampermonkey : remplacer searchKR (proxy Vercel) par appel direct KR via GM_xmlhttpRequest
const tmSearchKR = `
  async function searchKR(title) {
    return new Promise(resolve => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://store.playstation.com/ko-kr/search/' + encodeURIComponent(title),
        headers: { 'Accept-Language': 'ko-KR' },
        onload(res) {
          try {
            const m = res.responseText.match(/<script id="__NEXT_DATA__" type=\\"application\\\\/json\\">([\\\s\\\S]*?)<\\\\/script>/);
            if (!m) { resolve([]); return; }
            const apollo = JSON.parse(m[1]).props?.apolloState ?? {};
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
              })));
          } catch { resolve([]); }
        },
        onerror() { resolve([]); }
      });
    });
  }
`;

// Remplacer la fonction searchKR dans le source
const tmSrc = src.replace(
  /\/\/ ── Module : searchKR ─+\n[\s\S]*?^  \}/m,
  '  // ── Module : searchKR (GM_xmlhttpRequest — direct, pas de proxy) ──────────────' + tmSearchKR
);

fs.writeFileSync(
  path.join(__dirname, 'psn-kr-prices.user.js'),
  userscriptHeader + '\n' + tmSrc
);
console.log('✅ psn-kr-prices.user.js généré');

// ── Bookmarklet mobile : minification basique ──────────────────────────────
const minified = src
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\n\s*/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

const bookmarklet = 'javascript:' + encodeURIComponent(minified);
fs.writeFileSync(path.join(__dirname, 'psn-kr-prices.min.txt'), bookmarklet);
console.log('✅ psn-kr-prices.min.txt généré (' + bookmarklet.length + ' chars)');
