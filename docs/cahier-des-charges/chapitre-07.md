# Chapitre 7 — Architecture technique et base de données

## 7.1 Vue d'ensemble
- **EX-7.1** Monorepo Turborepo + pnpm : `apps/web` (Next.js),
  `apps/api` (Express + pg), `packages/types` (types partagés),
  `database/` (PostgreSQL 16), `scrapers/` (Node sans dépendance),
  `powerbi/` (modèle et mesures), `docs/` (ce cahier).
- **EX-7.2** PostgreSQL 16 en local via `docker-compose.yml`
  (service `db`, volume `pgdata`) ; `DATABASE_URL` en variable
  d'environnement, jamais en dur dans le code.

## 7.2 Base de données (68 tables)
- **EX-7.3** Chaque table a une clé primaire UUID, `created_at` /
  `updated_at` et un commentaire. Domaines : rôles et utilisateurs,
  breeders, cultivars et alias, pedigree, phénotypes et sensoriel, labo,
  culture, médias et IA, scraping, scores et marché, communauté et audit.
- **EX-7.4** Contraintes clés : unicité du `canonical_name`, interdiction
  de l'auto-parenté, fourchettes THC/CBD 0–100 avec min ≤ max, statuts
  de vérification en liste fermée, prix toujours avec devise, unité et
  date d'observation.
- **EX-7.5** Vues : `v_cultivar_scores` (catalogue + score, utilisée par
  l'API et Power BI), `v_cultivar_catalogue`, `v_scrape_quality`,
  `v_top_terpenes`. Fonctions : `compute_commercial_score()`,
  `set_updated_at()` et, en lot 2, triggers `updated_at` sur toutes les
  tables concernées (`database/migrations/002_updated_at_triggers.sql`,
  idempotente).
- **EX-7.6** Migration : `pnpm db:migrate` applique dans l'ordre
  schema, indexes, vues, fonctions, triggers ; `pnpm db:seed` n'insère
  que des EXEMPLES fictifs, jamais présentés comme réels, à supprimer
  avant tout import réel.

## 7.3 Critères d'acceptation
Schéma compté à 68 tables (objectif 50+) ; migration rejouable ;
aucune table sans commentaire ; aucune donnée réelle inventée dans le seed.
