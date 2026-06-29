# Brief P3 — Indicateurs PS+ Extra / Premium

## Objectif
Afficher clairement si un jeu est inclus dans le catalogue PS+ Extra ou Premium, et notifier l'utilisateur quand un jeu de sa liste entre dans ce catalogue.

## Comportement attendu

### Dans la liste (GameCard)
- Si `psPlusTier === 'EXTRA'` : badge doré "PS+ Extra" bien visible
- Si `psPlusTier === 'PREMIUM'` : badge doré "PS+ Premium"
- Actuellement : icône StarFour + texte "Extra" / "Premium" — à rendre plus PSN-like

### Dans la recherche (confirmation panel)
- Afficher le tier PS+ si disponible
- Indiquer si le prix affiché est un "prix PS+" (abonné) vs prix standard

### Notifications push
- Le cron `/api/push/cron` tourne chaque matin
- Actuellement il détecte les promos prix
- Extension : détecter quand un jeu ENTRE dans le catalogue PS+ (transition null → EXTRA ou PREMIUM)
- Nécessite de mémoriser l'état PS+ précédent

## Plan technique

### Migration DB requise
```sql
-- Stocker le tier PS+ connu pour chaque jeu (dernière valeur vue)
ALTER TABLE games ADD COLUMN ps_tier TEXT DEFAULT NULL;
-- Valeurs possibles : NULL (pas en PS+), 'EXTRA', 'PREMIUM'
```
Fichier de migration : `migrations/004_ps_tier.sql`

### Logique cron étendue (`/api/push/cron`)
```
Pour chaque jeu avec notify=true :
  1. Fetch prix actuel → currentTier = fr.psPlusTier
  2. Comparer avec game.ps_tier en DB
  3. Si currentTier != null ET game.ps_tier == null → ENTRÉE en catalogue → notif push
  4. Mettre à jour game.ps_tier = currentTier dans la DB
```

### Payload notification
```json
{
  "title": "🎮 [Titre du jeu] est sur PS+ Extra !",
  "body": "Ce jeu vient d'être ajouté au catalogue PS+ Extra.",
  "url": "/[slug]"
}
```

### API PATCH games/[id]
- Étendre pour accepter `{ ps_tier: string | null }`

## Fichiers à modifier
- `migrations/004_ps_tier.sql` — nouveau
- `app/api/push/cron/route.ts` — étendre la logique
- `app/api/games/[id]/route.ts` — PATCH ps_tier
- `components/GameCard.tsx` — affichage badge PS+ plus prominent
- `lib/types.ts` — ajouter `ps_tier` à `Game`

## Ce qu'on ne fait PAS
- Pas de prix "PS+ subscriber price" séparé (PSN ne l'expose pas clairement dans notre scraping)
- Pas de filtre "PS+ seulement" dans la liste (future feature si besoin)

## Projet séparé ?
Non. Tout va dans le projet psn-tracker existant. La migration SQL est à exécuter dans Neon console.
