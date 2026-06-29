# PSN KR Prices Bookmarklet — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Injecter les prix du store PSN Corée directement dans la wishlist PSN officielle, sans backend, sans app séparée.

**Architecture:** Script JS autonome (IIFE) qui lit `window.__NEXT_DATA__` sur la page wishlist PSN, fetche les prix KR sur le même domaine (pas de CORS), injecte des badges visuels sous chaque jeu. Livré en deux variantes : Tampermonkey (desktop, auto) et bookmarklet URL (mobile Safari, manuel).

**Tech Stack:** JavaScript vanilla ES2022, fetch API, localStorage, Tampermonkey (desktop), bookmarklet `javascript:` URL (mobile)

## Global Constraints

- Aucun backend, aucune dépendance externe sauf `open.er-api.com` pour le taux de change
- Aucun faux positif silencieux : un prix affiché est toujours confirmé par suffix exact ou choix manuel
- Suffixes génériques exclus : `GAME000000000000`, `ASIA000000000000`, `ASIAPLACEHOLDER1`, `WELCOMPACK000000`, `EXTRALARGE000000`, `LARGE00000000000`, `BASE000000000000`, `SMALL00000000000`, `MEDIUM0000000000`, `DLCEXPANSION0001`, `DLCEXPANSION0002`
- Styles toujours en inline — ne pas dépendre du CSS PSN
- Ne jamais modifier ou supprimer des éléments PSN — uniquement ajouter
- localStorage key : `psn-kr-links`

---

## ⚠️ PHASE 0 — TERRAIN (obligatoire avant tout code)

Chaque exploration doit être exécutée par Paul dans DevTools Console sur la vraie page PSN. Les résultats informent Phase 1. Ne pas passer à Phase 1 avant que toutes les explorations soient validées.

---

### Task 0.1 : Explorer la structure `__NEXT_DATA__` sur la wishlist

**Page :** `https://store.playstation.com/fr-fr/wishlist` (connecté à ton compte PSN)

**Objectif :** Vérifier que les produits et prix sont dans `__NEXT_DATA__`, et identifier la structure exacte.

- [ ] **Étape 1 : Ouvrir la page wishlist PSN dans Chrome**

Aller sur `https://store.playstation.com/fr-fr/wishlist`. Attendre que tous les jeux soient chargés.

- [ ] **Étape 2 : Coller ce script dans la Console DevTools (F12 → Console)**

```js
(function exploreNextData() {
  if (!window.__NEXT_DATA__) { console.log('❌ __NEXT_DATA__ absent'); return; }
  
  const apollo = window.__NEXT_DATA__.props?.apolloState ?? {};
  const allKeys = Object.keys(apollo);
  
  console.log('✅ __NEXT_DATA__ trouvé');
  console.log('Types de clés Apollo:', [...new Set(allKeys.map(k => k.split(':')[0]))]);
  console.log('Nombre de clés Product:', allKeys.filter(k => k.startsWith('Product:')).length);
  
  // Afficher les 3 premiers produits
  const products = allKeys.filter(k => k.startsWith('Product:')).slice(0, 3);
  products.forEach(key => {
    const p = apollo[key];
    console.log('\n---', key);
    console.log('name:', p.name);
    console.log('id:', p.id);
    console.log('storeDisplayClassification:', p.storeDisplayClassification);
    console.log('price:', JSON.stringify(p.price));
    console.log('platforms:', p.platforms);
  });
  
  // Chercher d'autres types de clés liées à la wishlist
  const wishlistKeys = allKeys.filter(k => k.toLowerCase().includes('wish'));
  console.log('\nClés contenant "wish":', wishlistKeys);
})();
```

- [ ] **Étape 3 : Coller le résultat complet ici pour analyse**

**Résultat attendu (succès) :** Des clés `Product:EP...` ou `Product:HP...` avec `name`, `id`, `price.basePrice` renseignés.

**Si `__NEXT_DATA__` absent ou vide :** La wishlist charge en CSR après hydratation. On devra utiliser un MutationObserver + délai, ou intercepter les appels réseau XHR. → À analyser selon le résultat.

---

### Task 0.2 : Explorer le DOM des items wishlist

**Page :** `https://store.playstation.com/fr-fr/wishlist` (même session)

**Objectif :** Trouver les sélecteurs CSS exacts pour (a) chaque item wishlist, (b) le bloc prix de chaque item, (c) un identifiant unique par item (product ID).

- [ ] **Étape 1 : Coller ce script dans la Console**

```js
(function exploreDom() {
  // Tester les sélecteurs data-qa courants sur PSN
  const candidates = [
    '[data-qa="wishlist-item"]',
    '[data-qa="mfe-game-title__name"]',
    '[data-qa="price-display__price"]',
    '[data-qa="wishlist-item-container"]',
    '[data-telemetry-meta*="product"]',
    'li[class*="WishlistItem"]',
    'li[class*="wishlist"]',
    'div[class*="wishlist"]',
    '[data-product-id]',
  ];
  
  candidates.forEach(sel => {
    const els = document.querySelectorAll(sel);
    console.log(els.length > 0 ? '✅' : '❌', `${sel} → ${els.length} éléments`);
  });
  
  // Dump HTML du premier item de liste visible
  console.log('\n--- HTML du premier li ou article dans la page ---');
  const firstItem = document.querySelector('li') || document.querySelector('article');
  if (firstItem) console.log(firstItem.outerHTML.slice(0, 1000));
})();
```

