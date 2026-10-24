# Scrapers exécutables (lot 2)

Les workflows décrits dans `scrapers/*.md` (v1) sont maintenant du code :
`scrapers/src/run.mjs` + `scrapers/src/sources.mjs`, sans dépendance externe
(Node 20+).

## Lancer
```bash
# Toujours commencer par un dry-run (aucune requête réseau) :
node scrapers/src/run.mjs --source growdiaries --dry-run
node scrapers/src/run.mjs --source thcfarmer --dry-run
node scrapers/src/run.mjs --source rollitup --dry-run
node scrapers/src/run.mjs --source overgrow --dry-run
node scrapers/src/run.mjs --source reddit --dry-run

# Run réel, limité, sortie JSON :
node scrapers/src/run.mjs --source growdiaries --limit 20 --out out-growdiaries.json
# Cibler une page publique précise, vérifiée à la main :
node scrapers/src/run.mjs --source reddit --url https://www.reddit.com/r/exemple/ --limit 10
```

## Règles (non négociables)
- robots.txt vérifié avant toute page ; chemin interdit = arrêt, erreur explicite.
- Rate-limit strict : 30 requêtes/min par source par défaut, délai minimal
  2 000 ms ; `--delay-ms` ne peut qu'augmenter ce délai.
- 429 / 5xx / échec réseau = code de sortie 1, aucune donnée inventée.
- Sortie = liens bruts (`source_url`, `link_text`) uniquement. Aucune
  inférence de cultivar, breeder, THC ou rendement : l'import en base,
  la normalisation et la déduplication sont des étapes séparées, avec
  relecture humaine pour les alias (voir `ai/normalization_engine.md`).
- User-Agent identifié `GrowShieldBot/1.0`, jamais un faux navigateur.
  Aucun contournement (CAPTCHA, paywall, contenu derrière connexion).

## Tests
```bash
node --test scrapers/tests/run.test.mjs   # 7 tests, aucun réseau réel
```
