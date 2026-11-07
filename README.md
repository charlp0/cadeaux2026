# Les listes de Noël 2026

Site statique (GitHub Pages) : 4 listes de cadeaux (Louis — anniversaire 03/12 + Noël —, Capucine, Clémentine, Charles).

- `index.html` : page unique (onglets, table, réservations, mode parents, visionneuse)
- `data.js` : les listes (`LISTS`), les cadeaux de Louis (`ITEMS_LOUIS`, 44) et de Capucine (`ITEMS_CAPUCINE`, 26, `pref` = numéro écrit par Capucine, `avisDefaut` = étoiles de départ), les prix Amazon (`AMAZON_*`) et le meilleur prix ailleurs (`AILLEURS_*`)
- `img/` : visuels King Jouet 480 px, `img/large/` 600 px pour la visionneuse, photos des 4 listes, `placeholder.svg`

## Mode parents
Lien « Espace parents » en bas de page, code `PARENTS_CODE` dans `index.html` (0312 par défaut). Permet de fixer la priorité de chaque cadeau (1 étoile = J'aimerais, 2 = Je veux vraiment, 3 = Je veux absolument ; `avisDefaut` dans data.js donne la valeur de départ, par exemple celle déduite de l'ordre écrit par Capucine), de marquer un cadeau « acheté par nous », de retirer / remettre une ligne, d'ajouter un cadeau (nom, boutique, prix, liens, image), de supprimer un cadeau ajouté et de consulter le bilan.

## Stockage partagé
Supabase (projet familial), table `corse_votes` (block_id, voter), lecture/écriture avec la clé publique :
- `cadeau:<liste>:<id>` → réservation, voter = « Prénom · Occasion »
- `cadeau-avis:<liste>:<id>` → priorité, voter = 0 | 1 | 2 | 3 (0 annule l'étoile par défaut)
- `cadeau-hide:<liste>:<id>` → ligne retirée
- `cadeau-item:<liste>:<id>` → cadeau ajouté par les parents (JSON)

Déploiement : éditer → commit → push (Pages sur `main`).

## Relevé de prix hebdomadaire
Tâche planifiée Claude (app de bureau) « Relevé des prix des listes de Noël », le lundi à 7 h. Elle enchaîne :
`node scripts/prix_refs.js` → `scripts/browser_kj.js` et `scripts/browser_amazon.js` exécutés dans le navigateur intégré (King Jouet et Amazon bloquent curl) → `node scripts/compare_prix.js kj.json amazon.json`.
Le comparateur met à jour `data.js`, écrit `~/Documents/Claude/Outbox/Cadeaux/prix-AAAA-MM-JJ.md` et, s'il y a des changements, `~/Documents/Claude/Inbox/cadeaux-prix-alerte.md` (repris dans le briefing du matin). La tâche commit et pousse ensuite data.js.
