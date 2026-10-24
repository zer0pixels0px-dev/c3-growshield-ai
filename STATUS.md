# STATUS — C3 GrowShield AI (lot 2, 2026-10-24)

## Livré en v1 (2026-10-24)
- `database/schema.sql` : 68 tables PostgreSQL, chacune avec clé primaire
  UUID, created_at/updated_at et commentaires.
- `api/openapi.yaml` : OpenAPI 3.0, 14 chemins.
- `prompts/`, `ai/` (normalisation, scoring 35/20/15/10/10/10, recommandation).
- `scrapers/` : architecture + 5 workflows.
- `powerbi/` : modèle en étoile, mesures DAX, 5 pages.
- `docs/cahier-des-charges/` : plan + chapitres 1–3.

## Livré en lot 2 (2026-10-24) — NE PAS POUSSER depuis ce dossier sans relecture du parent
- **API complète** (`apps/api/src/app.ts`, v0.2.0) : tous les 14 chemins
  OpenAPI branchés sur PostgreSQL (pool `pg`, `DATABASE_URL`) —
  cultivars, breeders, journaux et entrées, recherche, scores,
  alias et propositions, sources et runs, santé. Pagination,
  validation, erreurs propres. Utilise `v_cultivar_scores` pour le
  catalogue et `compute_commercial_score` (miroir TypeScript dans
  `src/scoring.ts`) pour le recalcul. NULL = non documenté, jamais inventé.
- **Auth/rôles** (`apps/api/src/auth.ts`, doc `src/auth.md`) : jeton
  HMAC-SHA256 avec `AUTH_SECRET` en variable d'environnement, rôles
  admin/editor/grower/reader. Écritures = editor ou admin, suppression
  cultivar = admin, proposition d'alias = tout jeton valide, validation
  d'alias = editor ou admin. Délivrance via `POST /auth/token`
  (protégé par `AUTH_ADMIN_KEY`). `.env.example` mis à jour.
  Aucun secret en dur, aucun mot de passe réel dans ce module.
- **Tests** : API 9/9 (`apps/api/tests/api.test.ts`, `npm test` dans
  `apps/api`) et scrapers 7/7 (`scrapers/tests/run.test.mjs`).
  **Limite honnête : les tests API utilisent une base SIMULÉE
  (faux pool), pas une vraie PostgreSQL.** Aucun test live n'est
  prétendu : il n'y avait ni `psql` ni Docker dans cet environnement.
  Un test live exige `docker compose up -d db` + `pnpm db:migrate`.
- **Scrapers exécutables** (`scrapers/src/run.mjs`, `sources.mjs`,
  `scrapers/README.md`) : 5 sources, dry-run sans réseau, robots.txt
  vérifié, rate-limit strict (2 000 ms à 30 req/min), 429/5xx = erreur
  explicite, sortie = liens bruts uniquement, aucune inférence.
- **Cahier des charges** : chapitres 4–12 rédigés
  (`docs/cahier-des-charges/chapitre-04.md` à `chapitre-12.md`),
  plan mis à jour : 12/12 chapitres rédigés en version markdown concise
  (3 247 mots au total). **La cible 232–290 pages reste un objectif
  de mise en page, pas un nombre de pages atteint.**
- **Power BI finalisé en fichiers projet** : `powerbi/model.json`,
  `powerbi/queries/*.m`, `powerbi/measures.dax`, procédure
  `powerbi/BUILD.md`. **AUCUN .pbix binaire livré ni prétendu** :
  le .pbix ne peut être généré que dans Power BI Desktop (voir BUILD.md).
- **Triggers** : `database/migrations/002_updated_at_triggers.sql`
  (idempotente) ; `pnpm db:migrate` l'applique après les fonctions.

## Reste (lots suivants, à valider en langage clair)
1. Authentification utilisateur complète (mots de passe hachés, sessions
   révocables en base, réinitialisation) — le module lot 2 ne vérifie
   aucun mot de passe.
2. Tests contre une vraie PostgreSQL (docker + psql indisponibles ici).
3. Déploiement de `apps/web` (compilation vérifiée en lot 2) ;
   hébergement, CI, sauvegardes.
4. Génération du `.pbix` dans Power BI Desktop (procédure BUILD.md).
5. Mise en page du cahier vers 200–300 pages, si souhaitée, sans
   contenu inventé.
6. Premiers runs de scraping réels, avec relecture humaine des alias.

## Vérifications lot 2
```bash
grep -c "CREATE TABLE" database/schema.sql   # 68
python3 -c "import yaml; d=yaml.safe_load(open('api/openapi.yaml')); print(len(d['paths']))"  # 14
cd apps/api && npx tsc --noEmit              # passe (lot 2)
cd apps/api && npm test                      # 9/9, base simulée
node --test scrapers/tests/run.test.mjs      # 7/7, aucun réseau réel
node scrapers/src/run.mjs --source growdiaries --dry-run
```

## Vérification apps/web
`apps/web` a été compilé avec succès en lot 2 (`npm run build` dans
`apps/web` : routes `/` et `/catalogue` générées, 5 pages statiques).
Next a reconfiguré `apps/web/tsconfig.json` lors du build (options
standard) et généré `next-env.d.ts` ; ces deux fichiers font partie
du lot 2. Reste, avant déploiement : hébergement, CI, sauvegardes.

## Lancer l'API en local
```bash
cp .env.example .env            # puis renseigner DATABASE_URL, AUTH_SECRET, AUTH_ADMIN_KEY
docker compose up -d db
pnpm db:migrate                 # schema + indexes + vues + fonctions + triggers
pnpm db:seed                    # EXEMPLES fictifs uniquement
cd apps/api && npm run dev      # API sur :3001 (API_PORT)
# Exemple : curl http://localhost:3001/health
# Jeton : POST /auth/token avec X-Admin-Key, puis Authorization: Bearer <jeton>
```

## Push GitHub
Dépôt : `zer0pixels0px-dev/c3-growshield-ai` (public, `main`).
Lot 1 poussé et vérifié le 2026-10-24. **Lot 2 non poussé par l'agent
qui l'a construit : à pousser par le parent après vérification.**
