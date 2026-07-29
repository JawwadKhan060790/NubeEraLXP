-- ============================================================
-- NUBEERA LMS — DATABASE CLEANUP SCRIPT
-- Purpose : Reset database to clean demo/test state
-- Author  : Senior Database Architect (AI-assisted)
-- Date    : 2026-06-10
-- ============================================================
--
-- WHAT THIS SCRIPT DOES
-- ─────────────────────
-- 1. Keeps ALL 7 roles          (SuperAdmin, Admin, Principal, Staff, Teacher, Student, Parent)
-- 2. Keeps ALL 10 grade_levels  (canonical system GUIDs — never deleted)
-- 3. Keeps 1 school             (SchoolCode = 'VER-001' / NubeEra International School)
-- 4. Keeps ALL grades           for the retained school
-- 5. Keeps 1 user per role      (the 7 AdminSeeder seed accounts)
-- 6. Keeps 1 teacher profile    (teacher1@nubeera.com)
-- 7. Keeps 1 student profile    (student1@nubeera.com)
-- 8. Keeps system_settings      (application config, not transactional)
-- 9. Keeps report_card_grading_rules  (system/school config)
-- 10. Keeps certificate_templates     (master template data)
-- 11. Deletes ALL transactional data  (modules, lessons, exams, questions, results,
--     attendance, schedules, reports, certificates, events, tickets, orders, etc.)
--
-- RETAINED SEED ACCOUNTS (passwords unchanged)
-- ─────────────────────────────────────────────
--   superadmin@nubeera.com    SuperAdmin@123   (no school)
--   admin1@nubeera.com        Admin@123        (VER-001)
--   staff1@nubeera.com        Staff@123        (VER-001)
--   principal1@nubeera.com    Principal@123    (VER-001)
--   teacher1@nubeera.com      Teacher@123      (VER-001)
--   student1@nubeera.com      Student@123      (VER-001)
--   parent1@nubeera.com       Parent@123       (VER-001)
--
-- HOW TO RUN
-- ──────────
--   MySQL Workbench → open this file → Ctrl+Shift+Enter (Run as Script)
--   Or CLI: mysql -u root -p lmswithmysql < database_cleanup.sql
--
-- SAFETY
-- ──────
--   • SET FOREIGN_KEY_CHECKS = 0 is used during cleanup to avoid
--     ordering constraints. It is re-enabled at the very end.
--   • TRUNCATE is used for tables with no rows to keep (DDL — fastest).
--   • DELETE … WHERE is used for tables where specific rows must survive.
--   • A full row-count audit runs before AND after so you can verify.
--   • Entire cleanup is wrapped in a user-visible progress structure.
-- ============================================================

USE nubeera_db;   -- ← adjust if your database name differs

-- ══════════════════════════════════════════════════════════════
-- SECTION 0 — PRE-FLIGHT AUDIT
-- Row counts BEFORE cleanup — review these before proceeding
-- ══════════════════════════════════════════════════════════════
SELECT '─── PRE-FLIGHT ROW COUNTS ───────────────────────────────' AS info;
SELECT
    t.TABLE_NAME            AS `table`,
    t.TABLE_ROWS            AS `approx_rows`
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_TYPE   = 'BASE TABLE'
ORDER BY t.TABLE_NAME;

