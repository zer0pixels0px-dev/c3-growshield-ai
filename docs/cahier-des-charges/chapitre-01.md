# Chapitre 1 — Contexte, vision et périmètre

## 1.1 Contexte
Les informations sur les cultivars de cannabis sont dispersées entre
seedbanks, forums, journaux de culture et laboratoires, avec des noms
variables pour un même cultivar, des breeders affirmés sans preuve et
des données (THC, rendement) présentées sans source. C3 GrowShield AI
vise une base de connaissances unique, vérifiable, où chaque fait porte
sa source et son statut de vérification.

## 1.2 Vision
Devenir la référence francophone, orientée production, pour : identifier
un cultivar sans doublon, comparer des scores commerciaux explicables,
suivre une culture de la graine à la récolte, et surveiller la qualité
des données importées.

## 1.3 Périmètre v1 (inclus)
Catalogue cultivars / breeders / pedigree, profils de culture, journaux,
scores commerciaux, normalisation des alias, scraping de 5 sources
publiques, API REST, application web, modèle Power BI.

## 1.4 Hors périmètre v1 (exclu, lots suivants)
Paiement, vente en ligne, recommandation médicale, import de données
derrière connexion, application mobile native, .pbix binaire finalisé.

## 1.5 Règle fondatrice
Aucune donnée n'est inventée : un champ non documenté est `NULL` ou
« non vérifié » ; un breeder n'est affirmé que s'il est vérifié ; un
conflit de lignée est exposé, jamais tranché sans source.
Critère d'acceptation : un audit aléatoire de 100 fiches ne doit trouver
aucune valeur sans source ni statut.
