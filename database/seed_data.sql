-- C3 GrowShield AI — Seed v1
-- ATTENTION : TOUTES les lignes ci-dessous sont des EXEMPLES fictifs,
-- marqués « EXEMPLE » dans les noms, destinés uniquement à tester
-- l'application en local. AUCUNE n'est une donnée réelle de cultivar,
-- de breeder, de prix ou de laboratoire. Ne pas présenter comme réel.
-- Supprimer ce fichier (ou le remplacer) avant tout import réel.
INSERT INTO roles (code, label_fr) VALUES
  ('admin','Administrateur'), ('editor','Éditeur'),
  ('grower','Cultivateur'), ('reader','Lecteur')
ON CONFLICT (code) DO NOTHING;

INSERT INTO terpenes (name, name_fr) VALUES
  ('Myrcene','Myrcène'), ('Limonene','Limonène'), ('Caryophyllene','Caryophyllène')
ON CONFLICT (name) DO NOTHING;

INSERT INTO effects (label, label_fr, polarity) VALUES
  ('relaxed','Détente','positif'), ('euphoric','Euphorie','positif')
ON CONFLICT (label) DO NOTHING;

INSERT INTO aromas (label, label_fr, category) VALUES
  ('citrus','Agrume','fruité'), ('earthy','Terreux','terreux')
ON CONFLICT (label) DO NOTHING;

INSERT INTO breeders (name, canonical_name, verification_status) VALUES
  ('EXEMPLE Breeder Alpha', 'exemple-breeder-alpha', 'non vérifié')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO cultivars (name, canonical_name, verification_status) VALUES
  ('EXEMPLE Cultivar Test', 'exemple-cultivar-test', 'non vérifié')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO scrape_sources (code, name, base_url, rate_limit_per_minute) VALUES
  ('growdiaries','GrowDiaries','https://growdiaries.com',30),
  ('thcfarmer','THCFarmer','https://www.thcfarmer.com',30),
  ('rollitup','Rollitup','https://www.rollitup.org',30),
  ('overgrow','Overgrow','https://overgrow.com',30),
  ('reddit','Reddit','https://www.reddit.com',30)
ON CONFLICT (code) DO NOTHING;
-- Fin du seed d'exemple. Aucune donnée réelle ici.