-- ══════════════════════════════════════════════════════════════
-- SECTION 1 — EXACT COUNTS FOR KEY TABLES (accurate, not estimate)
-- ══════════════════════════════════════════════════════════════
SELECT '─── EXACT COUNTS (key tables) ───────────────────────────' AS info;
SELECT 'schools'        , COUNT(*) FROM schools
UNION ALL SELECT 'users'           , COUNT(*) FROM users
UNION ALL SELECT 'roles'           , COUNT(*) FROM roles
UNION ALL SELECT 'grade_levels'    , COUNT(*) FROM grade_levels
UNION ALL SELECT 'grades'          , COUNT(*) FROM grades
UNION ALL SELECT 'teachers'        , COUNT(*) FROM teachers
UNION ALL SELECT 'students'        , COUNT(*) FROM students
UNION ALL SELECT 'modules'         , COUNT(*) FROM modules
UNION ALL SELECT 'lessons'         , COUNT(*) FROM lessons
UNION ALL SELECT 'exams'           , COUNT(*) FROM exams
UNION ALL SELECT 'questions'       , COUNT(*) FROM questions
UNION ALL SELECT 'results'         , COUNT(*) FROM results
UNION ALL SELECT 'attendances'     , COUNT(*) FROM attendances
UNION ALL SELECT 'schedulers'      , COUNT(*) FROM schedulers
UNION ALL SELECT 'lessoncompletions' , COUNT(*) FROM lessoncompletions
UNION ALL SELECT 'studentnotes'    , COUNT(*) FROM studentnotes
UNION ALL SELECT 'studentpythoncodes', COUNT(*) FROM studentpythoncodes
UNION ALL SELECT 'certificates'    , COUNT(*) FROM certificates
UNION ALL SELECT 'report_cards'    , COUNT(*) FROM report_cards
UNION ALL SELECT 'events'          , COUNT(*) FROM events
UNION ALL SELECT 'eventregistrations', COUNT(*) FROM eventregistrations
UNION ALL SELECT 'tickets'         , COUNT(*) FROM tickets
UNION ALL SELECT 'orders'          , COUNT(*) FROM orders
UNION ALL SELECT 'products'        , COUNT(*) FROM products
UNION ALL SELECT 'backup_histories', COUNT(*) FROM backup_histories
UNION ALL SELECT 'websiteregistrations', COUNT(*) FROM websiteregistrations;

-- ══════════════════════════════════════════════════════════════
-- SECTION 2 — DEPENDENCY GRAPH (documented, not executed)
-- Deletion order from deepest leaf → root
-- ══════════════════════════════════════════════════════════════
--
-- TIER 8 (deepest leaves — no children)
--   StudentPythonCodes     ← students, lessons
--   StudentNotes           ← students, lessons
--   LessonCompletions      ← students, lessons, schools
--   Attendances            ← students, teachers, schools
--   report_card_subjects   ← report_cards
--   report_card_activities ← report_cards
--   report_card_skills     ← report_cards
--   TicketAttachments      ← Tickets, TicketComments
--   TicketHistories        ← Tickets, users
--   TicketComments         ← Tickets, users
--   OrderItems             ← Orders, Products
--   CartItems              ← users, Products
--   WishlistItems          ← users, Products
--   EventAuditLogs         ← schools
--   backup_audit_logs      ← (no FK)
--   backup_histories       ← (no FK)
--   WebsiteRegistrations   ← (no FK)
--   UploadedFiles          ← (no FK)
--   InAppNotifications     ← users
--
-- TIER 7
--   results                ← students, exams, schools
--   report_cards           ← students, grades, schools
--   certificates           ← students, schools, certificate_templates
--   EventRegistrations     ← Events, students
--   Tickets                ← schools, users, TicketCategories
--   Orders                 ← users, students, schools
--   schedulers             ← grades, modules, lessons, teachers
--   questions              ← exams (CASCADE), modules, lessons
--
-- TIER 6
--   exams                  ← grades, modules, lessons, teachers
--   Events                 ← schools
--   Products               ← ProductCategories
--
-- TIER 5
--   lessons                ← modules, teachers, schools
--
-- TIER 4
--   modules                ← schools, grades, teachers
--
-- TIER 3 (profiles — trim to 1 each)
--   teachers               ← schools, users   [keep teacher1@nubeera.com]
--   students               ← schools, grades, users  [keep student1@nubeera.com]
--
-- TIER 2 (master records — trim)
--   grades                 ← schools  [keep grades for VER-001]
--   TicketCategories       ← schools  [keep 1 for VER-001]
--   ProductCategories      ← (none)   [keep 1]
--   users                  ← roles, schools  [keep 7 seed accounts]
--
-- TIER 1 (root)
--   schools                [keep VER-001]
--
-- NEVER TOUCHED
--   roles                  (all 7 system roles)
--   grade_levels           (canonical 10-row master, seeded by EF migration)
--   system_settings        (application configuration)
--   report_card_grading_rules  (school/global config)
--   certificate_templates  (master template data)

