#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const src      = fs.readFileSync(path.join(__dirname, 'psn-kr-prices.source.js'), 'utf8');
const krSrc    = fs.readFileSync(path.join(__dirname, 'kr-store.source.js'), 'utf8');

// ── Tampermonkey : header ─────────────────────────────────────────────────
const userscriptHeader = `// ==UserScript==
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
`;

// ── Remplacement searchKR pour Tampermonkey (appel direct PSN KR) ─────────
const tmSearchKR = `
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
`;

const wishlistSrc = src.replace(
  /\/\/ ── Module : searchKR ─+\n[\s\S]*?^  \}/m,
  '  // ── Module : searchKR (GM_xmlhttpRequest — direct, pas de proxy) ──────────────' + tmSearchKR
);

// ── Assemblage user.js : routeur par hostname ─────────────────────────────
const routedScript = `
if (location.hostname === 'library.playstation.com') {
  // ── Wishlist ──────────────────────────────────────────────────────────────
  ${wishlistSrc}
} else if (location.hostname === 'store.playstation.com') {
  // ── Store KR ──────────────────────────────────────────────────────────────
  ${krSrc}
}
`;

fs.writeFileSync(
  path.join(__dirname, 'psn-kr-prices.user.js'),
  userscriptHeader + '\n' + routedScript
);
console.log('✅ psn-kr-prices.user.js généré');

// ── Bookmarklet mobile : wishlist uniquement, minification basique ─────────
const minified = src
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\n\s*/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

const bookmarklet = 'javascript:' + encodeURIComponent(minified);
fs.writeFileSync(path.join(__dirname, 'psn-kr-prices.min.txt'), bookmarklet);
console.log('✅ psn-kr-prices.min.txt généré (' + bookmarklet.length + ' chars)');
