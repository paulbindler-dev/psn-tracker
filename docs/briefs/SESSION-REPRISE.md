# Brief de reprise — PSN Tracker

> À coller en début de nouvelle session Claude Code pour reprendre exactement où on en est.

---

## Contexte projet

App web de suivi de prix PSN (PlayStation Store) pour Paul Bindler, notaire.
- **URL prod** : `https://psn-tracker-chi.vercel.app`
- **Stack** : Next.js 14 App Router, TypeScript strict, Tailwind, Neon Postgres (`@neondatabase/serverless`), Vercel
- **Icônes** : `@phosphor-icons/react` v2.1.10 (requis dans `transpilePackages` dans `next.config.mjs`)
- **Repo** : `/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker`

**Principe** : chaque utilisateur a un slug unique (URL secrète). L'app compare les prix FR et KR (Corée du Sud) de jeux PS5/PS4 pour identifier les économies possibles.

---

## Architecture technique clé

### PSN Scraping (`lib/psn-scraper.ts`)
PSN store est en Next.js SSR — les pages embarquent les données produit dans `__NEXT_DATA__` (Apollo state).
- `searchPSN(region, title)` → fetch `https://store.playstation.com/{region}/search/{title}` → parse `__NEXT_DATA__`
- `parseNextDataHtml(html)` → extrait tous les `Product:*` de l'Apollo state
- `fetchPSNUrl(url, region)` → fetch n'importe quelle URL PSN + parse (ajouté récemment)
- **IMPORTANT** : les pages produit PSN (`/product/ID`) ne contiennent plus l'Apollo state depuis juin 2026. Seules les pages de recherche (`/search/QUERY`) fonctionnent.

### Matching FR ↔ KR (`lib/game-matcher.ts`)
- `matchProducts(frProducts, krProducts)` : 1) suffix exact, 2) fallback titre (≥6 chars prefix ou ≥8 chars substring)
- `matchBySuffix(fr, krProducts)` : suffix-only, zéro faux positif — utilisé dans les résultats de recherche

### API routes clés
- `/api/search?title=` → cherche FR + KR en parallèle, retourne `{ games, addons, demos, krGames }`
- `/api/prices?fr_id=&title=` → fetch complet FR+KR avec matching, retourne `PriceResult`
- `/api/demos` → tente pages catégorie PSN, fallback multi-search (voir bug ci-dessous)
- `/api/exchange` → taux EUR/KRW
- `/api/games?slug=` → CRUD liste de souhaits

### Routing
- `app/[slug]/page.tsx` → liste de souhaits (`GameList` + `GameCard`)
- `app/[slug]/search/page.tsx` → recherche + ajout
- Contexte slug via `SlugContext` / `useSlug()`

### Design system
- CSS variables : `--bg`, `--surface`, `--ink`, `--muted`, `--sep`, `--tabbar`, `--promo-bg`
- Mode clair/sombre automatique via `prefers-color-scheme`
- Couleur principale : `#0070d1` (bleu PSN)
- Police : système (San Francisco sur iOS)
- **Pas de fond sombre ni violet**, pas d'emojis dans le code

---

## État actuel — Ce qui fonctionne ✅

- Liste de souhaits avec prix FR + KR, toggle EUR/KRW
- Prix FR barré (promo) et prix KR barré affichés
- Badge langue : vert `FR`/`EN` si dispo, rouge `KR` si KR uniquement
- Header "Liste" propre avec toggle EUR/KRW + bouton tri
- Modal tri avec body scroll lock, sans bouton annuler
- Recherche : résultats FR + KR inline, prix KR via suffix matching (zéro faux positif)
- Filtre pills PS5/PS4/Démo PS5 toujours visibles
- Jeux déjà ajoutés : coche grise au lieu du `+` bleu
- Panneau de confirmation : scroll to top automatique
- TabBar : 2 onglets seulement (Liste + Rechercher, démos supprimé)
- Notifications push web (VAPID, Vercel Cron 09:00)

---

## Bug ouvert — Démos sans recherche ❌

### Symptôme
Filtre "Démo PS5" sans query → rien ne s'affiche (ou "Aucune démo PS5 disponible").