- [ ] **Étape 2 : Inspecter manuellement un item**

Dans DevTools → Elements : clic droit sur le titre d'un jeu → "Inspecter". Remonter dans le DOM jusqu'à l'élément racine de l'item (celui qui contient cover + titre + prix). Noter :
- Le tag HTML (`li`, `article`, `div`)
- Les attributs `data-*` présents
- Le sélecteur CSS unique

- [ ] **Étape 3 : Inspecter le bloc prix**

Sur le même item, inspecter l'élément qui affiche le prix FR. Noter :
- Le sélecteur CSS exact du prix
- S'il y a un prix barré (promo) séparé

- [ ] **Étape 4 : Coller les résultats (console + observation manuelle) ici**

**Résultat attendu :** Au moins un sélecteur `data-qa` fonctionnel pour identifier les items et le bloc prix.

---

### Task 0.3 : Tester le fetch KR depuis le domaine PSN

**Page :** `https://store.playstation.com/fr-fr/wishlist` (même session)

**Objectif :** Confirmer que `fetch('https://store.playstation.com/ko-kr/search/...')` fonctionne depuis cette page (même domaine = pas de CORS) et que `__NEXT_DATA__` dans la réponse contient bien les produits KR.

- [ ] **Étape 1 : Remplacer `TITRE_JEU` par un vrai jeu de ta wishlist, coller dans Console**

```js
(async function testKrFetch() {
  const TITRE_JEU = 'Elden Ring'; // ← remplace par un jeu de ta wishlist
  
  console.log('Fetch KR pour:', TITRE_JEU);
  
  try {
    const res = await fetch(
      `https://store.playstation.com/ko-kr/search/${encodeURIComponent(TITRE_JEU)}`
    );
    console.log('Status HTTP:', res.status, res.ok ? '✅' : '❌');
    
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    
    if (!match) { console.log('❌ __NEXT_DATA__ absent dans la réponse KR'); return; }
    
    const data = JSON.parse(match[1]);
    const apollo = data.props?.apolloState ?? {};
    const products = Object.values(apollo)
      .filter(p => p.id && p.name && p.storeDisplayClassification)
      .map(p => ({
        id: p.id,
        suffix: p.id.split('-').pop(),
        name: p.name,
        classification: p.storeDisplayClassification,
        basePrice: p.price?.basePrice ?? null,
        discountedPrice: p.price?.discountedPrice ?? null,
      }));
    
    console.log('Produits KR trouvés:', products.length);
    console.log(JSON.stringify(products, null, 2));
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
})();
```

- [ ] **Étape 2 : Coller le résultat complet ici**

**Résultat attendu :** Status 200, liste de produits KR avec `id`, `suffix`, `name`, `basePrice`.

**Si erreur CORS :** Étonnant (même domaine), mais noter le message exact d'erreur.

**Si `__NEXT_DATA__` absent :** PSN KR utilise peut-être une stratégie de rendu différente. On devra chercher une alternative (appel API GraphQL PSN).

---

### Task 0.4 : Valider le suffix matching sur tes vrais jeux

**Page :** `https://store.playstation.com/fr-fr/wishlist`

**Objectif :** Pour 3 jeux de ta wishlist, vérifier que le suffix FR correspond bien à un produit KR via la recherche. C'est le cœur de la fiabilité du script.

- [ ] **Étape 1 : Récupérer les suffixes FR de ta wishlist**

```js
(function getSuffixes() {
  const apollo = window.__NEXT_DATA__?.props?.apolloState ?? {};
  const GENERIC = new Set(['GAME000000000000','ASIA000000000000','ASIAPLACEHOLDER1',
    'WELCOMPACK000000','EXTRALARGE000000','LARGE00000000000','BASE000000000000',
    'SMALL00000000000','MEDIUM0000000000','DLCEXPANSION0001','DLCEXPANSION0002']);
  
  const products = Object.values(apollo)
    .filter(p => p.id && p.name && ['FULL_GAME','GAME_BUNDLE','LEGACY_GAME'].includes(p.storeDisplayClassification))
    .map(p => ({ name: p.name, id: p.id, suffix: p.id.split('-').pop() }))
    .filter(p => !GENERIC.has(p.suffix));
  
  console.log('Jeux FR dans wishlist __NEXT_DATA__:', products.length);
  products.forEach(p => console.log(p.suffix, '—', p.name));
  
  // Exposer pour l'étape suivante
  window._frProducts = products;
})();
```

- [ ] **Étape 2 : Tester le matching pour les 3 premiers jeux**

