# Chapitre 10 — Exigences non fonctionnelles

## 10.1 Performance
- **EX-10.1** Listes paginées (défaut 20, max 100) ; index sur les clés
  de recherche (noms canoniques, alias, scores) ; vues matérialisables
  si le volume l'exige (chantier ultérieur, pas de promesse de chiffre
  sans mesure).
- **EX-10.2** Scraping : un seul run par source à la fois, délai minimal
  respecté, reprise sur panne au dernier item confirmé.

## 10.2 Sécurité et confidentialité
- **EX-10.3** Aucun secret en dur, aucun mot de passe en clair
  (`users.password_hash` uniquement) ; variables d'environnement pour
  `DATABASE_URL`, `AUTH_SECRET`, `AUTH_ADMIN_KEY` ; fichiers `.env`
  exclus par `.gitignore`.
- **EX-10.4** Données personnelles : minimisation (pas de pseudo importé
  sans nécessité), anonymisation avant tout affichage public, journal
  d'audit (`audit_logs`) pour les écritures sensibles (création,
  mise à jour, suppression, fusion, import).
- **EX-10.5** Conformité scraping : chapitre 6 (robots, rate-limit,
  aucune donnée derrière connexion) ; toute nouvelle source exige une
  fiche de conformité avant son premier run.

## 10.3 Accessibilité et langue
- **EX-10.6** Interface et documentation en français (fr-FR) ; termes
  nouveaux expliqués dans le paragraphe ; statuts toujours affichés en
  clair (« vérifié », « non vérifié », « contesté », « non documenté »),
  jamais par un code seul.
- **EX-10.7** Messages d'erreur en français, exploitables par un
  non-technicien : ce qui a échoué, et ce qu'il faut faire ensuite
  (ex. « définissez DATABASE_URL puis relancez la base »).

## 10.4 Fiabilité des données
- **EX-10.8** Règle fondatrice, rappelée à chaque couche : un champ non
  documenté est NULL ou « non vérifié » ; un conflit est exposé, jamais
  tranché sans source ; un audit aléatoire de 100 fiches ne doit trouver
  aucune valeur sans source ni statut.