-- ══════════════════════════════════════════════════════════════
-- SECTION 3 — DISABLE FK CHECKS
-- ══════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 0;
SELECT '✅  Foreign key checks DISABLED — starting cleanup' AS info;

-- ══════════════════════════════════════════════════════════════
-- SECTION 4 — TIER 8: DEEPEST LEAF TABLES (full truncate)
-- These have no children and can be cleared completely
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 8: Truncating leaf tables ──────────────────────' AS info;

TRUNCATE TABLE studentpythoncodes;
SELECT '  ✓ studentpythoncodes cleared' AS progress;

TRUNCATE TABLE studentnotes;
SELECT '  ✓ studentnotes cleared' AS progress;

TRUNCATE TABLE lessoncompletions;
SELECT '  ✓ lessoncompletions cleared' AS progress;

TRUNCATE TABLE attendances;
SELECT '  ✓ attendances cleared' AS progress;

TRUNCATE TABLE report_card_subjects;
SELECT '  ✓ report_card_subjects cleared' AS progress;

TRUNCATE TABLE report_card_activities;
SELECT '  ✓ report_card_activities cleared' AS progress;

TRUNCATE TABLE report_card_skills;
SELECT '  ✓ report_card_skills cleared' AS progress;

TRUNCATE TABLE ticketattachments;
SELECT '  ✓ ticketattachments cleared' AS progress;

TRUNCATE TABLE tickethistories;
SELECT '  ✓ tickethistories cleared' AS progress;

TRUNCATE TABLE ticketcomments;
SELECT '  ✓ ticketcomments cleared' AS progress;

TRUNCATE TABLE orderitems;
SELECT '  ✓ orderitems cleared' AS progress;

TRUNCATE TABLE cartitems;
SELECT '  ✓ cartitems cleared' AS progress;

TRUNCATE TABLE wishlistitems;
SELECT '  ✓ wishlistitems cleared' AS progress;

TRUNCATE TABLE eventauditlogs;
SELECT '  ✓ eventauditlogs cleared' AS progress;

TRUNCATE TABLE backup_audit_logs;
SELECT '  ✓ backup_audit_logs cleared' AS progress;

TRUNCATE TABLE backup_histories;
SELECT '  ✓ backup_histories cleared' AS progress;

TRUNCATE TABLE websiteregistrations;
SELECT '  ✓ websiteregistrations cleared' AS progress;

TRUNCATE TABLE uploadedfiles;
SELECT '  ✓ uploadedfiles cleared' AS progress;

TRUNCATE TABLE inappnotifications;
SELECT '  ✓ inappnotifications cleared' AS progress;

TRUNCATE TABLE teacherlessonprogresses;
SELECT '  ✓ teacherlessonprogresses cleared' AS progress;

TRUNCATE TABLE gradesections;
SELECT '  ✓ gradesections cleared' AS progress;

TRUNCATE TABLE teacher_schools;
SELECT '  ✓ teacher_schools cleared' AS progress;

TRUNCATE TABLE teacher_school_audit_logs;
SELECT '  ✓ teacher_school_audit_logs cleared' AS progress;

TRUNCATE TABLE curriculum_assignment_audit_logs;
SELECT '  ✓ curriculum_assignment_audit_logs cleared' AS progress;

TRUNCATE TABLE school_unit_assignments;
SELECT '  ✓ school_unit_assignments cleared' AS progress;

TRUNCATE TABLE school_topic_assignments;
SELECT '  ✓ school_topic_assignments cleared' AS progress;