```js
(async function testMatching() {
  const GENERIC = new Set(['GAME000000000000','ASIA000000000000','ASIAPLACEHOLDER1',
    'WELCOMPACK000000','EXTRALARGE000000','LARGE00000000000','BASE000000000000',
    'SMALL00000000000','MEDIUM0000000000','DLCEXPANSION0001','DLCEXPANSION0002']);
  
  const frGames = (window._frProducts || []).slice(0, 3);
  if (frGames.length === 0) { console.log('Lance d\'abord l\'étape 1'); return; }
  
  for (const game of frGames) {
    console.log('\n🔍 Test pour:', game.name, '(suffix FR:', game.suffix + ')');
    
    const res = await fetch(`https://store.playstation.com/ko-kr/search/${encodeURIComponent(game.name)}`);
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) { console.log('❌ Pas de __NEXT_DATA__ KR'); continue; }
    
    const apollo = JSON.parse(match[1]).props?.apolloState ?? {};
    const krProducts = Object.values(apollo)
      .filter(p => p.id && !GENERIC.has(p.id.split('-').pop()))
      .map(p => ({ id: p.id, suffix: p.id.split('-').pop(), name: p.name, price: p.price?.basePrice }));
    
    const exactMatch = krProducts.find(k => k.suffix === game.suffix);
    
    if (exactMatch) {
      console.log('✅ MATCH EXACT:', exactMatch.name, '—', exactMatch.price, '₩');
    } else {
      console.log('⚠️ Pas de match exact. Candidats KR trouvés:');
      krProducts.slice(0, 5).forEach(k => console.log('  ', k.suffix, '—', k.name, '—', k.price, '₩'));
    }
  }
})();
```

- [ ] **Étape 3 : Coller les résultats ici**

**Résultat attendu :** Au moins 2/3 jeux avec match exact. Les jeux sans match deviennent des cas de disambiguation.

---

### Task 0.5 : Tester l'API du taux de change

**Page :** n'importe quelle page `store.playstation.com`

- [ ] **Étape 1 : Coller dans Console**

```js
(async function testRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    const data = await res.json();
    console.log('Status API:', data.result);
    console.log('1 KRW =', data.rates.EUR, 'EUR');
    console.log('10 000 ₩ =', (10000 * data.rates.EUR).toFixed(2), '€');
    console.log('50 000 ₩ =', (50000 * data.rates.EUR).toFixed(2), '€');
  } catch (e) {
    console.error('❌ API indisponible:', e.message);
  }
})();
```

- [ ] **Étape 2 : Coller le résultat ici**

**Résultat attendu :** `result: "success"`, taux EUR autour de `0.000065` à `0.000070`.

**Si bloqué par PSN :** Utiliser `https://api.exchangerate-api.com/v4/latest/KRW` comme fallback.

---

## PHASE 1 — IMPLÉMENTATION

> ⚠️ Ne commencer Phase 1 qu'après validation complète de toutes les tâches 0.x.
> Les sélecteurs DOM (ITEM_SELECTOR, PRICE_SELECTOR) et la structure Apollo sont à remplir d'après les résultats de Phase 0.

---

### Task 1.1 : Scaffolding — structure des fichiers

**Files:**
- Create: `bookmarklet/psn-kr-prices.source.js`
- Create: `bookmarklet/build.js`

- [ ] **Étape 1 : Créer `bookmarklet/psn-kr-prices.source.js` avec le squelette IIFE**

```js
(async function psnKrPrices() {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────────
  const GENERIC_SUFFIXES = new Set([
    'GAME000000000000', 'ASIA000000000000', 'ASIAPLACEHOLDER1',
    'WELCOMPACK000000', 'EXTRALARGE000000', 'LARGE00000000000',
    'BASE000000000000', 'SMALL00000000000', 'MEDIUM0000000000',
    'DLCEXPANSION0001', 'DLCEXPANSION0002',
  ]);

  // ← À remplir d'après résultats Task 0.2
  const ITEM_SELECTOR = '[data-qa="wishlist-item"]';
  const PRICE_SELECTOR = '[data-qa="price-display__price"]';
  const PRODUCT_ID_ATTR = 'data-product-id'; // ou autre, selon 0.2

  const LS_KEY = 'psn-kr-links';

  // ── Modules (Tasks 1.2 → 1.7) ──────────────────────────────────────────
  // parseWishlist, searchKR, matchSuffix, getExchangeRate,
  // injectBadge, showDisambiguation, showManualLink, loadLinks, saveLink
  // seront ajoutés ici dans les tâches suivantes

  // ── Orchestration (Task 1.8) ───────────────────────────────────────────
  // main() sera ajoutée ici

  console.log('[PSN KR] Script chargé — wishlist:', document.location.pathname);
})();
```

- [ ] **Étape 2 : Créer `bookmarklet/build.js`**

