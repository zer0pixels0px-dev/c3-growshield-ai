# Générer le .pbix dans Power BI Desktop (lot 2)

> Limite honnête : ce dépôt ne contient AUCUN fichier `.pbix` binaire.
> Le `.pbix` ne peut être créé que dans Power BI Desktop (Windows),
> à partir des fichiers projet ci-dessous. Ne jamais présenter un autre
> fichier comme un `.pbix` généré.

## Prérequis
- Base PostgreSQL accessible (en local : `docker compose up -d db`,
  puis `pnpm db:migrate` ; sans base, les requêtes échouent — c'est
  normal, il n'y a pas de données de démonstration inventées).
- Power BI Desktop installé.

## Étapes
1. Ouvrir Power BI Desktop, créer un classeur vide.
2. Obtenir des données → Base de données PostgreSQL → serveur
   `localhost`, base `growshield` (adapter à votre hébergement).
3. Pour chaque table, coller la requête M correspondante depuis
   `powerbi/queries/` (éditeur avancé) : `DimCultivar`, `DimDate`,
   `FactScores`, `FactMarketPrices`, `FactScrapeRuns`, `FactGrowCycles`.
   Importer aussi les tables simples `breeders`, `terpenes`, `aromas`,
   `effects`, `scrape_sources` (requêtes directes sur ces tables).
4. Créer les relations décrites dans `powerbi/model.json`
   (chaque fait → `DimCultivar`, faits datés → `DimDate`, runs →
   `DimSource`, filtre simple).
5. Créer les mesures depuis `powerbi/measures.dax` (et
   `powerbi/dax-measures.md`) dans les tables indiquées.
6. Construire les 5 pages décrites dans `powerbi/pages-dashboard.md`
   (Marché, Catalogue, Scores, Culture, Scraping / qualité).
7. Appliquer les règles d'affichage : score NULL = « non documenté »
   (jamais 0), breeder « non vérifié » affiché tel quel, prix toujours
   avec devise, unité et date.
8. Enregistrer sous `C3-GrowShield-AI.pbix` (fichier local, non commité
   par défaut : un `.pbix` contient les données importées).
9. Actualiser : marché et scraping quotidiens, scores hebdomadaires
   (ou quand les composants changent).

## Vérification
Après actualisation, contrôler : nombre de cultivars = nombre de lignes
de `v_cultivar_catalogue` ; part des scores nuls cohérente avec
`completeness = 'nul'` en base ; aucun prix sans devise ni unité.
