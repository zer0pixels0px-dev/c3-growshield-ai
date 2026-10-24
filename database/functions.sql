-- C3 GrowShield AI — Fonctions v1
-- Formule (ai/scoring_engine.md) : rendement 35 %, terpènes 20 %, vigueur 15 %,
-- résistance moisissure 10 %, bag appeal 10 %, marché 10 %.
-- Score partiel : pondération renormalisée sur les composants documentés.
-- Score nul : aucun composant documenté -> score NULL, completeness = 'nul',
-- trié en dernier (jamais 0 présenté comme un vrai score).

CREATE OR REPLACE FUNCTION compute_commercial_score(
  p_yield NUMERIC, p_terpenes NUMERIC, p_vigor NUMERIC,
  p_mold NUMERIC, p_bag NUMERIC, p_market NUMERIC
) RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  w_yield NUMERIC := 0.35; w_terp NUMERIC := 0.20; w_vigor NUMERIC := 0.15;
  w_mold NUMERIC := 0.10; w_bag NUMERIC := 0.10; w_market NUMERIC := 0.10;
  total_weight NUMERIC := 0; weighted_sum NUMERIC := 0;
BEGIN
  IF p_yield  IS NOT NULL THEN total_weight := total_weight + w_yield;  weighted_sum := weighted_sum + w_yield  * p_yield;  END IF;
  IF p_terpenes IS NOT NULL THEN total_weight := total_weight + w_terp;   weighted_sum := weighted_sum + w_terp   * p_terpenes; END IF;
  IF p_vigor   IS NOT NULL THEN total_weight := total_weight + w_vigor;  weighted_sum := weighted_sum + w_vigor  * p_vigor;   END IF;
  IF p_mold    IS NOT NULL THEN total_weight := total_weight + w_mold;   weighted_sum := weighted_sum + w_mold   * p_mold;    END IF;
  IF p_bag     IS NOT NULL THEN total_weight := total_weight + w_bag;    weighted_sum := weighted_sum + w_bag    * p_bag;     END IF;
  IF p_market  IS NOT NULL THEN total_weight := total_weight + w_market; weighted_sum := weighted_sum + w_market * p_market;  END IF;
  IF total_weight = 0 THEN RETURN NULL; END IF;
  RETURN ROUND(weighted_sum / total_weight, 2);
END;
$$;
COMMENT ON FUNCTION compute_commercial_score IS 'Score commercial 0-100, renormalisé sur composants documentés.';

-- Trigger updated_at générique : à appliquer table par table en lot 2
-- (exemple) : CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- La fonction set_updated_at() est définie dans schema.sql.

CREATE OR REPLACE FUNCTION apply_updated_at_trigger(p_table TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
    p_table, p_table);
END;
$$;
COMMENT ON FUNCTION apply_updated_at_trigger IS 'Utilitaire lot 2 : pose le trigger updated_at sur une table nommée.';
