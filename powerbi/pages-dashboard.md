# Power BI — 5 pages de dashboard (v1)

## 1. Marché
Prix médians observés par cultivar (devise + unité filtrées), évolution
dans le temps (DimDate), nombre de listings. Aucun prix estimé.

## 2. Catalogue
Table des cultivars (nom, breeder + statut de vérification, type,
THC documenté ou « non documenté », floraison, difficulté), filtres
breeder / type / difficulté, recherche par nom et alias.

## 3. Scores
Distribution des scores commerciaux, top cultivars scorés, part des
scores nuls (couverture), détail des composants pondérés
(rendement 35 %, terpènes 20 %, vigueur 15 %, moisissure 10 %,
bag appeal 10 %, marché 10 %).

## 4. Culture
Cycles par setup, durées de floraison, rendements déclarés vs mesurés,
observations sanitaires (plant_observations) par type et sévérité,
journaux publics importés.

## 5. Scraping / qualité
Runs par source (v_scrape_quality), taux de doublons, file d'alias
en attente, items nouveaux vs mis à jour, erreurs de run.
Cette page pilote la qualité des données, pas le volume brut.
