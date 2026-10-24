# STATUS — Socle v1 C3 GrowShield AI (2026-10-24)

## Livré en v1
- `database/schema.sql` : 68 tables PostgreSQL (objectif : 50+), chacune
  avec clé primaire UUID, created_at/updated_at et commentaires.
- `database/indexes.sql`, `views.sql` (dont `v_cultivar_scores`),
  `functions.sql` (`compute_commercial_score`), `seed_data.sql`
  (EXEMPLES fictifs uniquement, jamais présentés comme réels).
- Turborepo / Next.js : `turbo.json`, `package.json` racine,
  `apps/web` (accueil + `/catalogue` branché sur l'API via `lib/api.ts`),
  `apps/api` (squelette, contrat réel dans l'OpenAPI),
  `packages/types`, `tsconfig`, `.env.example`, `docker-compose.yml`.
- `api/openapi.yaml` : OpenAPI 3.0 (cultivars, breeders, journaux,
  recherche, scores, alias/normalisation, sources).
- `prompts/` : 6 prompts structurés, JSON strict, règles anti-invention.
- `ai/` : normalisation (déduplication avant enrichissement), scoring
  (35/20/15/10/10/10, partiels renormalisés, nuls en dernier),
  recommandation.
- `scrapers/` : architecture + 5 workflows, rate-limit, pas de contournement.
- `powerbi/` : modèle en étoile, mesures DAX, 5 pages. Pas de `.pbix`
  binaire en v1 (décrit, non prétendu).
- `docs/cahier-des-charges/` : plan 232–290 pages + chapitres 1–3 rédigés.
  Les chapitres 4–12 sont planifiés, pas rédigés — le cahier n'est pas complet.

## Reste (lots 2+)
1. Implémentation API complète sur PostgreSQL + auth/rôles + tests.
2. Scrapers exécutables (code, pas seulement workflows).
3. Chapitres 4–12 du cahier + .pbix Power BI finalisé.
4. Triggers `updated_at` sur toutes les tables (utilitaire fourni).
5. Déploiement (hébergement DB, CI).

## Vérification
```bash
grep -c "CREATE TABLE" database/schema.sql   # attendu : >= 50
python3 -c "import yaml; yaml.safe_load(open('api/openapi.yaml')); print('openapi OK')"
find . -type f | sort
```

## Push GitHub
Dépôt : `zer0pixels0px-dev/c3-growshield-ai` (public, `main`, créé par
Alain, vide à la création). Aucun push effectué par l'agent — à pousser
par le parent / Alain depuis ce dossier.
