# Power BI — Mesures DAX (v1)

```dax
-- Score moyen, en ignorant les scores nuls (BLANK)
Score moyen =
AVERAGE ( FactScores[score] )

-- Nombre de cultivars avec un score documenté
Cultivars scorés =
CALCULATE (
    DISTINCTCOUNT ( FactScores[cultivar_id] ),
    NOT ISBLANK ( FactScores[score] )
)

-- Part des cultivars à score nul (à surveiller : couverture des données)
Part score nul =
DIVIDE (
    CALCULATE (
        DISTINCTCOUNT ( DimCultivar[cultivar_id] ),
        ISBLANK ( RELATED ( FactScores[score] ) )
    ),
    DISTINCTCOUNT ( DimCultivar[cultivar_id] )
)

-- Prix médian observé (par devise et unité : filtrer avant lecture)
Prix médian observé =
MEDIAN ( FactMarketPrices[price_amount] )

-- Taux de doublons scraping
Taux doublons scraping =
DIVIDE (
    SUM ( FactScrapeRuns[items_skipped_duplicate] ),
    SUM ( FactScrapeRuns[items_fetched] )
)

-- Rendement moyen déclaré (données déclarées, pas mesurées en labo)
Rendement moyen déclaré =
AVERAGE ( FactGrowCycles[yield_indoor_g_m2] )
```

Note : `RELATED` suppose la relation active FactScores → DimCultivar ;
adapter les noms de tables/colonnes aux noms réels après import.

## Lot 2
Mesures complétées dans `measures.dax` (fichier DAX copiable) :
score moyen, cultivars scorés, part score nul, prix médian observé,
nombre de listings, taux doublons scraping, rendement sec moyen.
Modèle finalisé en fichiers projet : `model.json`, `queries/*.m`,
procédure `BUILD.md`. Aucun .pbix binaire livré (voir BUILD.md).
