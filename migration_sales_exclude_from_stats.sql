-- Flag exceptional sales so they can be excluded from marketing statistics
-- (averages, ratios, offer ranking, growth levers) while remaining fully
-- accounted for in the CFO revenue and net result.
--
-- Background: a one-off sale can distort the "average purchase value" and the
-- other Jay Abraham growth levers. Rather than auto-trimming outliers (opaque,
-- non-reversible), the user explicitly flags the sale here and can toggle its
-- inclusion on the Marketing dashboard.

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS exclude_from_stats BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN sales.exclude_from_stats IS
    'When true, the sale is excluded from marketing statistics. It stays included in CFO revenue and net result.';

-- No GRANT/RLS change needed:
--   * migration_marketing_cfo.sql grants SELECT/INSERT/UPDATE/DELETE at table level;
--   * the owner_full_access policy already covers every column (user_id = auth.uid()).
