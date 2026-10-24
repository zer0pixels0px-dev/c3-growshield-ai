-- ============================================================================
-- C3 GrowShield AI — Schéma PostgreSQL v1
-- PostgreSQL 16+. Extension pgcrypto pour gen_random_uuid().
-- Règles : chaque table a id UUID, created_at / updated_at, et un commentaire.
-- Aucune donnée réelle de cultivar, de prix ou de labo n'est insérée ici :
-- voir seed_data.sql (exemples explicitement marqués « EXEMPLE »).
-- Statut de vérification : un champ non documenté reste NULL ou
-- 'non vérifié', jamais une valeur inventée.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- 01. Rôles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('admin','editor','grower','reader')),
  label_fr TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE roles IS 'Rôles applicatifs.';

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Comptes utilisateurs. Aucun mot de passe en clair.';

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
COMMENT ON TABLE user_roles IS 'Affectation rôle / utilisateur.';

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_sessions IS 'Sessions : seul le hash du jeton est stocké.';

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'fr-FR',
  default_unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (default_unit_system IN ('metric','imperial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_preferences IS 'Préférences d’affichage par utilisateur.';

-- ------------------------------------------------------- 02. Breeders
CREATE TABLE breeders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  country_code CHAR(2),
  website_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (verification_status IN ('vérifié','non vérifié','contesté')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE breeders IS 'Sélectionneurs (breeders). Le breeder d’origine n’est affirmé que si vérifié.';

CREATE TABLE breeder_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder_id UUID NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (breeder_id, alias)
);
COMMENT ON TABLE breeder_aliases IS 'Variantes orthographiques de noms de breeders.';

CREATE TABLE breeder_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder_id UUID NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE breeder_sources IS 'Sources attestant l’existence d’un breeder.';

-- ------------------------------------------------------ 03. Cultivars
CREATE TABLE cultivars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  breeder_id UUID REFERENCES breeders(id) ON DELETE SET NULL,
  breeder_verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (breeder_verification_status IN ('vérifié','non vérifié','contesté')),
  plant_type TEXT CHECK (plant_type IN ('indica','sativa','hybride','indica-dominante','sativa-dominante','ruderalis','hybride-ruderalis')),
  flowering_type TEXT CHECK (flowering_type IN ('photopériodique','autofloraison','non documenté')),
  thc_min_percent NUMERIC(5,2) CHECK (thc_min_percent BETWEEN 0 AND 100),
  thc_max_percent NUMERIC(5,2) CHECK (thc_max_percent BETWEEN 0 AND 100),
  cbd_min_percent NUMERIC(5,2) CHECK (cbd_min_percent BETWEEN 0 AND 100),
  cbd_max_percent NUMERIC(5,2) CHECK (cbd_max_percent BETWEEN 0 AND 100),
  description_fr TEXT,
  verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (verification_status IN ('vérifié','non vérifié','contesté')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (thc_min_percent IS NULL OR thc_max_percent IS NULL OR thc_min_percent <= thc_max_percent)
);
COMMENT ON TABLE cultivars IS 'Fiche cultivar. THC/CBD NULL = non documenté, jamais estimé.';

CREATE TABLE cultivar_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'variante' CHECK (alias_type IN ('variante','abréviation','faute courante','ancien nom')),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, alias)
);
COMMENT ON TABLE cultivar_aliases IS 'Alias de cultivars (ex. gsc / girl scout cookies).';

CREATE TABLE canonical_name_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('cultivar','breeder')),
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE canonical_name_rules IS 'Règles de canonicalisation, appliquées dans l’ordre de priorité.';

CREATE TABLE alias_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_alias TEXT NOT NULL,
  target_cultivar_id UUID REFERENCES cultivars(id) ON DELETE SET NULL,
  target_breeder_id UUID REFERENCES breeders(id) ON DELETE SET NULL,
  proposed_by TEXT NOT NULL DEFAULT 'scraper',
  status TEXT NOT NULL DEFAULT 'en attente' CHECK (status IN ('en attente','acceptée','rejetée')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE alias_proposals IS 'File de validation humaine des alias détectés.';

CREATE TABLE cultivar_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE RESTRICT,
  merged_cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  merged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE cultivar_merges IS 'Journal des fusions de doublons (traçabilité).';

-- ------------------------------------------------------ 04. Pedigree
CREATE TABLE pedigree_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  parent_cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  parent_role TEXT NOT NULL CHECK (parent_role IN ('mère','père','parent','inconnu')),
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (verification_status IN ('vérifié','non vérifié','contesté')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_cultivar_id, parent_cultivar_id, parent_role),
  CHECK (child_cultivar_id <> parent_cultivar_id)
);
COMMENT ON TABLE pedigree_links IS 'Arêtes parent → enfant du graphe de lignées.';