```js
#!/usr/bin/env node
// Génère psn-kr-prices.user.js (Tampermonkey) et psn-kr-prices.min.txt (bookmarklet)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'psn-kr-prices.source.js'), 'utf8');

// Tampermonkey : ajouter le header @userscript
const userscriptHeader = `// ==UserScript==
// @name         PSN KR Prices
// @namespace    https://store.playstation.com
// @version      1.0
// @description  Affiche les prix du store PSN Corée sur ta wishlist
// @author       Paul Bindler
// @match        https://store.playstation.com/*/wishlist*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
`;
fs.writeFileSync(path.join(__dirname, 'psn-kr-prices.user.js'), userscriptHeader + '\n' + src);
console.log('✅ psn-kr-prices.user.js généré');

// Bookmarklet : minification basique + encodage URI
const minified = src
  .replace(/\/\/[^\n]*/g, '')     // supprimer commentaires //
  .replace(/\/\*[\s\S]*?\*\//g, '') // supprimer commentaires /* */
  .replace(/\s+/g, ' ')            // compresser espaces
  .trim();

const bookmarklet = 'javascript:' + encodeURIComponent(minified);
fs.writeFileSync(path.join(__dirname, 'psn-kr-prices.min.txt'), bookmarklet);
console.log('✅ psn-kr-prices.min.txt généré (', bookmarklet.length, 'chars)');
```

- [ ] **Étape 3 : Tester le build (doit générer les deux fichiers)**

```bash
cd "/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker"
node bookmarklet/build.js
ls -la bookmarklet/
```

Résultat attendu : `psn-kr-prices.user.js` et `psn-kr-prices.min.txt` créés.

- [ ] **Étape 4 : Commit**

```bash
git add bookmarklet/psn-kr-prices.source.js bookmarklet/build.js
git commit -m "feat: scaffolding bookmarklet PSN KR"
```

---

### Task 1.2 : Module `parseWishlist`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :** `parseWishlist() → Array<{ id, suffix, name, coverUrl, frBasePrice, frDiscountedPrice, itemEl }>`

- [ ] **Étape 1 : Ajouter `parseWishlist` dans le source (remplacer le commentaire placeholder)**

```js
function parseWishlist() {
  const apollo = window.__NEXT_DATA__?.props?.apolloState ?? {};
  
  return Object.values(apollo)
    .filter(p =>
      p.id &&
      p.name &&
      ['FULL_GAME', 'GAME_BUNDLE', 'LEGACY_GAME'].includes(p.storeDisplayClassification) &&
      !GENERIC_SUFFIXES.has(p.id.split('-').pop())
    )
    .map(p => ({
      id: p.id,
      suffix: p.id.split('-').pop(),
      name: p.name,
      coverUrl: (p.media ?? []).find(m => m.role === 'MASTER')?.url ?? null,
      frBasePrice: p.price?.basePrice ?? null,
      frDiscountedPrice: p.price?.discountedPrice ?? null,
      frPriceValue: parseFloat((p.price?.discountedPrice ?? p.price?.basePrice ?? '0').replace(/[^0-9,]/g, '').replace(',', '.')),
    }));
}
```

- [ ] **Étape 2 : Test terrain — coller dans Console sur la page wishlist PSN**

```js
// Test parseWishlist (coller après avoir rechargé la page avec le nouveau source.js actif)
// Pour tester sans Tampermonkey, coller tout le source.js + appeler parseWishlist() manuellement
const games = parseWishlist();
console.log('Jeux parsés:', games.length);
games.forEach(g => console.log(g.suffix, '—', g.name, '—', g.frBasePrice));
```

Résultat attendu : liste de tes jeux avec suffix, nom, prix FR.

- [ ] **Étape 3 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: module parseWishlist"
```

---

### Task 1.3 : Module `searchKR` + `matchSuffix`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :**
- `searchKR(title) → Promise<Array<{ id, suffix, name, krBasePrice, krDiscountedPrice, krPriceValue }>>`
- `matchSuffix(frSuffix, krProducts) → { match: object|null, candidates: object[] }`

- [ ] **Étape 1 : Ajouter `searchKR` dans le source**

```js
async function searchKR(title) {
  try {
    const res = await fetch(
      `https://store.playstation.com/ko-kr/search/${encodeURIComponent(title)}`,
      { headers: { 'Accept-Language': 'ko-KR' } }
    );
    if (!res.ok) return [];

    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return [];

    const apollo = JSON.parse(m[1]).props?.apolloState ?? {};

    return Object.values(apollo)
      .filter(p =>
        p.id &&
        p.name &&
        ['FULL_GAME', 'GAME_BUNDLE', 'LEGACY_GAME'].includes(p.storeDisplayClassification) &&
        !GENERIC_SUFFIXES.has(p.id.split('-').pop())
      )
      .map(p => ({
        id: p.id,
        suffix: p.id.split('-').pop(),
        name: p.name,
        coverUrl: (p.media ?? []).find(m => m.role === 'MASTER')?.url ?? null,
        krBasePrice: p.price?.basePrice ?? null,
        krDiscountedPrice: p.price?.discountedPrice ?? null,
        krPriceValue: parseFloat(
          (p.price?.discountedPrice ?? p.price?.basePrice ?? '0')
            .replace(/[^0-9]/g, '')
        ),
      }));
  } catch {
    return [];
  }
}
```

- [ ] **Étape 2 : Ajouter `matchSuffix` dans le source**

```js
function matchSuffix(frSuffix, krProducts) {
  const match = krProducts.find(k => k.suffix === frSuffix) ?? null;
  // Candidats = tous les produits KR si pas de match exact (pour disambiguation)
  const candidates = match ? [] : krProducts;
  return { match, candidates };
}
```

- [ ] **Étape 3 : Test terrain — coller dans Console sur wishlist PSN**

```js
// Tester searchKR + matchSuffix sur un jeu réel
// Remplace les valeurs par celles trouvées en Task 0.4
(async () => {
  const FR_SUFFIX = 'XXXXXXXXXXXXXXXX'; // ← suffix d'un jeu de ta wishlist
  const TITLE = 'Elden Ring';           // ← titre correspondant
  
  console.log('Recherche KR pour:', TITLE);
  const krProducts = await searchKR(TITLE);
  console.log('Produits KR:', krProducts.length);
  
  const { match, candidates } = matchSuffix(FR_SUFFIX, krProducts);
  
  if (match) {
    console.log('✅ Match exact:', match.name, '—', match.krBasePrice);
  } else {
    console.log('⚠️ Pas de match. Candidats:', candidates.length);
    candidates.slice(0, 3).forEach(c => console.log(' ', c.suffix, c.name, c.krBasePrice));
  }
})();
```

Résultat attendu : match exact pour les jeux validés en Task 0.4.

- [ ] **Étape 4 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: modules searchKR + matchSuffix"
```

