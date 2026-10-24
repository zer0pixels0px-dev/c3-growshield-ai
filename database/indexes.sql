-- C3 GrowShield AI — Indexes v1 (à appliquer après schema.sql)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Recherche plein texte FR sur les noms canoniques + recherche par alias.
CREATE INDEX IF NOT EXISTS idx_cultivars_canonical_trgm ON cultivars USING gin (canonical_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cultivars_name_trgm ON cultivars USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cultivar_aliases_alias ON cultivar_aliases (alias);
CREATE INDEX IF NOT EXISTS idx_breeders_canonical ON breeders (canonical_name);
CREATE INDEX IF NOT EXISTS idx_cultivars_breeder ON cultivars (breeder_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_child ON pedigree_links (child_cultivar_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_parent ON pedigree_links (parent_cultivar_id);
CREATE INDEX IF NOT EXISTS idx_cultivar_terpenes_cultivar ON cultivar_terpenes (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_cultivar_aromas_cultivar ON cultivar_aromas (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_cultivar_effects_cultivar ON cultivar_effects (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_cultivation_cultivar ON cultivation_profiles (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_cycles_user ON grow_cycles (user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_cultivar ON grow_cycles (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_journals_cycle ON grow_journals (cycle_id);
CREATE INDEX IF NOT EXISTS idx_entries_journal_date ON journal_entries (journal_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_lab_results_cultivar ON lab_results (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_scrape_items_source ON scrape_items (source_id, source_item_id);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_cultivar ON commercial_scores (cultivar_id);
CREATE INDEX IF NOT EXISTS idx_score_history_cultivar ON score_history (cultivar_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_listing ON market_prices (listing_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_env_room_time ON environmental_readings (room_id, measured_at DESC);
-- Nécessite pg_trgm : CREATE EXTENSION IF NOT EXISTS pg_trgm;
