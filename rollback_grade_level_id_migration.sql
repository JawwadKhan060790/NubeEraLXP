-- ============================================================
-- ROLLBACK: AddGradeLevelIdToGrades migration
-- Purpose : Standalone inverse of
--           Backend/NubeEra.Infrastructure/Persistence/Migrations/
--           20260616130000_AddGradeLevelIdToGrades.cs
--           for use when `dotnet ef` tooling is not available.
-- Effect  : Drops FK_grades_grade_levels_GradeLevelId, then
--           IX_grades_GradeLevelId, then the GradeLevelId column itself.
--           Order matters: MySQL will not drop a column while an FK or
--           index still references it.
-- Safe    : `grades.GradeLevel` / `grades.GradeName` (the columns every
--           existing read path actually uses) are NOT touched. No rows
--           are deleted. Re-running the forward migration afterwards
--           reproduces identical GradeLevelId values (deterministic
--           seed-GUID backfill), so this rollback is fully reversible.
-- Run in  : MySQL Workbench — execute as a script (Ctrl+Shift+Enter)
--           or `mysql -u <user> -p <db> < rollback_grade_level_id_migration.sql`
-- See also: GRADE_LEVEL_ID_MIGRATION_STRATEGY.md (section 5, rollback procedure)
-- ============================================================

USE lmswithmysql;    -- adjust if your DB name differs

-- ── 0. Pre-rollback snapshot (for comparison after) ─────────────────────
SELECT 'Before rollback' AS step,
       COUNT(*) AS total_grades,
       SUM(CASE WHEN GradeLevelId IS NOT NULL THEN 1 ELSE 0 END) AS grades_with_level_id
FROM `grades`;

-- ── 1. Drop the foreign key ──────────────────────────────────────────────
-- Guard: only drop if it currently exists (keeps the script idempotent /
-- safe to re-run if a previous attempt partially completed).
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'grades'
      AND CONSTRAINT_NAME = 'FK_grades_grade_levels_GradeLevelId'
);
SET @sql := IF(@fk_exists > 0,
    'ALTER TABLE `grades` DROP FOREIGN KEY `FK_grades_grade_levels_GradeLevelId`',
    'SELECT "FK already absent, skipping" AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 2. Drop the index ────────────────────────────────────────────────────
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'grades'
      AND INDEX_NAME = 'IX_grades_GradeLevelId'
);
SET @sql := IF(@idx_exists > 0,
    'ALTER TABLE `grades` DROP INDEX `IX_grades_GradeLevelId`',
    'SELECT "Index already absent, skipping" AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 3. Drop the column ───────────────────────────────────────────────────
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'grades'
      AND COLUMN_NAME = 'GradeLevelId'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE `grades` DROP COLUMN `GradeLevelId`',
    'SELECT "Column already absent, skipping" AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 4. Verify ─────────────────────────────────────────────────────────────
SELECT 'After rollback' AS step, COUNT(*) AS total_grades FROM `grades`;

SELECT COUNT(*) AS remaining_fk
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'grades'
  AND CONSTRAINT_NAME = 'FK_grades_grade_levels_GradeLevelId';
-- Expect: 0

SELECT COUNT(*) AS remaining_index
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'grades'
  AND INDEX_NAME = 'IX_grades_GradeLevelId';
-- Expect: 0

SELECT COUNT(*) AS remaining_column
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'grades'
  AND COLUMN_NAME = 'GradeLevelId';
-- Expect: 0

-- ── 5. IMPORTANT: also reflect this in EF's migration history table ───────
-- If this rollback was run standalone (not via `dotnet ef database update`),
-- EF Core's __EFMigrationsHistory table will still list
-- "20260616130000_AddGradeLevelIdToGrades" as applied, even though its
-- effects were just undone manually. Delete that row so EF does not believe
-- the column still exists the next time migrations run:
DELETE FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260616130000_AddGradeLevelIdToGrades';
SELECT ROW_COUNT() AS migration_history_rows_removed;
