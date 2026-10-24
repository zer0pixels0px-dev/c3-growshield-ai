# Chapitre 5 — Moteurs IA : normalisation, scoring, recommandation

## 5.1 Normalisation (voir ai/normalization_engine.md)
- **EX-5.1** Un cultivar = une fiche canonique. Toute variante devient un
  alias, jamais une nouvelle fiche. La déduplication a lieu AVANT tout
  enrichissement.
- **EX-5.2** Pipeline : nettoyage (minuscules, accents supprimés pour la
  comparaison, espaces normalisés), règles ordonnées
  (`canonical_name_rules`), recherche exacte puis alias puis similarité,
  décision (fusion, proposition en attente, ou création « non vérifié »).
- **EX-5.3** Un alias qui changerait le breeder ou la lignée exige une
  relecture humaine ; chaque fusion est journalisée (`cultivar_merges`,
  `scrape_dedup_log`) et chaque conflit de lignée est exposé
  (`lineage_conflicts`), jamais tranché par le moteur seul.
- **EX-5.4** Règles documentées en lot 2 : `gsc` et `thin mint gsc` →
  `girl scout cookies`, `rs11` → `rs-11` (implémentées dans
  `apps/api/src/normalization.ts` et testées).

## 5.2 Scoring commercial (voir ai/scoring_engine.md)
- **EX-5.5** Formule : rendement 35 %, terpènes 20 %, vigueur 15 %,
  résistance moisissure 10 %, bag appeal 10 %, marché 10 %.
  Implémentation SQL `compute_commercial_score()` et miroir TypeScript
  (`apps/api/src/scoring.ts`), avec les mêmes poids.
- **EX-5.6** Scores partiels : pondération renormalisée sur les composants
  documentés, `completeness = 'partiel'` et nombre de composants affichés.
  Score nul : aucun composant → score NULL, `completeness = 'nul'`,
  trié en dernier, jamais affiché comme 0.
- **EX-5.7** Le recalcul par l'API (`POST /cultivars/{id}/scores`) utilise
  d'abord les composants existants, sinon le profil de culture
  (scores 0–10 ramenés à 0–100), puis historise le résultat
  (`score_history`, version de formule conservée).

## 5.3 Recommandation
- **EX-5.8** Une recommandation (`recommendations`) exige une raison
  explicable en français (`reason_fr`) ; le retour utilisateur
  (`recommendation_feedback` : pertinente, non pertinente, déjà testée)
  est conservé pour mesurer la pertinence, pas pour modifier un score
  sans relecture.

## 5.4 Critères d'acceptation
Tests de scoring (complet, partiel renormalisé, nul), de normalisation
(règles documentées) et de file d'alias : tous passent en lot 2
(`apps/api/tests/api.test.ts`). Limite affichée : les scores reposent sur
des guides et données publiques, pas sur des essais contrôlés propres
au projet.
