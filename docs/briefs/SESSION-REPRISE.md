# Brief de reprise — PSN Tracker

> Colle ce fichier en début de nouvelle session Claude Code. Il contient tout le contexte nécessaire pour reprendre sans repartir de zéro.

---

## 🔴 PIVOT MAJEUR — Session du 2026-06-29

**L'app PSN Tracker n'est plus le focus principal.** On a décidé de pivoter vers un **bookmarklet/Tampermonkey** qui injecte les prix KR directement dans la vraie wishlist PSN officielle (`library.playstation.com/wishlist`).

### Pourquoi ce pivot
- PSN fait déjà nativement : wishlist persistante, notifications promo, indicateurs PS+
- La seule valeur unique de notre app = le prix KR
- Autant injecter ce prix dans la vraie wishlist PSN plutôt que reconstruire une app clone

### L'app existante
- **Toujours déployée et fonctionnelle** sur `https://psn-tracker-chi.vercel.app`
- **Ne pas la toucher** — elle reste en veille, rien n'a été supprimé
- Si le bookmarklet ne convient pas à Paul, on revient à l'app avec le matching corrigé

---

## ⚠️ IMPORTANT — Base de données

**Ce projet utilise Neon Postgres, PAS Supabase.**
- Client : `@neondatabase/serverless` → `lib/db.ts` → `getSql()`
- `lib/supabase.ts` existe mais n'est pas utilisé (code mort)
- Migrations SQL dans la console Neon (neon.tech → SQL Editor)
- Connection string : variable d'environnement `DATABASE_URL`

---

## Contexte projet

App web de suivi de prix PSN (PlayStation Store) — usage personnel Paul Bindler.
- **URL prod app** : `https://psn-tracker-chi.vercel.app`
- **Stack app** : Next.js 14 App Router, TypeScript, Tailwind, Neon Postgres, Vercel
- **Repo** : `/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker`
- **Principe** : comparer prix FR et KR des jeux PS5/PS4. KR souvent 30-60% moins cher.

---

## 🆕 BOOKMARKLET — État au 2026-06-29

### Ce qu'on a construit

**Fichiers créés :**
```
bookmarklet/
  psn-kr-prices.source.js    — code source complet (IIFE, tout-en-un)
  psn-kr-prices.user.js      — variante Tampermonkey (GM_xmlhttpRequest, auto-run)
  psn-kr-prices.min.txt      — URL javascript: minifiée pour bookmarklet mobile Safari
  build.js                   — script Node.js pour regénérer user.js + min.txt depuis source.js

app/api/kr-search/route.ts   — proxy Vercel avec CORS headers (Access-Control-Allow-Origin: *)
```

**Specs et plan :**
```
docs/superpowers/specs/2026-06-29-psn-kr-bookmarklet-design.md
docs/superpowers/plans/2026-06-29-psn-kr-bookmarklet.md
```

### Comment le bookmarklet fonctionne

1. S'exécute sur `library.playstation.com/wishlist` (vraie wishlist PSN de Paul)
2. Lit `window.__NEXT_DATA__.props.apolloState` → extrait les Product FR (id, name, price)
3. Pour chaque jeu, appelle `https://psn-tracker-chi.vercel.app/api/kr-search?title=...` (proxy CORS)
4. Le proxy fetche le store KR et retourne les produits KR en JSON
5. Match par suffix d'ID produit (zéro faux positif)
6. Injecte un badge KR sous le prix de chaque item wishlist

### Résultats Phase 0 (validés)

| Test | Résultat |
|---|---|
| `__NEXT_DATA__` wishlist | ✅ 61 produits avec prix. `storeDisplayClassification` absent → filtrer par `platforms` |
| Sélecteurs DOM | ✅ Items : `li[data-qa^="wishlist-list-item"]` / Prix : `[data-qa$="#price#display-price"]` / Product ID : `data-telemetry-meta` JSON |
| CORS direct PSN KR depuis library.playstation.com | ❌ Bloqué (origins différentes) → solution : proxy Vercel avec CORS headers |
| Proxy Vercel `/api/kr-search` | ✅ Déployé en prod, répond correctement, CORS ok |
| Suffix matching | ✅ Demon's Souls : match exact `DEMONSSOULS00000` → 79 800 ₩ |
| Faux positif Mafia | ✅ Pas de match exact (suffix SIEE vs SIEA) → disambiguation panel (pas de faux positif) |
| Taux de change `open.er-api.com` | ✅ 1 KRW = 0.000571 EUR, CORS ouvert depuis library.playstation.com |