TRUNCATE TABLE student_doubts;
SELECT '  ✓ student_doubts cleared' AS progress;

TRUNCATE TABLE teacher_ratings;
SELECT '  ✓ teacher_ratings cleared' AS progress;

TRUNCATE TABLE studentweaktopics;
SELECT '  ✓ studentweaktopics cleared' AS progress;

TRUNCATE TABLE teacherscheduleperiods;
SELECT '  ✓ teacherscheduleperiods cleared' AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 5 — TIER 7: TRANSACTIONAL RECORDS
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 7: Transactional records ───────────────────────' AS info;

TRUNCATE TABLE results;
SELECT '  ✓ results cleared' AS progress;

TRUNCATE TABLE report_cards;
SELECT '  ✓ report_cards cleared' AS progress;

TRUNCATE TABLE certificates;
SELECT '  ✓ certificates cleared' AS progress;

TRUNCATE TABLE eventregistrations;
SELECT '  ✓ eventregistrations cleared' AS progress;

TRUNCATE TABLE tickets;
SELECT '  ✓ tickets cleared' AS progress;

TRUNCATE TABLE orders;
SELECT '  ✓ orders cleared' AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 6 — TIER 6–5: SCHEDULING, ASSESSMENTS, CONTENT
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 6–5: Assessments, scheduling, content ───────────' AS info;

TRUNCATE TABLE schedulers;
SELECT '  ✓ schedulers cleared' AS progress;

TRUNCATE TABLE questions;
SELECT '  ✓ questions cleared' AS progress;

TRUNCATE TABLE exams;
SELECT '  ✓ exams cleared' AS progress;

TRUNCATE TABLE events;
SELECT '  ✓ events cleared' AS progress;

TRUNCATE TABLE products;
SELECT '  ✓ products cleared' AS progress;

-- lessons CASCADE-deletes from modules but we truncate explicitly for clarity
TRUNCATE TABLE lessons;
SELECT '  ✓ lessons cleared' AS progress;

TRUNCATE TABLE modules;
SELECT '  ✓ modules cleared' AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 7 — TIER 4: TRIM TEACHER PROFILES
-- Keep ONLY the profile for teacher1@nubeera.com
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 4: Trimming teacher profiles ───────────────────' AS info;

-- Null out ClassTeacherId on all grades to safely remove extra teacher rows
UPDATE grades SET ClassTeacherId = NULL WHERE ClassTeacherId IS NOT NULL;
SELECT '  ✓ grades.ClassTeacherId cleared (avoid Restrict FK on teachers)' AS progress;

DELETE FROM teachers
WHERE UserId NOT IN (
    SELECT Id FROM users WHERE Email = 'teacher1@nubeera.com'
);
SELECT CONCAT('  ✓ teachers trimmed — ', ROW_COUNT(), ' rows deleted, 1 kept') AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 8 — TIER 4: TRIM STUDENT PROFILES
-- Keep ONLY the profile for student1@nubeera.com
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 4: Trimming student profiles ───────────────────' AS info;

DELETE FROM students
WHERE UserId NOT IN (
    SELECT Id FROM users WHERE Email = 'student1@nubeera.com'
);
SELECT CONCAT('  ✓ students trimmed — ', ROW_COUNT(), ' rows deleted, 1 kept') AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 9 — TIER 3: TRIM USERS TO 7 SEED ACCOUNTS
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 3: Trimming users ───────────────────────────────' AS info;

DELETE FROM users
WHERE Email NOT IN (
    'superadmin@nubeera.com',
    'admin1@nubeera.com',
    'staff1@nubeera.com',
    'principal1@nubeera.com',
    'teacher1@nubeera.com',
    'student1@nubeera.com',
    'parent1@nubeera.com'
);
SELECT CONCAT('  ✓ users trimmed — ', ROW_COUNT(), ' rows deleted, 7 kept') AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 10 — TIER 2: TRIM SCHOOLS TO VER-001
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 2: Trimming schools ─────────────────────────────' AS info;

