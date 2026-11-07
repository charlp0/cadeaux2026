# Les listes de Noël 2026

Site statique (GitHub Pages), deux pages :
- `anniversaire.html` : **l'anniversaire de Louis (03/12)**, sa liste seule, gros compte à rebours, aucune mention de Noël hormis l'encart « les listes de Noël seront partagées plus tard ». Lien à envoyer en premier.
- `index.html` : **Noël**, 4 listes (Louis, Capucine, Clémentine, Charles), aucune mention de l'anniversaire. Les jouets réservés (ou « achetés par nous ») sur la page anniversaire sont retirés automatiquement de la liste de Noël de Louis ; en mode parents, le bouton « Offerts à l'anniversaire (n) » les montre.

`anniversaire.html` est **généré** depuis `index.html` par `node scripts/build_anniv.js` (attribut `data-mode="anniv"` sur `<html>`) : modifier index.html puis relancer le script. Les étoiles de priorité et les retraits sont distincts entre les deux pages (clés `louis-anniv`), les réservations sont communes (`cadeau:louis:<id>`, voter suffixé « · Anniversaire » sur la page anniversaire).

- `index.html` : page unique (onglets, table, réservations, mode parents, visionneuse)
- `data.js` : les listes (`LISTS`), les cadeaux de Louis (`ITEMS_LOUIS`, 44) et de Capucine (`ITEMS_CAPUCINE`, 26, `pref` = numéro écrit par Capucine, `avisDefaut` = étoiles de départ), les prix Amazon (`AMAZON_*`) et le meilleur prix ailleurs (`AILLEURS_*`)
- `img/` : visuels King Jouet 480 px, `img/large/` 600 px pour la visionneuse, photos des 4 listes, `placeholder.svg`

## Mode parents
Lien « Espace parents » en bas de page, code `PARENTS_CODE` dans `index.html` (0312 par défaut). Permet de fixer la priorité de chaque cadeau (1 étoile = J'aimerais, 2 = Je veux vraiment, 3 = Je veux absolument ; `avisDefaut` dans data.js donne la valeur de départ, par exemple celle déduite de l'ordre écrit par Capucine), de marquer un cadeau « acheté par nous », de retirer / remettre une ligne, d'ajouter un cadeau (nom, boutique, prix, liens, image), de supprimer un cadeau ajouté et de consulter le bilan.

## Stockage partagé
Supabase (projet familial), table `corse_votes` (block_id, voter), lecture/écriture avec la clé publique :
- `cadeau:<liste>:<id>` → réservation, voter = « Prénom » (page Noël) ou « Prénom · Anniversaire » (page anniversaire) ; « __nous__ » = acheté par les parents
- `cadeau-avis:<liste>:<id>` → priorité, voter = 0 | 1 | 2 | 3 (0 annule l'étoile par défaut) ; `<liste>` = `louis-anniv` sur la page anniversaire
- `cadeau-hide:<liste>:<id>` → ligne retirée (idem `louis-anniv` sur la page anniversaire)
- `cadeau-item:<liste>:<id>` → cadeau ajouté par les parents (JSON)

Déploiement : éditer → commit → push (Pages sur `main`).

## Relevé de prix hebdomadaire
Tâche planifiée Claude (app de bureau) « Relevé des prix des listes de Noël », le lundi à 7 h. Elle enchaîne :
`node scripts/prix_refs.js` → `scripts/browser_kj.js` et `scripts/browser_amazon.js` exécutés dans le navigateur intégré (King Jouet et Amazon bloquent curl) → `node scripts/compare_prix.js kj.json amazon.json`.
Le comparateur met à jour `data.js`, écrit `~/Documents/Claude/Outbox/Cadeaux/prix-AAAA-MM-JJ.md` et, s'il y a des changements, `~/Documents/Claude/Inbox/cadeaux-prix-alerte.md` (repris dans le briefing du matin). La tâche commit et pousse ensuite data.js.
