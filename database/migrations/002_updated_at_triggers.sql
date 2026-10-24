-- Migration lot 2 : trigger updated_at sur toutes les tables qui ont
-- une colonne updated_at. Idempotente (DROP IF EXISTS avant CREATE).
-- À appliquer après functions.sql (fonction set_updated_at()).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON %I',
      r.table_name, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      r.table_name, r.table_name);
  END LOOP;
END;
$$;
-- Vérification : SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;
