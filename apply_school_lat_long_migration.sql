-- ============================================================
-- APPLY: AddSchoolLatitudeLongitude migration
-- Purpose : Standalone, idempotent equivalent of
--           Backend/NubeEra.Infrastructure/Persistence/Migrations/
--           20260616130000_AddSchoolLatitudeLongitude.cs
--           for use when you want to update the database directly
--           (MySQL Workbench / mysql CLI) instead of starting the
--           backend (which would otherwise apply it automatically via
--           Program.cs -> db.Database.Migrate() on next run).
-- Cause   : NubeEra.Domain.Entities.School and SchoolConfiguration already
--           define/map Latitude and Longitude (decimal(9,6), nullable),
--           but no migration ever created the columns in the database —
--           hence "Unknown column 's.Latitude' in 'field list'" at runtime.
-- Effect  : Adds schools.Latitude and schools.Longitude (decimal(9,6) NULL).
-- Safe    : Additive only, both columns nullable. No existing rows/columns
--           are touched. Safe to re-run (IF NOT EXISTS guards).
-- Run in  : MySQL Workbench — execute as a script (Ctrl+Shift+Enter)
--           or `mysql -u <user> -p nubeera_db < apply_school_lat_long_migration.sql`
-- ============================================================

USE nubeera_db;    -- adjust if your DB name differs

-- ── 1. Add the columns (idempotent) ──────────────────────────────────────
-- NOTE: issued as two separate single-column ALTER statements. A combined
-- `ADD COLUMN IF NOT EXISTS a ..., ADD COLUMN IF NOT EXISTS b ...` form was
-- rejected by this server/client combination; splitting them avoided the
-- issue and is what was actually run to apply this migration.
ALTER TABLE `schools` ADD COLUMN IF NOT EXISTS `Latitude`  decimal(9,6) NULL;
ALTER TABLE `schools` ADD COLUMN IF NOT EXISTS `Longitude` decimal(9,6) NULL;

-- ── 2. Mark migration as applied in EF Core history ──────────────────────
-- Required so the backend's automatic `Database.Migrate()` on next startup
-- does not try to re-apply this migration and fail.
INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260616130000_AddSchoolLatitudeLongitude', '9.0.0');

-- ── 3. Verify ─────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'schools'
  AND COLUMN_NAME IN ('Latitude', 'Longitude');
-- Expect: 2 rows, decimal(9,6), nullable.

SELECT 'schools.Latitude / schools.Longitude migration applied successfully.' AS Result;