---

### Task 1.4 : Module `getExchangeRate` + `localStorage`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :**
- `getExchangeRate() → Promise<number>` (1 KRW en EUR)
- `loadLinks() → Record<string, string|null>`
- `saveLink(frId: string, krId: string|null) → void`

- [ ] **Étape 1 : Ajouter les trois fonctions dans le source**

```js
async function getExchangeRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API KO');
    return data.rates.EUR;
  } catch {
    // Fallback API
    try {
      const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/KRW');
      const data2 = await res2.json();
      return data2.rates.EUR;
    } catch {
      return null; // Affichera le prix en ₩ brut
    }
  }
}

function loadLinks() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveLink(frId, krId) {
  const links = loadLinks();
  links[frId] = krId; // null = "aucun de ces jeux" mémorisé
  localStorage.setItem(LS_KEY, JSON.stringify(links));
}
```

- [ ] **Étape 2 : Test terrain — Console sur wishlist PSN**

```js
// Test taux + localStorage
(async () => {
  const rate = await getExchangeRate();
  console.log('Taux:', rate, '— 10 000 ₩ =', (10000 * rate).toFixed(2), '€');
  
  saveLink('TEST-FR-ID', 'TEST-KR-ID');
  console.log('Links sauvegardés:', loadLinks());
  saveLink('TEST-FR-ID', null); // mémoriser "aucun"
  console.log('Links après null:', loadLinks());
})();
```

Résultat attendu : taux correct, localStorage persisté entre rechargements.

