-- ============================================================
-- Student Performance Index Migration
-- Generated from: 20260610102023_AddStudentPerformanceIndexes
-- Run this against: nubeera_db
-- ============================================================

-- 1. Composite index covering the primary list query:
--    WHERE SchoolId = ? AND IsActive = 1 ORDER BY FirstName, LastName
CREATE INDEX IF NOT EXISTS IX_students_school_active_name
    ON students (SchoolId, IsActive, FirstName, LastName);

-- 2. Composite index covering grade-level filtering:
--    WHERE GradeId = ? AND IsActive = 1
CREATE INDEX IF NOT EXISTS IX_students_grade_active
    ON students (GradeId, IsActive);

-- 3. Update the EF Core __EFMigrationsHistory table so the framework
--    knows this migration has been applied (adjust MigrationId if yours differs).
INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260610102023_AddStudentPerformanceIndexes', '8.0.0');

-- Verify
SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'students'
  AND INDEX_NAME IN ('IX_students_school_active_name', 'IX_students_grade_active')
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
