# Brief de reprise — PSN Tracker

> Colle ce fichier en début de nouvelle session Claude Code. Il contient tout le contexte nécessaire pour reprendre sans repartir de zéro.

---

## ⚠️ IMPORTANT — Fichier BRIEF-REPRISE.md à la racine

Il existe un vieux fichier `BRIEF-REPRISE.md` à la racine du projet. **Il est OBSOLÈTE — ne pas l'utiliser.** Il date du démarrage du projet sur Supabase, avant la migration vers Neon. Ce fichier SESSION-REPRISE.md est la référence à jour.

---

## Base de données — NEON, pas Supabase

**Ce projet utilise Neon Postgres, PAS Supabase.**

- Client : `@neondatabase/serverless` → `lib/db.ts` → `getSql()`
- `lib/supabase.ts` existe mais n'est importé nulle part → code mort de l'ancienne version
- Le package `@supabase/supabase-js` est dans `package.json` mais inutilisé → peut être supprimé
- Les migrations SQL s'exécutent dans la **console Neon** (neon.tech → SQL Editor), pas dans Supabase
- Connection string dans la variable d'environnement `DATABASE_URL` (Neon)

---

## Contexte projet

App web de suivi de prix PSN (PlayStation Store) pour Paul Bindler, notaire.
- **URL prod** : `https://psn-tracker-chi.vercel.app`
- **Stack** : Next.js 14 App Router, TypeScript strict, Tailwind, **Neon Postgres** (`@neondatabase/serverless`), Vercel
- **Icônes** : `@phosphor-icons/react` v2.1.10 (requis dans `transpilePackages` dans `next.config.mjs`)
- **Repo** : `/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker`

**Principe** : chaque utilisateur a un slug unique (URL secrète). L'app compare les prix FR (store PlayStation France) et KR (store PlayStation Corée du Sud) des jeux PS5/PS4. En KR, les jeux coûtent souvent 30-60% moins cher. L'app aide à identifier ces économies.

---

## Architecture technique clé

### PSN Scraping (`lib/psn-scraper.ts`)
PSN store est en Next.js SSR — les pages embarquent les données produit dans `__NEXT_DATA__` (Apollo state).
- `searchPSN(region, title)` → fetch `https://store.playstation.com/{region}/search/{title}` → parse `__NEXT_DATA__`
- `parseNextDataHtml(html)` → extrait tous les `Product:*` de l'Apollo state
- `fetchPSNUrl(url, region)` → fetch n'importe quelle URL PSN + parse
- **IMPORTANT** : les pages produit PSN (`/product/ID`) ne contiennent plus l'Apollo state depuis juin 2026. Seules les pages de recherche (`/search/QUERY`) fonctionnent.

### Matching FR ↔ KR (`lib/game-matcher.ts`)
- `matchProducts(frProducts, krProducts)` : 1) suffix exact sur l'ID produit, 2) fallback titre (≥6 chars prefix ou ≥8 chars substring)
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

### Schéma DB (Neon)
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,        -- slug
  title TEXT NOT NULL,
  fr_product_id TEXT,
  kr_product_id TEXT,
  notify BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now()
);
```

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
- TabBar : 2 onglets seulement (Liste + Rechercher, onglet Démos supprimé)
- Notifications push web (VAPID, Vercel Cron 09:00)

---

## Bug ouvert — Démos sans recherche ❌

### Symptôme
Filtre "Démo PS5" sans query → rien ne s'affiche.

### Root cause
La route `/api/demos` essaie :
1. Pages catégorie PSN (`/pages/demos`, `/pages/game-demos`) → **échec** : ces pages sont CSR (client-side rendering), `__NEXT_DATA__` ne contient pas les produits.
2. Recherches parallèles ("démo", "demo", "trial", "gratuit") → **quasi-échec** : PSN FR retourne très peu (0-1) de produits classifiés `DEMO` pour ces termes génériques.

### Ce qui marche encore
Quand l'utilisateur tape un titre (ex: "Baldur's Gate"), les démos de ce jeu apparaissent dans les résultats via `results.demos`. C'est fiable.

### Pistes à explorer
**Option A** — Trouver la vraie URL PSN pour les démos (investigation manuelle) :
- Ouvrir `https://store.playstation.com/fr-fr/pages/demos` dans un navigateur
- Inspecter le code source (Cmd+U ou DevTools → Network)
- Chercher les appels XHR/fetch vers des endpoints PSN → trouver un endpoint JSON listings
- L'URL type non-documentée PSN ressemble à : `https://store.playstation.com/store/api/11/chihiro/00_09_000/fr/FR/select/...`