- [ ] **Étape 3 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: modules getExchangeRate + localStorage"
```

---

### Task 1.5 : Module `injectBadge`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :** `injectBadge(itemEl, state, data) → HTMLElement` — injecte un badge KR dans un item wishlist

> ⚠️ Les sélecteurs `ITEM_SELECTOR` et `PRICE_SELECTOR` doivent être confirmés par Task 0.2 avant d'écrire cette tâche.

- [ ] **Étape 1 : Ajouter `formatPrice` et `injectBadge`**

```js
function formatPrice(krw, rate) {
  if (!rate) return `${krw.toLocaleString('fr-FR')} ₩`;
  return (krw * rate).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function injectBadge(itemEl, state, data) {
  // Supprimer badge existant si re-run
  itemEl.querySelector('.psn-kr-badge')?.remove();

  const badge = document.createElement('div');
  badge.className = 'psn-kr-badge';
  badge.style.cssText = 'font-size:12px;margin-top:4px;font-family:inherit;line-height:1.4;';

  if (state === 'loading') {
    badge.innerHTML = '<span style="color:#888">🇰🇷 …</span>';
  } else if (state === 'not_found') {
    badge.innerHTML = '<span style="color:#aaa">🇰🇷 —</span>';
  } else if (state === 'found') {
    const { krPriceValue, krDiscountedPrice, krBasePrice, frPriceValue, rate } = data;
    const displayPrice = krDiscountedPrice
      ? `<span style="text-decoration:line-through;color:#aaa">${formatPrice(parseFloat(krBasePrice.replace(/[^0-9]/g,'')), rate)}</span> ${formatPrice(parseFloat(krDiscountedPrice.replace(/[^0-9]/g,'')), rate)}`
      : formatPrice(krPriceValue, rate);

    const saving = frPriceValue > 0 ? Math.round((1 - (krPriceValue * rate) / frPriceValue) * 100) : 0;
    const color = saving >= 5 ? '#1db954' : '#888';

    badge.innerHTML = `<span style="color:${color}">🇰🇷 ${displayPrice}${saving >= 5 ? ` <strong>−${saving}%</strong>` : ''}</span>`;
  } else if (state === 'ambiguous') {
    badge.innerHTML = '<span style="color:#888">🇰🇷 ? </span><button class="psn-kr-identify" style="font-size:11px;padding:2px 8px;border:1px solid #0070d1;background:none;color:#0070d1;border-radius:4px;cursor:pointer;">Identifier →</button>';
  }

  // Injecter après le bloc prix
  // ← sélecteur PRICE_SELECTOR à confirmer avec Task 0.2
  const priceEl = itemEl.querySelector(PRICE_SELECTOR);
  if (priceEl) {
    priceEl.after(badge);
  } else {
    itemEl.appendChild(badge);
  }

  return badge;
}
```

- [ ] **Étape 2 : Test terrain — Console (remplacer `ITEM_SELECTOR` par le vrai sélecteur)**

```js
// Test visuel : injecter un badge de chaque type sur les 4 premiers items
const items = document.querySelectorAll(ITEM_SELECTOR);
console.log('Items trouvés:', items.length);

if (items[0]) injectBadge(items[0], 'loading', {});
if (items[1]) injectBadge(items[1], 'not_found', {});
if (items[2]) injectBadge(items[2], 'found', {
  krPriceValue: 29900, krBasePrice: '29900', krDiscountedPrice: null,
  frPriceValue: 59.99, rate: 0.000066
});
if (items[3]) injectBadge(items[3], 'ambiguous', {});

console.log('Badges injectés — vérifie visuellement dans la page');
```

Résultat attendu : 4 badges visibles dans la wishlist sans casser la mise en page PSN.

- [ ] **Étape 3 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: module injectBadge"
```

---

### Task 1.6 : Module `showDisambiguation`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :** `showDisambiguation(itemEl, candidates, frId, onChoice)` — panneau inline de sélection

- [ ] **Étape 1 : Ajouter `showDisambiguation`**

```js
function showDisambiguation(itemEl, candidates, frId, onChoice) {
  const existing = itemEl.querySelector('.psn-kr-disambig');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.className = 'psn-kr-disambig';
  panel.style.cssText = 'margin-top:8px;padding:8px;background:#f5f5f5;border-radius:6px;font-family:inherit;font-size:12px;';

  const title = document.createElement('div');
  title.textContent = 'Plusieurs versions KR trouvées :';
  title.style.cssText = 'font-weight:600;margin-bottom:6px;color:#333;';
  panel.appendChild(title);

  candidates.slice(0, 4).forEach(candidate => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;border-radius:4px;';
    row.innerHTML = `
      ${candidate.coverUrl ? `<img src="${candidate.coverUrl}" style="width:32px;height:32px;object-fit:cover;border-radius:3px;">` : ''}
      <span style="flex:1;color:#333;">${candidate.name}</span>
      <span style="color:#888;">${candidate.krBasePrice ?? '?'}</span>
    `;
    row.addEventListener('click', () => {
      saveLink(frId, candidate.id);
      panel.remove();
      onChoice(candidate);
    });
    panel.appendChild(row);
  });

  const noneRow = document.createElement('div');
  noneRow.textContent = 'Aucun de ces jeux';
  noneRow.style.cssText = 'color:#0070d1;cursor:pointer;padding:4px 0;margin-top:4px;font-size:11px;';
  noneRow.addEventListener('click', () => {
    panel.remove();
    showManualLink(itemEl, candidates[0]?.name ?? '', frId, onChoice);
  });
  panel.appendChild(noneRow);

  itemEl.querySelector('.psn-kr-badge')?.after(panel);
}
```

- [ ] **Étape 2 : Test terrain — Console**

```js
// Test showDisambiguation sur le 4ème item (celui en état 'ambiguous')
const items = document.querySelectorAll(ITEM_SELECTOR);
const fakeGame = (window._frProducts || [])[0];
const fakeCandidates = [
  { id: 'HP0001-TEST1', suffix: 'TEST1', name: 'Elden Ring PS5', krBasePrice: '59 900 ₩', coverUrl: null },
  { id: 'HP0001-TEST2', suffix: 'TEST2', name: 'Elden Ring PS4', krBasePrice: '49 900 ₩', coverUrl: null },
];

if (items[3]) {
  showDisambiguation(items[3], fakeCandidates, 'FR-TEST-ID', (chosen) => {
    console.log('Choix effectué:', chosen);
    injectBadge(items[3], 'found', { krPriceValue: 59900, krBasePrice: '59900', krDiscountedPrice: null, frPriceValue: 79.99, rate: 0.000066 });
  });
}
```

Résultat attendu : panneau visible sur l'item, clic sur un choix le referme et affiche le prix.

- [ ] **Étape 3 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: module showDisambiguation"
```

---

### Task 1.7 : Module `showManualLink`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :** `showManualLink(itemEl, title, frId, onLinked)` — champ de saisie URL KR + ouverture store KR

- [ ] **Étape 1 : Ajouter `showManualLink`**

```js
function showManualLink(itemEl, title, frId, onLinked) {
  const panel = document.createElement('div');
  panel.className = 'psn-kr-manual';
  panel.style.cssText = 'margin-top:8px;padding:8px;background:#fff3cd;border-radius:6px;font-family:inherit;font-size:12px;';

  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px;color:#333;">Coller l'URL du jeu KR :</div>
    <div style="display:flex;gap:6px;align-items:center;">
      <input class="psn-kr-url-input" type="text" placeholder="https://store.playstation.com/ko-kr/product/..." 
        style="flex:1;padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
      <button class="psn-kr-link-btn" style="padding:4px 10px;background:#0070d1;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Lier</button>
    </div>
    <div class="psn-kr-manual-error" style="color:#c0392b;font-size:11px;margin-top:4px;display:none;"></div>
  `;

  // Ouvrir le store KR avec la recherche pré-remplie
  window.open(`https://store.playstation.com/ko-kr/search/${encodeURIComponent(title)}`, '_blank');

  panel.querySelector('.psn-kr-link-btn').addEventListener('click', async () => {
    const url = panel.querySelector('.psn-kr-url-input').value.trim();
    const errorEl = panel.querySelector('.psn-kr-manual-error');

    // Extraire l'ID produit depuis l'URL PSN
    const idMatch = url.match(/\/product\/([A-Z0-9_\-]+)/i);
    if (!idMatch) {
      errorEl.textContent = 'URL invalide — doit contenir /product/...';
      errorEl.style.display = 'block';
      return;
    }

    const krId = idMatch[1];
    errorEl.style.display = 'none';

    // Chercher le prix de ce produit KR spécifique via search (product pages ne marchent plus)
    const krProducts = await searchKR(title);
    const found = krProducts.find(p => p.id === krId || p.suffix === krId.split('-').pop());

    if (!found) {
      errorEl.textContent = 'Produit KR non trouvé dans les résultats de recherche.';
      errorEl.style.display = 'block';
      return;
    }

    saveLink(frId, found.id);
    panel.remove();
    onLinked(found);
  });

  itemEl.querySelector('.psn-kr-badge')?.after(panel);
}
```

- [ ] **Étape 2 : Test terrain — Console**

```js
// Test showManualLink
const items = document.querySelectorAll(ITEM_SELECTOR);
if (items[0]) {
  showManualLink(items[0], 'Elden Ring', 'FR-TEST-ID', (linked) => {
    console.log('Jeu lié:', linked);
  });
}
// → doit ouvrir un onglet KR + afficher le champ de saisie
```

- [ ] **Étape 3 : Rebuild et commit**

```bash
node bookmarklet/build.js
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: module showManualLink"
```

---

### Task 1.8 : Orchestration principale `main()`

**Files:** Modify `bookmarklet/psn-kr-prices.source.js`

**Produit :** Fonction `main()` qui orchestre tout — lecture wishlist, fetches KR parallèles, injection badges

- [ ] **Étape 1 : Ajouter `main()` et l'appel final**

```js
async function main() {
  // Éviter les doubles exécutions
  if (document.querySelector('.psn-kr-badge')) {
    document.querySelectorAll('.psn-kr-badge, .psn-kr-disambig, .psn-kr-manual').forEach(el => el.remove());
  }

  const games = parseWishlist();
  if (games.length === 0) {
    console.warn('[PSN KR] Aucun jeu trouvé dans __NEXT_DATA__. La page est-elle chargée ?');
    return;
  }

  const items = document.querySelectorAll(ITEM_SELECTOR);
  console.log(`[PSN KR] ${games.length} jeux dans __NEXT_DATA__, ${items.length} items DOM`);

  // Pré-charger le taux de change et les liens mémorisés
  const [rate, links] = await Promise.all([getExchangeRate(), Promise.resolve(loadLinks())]);

  // Injecter "chargement" sur tous les items immédiatement
  items.forEach(el => injectBadge(el, 'loading', {}));

  // Matcher chaque jeu avec le DOM (par index ou par product-id selon Task 0.2)
  // ← Si PSN expose l'ID sur chaque item via data-product-id, utiliser :
  //   const itemEl = document.querySelector(`[${PRODUCT_ID_ATTR}="${game.id}"]`);
  // Sinon utiliser l'index (moins robuste) :
  //   const itemEl = items[i];
  
  await Promise.all(games.map(async (game, i) => {
    const itemEl = items[i]; // ← ajuster selon résultats Task 0.2
    if (!itemEl) return;

    // Vérifier le cache localStorage
    if (game.id in links) {
      const cachedKrId = links[game.id];
      if (cachedKrId === null) {
        injectBadge(itemEl, 'not_found', {});
        return;
      }
      // Chercher le produit KR mémorisé
      const krProducts = await searchKR(game.name);
      const cached = krProducts.find(p => p.id === cachedKrId);
      if (cached) {
        injectBadge(itemEl, 'found', { ...cached, frPriceValue: game.frPriceValue, rate });
        return;
      }
    }

    // Recherche KR + matching suffix
    const krProducts = await searchKR(game.name);
    const { match, candidates } = matchSuffix(game.suffix, krProducts);

    if (match) {
      injectBadge(itemEl, 'found', { ...match, frPriceValue: game.frPriceValue, rate });
    } else if (candidates.length === 0) {
      injectBadge(itemEl, 'not_found', {});
    } else {
      injectBadge(itemEl, 'ambiguous', {});
      itemEl.querySelector('.psn-kr-identify')?.addEventListener('click', () => {
        showDisambiguation(itemEl, candidates, game.id, (chosen) => {
          injectBadge(itemEl, 'found', { ...chosen, frPriceValue: game.frPriceValue, rate });
        });
      });
    }
  }));

  console.log('[PSN KR] Terminé');
}

// Appel principal (remplace le console.log placeholder du Task 1.1)
main();
```

- [ ] **Étape 2 : Rebuild**

```bash
node bookmarklet/build.js
```

- [ ] **Étape 3 : Test terrain complet — coller `psn-kr-prices.source.js` entier dans la Console**

Ouvrir la wishlist PSN → F12 → Console → coller tout le contenu de `source.js` → Entrée.

Vérifier :
- Log `[PSN KR] X jeux dans __NEXT_DATA__, Y items DOM`
- Badges "chargement" apparaissent immédiatement
- Badges définitifs s'affichent après quelques secondes
- Prix corrects sur les jeux matchés en Task 0.4
- Aucun faux positif

- [ ] **Étape 4 : Commit**

```bash
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt
git commit -m "feat: orchestration main() — script complet fonctionnel"
```

---

### Task 1.9 : Tampermonkey — MutationObserver pour SPA

**Files:** Modify `bookmarklet/build.js` pour wrapper Tampermonkey, puis rebuild

**Objectif :** Le script doit se ré-exécuter si PSN navigue vers la wishlist sans rechargement de page (SPA).

- [ ] **Étape 1 : Ajouter un wrapper SPA dans `psn-kr-prices.source.js` après `main()`**

```js
// Wrapper SPA : ré-exécuter main() si l'URL change vers /wishlist
// (actif uniquement dans Tampermonkey via la variable globale __TM__)
if (typeof __TM__ !== 'undefined') {
  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (location.pathname.includes('/wishlist')) {
        setTimeout(main, 1500); // délai pour laisser React hydrater
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
```

- [ ] **Étape 2 : Modifier `build.js` pour définir `__TM__` dans le user.js**

Ajouter `const __TM__ = true;` en tête du fichier Tampermonkey généré (juste après le header `==UserScript==`) :

```js
// Dans build.js, modifier la ligne qui écrit psn-kr-prices.user.js :
fs.writeFileSync(
  path.join(__dirname, 'psn-kr-prices.user.js'),
  userscriptHeader + '\nconst __TM__ = true;\n' + src
);
```

- [ ] **Étape 3 : Rebuild**

```bash
node bookmarklet/build.js
```

- [ ] **Étape 4 : Test Tampermonkey**

1. Ouvrir Tampermonkey → "Créer un nouveau script"
2. Coller le contenu de `psn-kr-prices.user.js`
3. Sauvegarder
4. Aller sur `store.playstation.com/fr-fr/wishlist`
5. Vérifier que les badges apparaissent automatiquement
6. Naviguer hors de la wishlist puis y revenir → vérifier la ré-injection

- [ ] **Étape 5 : Commit**

```bash
git add bookmarklet/psn-kr-prices.source.js bookmarklet/psn-kr-prices.user.js bookmarklet/psn-kr-prices.min.txt bookmarklet/build.js
git commit -m "feat: MutationObserver SPA + Tampermonkey wrapper"
```

---

### Task 1.10 : Test bookmarklet mobile Safari

**Objectif :** Valider que le bookmarklet fonctionne sur iPhone dans Safari.

- [ ] **Étape 1 : Copier le contenu de `psn-kr-prices.min.txt`**

```bash
cat "/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker/bookmarklet/psn-kr-prices.min.txt" | pbcopy
```

- [ ] **Étape 2 : Créer le favori sur iPhone**

1. Sur iPhone Safari, ouvrir n'importe quelle page
2. Appuyer sur l'icône Partage → "Ajouter aux signets" → nommer "PSN KR Prices" → Enregistrer
3. Aller dans Signets → trouver "PSN KR Prices" → Modifier → effacer l'URL et coller le contenu `javascript:...`
4. Enregistrer

- [ ] **Étape 3 : Test sur iPhone**

1. Ouvrir Safari → `store.playstation.com/fr-fr/wishlist` (connecté PSN)
2. Attendre que la wishlist soit chargée
3. Taper le favori "PSN KR Prices" dans la barre de signets
4. Vérifier les badges KR

- [ ] **Étape 4 : Commit final**

```bash
git add .
git commit -m "feat: bookmarklet PSN KR prices — complet desktop + mobile"
git push
```