### Root cause
La route `/api/demos` essaie :
1. Pages catégorie PSN (`/pages/demos`, `/pages/game-demos`, `/pages/ps5/demos`) → **échec** : ces pages sont rendues côté client (CSR), `__NEXT_DATA__` ne contient pas les produits.
2. Recherches parallèles ("démo", "demo", "trial", "gratuit") → **quasi-échec** : PSN FR retourne très peu (0-1) de produits classifiés `DEMO` pour ces termes.

### Ce qui marche encore
Quand l'utilisateur TAPE un titre (ex: "Baldur's Gate"), les démos de ce jeu apparaissent dans les résultats via `results.demos` (depuis `/api/search`). C'est fiable car PSN indexe bien les démos quand on cherche le titre du jeu.

### Pistes à explorer pour demain
**Option A** — Trouver la vraie URL PSN pour les démos (à investiguer manuellement) :
- Ouvrir `https://store.playstation.com/fr-fr/pages/demos` dans un navigateur
- Inspecter le code source (Cmd+U)
- Si `__NEXT_DATA__` contient des produits → ajouter cette URL comme première tentative dans `/api/demos`
- Sinon : PSN utilise du CSR pur pour cette page

**Option B** — Chercher via l'API PSN officielle non-documentée :
PSN expose des endpoints JSON non-documentés. L'URL type est :
`https://store.playstation.com/store/api/11/chihiro/00_09_000/fr/FR/select/collection/PN.CH.DEV-PS5?size=24&start=0&language=fr`
Ces endpoints existent mais leur format change. À investiguer via l'inspecteur réseau du navigateur sur la page démos PSN.

**Option C** (fallback acceptable si A et B échouent) :
Accepter la limitation et améliorer l'UX : quand filtre=DEMO sans query, afficher un message clair + suggestions de jeux populaires qui ont des démos (liste hardcodée de 5-6 jeux connus avec démo PS5 : Final Fantasy XVI Demo, Spider-Man 2 Demo, etc.).

---

## Prochaines features à implémenter (dans l'ordre)

### P3 — Indicateurs PS+ Extra/Premium (brief dans `docs/briefs/P3-psplus-catalog.md`)
**Ce que c'est** : afficher si un jeu est dans le catalogue PS+ Extra ou Premium, et notifier quand il y entre.
**Migration SQL nécessaire** : `ALTER TABLE games ADD COLUMN ps_tier TEXT DEFAULT NULL;`
**Fichiers à modifier** : `migrations/004_ps_tier.sql`, `app/api/push/cron/route.ts`, `app/api/games/[id]/route.ts`, `components/GameCard.tsx`, `lib/types.ts`

### P4 — Import depuis PSN (brief dans `docs/briefs/P4-import-psn.md`)
**Deux options** :
- **Option B d'abord** (recommandé) : iOS Raccourcis — partager un jeu depuis l'app PSN → Raccourci iOS intercepte l'URL → ouvre `psn-tracker.app/[slug]/add?psn_url=...` → app ajoute le jeu automatiquement. Nécessite une page `app/[slug]/add/page.tsx`.
- **Option A ensuite** : bookmarklet JavaScript à ajouter en favori Safari sur la page PSN wishlist pour import en masse.

---

## Fichiers importants à lire au démarrage

```
lib/psn-scraper.ts        — scraping PSN (searchPSN, fetchPSNUrl, parseNextDataHtml)
lib/game-matcher.ts       — matchProducts, matchBySuffix
lib/types.ts              — PSNProduct, PriceResult, Game
app/api/prices/route.ts   — logique principale fetch prix FR+KR
app/api/search/route.ts   — recherche FR+KR parallèle
app/api/demos/route.ts    — browse démos (BUG : retourne vide)
app/[slug]/search/page.tsx — page recherche complète
components/GameCard.tsx   — carte jeu dans la liste
components/GameList.tsx   — liste + header + toggle currency
```

---

## Règles importantes à respecter

1. **Toujours répondre en français**, même pendant le debug technique
2. **Pas de notifications email** — web push VAPID uniquement
3. **Pas de fond sombre ni violet** dans le design
4. **Exécuter de façon autonome** — pas de demande de validation entre les tâches
5. **Commit + deploy après chaque bloc de changements**
6. **Design** : iOS-native feel, pas de bordures côté gauche colorées, pas de gradient text