DELETE FROM schools
WHERE SchoolCode != 'VER-001';
SELECT CONCAT('  ✓ schools trimmed — ', ROW_COUNT(), ' rows deleted, 1 kept') AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 11 — TIER 2: TRIM GRADES
-- Keep ALL grades belonging to the retained school (VER-001)
-- This preserves the student1 grade reference and ensures
-- the school is immediately usable for new test data
-- ══════════════════════════════════════════════════════════════
SELECT '── TIER 2: Trimming grades ──────────────────────────────' AS info;

DELETE FROM grades
WHERE SchoolId NOT IN (
    SELECT Id FROM schools WHERE SchoolCode = 'VER-001'
);
SELECT CONCAT('  ✓ grades trimmed — ', ROW_COUNT(), ' rows deleted') AS progress;

-- Reassign ClassTeacherId to the kept teacher for the kept school's grades
-- (Optional: links Grade 1 to teacher1 so dashboard has a demo class teacher)
UPDATE grades g
INNER JOIN teachers t ON t.SchoolId = g.SchoolId
SET g.ClassTeacherId = t.Id
WHERE g.ClassTeacherId IS NULL
  AND g.SchoolId = (SELECT Id FROM schools WHERE SchoolCode = 'VER-001')
  AND g.GradeLevel = '1';
SELECT '  ✓ Grade 1 class teacher reassigned to teacher1' AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 12 — TRIM MASTER LOOKUP TABLES TO 1 RECORD
-- ══════════════════════════════════════════════════════════════
SELECT '── Trimming master lookup tables ────────────────────────' AS info;

-- ── ProductCategories: keep 1 ─────────────────────────────────
-- Use a subquery workaround (MySQL won't let you DELETE+SELECT same table directly)
DELETE FROM productcategories
WHERE Id NOT IN (
    SELECT Id FROM (
        SELECT Id FROM productcategories ORDER BY CreatedAt ASC LIMIT 1
    ) AS _keep
);
SELECT CONCAT('  ✓ productcategories trimmed — 1 kept') AS progress;

-- ── TicketCategories: keep 1 for VER-001 school ───────────────
-- If no category exists for VER-001, keep any 1 category (fallback)
DELETE FROM ticketcategories
WHERE Id NOT IN (
    SELECT Id FROM (
        SELECT tc.Id
        FROM ticketcategories tc
        INNER JOIN schools s ON tc.SchoolId = s.Id AND s.SchoolCode = 'VER-001'
        ORDER BY tc.CreatedAt ASC
        LIMIT 1
    ) AS _keep
);
-- If the above deleted everything (no VER-001 category existed), insert a default
-- so the system remains functional
INSERT IGNORE INTO ticketcategories (Id, SchoolId, Name, Description, IsActive, CreatedAt)
SELECT
    '00000000-0000-0000-0000-000000000100',
    s.Id,
    'General Support',
    'General support and inquiries',
    1,
    NOW()
FROM schools s
WHERE s.SchoolCode = 'VER-001'
  AND NOT EXISTS (SELECT 1 FROM ticketcategories LIMIT 1);
SELECT '  ✓ TicketCategories trimmed — 1 kept (or inserted default)' AS progress;

-- ══════════════════════════════════════════════════════════════
-- SECTION 13 — RE-ENABLE FK CHECKS
-- ══════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 1;
SELECT '✅  Foreign key checks RE-ENABLED' AS info;

-- ══════════════════════════════════════════════════════════════
-- SECTION 14 — FK INTEGRITY VALIDATION
-- These queries MUST return 0 rows. Any result = broken reference.
-- ══════════════════════════════════════════════════════════════
SELECT '── FK Integrity Checks (expect 0 rows each) ─────────────' AS info;

-- teachers → users
SELECT 'teachers→users (broken)' AS check_name, COUNT(*) AS broken_count
FROM teachers t WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.Id = t.UserId);

