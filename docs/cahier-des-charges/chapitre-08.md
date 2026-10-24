# Chapitre 8 — API REST et sécurité

## 8.1 Contrat
- **EX-8.1** Contrat OpenAPI 3.0 (`api/openapi.yaml`, 14 chemins) :
  cultivars, breeders, journaux et entrées, recherche, scores,
  alias et propositions, sources et runs, santé. L'implémentation lot 2
  (`apps/api/src/app.ts`) couvre tous ces chemins, branchés sur
  PostgreSQL via le pool `pg` et `DATABASE_URL`.
- **EX-8.2** Pagination : `page` (≥ 1), `per_page` (1–100, défaut 20),
  total renvoyé ; tri `score_desc` (scores NULL en dernier) ou
  `name_asc`. Recherche : `q` d'au moins 2 caractères, sur nom,
  canonique et alias.
- **EX-8.3** Erreurs propres : 400 (validation), 401 (jeton manquant ou
  invalide), 403 (rôle insuffisant), 404 (introuvable), 409 (conflit
  d'unicité), 503 (base ou auth non configurée), jamais de pile
  technique exposée au client.

## 8.2 Authentification et rôles (lot 2)
- **EX-8.4** Jeton signé HMAC-SHA256 avec `AUTH_SECRET` en variable
  d'environnement (voir `apps/api/src/auth.md`) ; rôles admin, editor,
  grower, reader ; admin passe partout, editor écrit, reader lit et
  propose des alias (file de validation, jamais d'écriture directe).
- **EX-8.5** Écritures protégées : création et mise à jour = editor ou
  admin ; suppression d'un cultivar = admin uniquement ; proposition
  d'alias = tout jeton valide ; acceptation ou rejet = editor ou admin
  (avec insertion dans `cultivar_aliases` en cas d'acceptation).
- **EX-8.6** Délivrance des jetons : `POST /auth/token` protégé par
  `AUTH_ADMIN_KEY` ; aucun secret en dur, aucun mot de passe réel dans
  ce module (voir la limite ci-dessous).
- **EX-8.7** Le statut de vérification d'un breeder n'est pas modifiable
  par un PATCH libre : il reflète une vérification sourcée.

## 8.3 Limites et chantiers suivants
- Authentification utilisateur complète (hachage de mot de passe,
  sessions révocables en base, réinitialisation) : hors lot 2, listée
  dans STATUS.md. Sans `AUTH_SECRET`, les écritures répondent 503,
  jamais de contournement.
- Les routes de lecture restent publiques dans cette version : le
  catalogue est une base de connaissances, pas un espace privé.

## 8.4 Critères d'acceptation
Tests d'auth (401 / 403 / 201 / 204 selon le rôle), de validation et de
pagination : tous passent en lot 2 avec une base simulée (voir chapitre 11).
