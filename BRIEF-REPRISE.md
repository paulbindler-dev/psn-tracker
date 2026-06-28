# PSN Tracker — Brief de reprise

**Projet :** `/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker`  
**Plan :** `/Users/paulbindler/docs/superpowers/plans/2026-06-28-psn-price-tracker.md`  
**Ledger SDD :** `.superpowers/sdd/progress.md`

## État au 28/06/2026

### Tâches terminées (Tasks 1-8)
1. ✅ Scaffold Next.js 14 + Jest + Supabase schema
2. ✅ Types + PSN scraper (`parseNextDataHtml`) — 5 tests
3. ✅ Lang parser + game matcher — 15 tests (bug `normTitle` KR fixé)
4. ✅ Supabase client + Games CRUD API (GET/POST/DELETE)
5. ✅ Exchange rate + Prices API (Frankfurter, KRW→EUR)
6. ✅ UI principale — GameCard PSN clone, swipe-to-delete, ActionSheet, SortModal
7. ✅ Page Recherche — 3 sections (jeux/extensions/démos), confirmation KR, ajout
8. ✅ PWA — manifest, icônes (médiathèques), viewport fix

### Tâches restantes
- **Task 9** (en cours) : Bookmarklet + iOS Shortcut guide
- **Task 10** : Edge case validation + deploy final

### Minor à corriger en Task 10
- `added_old` sort dans `GameList.tsx` retourne constante 1 → doit comparer par `added_at` asc

### Ce qu'il manque pour la mise en prod
1. Créer un projet Supabase : `supabase.com/dashboard`
2. Récupérer `Project URL` et `anon key`
3. Mettre à jour `.env.local` avec les vraies valeurs
4. Exécuter `supabase/migrations/001_games.sql` dans le SQL Editor Supabase
5. `cd psn-tracker && NPM_CONFIG_CACHE=/tmp/npm-cache-paul npx vercel@latest deploy --prod`
6. Remplacer `your-psn-tracker.vercel.app` dans `bookmarklet/add-game.js` et `docs/ios-shortcut.md`

## Prompt de reprise

```
Reprends le projet PSN Tracker. Ouvre d'abord BRIEF-REPRISE.md dans le projet (`/Volumes/SSD dock/Paulbindler.dock/Projets Claude/psn-tracker/`) et le ledger SDD (`.superpowers/sdd/progress.md`). 
La Task 9 est peut-être terminée — vérifie le git log. 
Il reste Task 10 (edge cases + deploy) et la mise en prod Supabase. 
Utilise superpowers:subagent-driven-development pour continuer.
```