-- teachers → schools
SELECT 'teachers→schools (broken)' AS check_name, COUNT(*) AS broken_count
FROM teachers t WHERE NOT EXISTS (SELECT 1 FROM schools s WHERE s.Id = t.SchoolId);

-- students → users
SELECT 'students→users (broken)' AS check_name, COUNT(*) AS broken_count
FROM students s WHERE s.UserId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.Id = s.UserId);

-- students → schools
SELECT 'students→schools (broken)' AS check_name, COUNT(*) AS broken_count
FROM students s WHERE NOT EXISTS (SELECT 1 FROM schools sc WHERE sc.Id = s.SchoolId);

-- students → grades
SELECT 'students→grades (broken)' AS check_name, COUNT(*) AS broken_count
FROM students s WHERE NOT EXISTS (SELECT 1 FROM grades g WHERE g.Id = s.GradeId);

-- users → roles
SELECT 'users→roles (broken)' AS check_name, COUNT(*) AS broken_count
FROM users u WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.Id = u.RoleId);

-- users → schools (nullable — only check non-null)
SELECT 'users→schools (broken)' AS check_name, COUNT(*) AS broken_count
FROM users u WHERE u.SchoolId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.Id = u.SchoolId);

-- grades → schools
SELECT 'grades→schools (broken)' AS check_name, COUNT(*) AS broken_count
FROM grades g WHERE NOT EXISTS (SELECT 1 FROM schools s WHERE s.Id = g.SchoolId);

-- schools → grade_levels (from_grade_id / to_grade_id)
SELECT 'schools→grade_levels(from) (broken)' AS check_name, COUNT(*) AS broken_count
FROM schools sc WHERE sc.from_grade_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM grade_levels gl WHERE gl.Id = sc.from_grade_id);

SELECT 'schools→grade_levels(to) (broken)' AS check_name, COUNT(*) AS broken_count
FROM schools sc WHERE sc.to_grade_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM grade_levels gl WHERE gl.Id = sc.to_grade_id);

-- ══════════════════════════════════════════════════════════════
-- SECTION 15 — POST-CLEANUP AUDIT
-- ══════════════════════════════════════════════════════════════
SELECT '── POST-CLEANUP ROW COUNTS ──────────────────────────────' AS info;

SELECT 'schools'          , COUNT(*) AS rows_remaining FROM schools
UNION ALL SELECT 'roles'              , COUNT(*) FROM roles
UNION ALL SELECT 'grade_levels'       , COUNT(*) FROM grade_levels
UNION ALL SELECT 'grades'             , COUNT(*) FROM grades
UNION ALL SELECT 'users'              , COUNT(*) FROM users
UNION ALL SELECT 'teachers'           , COUNT(*) FROM teachers
UNION ALL SELECT 'students'           , COUNT(*) FROM students
UNION ALL SELECT 'modules'            , COUNT(*) FROM modules
UNION ALL SELECT 'lessons'            , COUNT(*) FROM lessons
UNION ALL SELECT 'exams'              , COUNT(*) FROM exams
UNION ALL SELECT 'questions'          , COUNT(*) FROM questions
UNION ALL SELECT 'results'            , COUNT(*) FROM results
UNION ALL SELECT 'attendances'        , COUNT(*) FROM attendances
UNION ALL SELECT 'schedulers'         , COUNT(*) FROM schedulers
UNION ALL SELECT 'lessoncompletions'  , COUNT(*) FROM lessoncompletions
UNION ALL SELECT 'studentnotes'       , COUNT(*) FROM studentnotes
UNION ALL SELECT 'studentpythoncodes' , COUNT(*) FROM studentpythoncodes
UNION ALL SELECT 'certificates'       , COUNT(*) FROM certificates
UNION ALL SELECT 'report_cards'       , COUNT(*) FROM report_cards
UNION ALL SELECT 'report_card_subjects', COUNT(*) FROM report_card_subjects
UNION ALL SELECT 'report_card_activities', COUNT(*) FROM report_card_activities
UNION ALL SELECT 'report_card_skills' , COUNT(*) FROM report_card_skills
UNION ALL SELECT 'events'             , COUNT(*) FROM events
UNION ALL SELECT 'eventregistrations' , COUNT(*) FROM eventregistrations
UNION ALL SELECT 'tickets'            , COUNT(*) FROM tickets
UNION ALL SELECT 'ticketcategories'   , COUNT(*) FROM ticketcategories
UNION ALL SELECT 'orders'             , COUNT(*) FROM orders
UNION ALL SELECT 'products'           , COUNT(*) FROM products
UNION ALL SELECT 'productcategories'  , COUNT(*) FROM productcategories
UNION ALL SELECT 'backup_histories'   , COUNT(*) FROM backup_histories
UNION ALL SELECT 'backup_audit_logs'  , COUNT(*) FROM backup_audit_logs
UNION ALL SELECT 'websiteregistrations', COUNT(*) FROM websiteregistrations
UNION ALL SELECT 'uploadedfiles'      , COUNT(*) FROM uploadedfiles
UNION ALL SELECT 'inappnotifications' , COUNT(*) FROM inappnotifications
UNION ALL SELECT 'system_settings'    , COUNT(*) FROM system_settings
UNION ALL SELECT 'report_card_grading_rules', COUNT(*) FROM report_card_grading_rules
UNION ALL SELECT 'certificate_templates', COUNT(*) FROM certificate_templates;

