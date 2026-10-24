# Chapitre 12 — Planning, lots, risques et annexes

## 12.1 Lots réalisés
- **Lot 1 (socle v1, 2026-10-24)** : schéma 68 tables, OpenAPI 14 chemins,
  prompts, moteurs, workflows de scraping, modèle Power BI, plan du
  cahier et chapitres 1–3. Poussé sur `zer0pixels0px-dev/c3-growshield-ai`.
- **Lot 2 (2026-10-24)** : API complète sur PostgreSQL (tous les chemins
  OpenAPI), auth et rôles, tests (9 API + 7 scrapers), scrapers
  exécutables, chapitres 4–12 du cahier, modèle Power BI finalisé en
  fichiers projet (sans faux .pbix), triggers `updated_at`.
  Le cahier est donc complet en chapitres (12/12) dans sa version
  markdown concise ; sa pagination cible (232–290 pages) reste un
  objectif de mise en page, pas un nombre de pages déjà atteint.

## 12.2 Lots suivants (à valider en langage clair)
1. Authentification utilisateur complète (mots de passe hachés, sessions,
   réinitialisation) et tests contre une vraie PostgreSQL.
2. Compilation et déploiement de `apps/web` ; hébergement, CI, sauvegardes.
3. Génération du `.pbix` dans Power BI Desktop (procédure
   `powerbi/BUILD.md`) et publication du dashboard.
4. Mise en page du cahier vers 200–300 pages (si souhaitée) à partir des
   12 chapitres rédigés, sans ajout de contenu inventé.
5. Premiers runs de scraping réels, avec relecture humaine des alias
   proposés avant tout import.

## 12.3 Risques
| Risque | Mesure |
|---|---|
| Donnée inventée ou breeder affirmé sans preuve | Règle fondatrice, statuts, relecture humaine, audit |
| Blocage par une source (429, robots) | Arrêt propre, reprise, rate-limit strict, aucune contournement |
| Doublons de cultivars | Normalisation avant enrichissement, file d'alias, journal de fusions |
| Score mal compris (partiel vs complet) | Complétude et nombre de composants toujours affichés |
| Dépendance à un seul environnement | Docker local documenté, migration rejouable, seed séparé des données réelles |

## 12.4 Annexes
- Schéma : `database/schema.sql` (+ indexes, vues, fonctions, migrations).
- Contrat : `api/openapi.yaml`.
- Moteurs : `ai/normalization_engine.md`, `ai/scoring_engine.md`,
  `ai/recommendation_engine.md`.
- Scrapers : `scrapers/README.md` et `scrapers/src/`.
- Power BI : `powerbi/BUILD.md`, `powerbi/model.json`,
  `powerbi/queries/`, `powerbi/dax-measures.md`.
- Auth : `apps/api/src/auth.md`.
