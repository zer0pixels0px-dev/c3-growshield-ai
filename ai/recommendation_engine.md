# Moteur de recommandation (v1)

## Principe
Recommander = expliquer. Chaque recommandation stockée dans `recommendations`
porte une `reason_fr` lisible et un score ; une recommandation sans raison
explicable n'est pas émise.

## Signaux (par ordre)
1. Score commercial et complétude (partiel acceptable, nul exclu).
2. Compatibilité avec le setup de l'utilisateur (intérieur / serre / extérieur,
   difficulté, durée de floraison).
3. Affinités : favoris, collections, avis passés, retours
   (`recommendation_feedback`) — un retour `non pertinente` pénalise
   les profils similaires.
4. Diversité : pas plus de deux cultivars partageant le même parent direct
   dans une même liste de 10 (évite l'effet « même famille »).

## Sortie
Liste de 10 maximum : cultivar, score, raison en une phrase, composants
manquants signalés (« rendement non documenté »). Les cultivars à score nul
sont exclus, avec mention du motif si l'utilisateur les avait favorisés.

## Boucle de retour
`recommendation_feedback` (pertinente / non pertinente / déjà testée)
est agrégée mensuellement ; aucune donnée personnelle n'est utilisée
hors du compte de l'utilisateur concerné.

## Limites
Pas de recommandation médicale, pas de promesse de rendement, pas de prix :
les prix affichés ailleurs proviennent uniquement de `market_prices` observés.
