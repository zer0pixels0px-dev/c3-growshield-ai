# Architecture des scrapers (v1)

## Pipeline commun (toutes sources)
Ingestion → Extraction → Normalisation → Déduplication → Stockage

1. **Ingestion** : requête HTTP simple, User-Agent identifié « GrowShieldBot/1.0
   (contact : voir README) », respect de robots.txt, respect strict du
   `rate_limit_per_minute` de `scrape_sources` (compteurs `source_rate_limits`).
   En cas d'erreur 429 ou 5xx : arrêt du run, reprise au dernier item confirmé
   (curseur `scrape_runs` / `scrape_items`), jamais de retry agressif.
2. **Extraction** : item brut stocké tel quel dans `scrape_items.raw_payload`,
   champs extraits dans `scrape_item_fields` avec confiance d'extraction.
   Aucune page protégée par connexion, aucun contournement de protection
   anti-bot, de paywall ou de CAPTCHA.
3. **Normalisation** : voir `ai/normalization_engine.md` (règles, alias).
4. **Déduplication** : AVANT enrichissement, journalisée dans
   `scrape_dedup_log` ; doublon → `items_skipped_duplicate` du run.
5. **Stockage** : écriture idempotente sur `(source_id, source_item_id)` ;
   un second passage ne duplique jamais.

## Règles communes
- Licence et attribution : URL source conservée sur chaque fiche importée.
- Données personnelles : aucun pseudo utilisateur importé sans nécessité,
  et jamais affiché publiquement sans anonymisation (lot 2).
- Arrêt propre : chaque run enregistre `started_at`, `finished_at`, `status`,
  compteurs et `error_message`.

## Fiches par source
GrowDiaries, THCFarmer, Rollitup, Overgrow, Reddit : voir les fichiers dédiés.
