# C3 GrowShield AI

Base de connaissances cultivars, journaux de culture et scores commerciaux
— données vérifiées uniquement, en français (fr-FR).

## Vision
Un cultivar = une fiche canonique, sans doublon ; chaque fait porte sa
source et son statut (« vérifié », « non vérifié », « contesté »).
Aucun breeder, THC, rendement ou prix n'est jamais inventé : ce qui n'est
pas documenté s'affiche « non documenté » ou `NULL`.

## Arborescence
```
database/        schema.sql (68 tables), indexes.sql, views.sql, functions.sql, seed_data.sql (EXEMPLES seulement)
apps/web/        Next.js : accueil + /catalogue branché sur l'API
apps/api/        Service API (squelette, contrat dans api/openapi.yaml)
packages/types/  Types TypeScript partagés
api/openapi.yaml OpenAPI 3.0 : cultivars, breeders, journaux, recherche, scores, alias, sources
prompts/         6 prompts structurés (JSON strict, règles anti-invention)
ai/              normalization_engine, scoring_engine, recommendation_engine
scrapers/        architecture + 5 workflows (GrowDiaries, THCFarmer, Rollitup, Overgrow, Reddit)
powerbi/         modèle en étoile, mesures DAX, 5 pages (pas de .pbix binaire en v1)
docs/cahier-des-charges/  plan 232–290 pages + chapitres 1–3 rédigés
STATUS.md        état v1, lots suivants, commandes de vérification
```

## Démarrage local
```bash
cp .env.example .env.local
docker compose up -d db
pnpm db:migrate   # schema + indexes + vues + fonctions
pnpm db:seed      # EXEMPLES fictifs uniquement, pour tester en local
pnpm dev          # web :3000, api :3001
```

## Statut v1 et lots suivants
Voir [STATUS.md](STATUS.md). En bref : socle livré (schéma, OpenAPI,
prompts, moteurs, scrapers, Power BI, plan du cahier). Reste, lots 2+ :
implémentation complète de l'API sur PostgreSQL, auth, tests, chapitres
4–12 du cahier, .pbix finalisé, scrapers exécutables.

## Dépôt
Dépôt GitHub (créé par Alain) : `zer0pixels0px-dev/c3-growshield-ai`
(public, branche `main`). Ce socle est prêt à pousser ; aucun push n'a
été effectué par l'agent.