CREATE TABLE lineage_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  conflicting_parent_name TEXT NOT NULL,
  source_a TEXT,
  source_b TEXT,
  resolution TEXT CHECK (resolution IN ('non tranché','tranché','divergent documenté')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE lineage_conflicts IS 'Conflits de lignée exposés, jamais tranchés sans source.';

-- ------------------------------------------------- 05. Phénotypes / sensoriel
CREATE TABLE phenotypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  phenotype_label TEXT NOT NULL,
  description_fr TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE phenotypes IS 'Phénotypes documentés d’un cultivar.';

CREATE TABLE terpenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_fr TEXT,
  aroma_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE terpenes IS 'Référentiel des terpènes.';

CREATE TABLE cultivar_terpenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  terpene_id UUID NOT NULL REFERENCES terpenes(id) ON DELETE CASCADE,
  rank INT CHECK (rank BETWEEN 1 AND 10),
  concentration_percent NUMERIC(5,3),
  source_type TEXT NOT NULL CHECK (source_type IN ('labo','guide','communauté','non documenté')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, terpene_id, source_type)
);
COMMENT ON TABLE cultivar_terpenes IS 'Terpènes dominants par cultivar, avec type de source.';

CREATE TABLE aromas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  label_fr TEXT,
  category TEXT CHECK (category IN ('fruité','terreux','épicé','floral','chimique','sucré','boisé','autre')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE aromas IS 'Référentiel des arômes / saveurs (descripteurs sensoriels uniquement).';

CREATE TABLE cultivar_aromas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  aroma_id UUID NOT NULL REFERENCES aromas(id) ON DELETE CASCADE,
  votes INT NOT NULL DEFAULT 0 CHECK (votes >= 0),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, aroma_id)
);
COMMENT ON TABLE cultivar_aromas IS 'Arômes associés à un cultivar. Les termes d’effets en sont exclus.';

CREATE TABLE effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  label_fr TEXT,
  polarity TEXT CHECK (polarity IN ('positif','négatif','neutre')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE effects IS 'Référentiel des effets ressentis.';

CREATE TABLE cultivar_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  effect_id UUID NOT NULL REFERENCES effects(id) ON DELETE CASCADE,
  votes INT NOT NULL DEFAULT 0 CHECK (votes >= 0),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, effect_id)
);
COMMENT ON TABLE cultivar_effects IS 'Effets associés à un cultivar.';

CREATE TABLE sensory_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  terpene_coverage NUMERIC(5,2),
  effect_coverage NUMERIC(5,2),
  aroma_coverage NUMERIC(5,2),
  sensorial_score NUMERIC(5,2),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE sensory_scores IS 'Score sensoriel calculé (voir ai/scoring_engine.md).';

-- ---------------------------------------------------------- 06. Labo
CREATE TABLE labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  accreditation TEXT,
  country_code CHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE labs IS 'Laboratoires d’analyse accrédités (référentiel).';

CREATE TABLE lab_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
  batch_code TEXT NOT NULL,
  cultivar_id UUID REFERENCES cultivars(id) ON DELETE SET NULL,
  sampled_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE lab_batches IS 'Lots analysés en laboratoire.';

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES lab_batches(id) ON DELETE CASCADE,
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  report_url TEXT,
  tested_at DATE,
  moisture_percent NUMERIC(5,2),
  verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (verification_status IN ('vérifié','non vérifié','contesté')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE lab_results IS 'Résultat d’analyse de laboratoire, rattaché à un lot.';

CREATE TABLE lab_result_cannabinoids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  cannabinoid TEXT NOT NULL CHECK (cannabinoid IN ('THC','THCA','CBD','CBDA','CBG','CBC','CBN','THCV','CBDV')),
  percent NUMERIC(6,3) NOT NULL CHECK (percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lab_result_id, cannabinoid)
);
COMMENT ON TABLE lab_result_cannabinoids IS 'Teneurs en cannabinoïdes mesurées.';

