# Design — PSN KR Prices Bookmarklet

**Date :** 2026-06-29  
**Statut :** Approuvé  

---

## Contexte et décision pivot

L'app psn-tracker existante reproduisait la wishlist PSN pour y ajouter les prix coréens. Problème : PSN fait déjà nativement la wishlist, les notifications de promo, et les indicateurs PS+. La seule valeur unique de notre app est le **prix coréen converti en euros**.

Décision : abandonner le développement de l'app en tant que clone PSN. Construire à la place un script qui s'injecte directement dans la vraie wishlist PSN pour y ajouter uniquement ce qui manque : le prix KR.

L'app existante reste déployée mais n'évolue plus.

---

## Ce qu'on construit

Un script JavaScript en deux variantes de livraison :
- **Tampermonkey** (`psn-kr-prices.user.js`) — s'exécute automatiquement sur `store.playstation.com/*/wishlist`
- **Bookmarklet mobile** (`psn-kr-prices.min.txt`) — URL `javascript:` à sauvegarder en favori Safari, à taper manuellement sur la page wishlist

Le code source est commun (`psn-kr-prices.source.js`). Aucun backend requis.

---

## Architecture & fichiers

```
bookmarklet/
  psn-kr-prices.source.js    — code source lisible (référence)
  psn-kr-prices.user.js      — script Tampermonkey (headers @match etc.)
  psn-kr-prices.min.txt      — URL javascript: minifiée pour bookmarklet mobile
```

Les fichiers existants (`add-game.js`, `bookmarklet.min.txt`) sont obsolètes et ne sont plus utilisés.

---

## Flux de données

### 1. Lecture de la wishlist FR
```
window.__NEXT_DATA__.props.apolloState
→ filtrer les clés Product:*
→ extraire { id, suffix, name, basePrice, discountedPrice, coverUrl }
```
Même technique que le scraper serveur existant (`lib/psn-scraper.ts`).

### 2. Taux de change EUR/KRW
```
GET https://open.er-api.com/v6/latest/KRW
→ rates.EUR
```
API publique, gratuite, CORS autorisé. Une seule requête par exécution du script.

### 3. Recherche KR par jeu (en parallèle)
Pour chaque produit FR, en `Promise.all` :
```
GET https://store.playstation.com/ko-kr/search/{encodeURIComponent(title)}
→ parse __NEXT_DATA__ de la réponse HTML (même parsing que le scraper)
→ extraire les Product: KR
```
Aucun problème CORS : le script tourne sur `store.playstation.com`, les fetches restent sur le même domaine.

### 4. Matching par suffix
```
fr.suffix === kr.suffix  →  match certain
```
Le suffix est la dernière partie de l'ID produit PSN (ex: `EP0001-PPSA07521_00-AV00000000000001` → suffix `AV00000000000001`).

Les suffixes génériques connus sont exclus (liste issue de `lib/game-matcher.ts` : `GAME000000000000`, `ASIA000000000000`, etc.).

**Aucun fallback titre automatique.** Si pas de suffix match, on passe en mode disambiguation — jamais de faux positif silencieux.

### 5. Classification des résultats
| Résultat | État |
|---|---|
| Suffix exact trouvé | `FOUND` — prix KR confirmé |
| Aucun candidat KR | `NOT_FOUND` |
| Candidats KR sans suffix exact | `AMBIGUOUS` — liste pour l'utilisateur |

---

## UI d'injection

Le script injecte un `<div>` avec styles inline (indépendant du CSS PSN) directement sous le bloc prix de chaque item wishlist. Il ajoute, ne remplace jamais.

### Cas FOUND
```
🇰🇷  18,50 €  -34%
```
- Vert si économie > 5%
- Gris neutre sinon
- Si promo KR : prix barré + prix promo

### Cas NOT_FOUND
```
🇰🇷  —
```
Gris, sobre.

### Cas AMBIGUOUS
```
🇰🇷  ?   [Identifier →]
```
Clic sur "Identifier" → panneau inline sous l'item :
```
Plusieurs versions KR trouvées :
  [cover] Titre KR 1    XX 900 ₩
  [cover] Titre KR 2    XX 900 ₩
  Aucun de ces jeux
```

### Flux "Aucun de ces jeux"
1. Ouvre automatiquement un nouvel onglet sur `store.playstation.com/ko-kr/search/{titre}`
2. Affiche simultanément un champ de saisie inline :
   ```
   Coller l'URL du jeu KR :
   [ store.playstation.com/ko-kr/product/... ]  [Lier]
   ```
3. Paul colle l'URL PSN KR du bon jeu → le script extrait l'ID produit, fetche le prix, l'affiche
4. Le lien FR ID → KR ID est sauvegardé en `localStorage` pour les exécutions suivantes

---

## Persistance localStorage

```js
psn-kr-links: {
  "EP0001-PPSA07521_00-AV00000000000001": "HP0001-PPSA07521_00-AV00000000000001",
  "EP0001-CUSA99999_00-XXXXXXXXXXXXXXXX": null   // "Aucun de ces jeux" mémorisé
}
```

Au démarrage, le script consulte ce dictionnaire avant de faire les fetches KR. Si un lien est déjà connu, on fetche directement l'ID KR mémorisé.

---

## Tampermonkey — comportement spécifique

- `@run-at document-idle` — attend que la page soit chargée
- `@match https://store.playstation.com/*/wishlist*`
- `MutationObserver` sur le conteneur wishlist — ré-injecte si la liste change (navigation SPA sans rechargement)
- `GM_xmlhttpRequest` non nécessaire (même domaine)

---

## Bookmarklet mobile — contraintes

- Pas de MutationObserver persistant (le script s'exécute une fois)
- L'utilisateur tape le favori après que la wishlist soit chargée
- Le localStorage fonctionne normalement sur Safari iOS

---

## Ce qu'on ne fait pas

- Pas de filtre PS5/PS4 (PSN le fait nativement)
- Pas de notifications push (les promos KR suivent le même calendrier FR)
- Pas d'indicateurs PS+ (PSN les affiche nativement)
- Pas de page de recherche enrichie (la wishlist seule suffit)
- Pas de backend, pas de DB, pas de déploiement Vercel nécessaire

---

## Gestion des erreurs

- Fetch KR timeout / erreur réseau → affiche `🇰🇷 —` sans bloquer les autres jeux
- `__NEXT_DATA__` absent ou mal formé → log console, skip silencieux
- Taux de change indisponible → affiche le prix en ₩ brut avec mention "(taux indisponible)"
- URL KR collée invalide → message d'erreur inline, champ reste ouvert

---

## Critères de succès

1. Tous les jeux de la wishlist affichent un badge KR (trouvé, non trouvé, ou ambigu)
2. Zéro faux positif silencieux — un prix affiché est toujours confirmé par suffix ou par choix manuel
3. Le lien manuel fonctionne et est mémorisé entre sessions
4. Fonctionne sur Chrome desktop (Tampermonkey) et Safari iOS (bookmarklet)
5. N'altère pas le fonctionnement normal de la page wishlist PSN
