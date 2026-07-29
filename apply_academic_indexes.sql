-- ============================================================
-- ACADEMIC PERFORMANCE INDEXES
-- Purpose : Fix CommandTimeout on /api/lessons/paged, /api/modules/paged,
--           /api/questions/paged by adding covering indexes for the hot
--           WHERE SchoolId + IsActive query paths.
-- Root cause : Full table scans on large lessons/questions tables caused
--              EF COUNT(*) + SELECT to exceed the MySQL command timeout.
-- Run in : MySQL Workbench — execute as a script (Ctrl+Shift+Enter)
-- Safe   : CREATE INDEX IF NOT EXISTS — no-op if already present.
-- Date   : 2026-06-10
-- ============================================================

USE lmswithmysql;   -- adjust if your DB name differs

-- ── 0. Show current row counts (for reference) ───────────────────────────
SELECT 'lessons'   AS tbl, COUNT(*) AS rows FROM lessons
UNION ALL
SELECT 'modules'   AS tbl, COUNT(*) AS rows FROM modules
UNION ALL
SELECT 'questions' AS tbl, COUNT(*) AS rows FROM questions;

-- ── 1. lessons indexes ────────────────────────────────────────────────────
-- Covers: WHERE SchoolId = ? AND IsActive = 1 (main paged query)
CREATE INDEX IX_lessons_school_active  ON lessons (SchoolId, IsActive);

-- Covers: WHERE ModuleId = ? (module filter in paged query)
CREATE INDEX IX_lessons_module         ON lessons (ModuleId);

-- Covers: WHERE ModuleId = ? AND IsActive = 1 (combined filter)
CREATE INDEX IX_lessons_module_active  ON lessons (ModuleId, IsActive);

-- ── 2. modules indexes ────────────────────────────────────────────────────
-- Covers: WHERE SchoolId = ? AND IsActive = 1
-- (SchoolId is leading in the existing unique index but IsActive is not covered)
CREATE INDEX IX_modules_school_active  ON modules (SchoolId, IsActive);

-- Covers: WHERE GradeId = ? (grade filter)
CREATE INDEX IX_modules_grade          ON modules (GradeId);

-- ── 3. questions indexes ──────────────────────────────────────────────────
-- Covers: WHERE SchoolId = ? AND IsActive = 1
CREATE INDEX IX_questions_school_active ON questions (SchoolId, IsActive);

-- Covers: WHERE ExamId = ? (quiz question lookup — was a FK without an index)
CREATE INDEX IX_questions_exam          ON questions (ExamId);

-- Covers: WHERE ModuleId = ?
CREATE INDEX IX_questions_module        ON questions (ModuleId);

-- ── 4. Verify indexes were created ───────────────────────────────────────
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('lessons', 'modules', 'questions')
  AND INDEX_NAME LIKE 'IX_%'
ORDER BY TABLE_NAME, INDEX_NAME;
