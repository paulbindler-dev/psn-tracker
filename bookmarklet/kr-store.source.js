(function psnKrStoreLink() {
  'use strict';

  const SS_FR_ID    = 'psn-kr-pending-fr-id';
  const SS_FR_TITLE = 'psn-kr-pending-fr-title';

  // Lire depuis l'URL (ouverture depuis la wishlist) ou sessionStorage (navigation SPA interne)
  const urlParams      = new URLSearchParams(location.search);
  const frIdFromUrl    = urlParams.get('psn-kr-fr');
  const frTitleFromUrl = urlParams.get('psn-kr-title');

  if (frIdFromUrl) {
    sessionStorage.setItem(SS_FR_ID, frIdFromUrl);
    sessionStorage.setItem(SS_FR_TITLE, frTitleFromUrl ?? '');
  }

  const frId    = frIdFromUrl    || sessionStorage.getItem(SS_FR_ID);
  const frTitle = frTitleFromUrl || sessionStorage.getItem(SS_FR_TITLE);

  if (!frId) return;

  // ── Rendu de la bannière ──────────────────────────────────────────────────
  function krIdFromPath(pathname) {
    if (!pathname.includes('/product/')) return null;
    return pathname.split('/product/')[1]?.split('/')[0]?.split('?')[0] ?? null;
  }

  function renderBanner() {
    document.getElementById('psn-kr-banner')?.remove();
    document.body.style.marginTop = '';

    const krId = krIdFromPath(location.pathname);

    const banner = document.createElement('div');
    banner.id = 'psn-kr-banner';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#003791', 'color:#fff', 'padding:10px 20px',
      'font-size:13px', 'font-family:inherit',
      'display:flex', 'align-items:center', 'gap:10px', 'flex-wrap:wrap',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    ].join(';');

    const msg = document.createElement('span');
    if (krId) {
      msg.innerHTML = '🇰🇷 Fiche trouvée — lier à <strong>' + (frTitle ?? 'ma wishlist') + '</strong> ?';
    } else {
      msg.innerHTML = '🇰🇷 Mode liaison — <strong>' + (frTitle ?? 'jeu') + '</strong>' +
        ' — Navigue jusqu\'à la bonne fiche KR';
    }
    banner.appendChild(msg);

    if (krId) {
      const linkBtn = document.createElement('button');
      linkBtn.style.cssText = [
        'padding:6px 18px', 'background:#fff', 'color:#003791',
        'border:none', 'border-radius:4px', 'cursor:pointer',
        'font-size:13px', 'font-weight:700', 'white-space:nowrap',
      ].join(';');
      linkBtn.textContent = '✓ Lier ce jeu';
      linkBtn.addEventListener('click', () => {
        sessionStorage.removeItem(SS_FR_ID);
        sessionStorage.removeItem(SS_FR_TITLE);
        location.href =
          'https://library.playstation.com/wishlist?psn-kr-link=' +
          encodeURIComponent(frId + ':' + krId);
      });
      banner.appendChild(linkBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = [
      'margin-left:auto', 'padding:4px 14px',
      'border:1px solid rgba(255,255,255,0.5)', 'background:none', 'color:#fff',
      'border-radius:4px', 'cursor:pointer', 'font-size:12px', 'white-space:nowrap',
    ].join(';');
    cancelBtn.textContent = '✕ Annuler';
    cancelBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SS_FR_ID);
      sessionStorage.removeItem(SS_FR_TITLE);
      banner.remove();
      document.body.style.marginTop = '';
    });
    banner.appendChild(cancelBtn);

    document.body.prepend(banner);
    document.body.style.marginTop = banner.offsetHeight + 'px';
  }

  // ── Détecter la navigation SPA Next.js (pas de rechargement de page) ─────
  let lastPath = location.pathname;

  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      renderBanner();
    }
  }, 300);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();
