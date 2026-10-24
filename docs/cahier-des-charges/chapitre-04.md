# Chapitre 4 — Exigences fonctionnelles : culture, journaux, GrowShield

## 4.1 Cycles et configurations
- **EX-4.1** Un cycle (`grow_cycles`) appartient à un utilisateur, référence
  un cultivar et une configuration (`grow_setups`, `grow_rooms`), avec
  dates de début et de fin, et un statut parmi planifié, en cours,
  récolté, abandonné.
- **EX-4.2** Une configuration décrit le type (intérieur, serre, extérieur),
  le substrat, l'éclairage et la taille de tente ; les pièces sont des
  zones de mesure (`grow_rooms`).

## 4.2 Journaux et mesures
- **EX-4.3** Un journal (`grow_journals`) est manuel ou importé
  (`source_platform` parmi growdiaries, thcfarmer, rollitup, overgrow,
  reddit, manuel) ; ses entrées (`journal_entries`) sont datées, avec
  stade de croissance, semaine, hauteur et note.
- **EX-4.4** Les apports (`feeding_events`, `nutrient_schedules`) et les
  mesures d'ambiance (`environmental_readings` : température, humidité,
  CO2, VPD) sont enregistrés tels que mesurés ou saisis, jamais recalculés
  en douce : une mesure déclarée reste étiquetée déclarée.
- **EX-4.5** Récolte (`harvests`), séchage et curing
  (`drying_curing_logs`) sont suivis par cycle, avec poids humide, sec
  et de taille quand ils sont mesurés (NULL sinon).

## 4.3 GrowShield : observations sanitaires
- **EX-4.6** Une observation (`plant_observations`) porte un type
  (maladie, ravageur, carence, brûlure, moisissure, autre), une sévérité
  et une date de résolution ; les analyses de photos (`photo_analyses`)
  conservent modèle, version de prompt, résultat JSON et relecture humaine.
- **EX-4.7** Un conseil de culture (`cultivation_tips`) indique son type
  de source (guide, essai, communauté) et son URL ; un conseil d'essai
  contrôlé n'existe que s'il est sourcé.

## 4.4 Critères d'acceptation
Création d'un cycle complet par l'API, ajout d'entrées datées, consultation
d'un journal avec ses entrées ; un journal importé conserve toujours son
`source_url` ; aucune mesure inventée n'apparaît quand le champ est NULL.
