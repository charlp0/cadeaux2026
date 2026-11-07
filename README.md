# Liste de cadeaux 2026

Page statique (GitHub Pages) : liste de cadeaux anniversaire (03/12) & Noël 2026, issue du catalogue King Jouet.

- `index.html` : page (table + réservations partagées)
- `data.js` : les 44 jouets (`ITEMS`) et le meilleur prix trouvé ailleurs (`AILLEURS`)
- `img/` : visuels King Jouet (480 px)

Réservations : stockées dans Supabase (projet familial), table `corse_votes`, lignes `block_id = "cadeau:<id>"`, `voter = "Prénom · Occasion"`.
Clé publique dans `index.html` (lecture/écriture ouvertes sur cette table, comme pour le site Solenzara 2026).

Déploiement : éditer → commit → push (Pages sur `main`).
