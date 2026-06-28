# iOS Shortcut — Ajouter un jeu depuis Safari

## Configuration (une seule fois)

1. Ouvre l'app **Raccourcis** sur iPhone
2. Appuie sur **+** → **Nouvelle action**
3. Cherche **"URL"** → colle `https://your-psn-tracker.vercel.app/api/games`
4. Ajoute action **"Recevoir"** → sélectionne **Page Web**
5. Ajoute action **"Obtenir du contenu de la page web"** → sélectionne **Texte de la page**
   - Sélecteur CSS : `[data-qa="mfe-game-title__name"]`
6. Ajoute action **"Demander une confirmation"** → `Ajouter "[Texte]" à PSN Tracker ?`
7. Ajoute action **"Contenu de l'URL"** :
   - URL : `https://your-psn-tracker.vercel.app/api/games`
   - Méthode : **POST**
   - Corps : `{"title": "[Texte]"}`
   - En-tête : `Content-Type: application/json`
8. Nomme le raccourci **"PSN Tracker"**

## Utilisation

1. Sur une fiche jeu dans Safari (store.playstation.com)
2. Tape le bouton **Partager** (carré avec flèche)
3. Sélectionne **PSN Tracker**
4. Confirme l'ajout
