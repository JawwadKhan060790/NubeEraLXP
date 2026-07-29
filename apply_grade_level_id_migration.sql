-- ============================================================
-- APPLY: AddGradeLevelIdToGrades migration
-- Purpose : Standalone, idempotent equivalent of
--           Backend/NubeEra.Infrastructure/Persistence/Migrations/
--           20260616130000_AddGradeLevelIdToGrades.cs
--           for use when you want to update the database directly
--           (MySQL Workbench / mysql CLI) instead of starting the
--           backend (which would otherwise apply it automatically via
--           Program.cs -> db.Database.Migrate() on next run).
-- Effect  : Adds grades.GradeLevelId (nullable char(36)), backfills it
--           from the existing GradeLevel string using the deterministic
--           seed GUIDs, adds the FK -> grade_levels.Id, and records the
--           migration as applied in __EFMigrationsHistory so a later
--           `dotnet run` / Database.Migrate() does not try to re-apply
--           it and fail on "column already exists".
-- Safe    : Additive only. grades.GradeLevel / GradeName are untouched.
--           No rows are deleted. Safe to re-run (IF NOT EXISTS guards).
-- Run in  : MySQL Workbench — execute as a script (Ctrl+Shift+Enter)
--           or `mysql -u <user> -p <db> < apply_grade_level_id_migration.sql`
-- See also: GRADE_LEVEL_ID_MIGRATION_STRATEGY.md
-- ============================================================

USE nubeera_db;    -- adjust if your DB name differs

SET foreign_key_checks = 0;

-- ── 0. Pre-apply snapshot ───────────────────────────────────────────────
SELECT 'Before apply' AS step,
       COUNT(*) AS total_grades,
       SUM(CASE WHEN GradeLevel IS NULL THEN 1 ELSE 0 END) AS rows_missing_legacy_string
FROM `grades`;

-- ── 1. Add the column (idempotent) ───────────────────────────────────────
ALTER TABLE `grades`
    ADD COLUMN IF NOT EXISTS `GradeLevelId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL;

-- ── 2. Add the index (idempotent) ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS `IX_grades_GradeLevelId` ON `grades` (`GradeLevelId`);

-- ── 3. Backfill from the legacy GradeLevel string ────────────────────────
-- "10"/"10th" matched first so the generic single-digit branch never
-- misreads its leading "1". Deterministic seed GUIDs, same scheme as
-- grade_levels / schools.from_grade_id / schools.to_grade_id.
UPDATE `grades`
SET `GradeLevelId` = CASE
    WHEN `GradeLevel` REGEXP '^10' THEN '00000000-0000-0000-0000-000000000010'
    WHEN `GradeLevel` REGEXP '^[1-9]' THEN CONCAT('00000000-0000-0000-0000-00000000000', LEFT(`GradeLevel`, 1))
    ELSE NULL
END
WHERE `GradeLevelId` IS NULL;

SELECT ROW_COUNT() AS rows_backfilled;

-- ── 4. Add the foreign key (guarded — MySQL has no native
--      "ADD CONSTRAINT IF NOT EXISTS", so check information_schema first) ──
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'grades'
      AND CONSTRAINT_NAME = 'FK_grades_grade_levels_GradeLevelId'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE `grades` ADD CONSTRAINT `FK_grades_grade_levels_GradeLevelId` FOREIGN KEY (`GradeLevelId`) REFERENCES `grade_levels` (`Id`) ON DELETE RESTRICT',
    'SELECT "FK already exists, skipping" AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 5. Mark migration as applied in EF Core history ──────────────────────
-- Required so the backend's automatic `Database.Migrate()` on next startup
-- does not try to re-apply this migration and fail.
INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260616130000_AddGradeLevelIdToGrades', '9.0.0');

SET foreign_key_checks = 1;

-- ── 6. Verify ─────────────────────────────────────────────────────────────
SELECT 'After apply' AS step, COUNT(*) AS total_grades FROM `grades`;

SELECT COUNT(*) AS rows_still_null_after_backfill
FROM `grades` WHERE `GradeLevelId` IS NULL;
-- Expect: 0 (any row > 0 here has a GradeLevel value that doesn't match
-- "1".."10"/"1st".."10th" — needs manual fix, see GRADE_LEVEL_ID_MIGRATION_STRATEGY.md)

SELECT g.Id, g.GradeLevel, g.GradeLevelId
FROM `grades` g
LEFT JOIN `grade_levels` gl ON gl.Id = g.GradeLevelId
WHERE g.GradeLevelId IS NOT NULL AND gl.Id IS NULL;
-- Expect: 0 rows (no orphaned GradeLevelId values)

SELECT 'GradeLevelId migration applied successfully.' AS Result;
