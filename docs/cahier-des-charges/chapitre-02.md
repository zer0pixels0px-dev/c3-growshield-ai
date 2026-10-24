# Chapitre 2 — Parties prenantes et utilisateurs

## 2.1 Parties prenantes
- **C3 / équipe GrowShield** : propriétaire du produit, valide les règles
  de vérification et les sources autorisées.
- **Techniciens de culture** : utilisateurs principaux, saisissent cycles
  et journaux, consultent fiches et scores.
- **Éditeurs de données** : valident alias, fusions et conflits de lignée.
- **Lecteurs** : consultent catalogue et dashboards sans écrire.

## 2.2 Personas et besoins
| Persona | Besoin principal | Exigence associée |
|---|---|---|
| Technicien | Retrouver un cultivar sans doublon, comparer vite | EX-3.1, recherche par alias |
| Technicien | Suivre son cycle, ses apports, sa récolte | Chapitre 4 (planifié) |
| Éditeur | Valider les alias proposés par les scrapers | EX-3.4, file alias_proposals |
| Lecteur | Lire un score et comprendre ses composants | Chapitre 5 (planifié) |

## 2.3 Rôles applicatifs
`admin`, `editor`, `grower`, `reader` (table `roles`). Toute écriture
sensible (fusion, import) est journalisée dans `audit_logs`.
Critère d'acceptation : un `reader` ne peut ni créer ni modifier une fiche.
