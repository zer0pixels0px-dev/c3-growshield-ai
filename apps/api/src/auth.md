# Authentification et rôles (lot 2)

## Principe
- Jeton signé HMAC-SHA256, secret dans `AUTH_SECRET` (jamais en dur, jamais commité).
- Format : `base64url(JSON {sub, roles, exp}).base64url(signature)`, validité 24 h.
- Rôles : `admin` (tout), `editor` (écritures), `grower` (écritures journaux
  via les mêmes routes editor dans cette version), `reader` (lecture + propositions d'alias).

## Règles appliquées
| Route | Rôle requis |
|---|---|
| GET (lecture, recherche, scores, sources) | aucun jeton |
| POST / PATCH cultivars, breeders, journaux, entrées, recalcul score | editor ou admin |
| DELETE /cultivars/{id} | admin uniquement |
| POST /cultivars/{id}/aliases (proposition, file de validation) | tout jeton valide |
| PATCH /alias-proposals/{id} | editor ou admin |
| Sans AUTH_SECRET | les écritures répondent 503, jamais de contournement |

## Délivrer un jeton (environnement de déploiement, pas en production publique)
```bash
curl -X POST http://localhost:3001/auth/token \
  -H "X-Admin-Key: <AUTH_ADMIN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<uuid-utilisateur>", "roles": ["editor"]}'
```
Puis : `Authorization: Bearer <jeton>`. Pour un jeton en développement,
le même code existe dans `src/auth.ts` (`signToken`) ; ne jamais
distribuer AUTH_ADMIN_KEY ni AUTH_SECRET.

## Ce que ce module ne fait pas
Il ne vérifie aucun mot de passe et ne remplace pas une authentification
utilisateur complète (table `users.password_hash`, hachage scrypt/bcrypt,
réinitialisation, révocation en base via `user_sessions`) : c'est un
chantier distinct, listé dans STATUS.md (lots suivants).