-- ══════════════════════════════════════════════════════════════
-- SECTION 16 — RETAINED DATA VERIFICATION
-- ══════════════════════════════════════════════════════════════
SELECT '── Retained Records ─────────────────────────────────────' AS info;

-- Retained school
SELECT 'RETAINED SCHOOL' AS entity, SchoolCode, Name, IsActive FROM schools;

-- Retained users (1 per role)
SELECT 'RETAINED USERS' AS entity,
    u.Email,
    r.RoleName AS role,
    u.FirstName,
    u.LastName,
    u.IsActive,
    s.SchoolCode
FROM users u
INNER JOIN roles r ON r.Id = u.RoleId
LEFT JOIN schools s ON s.Id = u.SchoolId
ORDER BY r.RoleName;

-- Retained teacher profile
SELECT 'RETAINED TEACHER' AS entity, t.EmployeeId, t.FirstName, t.LastName, t.Email, t.IsActive
FROM teachers t;

-- Retained student profile
SELECT 'RETAINED STUDENT' AS entity,
    st.StudentId, st.FirstName, st.LastName, st.Email, st.IsActive,
    g.GradeName AS grade
FROM students st
INNER JOIN grades g ON g.Id = st.GradeId;

-- Retained grades for VER-001
SELECT 'RETAINED GRADES' AS entity, GradeLevel, GradeName, IsActive
FROM grades
ORDER BY CAST(GradeLevel AS UNSIGNED);

-- Grade levels (all 10 preserved)
SELECT 'GRADE_LEVELS' AS entity, LevelNumber, Name, IsActive FROM grade_levels ORDER BY LevelNumber;

-- ══════════════════════════════════════════════════════════════
-- SECTION 17 — AUTO_INCREMENT NOTE
-- ══════════════════════════════════════════════════════════════
-- NOTE: All primary keys in this schema use char(36) UUIDs (Guid.NewGuid()).
-- There are NO integer AUTO_INCREMENT sequences to reset.
-- New records inserted by the application will automatically receive
-- fresh GUIDs with no sequence gaps or collisions.
-- ══════════════════════════════════════════════════════════════

SELECT '═══════════════════════════════════════════════════════' AS divider;
SELECT 'DATABASE CLEANUP COMPLETE ✅' AS result;
SELECT 'The database is ready for fresh testing and development.' AS result;
SELECT 'Login with any of the 7 seed accounts listed above.' AS result;
SELECT '═══════════════════════════════════════════════════════' AS divider;
