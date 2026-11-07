# Les listes de Noël 2026

Site statique (GitHub Pages) : 4 listes de cadeaux (Louis — anniversaire 03/12 + Noël —, Capucine, Clémentine, Charles).

- `index.html` : page unique (onglets, table, réservations, mode parents, visionneuse)
- `data.js` : les listes (`LISTS`), les cadeaux de Louis (`ITEMS_LOUIS`, 44) et de Capucine (`ITEMS_CAPUCINE`, 26, champ `pref` = ordre de préférence), les prix Amazon (`AMAZON_*`) et le meilleur prix ailleurs (`AILLEURS_*`)
- `img/` : visuels King Jouet 480 px, `img/large/` 600 px pour la visionneuse, photos des 4 listes, `placeholder.svg`

## Mode parents
Lien « Espace parents » en bas de page, code `PARENTS_CODE` dans `index.html` (0312 par défaut). Permet de noter chaque cadeau (1 à 3 étoiles), de retirer / remettre une ligne, d'ajouter un cadeau (nom, boutique, prix, liens, image) et de supprimer un cadeau ajouté.

## Stockage partagé
Supabase (projet familial), table `corse_votes` (block_id, voter), lecture/écriture avec la clé publique :
- `cadeau:<liste>:<id>` → réservation, voter = « Prénom · Occasion »
- `cadeau-avis:<liste>:<id>` → avis parents, voter = 1 | 2 | 3
- `cadeau-hide:<liste>:<id>` → ligne retirée
- `cadeau-item:<liste>:<id>` → cadeau ajouté par les parents (JSON)

Déploiement : éditer → commit → push (Pages sur `main`).
