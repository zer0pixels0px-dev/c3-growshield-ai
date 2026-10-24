# Moteur de normalisation génétique (v1)

## Principe
Un cultivar = une fiche canonique. Toute variante orthographique devient un alias,
jamais une nouvelle fiche. **La déduplication a lieu AVANT tout enrichissement**
(terpènes, effets, scores) : enrichir deux fiches du même cultivar est l'erreur à éviter.

## Pipeline
1. **Nettoyage** : minuscules, suppression des accents pour la comparaison,
   espaces multiples → un espace, suppression des caractères décoratifs.
2. **Règles ordonnées** (`canonical_name_rules`, par `priority`) : ex.
   `gsc` → `girl scout cookies`, `rs11` → `rs-11`, `thin mint gsc` → `girl scout cookies`.
   Les règles sont versionnées en base, pas codées en dur.
3. **Recherche** : correspondance exacte sur `canonical_name`, puis sur
   `cultivar_aliases.alias`, puis similarité trigramme (pg_trgm) avec seuil
   documenté dans la configuration du run.
4. **Décision** : correspondance exacte → fusion ; similarité élevée mais
   non exacte → `alias_proposals` (statut `en attente`, validation humaine) ;
   aucune correspondance → création d'une fiche `non vérifié`.
5. **Traçabilité** : chaque fusion est journalisée dans `cultivar_merges` et
   `scrape_dedup_log` (run, nom entrant, décision).

## Règles anti-invention
- Un alias proposé n'est jamais accepté automatiquement s'il change le breeder
  ou la lignée : relecture humaine obligatoire.
- Un conflit de lignée est enregistré dans `lineage_conflicts`, jamais tranché
  par le moteur seul.
- Les noms de breeders suivent le même pipeline (`breeder_aliases`,
  breeder d'origine `non vérifié` par défaut).

## Exemples de règles (documentation, pas des données réelles)
| Entrée | Canonique |
|---|---|
| `gsc`, `thin mint gsc` | `girl scout cookies` |
| `rs11` | `rs-11` |

## Métriques
Taux de doublons par run (`v_scrape_quality`), file `alias_proposals` en attente,
nombre de fusions par run.
