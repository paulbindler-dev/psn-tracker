// Bookmarklet: run on any PSN Store game page to add to PSN Tracker
// Replace APP_URL with your actual Vercel URL
(function () {
  const APP_URL = 'https://your-psn-tracker.vercel.app';

  const titleEl =
    document.querySelector('[data-qa="mfe-game-title__name"]') ||
    document.querySelector('h1');

  if (!titleEl) {
    alert('PSN Tracker: titre du jeu non trouvé sur cette page.');
    return;
  }

  const title = titleEl.textContent.trim();
  const confirmed = confirm(`Ajouter "${title}" à PSN Tracker ?`);

  if (!confirmed) return;

  fetch(`${APP_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
    .then((r) => r.json())
    .then(() => alert(`✅ "${title}" ajouté à PSN Tracker !`))
    .catch(() => alert('❌ Erreur lors de l\'ajout. Vérifie ta connexion.'));
})();
