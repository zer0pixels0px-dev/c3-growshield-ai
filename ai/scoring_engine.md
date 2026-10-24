# Moteur de score commercial (v1)

## Formule
Score sur 100, somme pondérée des composants normalisés 0–100 :

| Composant | Poids |
|---|---|
| Rendement | 35 % |
| Terpènes | 20 % |
| Vigueur | 15 % |
| Résistance moisissure | 10 % |
| Bag appeal | 10 % |
| Marché | 10 % |

Implémentation SQL : `compute_commercial_score()` dans `database/functions.sql`.

## Normalisation
Chaque composant brut (ex. rendement g/m², score vigueur 0–10) est ramené
à 0–100 par une échelle documentée par composant (lot 2 : publier les bornes
min/max et la source de chaque échelle). Un composant sans source documentée
reste `NULL`, jamais estimé à la moyenne.

## Scores partiels et nuls
- **Partiel** : au moins un composant documenté, pas tous → pondération
  **renormalisée** sur les composants présents (division par la somme des
  poids présents). Le champ `completeness = 'partiel'` et le nombre de
  composants sont toujours affichés à côté du score.
- **Nul** : aucun composant documenté → score `NULL`, `completeness = 'nul'`.
  En tri décroissant, les nuls passent **en dernier**, après les partiels,
  jamais affichés comme 0.
- Tri secondaire : nombre de composants documentés décroissant, puis nom.

## Score sensoriel (distinct)
`src/sensory_scores` : couverture terpènes / effets / arômes, calculée
séparément ; elle alimente le composant « terpènes » uniquement quand
les terpènes sont documentés, sinon elle reste informative.

## Limites affichées
Les scores reposent sur des guides et données publiques, pas sur des essais
contrôlés propres au projet ; les divergences entre sources ne sont pas
tranchées par le moteur.
