# Chapitre 9 — Interface : web, dashboards Power BI

## 9.1 Application web
- **EX-9.1** `apps/web` (Next.js) : page d'accueil et page `/catalogue`
  branchée sur l'API (`lib/api.ts`). En l'absence d'API, la page affiche
  un état vide explicite, jamais de données inventées comme réelles.
- **EX-9.2** Une fiche affiche : nom, breeder + statut de vérification,
  score commercial ou « non documenté », nombre de composants quand le
  score est partiel. Les scores nuls ne s'affichent jamais comme 0.
- **EX-9.3** Recherche par nom ou alias, avec le même tri que l'API
  (score décroissant, nuls en dernier).

## 9.2 Dashboards Power BI (lot 2, sans faux .pbix)
- **EX-9.4** Modèle en étoile finalisé (`powerbi/model.json` et
  `powerbi/queries/`) : faits `FactScores`, `FactLabResults`,
  `FactMarketPrices`, `FactScrapeRuns`, `FactGrowCycles` ; dimensions
  `DimCultivar`, `DimBreeder`, `DimTerpene`, `DimAroma`, `DimEffect`,
  `DimSource`, `DimDate`. Sources recommandées : `v_cultivar_scores`,
  `v_cultivar_catalogue`, `v_scrape_quality`.
- **EX-9.5** Mesures DAX complétées (`powerbi/dax-measures.md` + fichiers
  `.dax`) : score moyen (nuls ignorés), cultivars scorés, part des
  scores nuls, prix médian observé, taux de doublons, rendement moyen
  déclaré, couverture terpènes/effets/arômes.
- **EX-9.6** 5 pages : Marché, Catalogue, Scores, Culture, Scraping /
  qualité (voir `powerbi/pages-dashboard.md`).
- **EX-9.7** Aucun fichier `.pbix` binaire n'est fabriqué dans ce dépôt :
  la procédure de génération dans Power BI Desktop est documentée dans
  `powerbi/BUILD.md`, et cette limite est rappelée dans STATUS.md.
  Un `.pbix` prétendu sans génération réelle serait une fausse preuve.

## 9.3 Critères d'acceptation
Catalogue web lisible avec et sans API ; modèle Power BI importable
depuis les fichiers projet ; mesures DAX nommées, avec leur définition
et leur filtre attendu.