CREATE TABLE lab_result_terpenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  terpene_id UUID NOT NULL REFERENCES terpenes(id) ON DELETE CASCADE,
  percent NUMERIC(6,3) NOT NULL CHECK (percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lab_result_id, terpene_id)
);
COMMENT ON TABLE lab_result_terpenes IS 'Teneurs en terpènes mesurées.';

-- ------------------------------------------------------- 07. Culture
CREATE TABLE cultivation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  flowering_days_min INT CHECK (flowering_days_min > 0),
  flowering_days_max INT CHECK (flowering_days_max > 0),
  yield_indoor_g_m2_min NUMERIC(7,1),
  yield_indoor_g_m2_max NUMERIC(7,1),
  yield_outdoor_g_plant_min NUMERIC(7,1),
  yield_outdoor_g_plant_max NUMERIC(7,1),
  height_cm_min INT,
  height_cm_max INT,
  difficulty TEXT CHECK (difficulty IN ('facile','modérée','difficile','non documenté')),
  mold_resistance_score NUMERIC(3,1) CHECK (mold_resistance_score BETWEEN 0 AND 10),
  vigor_score NUMERIC(3,1) CHECK (vigor_score BETWEEN 0 AND 10),
  bag_appeal_score NUMERIC(3,1) CHECK (bag_appeal_score BETWEEN 0 AND 10),
  light_sensitivity_note TEXT,
  co2_ppm_ceiling INT,
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'non vérifié'
    CHECK (verification_status IN ('vérifié','non vérifié','contesté')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (flowering_days_min IS NULL OR flowering_days_max IS NULL OR flowering_days_min <= flowering_days_max)
);
COMMENT ON TABLE cultivation_profiles IS 'Données de culture de référence par cultivar. Scores NULL = non documenté.';

CREATE TABLE grow_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  setup_type TEXT NOT NULL CHECK (setup_type IN ('intérieur','serre','extérieur')),
  medium TEXT CHECK (medium IN ('terre','coco','hydro','aéro','laine de roche','autre')),
  light_type TEXT,
  tent_size_cm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE grow_setups IS 'Configurations de culture d’un utilisateur.';

CREATE TABLE grow_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id UUID NOT NULL REFERENCES grow_setups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE grow_rooms IS 'Pièces / zones d’une configuration.';

