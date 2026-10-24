-- C3 GrowShield AI — Vues v1
-- Règle d'affichage : les scores NULL (aucun composant) se trient en dernier.
CREATE OR REPLACE VIEW v_cultivar_scores AS
SELECT
  c.id AS cultivar_id,
  c.canonical_name,
  c.name,
  b.name AS breeder_name,
  c.breeder_verification_status,
  cs.score AS commercial_score,
  cs.completeness,
  (SELECT COUNT(*) FROM score_components sc WHERE sc.score_id = cs.id) AS component_count
FROM cultivars c
LEFT JOIN breeders b ON b.id = c.breeder_id
LEFT JOIN commercial_scores cs ON cs.cultivar_id = c.id;

COMMENT ON VIEW v_cultivar_scores IS 'Vue catalogue + score, utilisée par l’API et Power BI.';

CREATE OR REPLACE VIEW v_cultivar_catalogue AS
SELECT
  c.id AS cultivar_id,
  c.canonical_name,
  c.plant_type,
  c.flowering_type,
  c.thc_min_percent,
  c.thc_max_percent,
  cp.flowering_days_min,
  cp.flowering_days_max,
  cp.yield_indoor_g_m2_min,
  cp.yield_indoor_g_m2_max,
  cp.difficulty,
  c.verification_status
FROM cultivars c
LEFT JOIN cultivation_profiles cp ON cp.cultivar_id = c.id;

COMMENT ON VIEW v_cultivar_catalogue IS 'Vue catalogue enrichie (culture), sans données inventées.';

CREATE OR REPLACE VIEW v_scrape_quality AS
SELECT
  s.code AS source_code,
  r.id AS run_id,
  r.started_at,
  r.status,
  r.items_fetched,
  r.items_new,
  r.items_skipped_duplicate,
  CASE WHEN r.items_fetched > 0
    THEN ROUND(100.0 * r.items_skipped_duplicate / r.items_fetched, 2)
    ELSE NULL END AS duplicate_rate_percent
FROM scrape_runs r
JOIN scrape_sources s ON s.id = r.source_id;

COMMENT ON VIEW v_scrape_quality IS 'Vue qualité scraping (page Power BI « Scraping / qualité »).';

CREATE OR REPLACE VIEW v_top_terpenes AS
SELECT cultivar_id, terpene_id, rank, concentration_percent
FROM cultivar_terpenes WHERE rank <= 3;

COMMENT ON VIEW v_top_terpenes IS 'Top 3 terpènes par cultivar.';
