using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Veriton.Infrastructure.Persistence.DbContext;
using Veriton.Infrastructure.Persistence.Seed;

namespace Veriton.API.Extensions;

/// <summary>
/// Runs EF migrations and ensures all fallback tables exist (tables created outside
/// EF's migration history that the app depends on at startup).
/// </summary>
public static class DatabaseInitializationExtensions
{
    public static async Task<WebApplication> InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        // ── Ensure Database Exists ───────────────────────────────────────────
        try
        {
            var databaseCreator = (IRelationalDatabaseCreator)db.Database.GetService<IDatabaseCreator>();
            if (!databaseCreator.Exists())
            {
                databaseCreator.Create();
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to ensure database exists catalog level. Proceeding to fallback creation.");
        }

        // ── Fallback tables (idempotent CREATE TABLE IF NOT EXISTS) ──────────
        try
        {


            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS system_settings (
                    `Key` varchar(150) NOT NULL, `Value` text NOT NULL, PRIMARY KEY (`Key`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS backup_histories (
                    Id char(36) NOT NULL, CreatedAt datetime(6) NOT NULL,
                    FileName varchar(255) NOT NULL, FilePath varchar(1000) NOT NULL,
                    FileSizeBytes bigint NOT NULL, DatabaseName varchar(255) NOT NULL,
                    Status varchar(50) NOT NULL, ErrorMessage text NULL,
                    DurationMs bigint NOT NULL, CreatedByUserId char(36) NOT NULL,
                    CreatedByUserName varchar(255) NOT NULL, IsFileDeleted tinyint(1) NOT NULL DEFAULT 0,
                    PRIMARY KEY (Id),
                    KEY IX_backup_histories_Status (Status),
                    KEY IX_backup_histories_CreatedAt (CreatedAt)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS backup_audit_logs (
                    Id char(36) NOT NULL, CreatedAt datetime(6) NOT NULL,
                    UserId char(36) NOT NULL, UserName varchar(255) NOT NULL,
                    Role varchar(50) NOT NULL, ActionType varchar(50) NOT NULL,
                    DateTime datetime(6) NOT NULL, IpAddress varchar(64) NOT NULL,
                    Status varchar(50) NOT NULL, Details text NULL,
                    PRIMARY KEY (Id),
                    KEY IX_backup_audit_logs_UserId (UserId),
                    KEY IX_backup_audit_logs_ActionType (ActionType),
                    KEY IX_backup_audit_logs_DateTime (DateTime)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fallback table creation failed.");
        }

        // ── Align Charsets of grade_levels and related tables to ascii ───────
        try
        {
            db.Database.ExecuteSqlRaw("SET FOREIGN_KEY_CHECKS=0;");

            var gradeLevelsExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grade_levels'").FirstOrDefault();
            if (gradeLevelsExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE grade_levels MODIFY Id char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL"); } catch {}
            }

            var gradesExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grades'").FirstOrDefault();
            if (gradesExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE grades MODIFY GradeLevelId char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL"); } catch {}
            }

            var schoolsExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schools'").FirstOrDefault();
            if (schoolsExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE schools MODIFY from_grade_id char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL"); } catch {}
                try { db.Database.ExecuteSqlRaw("ALTER TABLE schools MODIFY to_grade_id char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL"); } catch {}
            }

            var modulesExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modules'").FirstOrDefault();
            if (modulesExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE modules MODIFY GradeLevelId char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL"); } catch {}
            }

            var unitsExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'units'").FirstOrDefault();
            if (unitsExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE units MODIFY GradeLevelId char(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL"); } catch {}
            }

            var subjectsExists = db.Database.SqlQueryRaw<int>(@"SELECT COUNT(*) AS Value FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subjects'").FirstOrDefault();
            if (subjectsExists > 0)
            {
                try { db.Database.ExecuteSqlRaw("ALTER TABLE subjects MODIFY GradeLevelId char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL"); } catch {}
            }

            db.Database.ExecuteSqlRaw("SET FOREIGN_KEY_CHECKS=1;");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to align character sets of grade_levels tables.");
        }

        // ── EF Migrations ────────────────────────────────────────────────────
        try
        {
            logger.LogInformation("Applying EF Core Database Migrations...");
            db.Database.Migrate();
            logger.LogInformation("EF Core Database Migrations completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "EF Core Migration Failed: {Message}", ex.Message);
            var env = app.Services.GetService<IWebHostEnvironment>();
            if (env != null && env.IsDevelopment())
            {
                logger.LogCritical(ex, "Halting application startup due to unhandled EF Core Migration error in Development environment.");
                throw;
            }
        }

        // ── ExpectedPeriods fallback column ──────────────────────────────────
        try
        {
            var colExists = db.Database.SqlQueryRaw<int>(
                @"SELECT COUNT(*) AS Value
                  FROM INFORMATION_SCHEMA.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'lessons'
                    AND COLUMN_NAME  = 'ExpectedPeriods'").FirstOrDefault();

            if (colExists == 0)
            {
                db.Database.ExecuteSqlRaw("ALTER TABLE lessons ADD ExpectedPeriods int NOT NULL DEFAULT 1;");
                logger.LogInformation("Added ExpectedPeriods column to lessons table.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "ExpectedPeriods fallback column check/add failed.");
        }

        // ── VideoUrls fallback column (JSON array for multiple videos) ────────
        try
        {
            var videoUrlsColExists = db.Database.SqlQueryRaw<int>(
                @"SELECT COUNT(*) AS Value
                  FROM INFORMATION_SCHEMA.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'lessons'
                    AND COLUMN_NAME  = 'VideoUrls'").FirstOrDefault();

            if (videoUrlsColExists == 0)
            {
                db.Database.ExecuteSqlRaw("ALTER TABLE lessons ADD VideoUrls LONGTEXT NULL;");
                logger.LogInformation("Added VideoUrls column to lessons table.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "VideoUrls fallback column check/add failed.");
        }

        // ── Fix TeacherLessonProgress unique index (add GradeId) ─────────────
        try
        {
            // Drop the old index that was missing GradeId, only if it exists
            try
            {
                var oldIdxExists = db.Database.SqlQueryRaw<int>(
                    @"SELECT COUNT(*) AS Value
                      FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME   = 'teacherlessonprogresses'
                        AND INDEX_NAME   = 'IX_teacherlessonprogresses_TeacherId_LessonId_SectionId'").FirstOrDefault();

                if (oldIdxExists > 0)
                {
                    db.Database.ExecuteSqlRaw("ALTER TABLE teacherlessonprogresses DROP INDEX `IX_teacherlessonprogresses_TeacherId_LessonId_SectionId`");
                    logger.LogInformation("Dropped old unique index IX_teacherlessonprogresses_TeacherId_LessonId_SectionId.");
                }
            }
            catch (Exception indexDropEx)
            {
                logger.LogWarning(indexDropEx, "Failed to drop old teacherlessonprogresses index.");
            }

            // Create the corrected index including GradeId
            var idxExists = db.Database.SqlQueryRaw<int>(
                @"SELECT COUNT(*) AS Value
                  FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'teacherlessonprogresses'
                    AND INDEX_NAME   = 'IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId'").FirstOrDefault();

            if (idxExists == 0)
            {
                db.Database.ExecuteSqlRaw(
                    @"CREATE UNIQUE INDEX `IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId`
                      ON teacherlessonprogresses (TeacherId, GradeId, LessonId, SectionId)");
                logger.LogInformation("Created corrected unique index on teacherlessonprogresses (TeacherId, GradeId, LessonId, SectionId).");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to update teacherlessonprogresses unique index.");
        }

        // ── StudentDoubt Hub table ────────────────────────────────────────────
        try
        {
            var doubtTableExists = db.Database.SqlQueryRaw<int>(
                @"SELECT COUNT(*) AS Value
                  FROM INFORMATION_SCHEMA.TABLES
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME   = 'student_doubts'").FirstOrDefault();

            if (doubtTableExists == 0)
            {
                db.Database.ExecuteSqlRaw(@"
                    CREATE TABLE student_doubts (
                        Id            char(36)     NOT NULL,
                        SchoolId      char(36)     NOT NULL,
                        StudentId     char(36)     NOT NULL,
                        GradeId       char(36)     NOT NULL,
                        SectionId     char(36)     NULL,
                        LessonId      char(36)     NULL,
                        ModuleId      char(36)     NULL,
                        Title         varchar(300) NOT NULL,
                        Description   longtext     NOT NULL,
                        ScreenshotUrl longtext     NULL,
                        Status        varchar(20)  NOT NULL DEFAULT 'Open',
                        TeacherReply  longtext     NULL,
                        RepliedAt     datetime(6)  NULL,
                        RepliedByTeacherId char(36) NULL,
                        ClosedAt      datetime(6)  NULL,
                        ClosedByUserId char(36)    NULL,
                        CreatedAt     datetime(6)  NOT NULL,
                        CreatedBy     char(36)     NULL,
                        UpdatedDate   datetime(6)  NULL,
                        UpdatedBy     char(36)     NULL,
                        IsDeleted     tinyint(1)   NOT NULL DEFAULT 0,
                        DeletedDate   datetime(6)  NULL,
                        DeletedBy     char(36)     NULL,
                        PRIMARY KEY (Id),
                        KEY IX_student_doubts_student  (StudentId),
                        KEY IX_student_doubts_school_status (SchoolId, Status),
                        KEY IX_student_doubts_grade_school  (GradeId, SchoolId)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
                logger.LogInformation("Created student_doubts table.");
            }
            else
            {
                // Alter column size to longtext to prevent truncation with Base64 screenshots
                try
                {
                    db.Database.ExecuteSqlRaw("ALTER TABLE student_doubts MODIFY COLUMN ScreenshotUrl longtext NULL;");
                    logger.LogInformation("Altered student_doubts table column ScreenshotUrl to longtext.");
                }
                catch (Exception alterEx)
                {
                    logger.LogWarning(alterEx, "Failed to alter student_doubts table Column ScreenshotUrl.");
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "student_doubts table check/create failed.");
        }

        // ── Certificate tables (ensures tables exist without dropping data) ─
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS certificate_templates (
                Id char(36) CHARACTER SET ascii NOT NULL,
                Name varchar(200) NOT NULL, ProgramType varchar(50) NOT NULL,
                GradeBand varchar(10) NOT NULL, Description varchar(500) NULL,
                CertificateTitle varchar(200) NOT NULL DEFAULT 'CERTIFICATE OF ACHIEVEMENT',
                Tagline varchar(300) NULL, DefaultPrincipalName varchar(200) NULL,
                DefaultDirectorName varchar(200) NULL, DefaultStaffName varchar(200) NULL,
                DefaultStaffDesignation varchar(100) NULL,
                IsActive tinyint(1) NOT NULL DEFAULT 1,
                SchoolId char(36) CHARACTER SET ascii NULL,
                IsDeleted tinyint(1) NOT NULL DEFAULT 0,
                DeletedDate datetime(6) NULL,
                DeletedBy char(36) CHARACTER SET ascii NULL,
                CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id),
                KEY IX_certificate_templates_SchoolId (SchoolId),
                KEY IX_certificate_templates_GradeBand (GradeBand)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS certificates (
                Id char(36) CHARACTER SET ascii NOT NULL,
                CertificateNumber varchar(50) NOT NULL, QrCodeData varchar(500) NULL,
                StudentId char(36) CHARACTER SET ascii NOT NULL,
                TemplateId char(36) CHARACTER SET ascii NULL,
                SchoolId char(36) CHARACTER SET ascii NOT NULL,
                IssuedByUserId char(36) CHARACTER SET ascii NOT NULL,
                ApprovedByUserId char(36) CHARACTER SET ascii NULL,
                StudentName varchar(200) NOT NULL, StudentIdNumber varchar(50) NOT NULL,
                GradeName varchar(100) NOT NULL, GradeLevel int NOT NULL,
                SchoolName varchar(200) NOT NULL, ParentName varchar(200) NULL,
                ProgramType varchar(50) NOT NULL, CourseName varchar(300) NOT NULL,
                AcademicYear varchar(20) NOT NULL, CompletionDate datetime(6) NOT NULL,
                Percentage decimal(5,2) NULL, PerformanceLevel varchar(50) NULL,
                Remarks varchar(500) NULL, Status varchar(30) NOT NULL DEFAULT 'Draft',
                IsApproved tinyint(1) NOT NULL DEFAULT 0, ApprovedAt datetime(6) NULL,
                IsRevoked tinyint(1) NOT NULL DEFAULT 0, RevokeReason varchar(500) NULL,
                RevokedAt datetime(6) NULL, IsAvailableToStudent tinyint(1) NOT NULL DEFAULT 0,
                IssuedAt datetime(6) NULL, ExpiryDate datetime(6) NULL,
                DownloadCount int NOT NULL DEFAULT 0, LastDownloadedAt datetime(6) NULL,
                PrincipalName varchar(200) NULL, PrincipalDesignation varchar(100) NULL,
                DirectorName varchar(200) NULL, DirectorDesignation varchar(100) NULL,
                StaffName varchar(200) NULL, StaffDesignation varchar(100) NULL,
                UpdatedByUserId varchar(36) NULL, UpdatedAt datetime(6) NULL,
                IsDeleted tinyint(1) NOT NULL DEFAULT 0,
                DeletedDate datetime(6) NULL,
                DeletedBy char(36) CHARACTER SET ascii NULL,
                CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id),
                UNIQUE KEY UX_certificates_CertificateNumber (CertificateNumber),
                KEY IX_certificates_StudentId (StudentId),
                KEY IX_certificates_SchoolId (SchoolId),
                KEY IX_certificates_Status (Status),
                CONSTRAINT FK_certificates_Students_StudentId  FOREIGN KEY (StudentId)  REFERENCES students (Id) ON DELETE RESTRICT,
                CONSTRAINT FK_certificates_Schools_SchoolId    FOREIGN KEY (SchoolId)   REFERENCES schools  (Id) ON DELETE RESTRICT,
                CONSTRAINT FK_certificates_CertTemplates_TemplateId FOREIGN KEY (TemplateId) REFERENCES certificate_templates (Id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed default certificate templates
        try
        {
            db.Database.ExecuteSqlRaw(@"
                INSERT INTO certificate_templates
                    (Id, Name, ProgramType, GradeBand, Description, CertificateTitle, Tagline, DefaultPrincipalName, DefaultDirectorName, DefaultStaffName, DefaultStaffDesignation, IsActive, SchoolId, CreatedAt)
                VALUES
                    ('d60df21d-927e-49b8-a6b1-b4f17f4a20b1', 'STEM Achievement Template', 'STEM', '1-10', 'Standard certificate for STEM workshops and programs.', 'CERTIFICATE OF STEM EXCELLENCE', 'For outstanding performance in science, technology, engineering, and mathematics', 'Dr. Sarah Jenkins', 'Mr. Robert Vance', 'Alice Carter', 'STEM Coordinator', 1, NULL, NOW()),
                    ('d60df21d-927e-49b8-a6b1-b4f17f4a20b2', 'Academic Honors Template', 'Honor', '1-10', 'For students achieving top ranks or honors.', 'CERTIFICATE OF ACADEMIC HONOR', 'In recognition of superior academic achievement and dedication to excellence', 'Dr. Sarah Jenkins', 'Mr. Robert Vance', 'David Miller', 'Academic Head', 1, NULL, NOW()),
                    ('d60df21d-927e-49b8-a6b1-b4f17f4a20b3', 'Co-Curricular Achievement Template', 'Co-Curricular', '1-10', 'For excellence in co-curricular activities like sports or arts.', 'CERTIFICATE OF PARTICIPATION', 'For active involvement and excellence in school activities', 'Dr. Sarah Jenkins', 'Mr. Robert Vance', 'Emma Watson', 'Activity In-charge', 1, NULL, NOW()),
                    ('d60df21d-927e-49b8-a6b1-b4f17f4a20b4', 'General Excellence Template', 'Excellence', '1-10', 'For overall excellence in curriculum and behaviour.', 'CERTIFICATE OF EXCELLENCE', 'In recognition of outstanding contributions and performance', 'Dr. Sarah Jenkins', 'Mr. Robert Vance', 'John Doe', 'Grade Coordinator', 1, NULL, NOW()),
                    ('d60df21d-927e-49b8-a6b1-b4f17f4a20b5', 'Regular Completion Template', 'Regular', '1-10', 'Standard certificate for general curriculum completion.', 'CERTIFICATE OF COMPLETION', 'For successful completion of the prescribed course of study', 'Dr. Sarah Jenkins', 'Mr. Robert Vance', 'Jane Smith', 'Class Coordinator', 1, NULL, NOW());");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed default certificate templates.");
        }

        // ── Teacher Rating table (Student Dashboard "Rate Your Teacher") ─────
        // Wrapped in its own try/catch (unlike the certificate/report-card blocks
        // above) so a schema hiccup here can never take down the rest of startup.
        try
        {
            db.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS teacher_ratings (
                    Id char(36) CHARACTER SET ascii NOT NULL,
                    SchoolId char(36) CHARACTER SET ascii NOT NULL,
                    StudentId char(36) CHARACTER SET ascii NOT NULL,
                    TeacherId char(36) CHARACTER SET ascii NOT NULL,
                    GradeId char(36) CHARACTER SET ascii NOT NULL,
                    Rating int NOT NULL,
                    Comment varchar(1000) NULL,
                    CreatedBy char(36) CHARACTER SET ascii NULL,
                    UpdatedBy char(36) CHARACTER SET ascii NULL,
                    UpdatedDate datetime(6) NULL,
                    IsDeleted tinyint(1) NOT NULL DEFAULT 0,
                    DeletedDate datetime(6) NULL,
                    DeletedBy char(36) CHARACTER SET ascii NULL,
                    CreatedAt datetime(6) NOT NULL,
                    PRIMARY KEY (Id),
                    UNIQUE KEY UX_teacher_ratings_StudentId_TeacherId (StudentId, TeacherId),
                    KEY IX_teacher_ratings_TeacherId (TeacherId),
                    KEY IX_teacher_ratings_SchoolId (SchoolId),
                    KEY IX_teacher_ratings_GradeId (GradeId),
                    CONSTRAINT FK_teacher_ratings_schools_SchoolId   FOREIGN KEY (SchoolId)  REFERENCES schools  (Id) ON DELETE RESTRICT,
                    CONSTRAINT FK_teacher_ratings_students_StudentId FOREIGN KEY (StudentId) REFERENCES students (Id) ON DELETE CASCADE,
                    CONSTRAINT FK_teacher_ratings_teachers_TeacherId FOREIGN KEY (TeacherId) REFERENCES teachers (Id) ON DELETE CASCADE,
                    CONSTRAINT FK_teacher_ratings_grades_GradeId     FOREIGN KEY (GradeId)   REFERENCES grades   (Id) ON DELETE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create teacher_ratings fallback table.");
        }

        // ── Report Card tables ───────────────────────────────────────────────
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS report_card_grading_rules (
                Id char(36) CHARACTER SET ascii NOT NULL,
                SchoolId char(36) CHARACTER SET ascii NULL,
                MinPercentage decimal(5,2) NOT NULL, MaxPercentage decimal(5,2) NOT NULL,
                GradeLetter varchar(10) NOT NULL, GpaValue decimal(4,2) NULL,
                Description varchar(100) NULL, IsActive tinyint(1) NOT NULL DEFAULT 1,
                SortOrder int NOT NULL DEFAULT 0, CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id), KEY IX_report_card_grading_rules_SchoolId (SchoolId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS report_cards (
                Id char(36) CHARACTER SET ascii NOT NULL,
                SchoolId char(36) CHARACTER SET ascii NOT NULL,
                StudentId char(36) CHARACTER SET ascii NOT NULL,
                GradeId char(36) CHARACTER SET ascii NOT NULL,
                ReportCardNumber varchar(50) NOT NULL, AcademicYear varchar(20) NOT NULL,
                ExamType varchar(50) NOT NULL, ExamName varchar(200) NULL,
                ExamDate datetime(6) NULL, StudentName varchar(200) NOT NULL,
                StudentIdNumber varchar(50) NOT NULL, RollNo varchar(50) NULL,
                GradeName varchar(100) NOT NULL, Section varchar(50) NULL,
                SchoolName varchar(200) NOT NULL, SchoolAddress varchar(500) NULL,
                SchoolLogoUrl varchar(500) NULL, SchoolContact varchar(100) NULL,
                DateOfBirth datetime(6) NULL, ParentName varchar(200) NULL,
                ParentContact varchar(100) NULL,
                TotalMarks decimal(8,2) NOT NULL DEFAULT 0,
                ObtainedMarks decimal(8,2) NOT NULL DEFAULT 0,
                Percentage decimal(5,2) NOT NULL DEFAULT 0,
                OverallGrade varchar(10) NULL, GPA decimal(4,2) NULL,
                `Rank` int NULL, IsPassed tinyint(1) NOT NULL DEFAULT 0,
                TotalWorkingDays int NULL, DaysPresent int NULL, DaysAbsent int NULL,
                AttendancePercentage decimal(5,2) NULL,
                TeacherRemarks varchar(1000) NULL, PrincipalRemarks varchar(1000) NULL,
                Status varchar(20) NOT NULL DEFAULT 'Draft',
                IsVisibleToStudent tinyint(1) NOT NULL DEFAULT 0,
                IsVisibleToParent tinyint(1) NOT NULL DEFAULT 0,
                GeneratedByUserId char(36) CHARACTER SET ascii NOT NULL,
                ApprovedByUserId char(36) CHARACTER SET ascii NULL,
                PublishedByUserId char(36) CHARACTER SET ascii NULL,
                ApprovedAt datetime(6) NULL, PublishedAt datetime(6) NULL,
                QrCodeData varchar(500) NULL, DownloadCount int NOT NULL DEFAULT 0,
                LastDownloadedAt datetime(6) NULL, UpdatedAt datetime(6) NULL,
                UpdatedByUserId varchar(36) NULL, CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id),
                UNIQUE KEY UX_report_cards_ReportCardNumber (ReportCardNumber),
                KEY IX_report_cards_SchoolId_AcademicYear (SchoolId, AcademicYear),
                KEY IX_report_cards_StudentId_AcademicYear (StudentId, AcademicYear),
                KEY IX_report_cards_Status (Status),
                CONSTRAINT FK_report_cards_schools_SchoolId   FOREIGN KEY (SchoolId)  REFERENCES schools  (Id) ON DELETE RESTRICT,
                CONSTRAINT FK_report_cards_students_StudentId FOREIGN KEY (StudentId) REFERENCES students (Id) ON DELETE RESTRICT,
                CONSTRAINT FK_report_cards_grades_GradeId     FOREIGN KEY (GradeId)   REFERENCES grades   (Id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS report_card_subjects (
                Id char(36) CHARACTER SET ascii NOT NULL,
                ReportCardId char(36) CHARACTER SET ascii NOT NULL,
                SubjectName varchar(200) NOT NULL, MaxMarks int NOT NULL,
                ObtainedMarks decimal(8,2) NOT NULL DEFAULT 0,
                Grade varchar(10) NULL, Remarks varchar(500) NULL,
                SortOrder int NOT NULL DEFAULT 0, CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id), KEY IX_report_card_subjects_ReportCardId (ReportCardId),
                CONSTRAINT FK_rc_subjects_report_cards FOREIGN KEY (ReportCardId) REFERENCES report_cards (Id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS report_card_activities (
                Id char(36) CHARACTER SET ascii NOT NULL,
                ReportCardId char(36) CHARACTER SET ascii NOT NULL,
                ActivityName varchar(100) NOT NULL, Rating varchar(50) NULL,
                Remarks varchar(500) NULL, SortOrder int NOT NULL DEFAULT 0,
                CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id), KEY IX_report_card_activities_ReportCardId (ReportCardId),
                CONSTRAINT FK_rc_activities_report_cards FOREIGN KEY (ReportCardId) REFERENCES report_cards (Id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS report_card_skills (
                Id char(36) CHARACTER SET ascii NOT NULL,
                ReportCardId char(36) CHARACTER SET ascii NOT NULL,
                SkillName varchar(100) NOT NULL, Rating int NOT NULL DEFAULT 1,
                Remarks varchar(500) NULL, SortOrder int NOT NULL DEFAULT 0,
                CreatedAt datetime(6) NOT NULL,
                PRIMARY KEY (Id), KEY IX_report_card_skills_ReportCardId (ReportCardId),
                CONSTRAINT FK_rc_skills_report_cards FOREIGN KEY (ReportCardId) REFERENCES report_cards (Id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed default grading rules once
        try
        {
            db.Database.ExecuteSqlRaw(@"
                INSERT IGNORE INTO report_card_grading_rules
                    (Id, SchoolId, MinPercentage, MaxPercentage, GradeLetter, GpaValue, Description, IsActive, SortOrder, CreatedAt)
                VALUES
                    (UUID(), NULL, 90, 100, 'A+', 4.00, 'Outstanding',  1, 1, NOW()),
                    (UUID(), NULL, 80, 89,  'A',  3.70, 'Excellent',    1, 2, NOW()),
                    (UUID(), NULL, 70, 79,  'B+', 3.30, 'Very Good',    1, 3, NOW()),
                    (UUID(), NULL, 60, 69,  'B',  3.00, 'Good',         1, 4, NOW()),
                    (UUID(), NULL, 50, 59,  'C',  2.00, 'Satisfactory', 1, 5, NOW()),
                    (UUID(), NULL, 0,  49,  'F',  0.00, 'Fail',         1, 6, NOW());");
        }
        catch { /* already seeded */ }

        AdminSeeder.Seed(db, app.Configuration);

        await Task.CompletedTask;
        return app;
    }
}
