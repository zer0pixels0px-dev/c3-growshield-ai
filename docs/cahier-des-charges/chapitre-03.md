# Chapitre 3 — Exigences fonctionnelles : catalogue et fiches

## 3.1 Catalogue des cultivars
- **EX-3.1** Recherche par nom ou alias, avec tolérance aux variantes
  (trigramme), résultats triés par score décroissant, scores nuls en dernier.
- **EX-3.2** Fiche cultivar : nom canonique, breeder + statut de vérification,
  type de plante, THC/CBD documentés (fourchette ou « non documenté »),
  terpènes / arômes / effets avec sources, profil de culture, pedigree.
- **EX-3.3** Aucune fiche ne peut être créée sans `canonical_name` unique ;
  les doublons détectés passent par `cultivar_merges` (traçabilité).

## 3.2 Breeders et pedigree
- **EX-3.4** Un breeder possède un nom canonique et des alias ; son statut
  par défaut est « non vérifié ».
- **EX-3.5** Le graphe de pedigree (`pedigree_links`) interdit l'auto-parenté
  et expose les conflits (`lineage_conflicts`) sans les trancher.

## 3.3 Données sensorielles et labo
- **EX-3.6** Terpènes, arômes et effets sont des référentiels séparés ;
  les termes d'effets sont exclus des arômes (audit des descripteurs).
- **EX-3.7** Un résultat labo est toujours rattaché à un lot (`lab_batches`)
  et à un laboratoire ; aucune teneur n'est saisie sans lot.

## 3.4 Critères d'acceptation du chapitre
Création, lecture, mise à jour et suppression via l'API OpenAPI ;
affichage « non vérifié » / « non documenté » partout où la source manque ;
tests d'unicité canonique et de rejet d'auto-parenté (lot 2).
