# Brief P4 — Import wishlist depuis PSN

## Objectif
Permettre à l'utilisateur d'importer sa liste de souhaits PSN (ou une sélection) dans l'app.

## Deux approches possibles

---

### Option A — Bookmarklet (recommandé)
**Principe** : un lien JavaScript qu'on ajoute en favori sur mobile. Quand on est sur le PSN store dans Safari/Chrome, on tape le favori, le script lit la page et envoie les données à l'app.

**Avantages**
- Pas d'OAuth, pas de credentials PSN
- Fonctionne sur mobile (Safari sur iOS)
- On contrôle entièrement le code

**Inconvénients**
- L'utilisateur doit d'abord naviguer manuellement sur chaque page de sa wishlist PSN
- La wishlist PSN n'est pas toujours sur une seule page facilement scrapable
- Sur iOS : ajouter un bookmarklet est fastidieux (copier/coller en favori)

**Implémentation**
1. Page `/[slug]/import` dans l'app avec instructions + le bookmarklet à copier
2. Le bookmarklet (JS minifié) :
   - Lit le DOM de la page PSN courante pour extraire les produits visibles
   - OU lit `window.__NEXT_DATA__` (Apollo state) pour extraire les IDs produit
   - POST vers `/api/import?slug=[slug]` avec la liste des `{ id, title }`
3. API `/api/import` : reçoit la liste, filtre les doublons, ajoute en masse

**Complexité** : Moyenne. Le plus difficile est de trouver les bons sélecteurs DOM sur le PSN store.

---

### Option B — Import depuis l'app PSN officielle (Share Sheet iOS)
**Principe** : dans l'app PSN sur iOS, "Partager" un jeu envoie une URL PSN (`https://store.playstation.com/...`). On crée un raccourci iOS qui intercepte ces URLs et les envoie à notre app.

**Avantages**
- Très fluide : voir un jeu sur PSN → "Partager" → il est dans la liste
- Game by game (ce que Paul a demandé "au détail")

**Inconvénients**
- Nécessite un Raccourci iOS configuré par l'utilisateur
- Pas d'import en masse (jeu par jeu)
- Dépend du fait que PSN partage l'URL du produit (pas toujours le cas)

**Implémentation**
1. Page `/add?psn_url=[url]` dans l'app
2. Raccourci iOS : reçoit l'URL partagée → ouvre `https://heures-hebdo.vercel.app/[slug]/add?psn_url=[url]`
3. La page `/add` parse l'URL PSN pour extraire le product ID
4. Appelle notre API prices pour récupérer les données
5. Ajoute le jeu

**Complexité** : Faible côté code. Moyenne côté UX (setup Raccourci iOS à guider).

---

## Recommandation
**Faire les deux** :
- **Option B d'abord** (jeu par jeu, rapide à implémenter) — flux le plus naturel pour Paul
- **Option A ensuite** (import masse depuis la wishlist PSN web)

## Projet séparé ?
Non. Tout dans psn-tracker. Nouvelles routes :
- `app/[slug]/import/page.tsx` — page d'instructions + bookmarklet
- `app/[slug]/add/page.tsx` — page de réception URL PSN (Option B)
- `app/api/import/route.ts` — API import en masse (Option A)

## Ce qu'on ne fait PAS
- Pas d'OAuth PSN (Sony n'a pas d'API publique, et les tokens sont complexes à maintenir)
- Pas de scraping du compte PSN en arrière-plan (nécessiterait credentials)
