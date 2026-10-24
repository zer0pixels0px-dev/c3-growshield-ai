# Workflow — Rollitup

## Source
- Site : https://www.rollitup.org
- Contenu visé : forum : journaux et discussions de culture
- Enregistrement en base : `scrape_sources.code = 'rollitup'`

## Étapes
1. **Ingestion** : lister les pages publiques dans le respect du rate-limit
   déclaré ; enregistrer un `scrape_runs` ; en cas de 429/5xx, interrompre
   proprement et reprendre au curseur.
2. **Extraction** : stocker le brut dans `scrape_items`, puis les champs
   dans `scrape_item_fields` (cultivar cité, stade, dates, mesures déclarées).
   Les mesures déclarées par un auteur sont étiquetées « déclarées », jamais
   présentées comme mesurées en laboratoire.
3. **Normalisation** : canonicalisation via `ai/normalization_engine.md` ;
   alias inconnus → `alias_proposals` en attente.
4. **Déduplication** : contrôle `(source_id, source_item_id)` puis
   correspondance canonique ; doublon → `scrape_dedup_log`.
5. **Stockage** : journaux → `grow_journals` / `journal_entries` ;
   cultivars nouveaux → fiche `non vérifié` avec `source_url`.

## Spécificités
Journaux publics et discussions ; même règle de connexion que THCFarmer.

## Respect et limites
Robots.txt respecté, rate-limit strict, aucun contournement, aucune donnée
derrière connexion. Qualité suivie dans `v_scrape_quality`.
