# Power BI — Modèle de données (v1)

> Ce dossier décrit un modèle à construire dans Power BI Desktop, pas un
> fichier `.pbix` binaire (aucun binaire n'est livré en v1, et aucun
> `.pbix` ne doit être prétendu existant).

## Modèle en étoile
- **Faits** : `FactScores` (commercial_scores + score_components),
  `FactLabResults` (lab_results + cannabinoïdes), `FactMarketPrices`
  (market_prices), `FactScrapeRuns` (scrape_runs), `FactGrowCycles`
  (grow_cycles + harvests).
- **Dimensions** : `DimCultivar` (cultivars + v_cultivar_catalogue),
  `DimBreeder` (breeders), `DimTerpene`, `DimAroma`, `DimEffect`,
  `DimSource` (scrape_sources), `DimDate` (calendrier généré).
- **Relations** : chaque fait → DimCultivar (plusieurs-à-un, filtre simple) ;
  FactScores → DimCultivar ; FactMarketPrices → DimCultivar (optionnel,
  un listing peut ne pas être rattaché) ; DimDate → tous les faits datés.

## Import
Connexion PostgreSQL directe ou import planifié (lot 2) ; vues sources
recommandées : `v_cultivar_scores`, `v_cultivar_catalogue`, `v_scrape_quality`.
Rafraîchissement : quotidien pour le marché et le scraping, hebdomadaire
pour les scores (recalculés uniquement quand les composants changent).

## Règles d'affichage
Score `NULL` affiché « non documenté », trié en dernier ; breeder
« non vérifié » affiché tel quel ; prix uniquement avec devise, unité et
date d'observation.
