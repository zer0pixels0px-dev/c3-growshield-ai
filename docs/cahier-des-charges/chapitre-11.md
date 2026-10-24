# Chapitre 11 — Plan de test, déploiement et exploitation

## 11.1 Tests (lot 2)
- **EX-11.1** API : 9 tests automatisés (`apps/api/tests/api.test.ts`,
  lanceur `npm test` dans `apps/api`) — santé, liste paginée, validation,
  auth et rôles, recalcul de score, proposition d'alias, scoring pur,
  normalisation pure. Tous passent en lot 2.
- **EX-11.2** Scrapers : 7 tests (`scrapers/tests/run.test.mjs`) — dry-run
  des 5 sources, rate-limit, robots, extraction, 429. Tous passent en
  lot 2, sans aucun réseau réel.
- **EX-11.3** Honnêteté des tests : la suite API utilise une base
  SIMULÉE (faux pool), pas une vraie PostgreSQL. Un test contre une
  vraie base exige `docker compose up -d db`, `pnpm db:migrate` et
  `pnpm db:seed`, et n'est pas prétendu ici. Cette limite est écrite
  dans STATUS.md et dans l'en-tête du fichier de test.
- **EX-11.4** Vérifications statiques : `tsc --noEmit` pour `apps/api`
  (passe en lot 2) ; `next build` pour `apps/web` (passe en lot 2 :
  routes `/` et `/catalogue`).

## 11.2 Déploiement
- **EX-11.5** En local : `docker compose up -d db`, `pnpm db:migrate`,
  `pnpm db:seed` (EXEMPLES uniquement), puis `pnpm dev`
  (web :3000, api :3001) ; ou, pour l'API seule :
  `cd apps/api && npm run dev` (port `API_PORT`, défaut 3001).
- **EX-11.6** En lot 2, les dépendances `apps/api` (100 paquets) et
  `apps/web` (27 paquets) ont été installées avec npm, et les deux
  builds passent (`tsc` pour l'API, `next build` pour le web).
- **EX-11.7** Hébergement de production, CI et sauvegardes de la base :
  hors lot 2, à décider avant toute mise en ligne (pas de déploiement
  improvisé avec les exemples du seed).

## 11.3 Exploitation
- **EX-11.8** Surveillance : santé (`/health`, avec état de la base),
  page Power BI « Scraping / qualité », file `alias_proposals` en
  attente (à traiter par un éditeur), historique des scores
  (`score_history`) pour tracer toute dérive.
- **EX-11.9** Sauvegarde : dumps PostgreSQL réguliers avant toute
  migration ; une migration est rejouable et, pour les triggers,
  idempotente.