### Ce qui reste à faire (prochaine session)

**Étape immédiate — test complet sur la vraie wishlist :**

1. Aller sur `library.playstation.com/wishlist` dans Chrome
2. F12 → Console → coller le contenu de `bookmarklet/psn-kr-prices.source.js`
3. Vérifier :
   - Log `[PSN KR] 60 jeux, 62 items DOM`
   - Badges KR apparaissent sous les prix FR
   - Prix corrects (pas de faux positifs)
   - Cas Mafia → badge "🇰🇷 ? [Identifier →]"
   - Cas Demon's Souls → badge "🇰🇷 XX,XX € −XX%"
4. Si tout est bon → installer Tampermonkey (`psn-kr-prices.user.js`)
5. Si des bugs → déboguer un par un

**Commande pour copier le script dans le presse-papiers :**
```bash
cat "/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker/bookmarklet/psn-kr-prices.source.js" | pbcopy
```

**Après validation desktop :**
- Installer dans Tampermonkey Chrome → auto-run sur la wishlist
- Créer le bookmarklet Safari iOS (contenu de `bookmarklet/psn-kr-prices.min.txt`)
- Instructions dans le plan : `docs/superpowers/plans/2026-06-29-psn-kr-bookmarklet.md` Task 1.10

### Points techniques importants

**Proxy Vercel :**
- URL : `https://psn-tracker-chi.vercel.app/api/kr-search?title=...`
- Retourne : `{ products: [{ id, suffix, name, coverUrl, basePrice, discountedPrice, ... }] }`
- Headers CORS : `Access-Control-Allow-Origin: *`

**Tampermonkey vs Bookmarklet :**
- Tampermonkey utilise `GM_xmlhttpRequest` (bypass CORS natif) → fetch direct PSN KR, sans proxy
- Bookmarklet utilise le proxy Vercel (nécessaire depuis library.playstation.com)
- Les deux sont générés par `node bookmarklet/build.js`

**Matching suffix :**
- Certains jeux ont un suffix région-spécifique (ex: `SIEE` EU vs `SIEA` Asia) → pas de match exact → disambiguation panel
- Suffixes génériques exclus (voir `GENERIC_SUFFIXES` dans le source)
- Liens manuels sauvegardés en `localStorage` clé `psn-kr-links`

---

## Architecture technique app existante (inchangée)

### PSN Scraping (`lib/psn-scraper.ts`)
- `searchPSN(region, title)` → fetch search page → parse `__NEXT_DATA__`
- **IMPORTANT** : pages produit PSN (`/product/ID`) ne contiennent plus l'Apollo state depuis juin 2026. Seules les pages de recherche (`/search/QUERY`) fonctionnent.

### Matching FR ↔ KR (`lib/game-matcher.ts`)
- `matchProducts(fr, kr)` : suffix exact puis fallback titre
- `matchBySuffix(fr, krProducts)` : suffix-only, zéro faux positif

### API routes clés (app existante)
- `/api/search?title=` → FR + KR en parallèle
- `/api/prices?fr_id=&title=` → fetch complet avec matching
- `/api/kr-search?title=` → **NOUVEAU** proxy KR avec CORS (pour bookmarklet)
- `/api/exchange` → taux EUR/KRW
- `/api/games?slug=` → CRUD liste de souhaits app

### Schéma DB (Neon)
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  fr_product_id TEXT,
  kr_product_id TEXT,
  notify BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Règles importantes

1. **Toujours répondre en français**, même pendant le debug technique
2. **L'app existante reste intacte** — ne rien supprimer, ne rien casser
3. **Pas de fond sombre ni violet** dans le design
4. **Exécuter de façon autonome** — pas de demande de validation entre les tâches
5. **Commit + push après chaque bloc** (Vercel déploie automatiquement)
6. **DB = Neon** — ne jamais utiliser `lib/supabase.ts`
7. **Test terrain avant code** — valider chaque hypothèse dans la console PSN avant d'implémenter