CREATE TABLE grow_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setup_id UUID REFERENCES grow_setups(id) ON DELETE SET NULL,
  cultivar_id UUID REFERENCES cultivars(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at DATE NOT NULL,
  ended_at DATE,
  status TEXT NOT NULL DEFAULT 'en cours' CHECK (status IN ('planifié','en cours','récolté','abandonné')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE grow_cycles IS 'Cycles de culture (une culture = un cycle).';

CREATE TABLE grow_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grow_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  source_platform TEXT CHECK (source_platform IN ('growdiaries','thcfarmer','rollitup','overgrow','reddit','manuel')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE grow_journals IS 'Journaux de culture (manuels ou importés).';

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES grow_journals(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  growth_stage TEXT CHECK (growth_stage IN ('germination','végétatif','floraison','récolte','séchage','curing')),
  week_number INT CHECK (week_number >= 0),
  height_cm NUMERIC(6,1),
  note_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE journal_entries IS 'Entrées datées d’un journal.';

CREATE TABLE nutrient_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  npk TEXT,
  product_type TEXT CHECK (product_type IN ('base','booster','additif','calmag','autre')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, product_name)
);
COMMENT ON TABLE nutrient_products IS 'Catalogue de produits nutritifs (données fabricants).';

CREATE TABLE nutrient_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grow_cycles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES nutrient_products(id) ON DELETE RESTRICT,
  dose_ml_per_l NUMERIC(6,2) NOT NULL CHECK (dose_ml_per_l >= 0),
  growth_stage TEXT CHECK (growth_stage IN ('végétatif','floraison','rinçage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE nutrient_schedules IS 'Programmes d’alimentation par cycle.';

CREATE TABLE feeding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grow_cycles(id) ON DELETE CASCADE,
  fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  water_l NUMERIC(6,2) CHECK (water_l >= 0),
  ec_ms_cm NUMERIC(4,2),
  ph NUMERIC(3,1) CHECK (ph BETWEEN 0 AND 14),
  note_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE feeding_events IS 'Arrosages / apports réellement effectués.';

CREATE TABLE environmental_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature_c NUMERIC(4,1),
  humidity_percent NUMERIC(5,2) CHECK (humidity_percent BETWEEN 0 AND 100),
  co2_ppm INT CHECK (co2_ppm >= 0),
  vpd_kpa NUMERIC(4,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE environmental_readings IS 'Mesures d’ambiance (capteurs ou saisies).';

CREATE TABLE harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grow_cycles(id) ON DELETE CASCADE,
  harvested_at DATE NOT NULL,
  wet_weight_g NUMERIC(8,1),
  dry_weight_g NUMERIC(8,1),
  trim_weight_g NUMERIC(8,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE harvests IS 'Récoltes mesurées par cycle.';

CREATE TABLE drying_curing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_id UUID NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('séchage','curing')),
  temperature_c NUMERIC(4,1),
  humidity_percent NUMERIC(5,2),
  note_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE drying_curing_logs IS 'Suivi séchage / curing.';

CREATE TABLE plant_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES grow_cycles(id) ON DELETE CASCADE,
  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('maladie','ravageur','carence','brûlure','moisissure','autre')),
  severity TEXT CHECK (severity IN ('faible','modérée','sévère')),
  note_fr TEXT,
  resolved_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE plant_observations IS 'Observations sanitaires (GrowShield : détection et suivi).';

CREATE TABLE cultivation_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID REFERENCES cultivars(id) ON DELETE CASCADE,
  tip_fr TEXT NOT NULL,
  tip_type TEXT CHECK (tip_type IN ('lumière','co2','arrosage','taille','nutrition','climat','autre')),
  source_type TEXT NOT NULL DEFAULT 'guide' CHECK (source_type IN ('guide','essai','communauté')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE cultivation_tips IS 'Conseils de culture, avec type de source. Les tips d’essais contrôlés n’existent que si sourcés.';

-- ------------------------------------------------------- 08. Médias / IA
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','vidéo')),
  original_url TEXT,
  license_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE media_assets IS 'Fichiers médias référencés (hotlink conservé si externe).';

CREATE TABLE cultivar_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  media_role TEXT NOT NULL CHECK (media_role IN ('produit fini','plante en floraison','plante en végétatif','autre')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, media_id, media_role)
);
COMMENT ON TABLE cultivar_media IS 'Médias rattachés à un cultivar, par rôle.';

CREATE TABLE photo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES grow_cycles(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  result_json JSONB NOT NULL,
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE photo_analyses IS 'Analyses IA de photos, avec version de prompt et relecture humaine possible.';

CREATE TABLE journal_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, media_id)
);
COMMENT ON TABLE journal_photos IS 'Photos jointes aux entrées de journal.';

-- ------------------------------------------------------- 09. Scraping
CREATE TABLE scrape_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('growdiaries','thcfarmer','rollitup','overgrow','reddit','leafly','seedfinder')),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  robots_respected BOOLEAN NOT NULL DEFAULT TRUE,
  rate_limit_per_minute INT NOT NULL DEFAULT 30 CHECK (rate_limit_per_minute > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE scrape_sources IS 'Sources de scraping déclarées. Aucun contournement de protection.';

CREATE TABLE scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'en cours' CHECK (status IN ('en cours','terminé','échoué','interrompu')),
  items_fetched INT NOT NULL DEFAULT 0,
  items_new INT NOT NULL DEFAULT 0,
  items_updated INT NOT NULL DEFAULT 0,
  items_skipped_duplicate INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE scrape_runs IS 'Exécutions de scraping, avec compteurs et reprise sur panne.';

CREATE TABLE scrape_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE RESTRICT,
  source_item_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_payload JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_item_id)
);
COMMENT ON TABLE scrape_items IS 'Items bruts collectés, avant normalisation.';

CREATE TABLE scrape_item_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_item_id UUID NOT NULL REFERENCES scrape_items(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  extraction_confidence NUMERIC(4,3) CHECK (extraction_confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE scrape_item_fields IS 'Champs extraits d’un item brut (étape extraction).';

CREATE TABLE scrape_dedup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
  incoming_canonical_name TEXT NOT NULL,
  matched_cultivar_id UUID REFERENCES cultivars(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('nouveau','fusionné','ignoré doublon','en attente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE scrape_dedup_log IS 'Journal de déduplication (avant tout enrichissement).';

CREATE TABLE source_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  requests_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE source_rate_limits IS 'Compteurs de requêtes par source (respect des limites).';

-- ------------------------------------------------------- 10. Scores / marché
CREATE TABLE commercial_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  score NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100),
  completeness TEXT NOT NULL DEFAULT 'partiel' CHECK (completeness IN ('complet','partiel','nul')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE commercial_scores IS 'Score commercial courant. NULL = aucun composant documenté.';

CREATE TABLE score_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES commercial_scores(id) ON DELETE CASCADE,
  component TEXT NOT NULL CHECK (component IN ('rendement','terpènes','vigueur','résistance moisissure','bag appeal','marché')),
  raw_value NUMERIC(7,2),
  normalized_value NUMERIC(5,2) CHECK (normalized_value BETWEEN 0 AND 100),
  weight_percent NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (score_id, component)
);
COMMENT ON TABLE score_components IS 'Composants pondérés du score (voir ai/scoring_engine.md).';

CREATE TABLE score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  formula_version TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE score_history IS 'Historique des scores, version de formule conservée.';

CREATE TABLE market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID REFERENCES cultivars(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  listing_url TEXT,
  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE market_listings IS 'Annonces / listings observés (sans prix inventé).';

CREATE TABLE market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  price_amount NUMERIC(10,2) NOT NULL CHECK (price_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CAD',
  unit TEXT NOT NULL CHECK (unit IN ('g','3.5g','7g','14g','28g','kg','livre','unité')),
  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE market_prices IS 'Prix observés, datés, avec devise et unité. Jamais de prix estimé sans source.';

-- ------------------------------------------------- 11. Communauté / audit
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tags IS 'Étiquettes libres.';

CREATE TABLE cultivar_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cultivar_id, tag_id)
);
COMMENT ON TABLE cultivar_tags IS 'Étiquettes par cultivar.';

CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cultivar_id)
);
COMMENT ON TABLE user_favorites IS 'Favoris des utilisateurs.';

CREATE TABLE user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_collections IS 'Collections personnelles (ex. « à tester »).';

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  note_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, cultivar_id)
);
COMMENT ON TABLE collection_items IS 'Cultivars d’une collection.';

CREATE TABLE cultivar_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review_fr TEXT,
  source_platform TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE cultivar_reviews IS 'Avis utilisateurs ou importés (source conservée).';

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cultivar_id UUID NOT NULL REFERENCES cultivars(id) ON DELETE CASCADE,
  reason_fr TEXT NOT NULL,
  score NUMERIC(5,2),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE recommendations IS 'Recommandations générées (raison explicable exigée).';

CREATE TABLE recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL CHECK (feedback IN ('pertinente','non pertinente','déjà testée')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE recommendation_feedback IS 'Retour utilisateur sur les recommandations.';

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','merge','import')),
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_logs IS 'Journal d’audit des écritures sensibles (fusions, imports).';

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_fr TEXT NOT NULL,
  body_fr TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications IS 'Notifications in-app.';

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cultivar_id UUID REFERENCES cultivars(id) ON DELETE CASCADE,
  journal_id UUID REFERENCES grow_journals(id) ON DELETE CASCADE,
  body_fr TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((cultivar_id IS NOT NULL) <> (journal_id IS NOT NULL))
);
COMMENT ON TABLE comments IS 'Commentaires, rattachés soit à un cultivar, soit à un journal.';

-- Triggers updated_at (échantillon générique appliqué à toutes les tables
-- possédant updated_at ; la liste complète est dans database/functions.sql).