**Option B** — Fallback hardcodé (si A échoue) :
Quand filtre=DEMO sans query : afficher une liste hardcodée de démos PS5 populaires connues (Final Fantasy XVI, Spider-Man 2, Hogwarts Legacy, etc.) en les recherchant dynamiquement.

---

## Feature P3 — Indicateurs PS+ Extra / Premium

### Vision
PS+ (PlayStation Plus) est le service d'abonnement de Sony. Il a 3 tiers :
- **Essential** : jeux mensuels offerts uniquement
- **Extra** : accès à un catalogue de ~400 jeux PS5/PS4 (inclus dans l'abonnement)
- **Premium** : accès Extra + jeux PS1/PS2/PS3 classiques + cloud streaming

**Ce qu'on veut** : sur chaque carte jeu dans la liste, afficher si ce jeu est **actuellement inclus dans PS+ Extra ou Premium**. Et notifier l'utilisateur quand un jeu de sa wishlist ENTRE dans le catalogue PS+ (transition : "pas inclus" → "inclus").

PSN expose déjà ce champ dans les données qu'on scrape — c'est `psPlusTier` dans le prix (`EXTRA`, `PREMIUM`, ou absent). L'info est **déjà disponible** dans nos données, il faut juste :
1. L'afficher sur les GameCard
2. La persister en DB pour détecter les changements

### Plan technique
**Migration Neon** (exécuter dans Neon SQL Editor sur neon.tech) :
```sql
ALTER TABLE games ADD COLUMN ps_tier TEXT DEFAULT NULL;
```

**Fichiers à modifier** :
- `lib/types.ts` → ajouter `ps_tier?: string | null` à `Game`
- `components/GameCard.tsx` → afficher badge "PS+ Extra" ou "PS+ Premium" si `fr?.psPlusTier`
- `app/api/push/cron/route.ts` → détecter quand `currentTier != null && game.ps_tier == null` → push notification
- `app/api/games/[id]/route.ts` → PATCH pour mettre à jour `ps_tier`

**Pas besoin de scraping supplémentaire** — `psPlusTier` est déjà dans `PriceResult.fr.psPlusTier`.

---

## Feature P4 — Import masse depuis PSN (style SongShift)

### Vision
**SongShift** est une app iOS qui transfère des playlists entières entre services musicaux (Spotify → Apple Music etc.). Paul veut l'équivalent pour PSN : importer **toute sa wishlist PSN** en une seule action, pas jeu par jeu.

PSN wishlist = liste de souhaits dans le compte PSN de l'utilisateur, accessible sur `store.playstation.com`.

### Option A — Bookmarklet web (recommandé en premier, import en masse)
**Principe** : l'utilisateur va sur `store.playstation.com/fr-fr/wishlist` dans Safari → tape un favori bookmarklet → le script lit tous les jeux visibles et les envoie à notre app.

**Implémentation** :
1. Page `app/[slug]/import/page.tsx` → instructions + code bookmarklet à copier
2. Le bookmarklet (JS minifié) lit `window.__NEXT_DATA__` sur la page wishlist PSN et extrait les IDs/titres de tous les jeux
3. POST vers `/api/import?slug=[slug]` avec `{ games: [{ id, title }, ...] }`
4. `/api/import/route.ts` → insert en masse, ignore doublons

**Défi principal** : trouver les bons sélecteurs/clés Apollo dans `__NEXT_DATA__` sur la page wishlist PSN. Nécessite d'inspecter manuellement le code source de `store.playstation.com/fr-fr/wishlist`.

### Option B — iOS Raccourcis (jeu par jeu, plus simple)
**Principe** : partager un jeu depuis l'app PSN iOS → Raccourci intercepte → ouvre notre app avec l'URL PSN.

1. Page `app/[slug]/add/page.tsx` → reçoit `?psn_url=...` → parse l'ID produit PSN → appelle `/api/prices` → affiche confirmation → ajoute
2. L'utilisateur configure un Raccourci iOS une fois pour toutes

**Recommandation** : implémenter les DEUX. Option B d'abord (2h de dev), Option A ensuite (import masse, 1 jour).

### API à créer
```
POST /api/import?slug=...
Body: { games: [{ title: string, fr_product_id: string }] }
Response: { added: number, skipped: number }
```

---

## Fichiers importants à lire au démarrage

```
lib/psn-scraper.ts        — scraping PSN
lib/game-matcher.ts       — matchProducts, matchBySuffix
lib/types.ts              — PSNProduct, PriceResult, Game
lib/db.ts                 — getSql() → Neon client (PAS supabase)
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
5. **Commit + push après chaque bloc de changements** (Vercel déploie automatiquement)
6. **Design** : iOS-native feel, pas de bordures côté gauche colorées, pas de gradient text
7. **DB = Neon** — ne jamais utiliser `lib/supabase.ts` (code mort) ni le client Supabase
