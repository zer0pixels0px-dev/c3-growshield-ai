# Chapitre 6 — Scraping : sources, conformité, qualité

## 6.1 Sources déclarées
- **EX-6.1** Sources autorisées (`scrape_sources`) : GrowDiaries,
  THCFarmer, Rollitup, Overgrow, Reddit (codes et limites en base).
  Chaque run (`scrape_runs`) enregistre début, fin, statut, compteurs
  et message d'erreur ; chaque item brut est conservé
  (`scrape_items.raw_payload`) avec son URL source.
- **EX-6.2** En lot 2, les 5 workflows sont du code exécutable
  (`scrapers/src/run.mjs`, sans dépendance externe) : dry-run sans
  réseau, puis run réel limité.

## 6.2 Conformité (non négociable)
- **EX-6.3** robots.txt vérifié avant toute page ; chemin interdit =
  arrêt avec erreur explicite, aucune donnée collectée.
- **EX-6.4** Rate-limit strict : délai minimal 60 000 / limite par minute
  (2 000 ms à 30 req/min) ; un délai personnalisé ne peut que l'augmenter.
- **EX-6.5** 429 / 5xx / échec réseau = arrêt propre, reprise au dernier
  item confirmé, jamais de retry agressif.
- **EX-6.6** Aucun contournement : pas de CAPTCHA, pas de paywall, pas de
  contenu derrière connexion, User-Agent identifié `GrowShieldBot/1.0`,
  jamais un faux navigateur.
- **EX-6.7** Données personnelles : aucun pseudo importé sans nécessité,
  jamais affiché publiquement sans anonymisation ; licence et attribution
  conservées (URL source sur chaque fiche importée).

## 6.3 Qualité
- **EX-6.8** Écriture idempotente sur `(source_id, source_item_id)` ;
  un second passage ne duplique jamais. Les doublons alimentent
  `items_skipped_duplicate` et la vue `v_scrape_quality` (taux de doublons,
  file d'alias en attente, erreurs de run) — c'est la page Power BI
  « Scraping / qualité ».
- **EX-6.9** Sortie du scraper = liens bruts uniquement : aucune inférence
  de cultivar, breeder, THC ou rendement. L'import, la normalisation et
  la déduplication sont des étapes séparées, avec relecture humaine.

## 6.4 Critères d'acceptation
Dry-run des 5 sources sans réseau ; tests robots, rate-limit, 429 et
extraction (7 tests, `scrapers/tests/run.test.mjs`, tous passent en lot 2).
