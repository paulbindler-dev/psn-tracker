# Product

## Register

product

## Users

Paul Bindler, usage personnel exclusif. Notaire, 30-40 ans, power user iOS. Utilise l'app sur iPhone en mobilité pour surveiller les prix PSN France vs Corée et identifier les meilleures offres. Aussi accessible sur desktop pour vérification rapide.

## Product Purpose

Comparateur PSN FR/KR : liste personnelle de jeux avec prix France et Corée en temps réel côte à côte, badge de sécurité linguistique (EN/FR/KR-only), conversion KRW→EUR, badges promo. Objectif : savoir immédiatement si un jeu est moins cher en KR et si les langues supportées le permettent.

## Brand Personality

Authentique, familier, premium. L'app doit être indiscernable de l'app PSN officielle au premier coup d'œil. Pas un "clone qui essaie de ressembler" — une reproduction fidèle au pixel près enrichie de nos fonctionnalités KR.

## Anti-references

- L'actuelle version de l'app (visuellement laide, trop amateur)
- Toute UI qui crie "fait avec une IA" (glassmorphism gratuit, dégradé texte, grilles de cartes identiques)
- Fond sombre violet ou bleu roi
- Le fond crème/sable typique des outils IA
- Fond blanc uni trop propre qui trahit une app maison

## Design Principles

1. **Clone d'abord, enrichissement ensuite** — La structure visuelle, la typographie, les espacements et les couleurs sont copiés de l'app PSN officielle. Nos ajouts (prix KR, badges langue, sort KR) s'intègrent sans rupture.
2. **Light par défaut, dark automatique** — Light mode est la valeur par défaut. Dark mode suit `prefers-color-scheme: dark` automatiquement. Les deux modes sont soignés.
3. **Mobile first, iPhone first** — Pensé pour être installé en PWA sur iPhone. Safe areas respectées, touch targets ≥44px, pas de zoom au focus clavier.
4. **Hiérarchie prix limpide** — Le prix FR et le prix KR (converti en EUR) sont immédiatement comparables. L'économie en % est visible sans chercher.
5. **Zéro friction** — La liste s'ouvre instantanément. La recherche est le seul autre onglet. Pas de navigation complexe.

## Accessibility & Inclusion

Usage personnel — WCAG AA suffisant. Contrastes corps ≥4.5:1. Touch targets ≥44px. Reduced motion respecté. Pas de dépendance à la couleur seule pour les badges de langue.
