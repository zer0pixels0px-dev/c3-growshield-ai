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
apps/api/        API complète lot 2 (tous les chemins OpenAPI, auth/rôles, tests)
packages/types/  Types TypeScript partagés
api/openapi.yaml OpenAPI 3.0 : cultivars, breeders, journaux, recherche, scores, alias, sources
prompts/         6 prompts structurés (JSON strict, règles anti-invention)
ai/              normalization_engine, scoring_engine, recommendation_engine
scrapers/        architecture + 5 workflows + scripts exécutables (lot 2, dry-run)
powerbi/         modèle en étoile, mesures DAX, 5 pages, fichiers projet + BUILD.md (pas de .pbix binaire)
docs/cahier-des-charges/  plan + chapitres 1–12 rédigés (lot 2, version markdown concise)
STATUS.md        état v1, lots suivants, commandes de vérification
```

## Démarrage local
```bash
cp .env.example .env
docker compose up -d db
pnpm db:migrate   # schema + indexes + vues + fonctions + triggers
pnpm db:seed      # EXEMPLES fictifs uniquement, pour tester en local
pnpm dev          # web :3000, api :3001
# API seule : cd apps/api && npm run dev   # :3001
# Tests : cd apps/api && npm test ; node --test scrapers/tests/run.test.mjs
```

## Statut lot 2
Voir [STATUS.md](STATUS.md). En bref : API complète sur PostgreSQL,
auth/rôles, tests (9 API + 7 scrapers, base simulée — aucun test live
prétendu), scrapers exécutables, chapitres 4–12 du cahier, Power BI en
fichiers projet (pas de faux .pbix). Reste : auth utilisateur complète,
tests sur vraie base, déploiement web, génération du .pbix.

## Dépôt
Dépôt GitHub (créé par Alain) : `zer0pixels0px-dev/c3-growshield-ai`
(public, branche `main`). Socle v1 poussé le 2026-10-24.
