using Veriton.Seeder.Core;
using static Veriton.Seeder.Core.BulkHelper;

namespace Veriton.Seeder.Seeders;

/// <summary>
/// Seeds:
///   10 Grades   (10 schools × 1 grade each, grade level cycles 1–10)
///   10 Units    (1 per canonical grade level — school-agnostic master content)
///   10 Topic-Lessons (10 units × 1 topic each)
///   School Unit/Topic Assignments (each school assigned the Unit/Topic for its own grade level)
///   Total lessons: 10
///
/// Units (Modules) and Topics (Lessons) are no longer owned by a school or a per-school
/// Grade row — they are keyed only by the canonical GradeLevel, so the exact same Unit/Topic
/// applies to every school at that grade level. A school only "has" a Unit/Topic once an
/// explicit SchoolUnitAssignment/SchoolTopicAssignment row exists (mirrors the real
/// /admin/curriculum-assignment workflow).
/// </summary>
public static class AcademicSeeder
{
    private const int UNITS_PER_GRADE     = 1;
    private const int TOPICS_PER_UNIT     = 1;
    private const int ACTIVITIES_PER_UNIT = 0;

    private static readonly string[] Subjects =
    [
        "Mathematics", "Science", "English Language", "Robotics & Coding",
        "AI & Machine Learning", "STEM Engineering"
    ];

    private static readonly string[] TopicTemplates =
    [
        "Introduction to {0} – Fundamentals and Key Concepts",
        "Core Principles of {0} – Theory and Practice",
        "Advanced Applications of {0}",
        "Problem Solving with {0}",
        "Project-Based Learning: {0} in Action"
    ];

    private static readonly (string Name, string Desc, bool Robotics, bool Python, bool Ai, bool Generic)[] ActivityTypes =
    [
        ("Robotics Build Challenge",         "Students assemble and program a robot to complete a real-world task.",    true,  false, false, true),
        ("Python Coding Lab",                "Hands-on Python coding session solving domain-specific problems.",        false, true,  false, true),
        ("AI Tool Workshop",                 "Explore AI tools and apply them to analyse data and generate insights.",  false, false, true,  true),
        ("Coding Sprint Activity",           "Timed coding challenge reinforcing unit concepts through code.",          false, false, false, true),
        ("STEM Innovation Challenge",        "Design, prototype, and test a STEM solution for a real-world problem.",  false, false, false, true),
    ];

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        await using var bulk = new BulkHelper(connStr, 2_000);
        await bulk.OpenAsync();

        await SeedGradesAsync(bulk, ctx);
        await SeedModulesAsync(bulk, ctx);
        await SeedLessonsAsync(bulk, ctx);
        // NOTE: School Unit/Topic Assignments are NOT seeded here — AssignedBy needs
        // ctx.PrincipalUserIds, which UserSeeder populates *after* AcademicSeeder runs.
        // See RunCurriculumAssignmentsAsync, called separately from Program.cs once
        // UserSeeder has completed.
    }

    // ── Grades (10) — 1 grade per school, level cycles 1–10 ──────────────
    private static async Task SeedGradesAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now     = DateTime.UtcNow;
        var rows    = new List<string>(10);
        int modIdx  = 0;

        foreach (var (schoolNum, schoolId) in ctx.Schools)
        {
            // Each school gets exactly 1 grade; level cycles 1–10 across the 10 schools
            int level   = ((schoolNum - 1) % 10) + 1;
            var gradeId = NewGuid();
            ctx.GradeIds[$"{schoolNum}-{level}"] = gradeId;

            // Assign a teacher as class teacher (round-robin among 10 teachers)
            var tcherNum = ((modIdx) % 10) + 1;
            var tId      = ctx.TeacherIds.TryGetValue(tcherNum, out var t) ? t.TeacherId : null;
            modIdx++;

            rows.Add(
                $"({G(gradeId)},{G(schoolId)}," +
                $"{Q(level.ToString())}," +
                $"{Q($"Grade {level}")}," +
                $"30," +
                $"{(tId != null ? G(tId) : "NULL")}," +
                $"{Q($"Room {level * 10}")}," +
                $"{Q("2025-2026")},1,{G(ctx.GradeLevels[level])},{D(now)})");
        }

        await bulk.BulkInsertAsync("grades",
            "Id,SchoolId,GradeLevel,GradeName,Capacity,ClassTeacherId,ClassRoom,AcademicYear,IsActive,GradeLevelId,CreatedAt",
            rows, label: "Grades (10)");
    }

    // ── Modules / Units (10) — 1 Unit per canonical grade level ──────────
    // School-agnostic master content: keyed only by GradeLevelId, no SchoolId/GradeId.
    // Every school sees the same Unit for a given grade level once assigned via
    // SchoolUnitAssignment (see SeedCurriculumAssignmentsAsync below).
    private static async Task SeedModulesAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now  = DateTime.UtcNow;
        var rows = new List<string>(10);

        foreach (var level in ctx.GradeLevels.Keys.OrderBy(l => l))
        {
            var gradeLevelId = ctx.GradeLevels[level];
            var tchNum       = ((level - 1) % 10) + 1;
            var tId          = ctx.TeacherIds.TryGetValue(tchNum, out var t) ? t.TeacherId : (string?)null;

            for (int u = 1; u <= UNITS_PER_GRADE; u++)   // UNITS_PER_GRADE = 1
            {
                var subj  = Subjects[(u - 1) % Subjects.Length];
                var modId = NewGuid();
                ctx.ModuleIds[level] = (modId, gradeLevelId);

                rows.Add(
                    $"({G(modId)},{G(gradeLevelId)}," +
                    $"{Q($"Unit {u}: {subj}")}," +
                    $"{Q($"Grade {level} Unit {u} – {subj} curriculum for academic year 2025-2026.")}," +
                    $"3," +
                    $"{(tId != null ? G(tId) : "NULL")}," +
                    $"NULL,1,{D(now)})");
            }
        }

        await bulk.BulkInsertAsync("modules",
            "Id,GradeLevelId,Name,Description,Credits,CreatedByTeacherId,PdfFileUrl,IsActive,CreatedAt",
            rows, label: "Units (10)");
    }

    // ── Lessons: Topics (10) — 1 topic per module ────────────────────────
    private static async Task SeedLessonsAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now   = DateTime.UtcNow;
        int total = 0;

        const int LESSON_BATCH = 2_000;
        var rows = new List<string>(LESSON_BATCH);

        foreach (var (level, (modId, _)) in ctx.ModuleIds)
        {
            var subj = Subjects[(level - 1) % Subjects.Length];
            var lessonIds = ctx.LessonIdsByLevel.TryGetValue(level, out var existing)
                ? existing
                : ctx.LessonIdsByLevel[level] = new List<string>();

            // 5 Topics
            for (int tp = 1; tp <= TOPICS_PER_UNIT; tp++)
            {
                var lid   = NewGuid();
                var title = string.Format(TopicTemplates[(tp - 1) % TopicTemplates.Length], subj);
                var proc  = $"1. Review prerequisites.\n2. Introduce {subj} concepts.\n3. Work through examples.\n4. Practice exercises.\n5. Assess understanding.";
                lessonIds.Add(lid);

                rows.Add(
                    $"({G(lid)},{G(modId)}," +
                    $"{Q($"Topic {tp}: {title}")}," +
                    $"NULL,NULL,NULL," +
                    $"{Q(proc)}," +
                    $"{Q($"Whiteboard, markers, textbooks, laptops")}," +
                    $"{Q($"Students gain a solid understanding of {subj} concepts.")}," +
                    $"NULL,{tp},45,NULL,1,0,0,0,0,NULL,{D(now)})");

                total++;
                if (rows.Count >= LESSON_BATCH)
                {
                    await FlushLessonsAsync(bulk, rows);
                    rows.Clear();
                }
            }

            // 5 Activities
            for (int ac = 0; ac < ACTIVITIES_PER_UNIT; ac++)
            {
                var (actName, actDesc, isRobotics, isPython, isAi, _) = ActivityTypes[ac];
                var lid = NewGuid();
                lessonIds.Add(lid);

                rows.Add(
                    $"({G(lid)},{G(modId)}," +
                    $"{Q($"Activity {ac+1}: {actName}")}," +
                    $"{Q(actDesc)}," +
                    $"NULL,NULL," +
                    $"{Q($"Step 1: Prepare materials.\nStep 2: Demonstrate the activity.\nStep 3: Hands-on practice.\nStep 4: Present results.\nStep 5: Debrief and evaluate.")}," +
                    $"{Q($"Activity kit, safety equipment, laptops, internet access")}," +
                    $"{Q($"Students develop practical skills in {actName.ToLower()}.")}," +
                    $"NULL,{TOPICS_PER_UNIT + ac + 1},60,NULL,1," +
                    $"1," +
                    $"{B(isRobotics)},{B(isPython)},{B(isAi)}," +
                    $"NULL,{D(now)})");

                total++;
                if (rows.Count >= LESSON_BATCH)
                {
                    await FlushLessonsAsync(bulk, rows);
                    rows.Clear();
                }
            }
        }

        // Final flush
        if (rows.Count > 0)
            await FlushLessonsAsync(bulk, rows);

        ctx.LessonCount = total;
        Console.WriteLine($"\r         Lessons (Topics+Activities)       : {total,8:N0} rows  [done]");
    }

    private static async Task FlushLessonsAsync(BulkHelper bulk, List<string> rows)
    {
        await bulk.BulkInsertAsync("lessons",
            "Id,ModuleId,SubTopic,Activity,VideoUrl,DiagramUrl," +
            "`Procedure`,RequiredMaterial,WhatYouGet,CreatedByTeacherId," +
            "SerialNumber,TotalHours,PdfFileUrl,IsActive,IsActivity," +
            "IsRoboticsActivity,IsPythonActivity,IsAiToolActivity,BrowserUrl,CreatedAt",
            rows, printProgress: false);
    }

    // ── School Curriculum Assignments ────────────────────────────────────
    // Mirrors the real /admin/curriculum-assignment workflow: assign each school
    // the Unit/Topic(s) for its own grade level, so seeded demo schools have visible
    // curriculum out of the box instead of needing a manual admin step.
    //
    // Must run AFTER UserSeeder (needs ctx.PrincipalUserIds for AssignedBy) — called
    // directly from Program.cs, not from RunAsync above.
    public static async Task RunCurriculumAssignmentsAsync(string connStr, SeedContext ctx)
    {
        await using var bulk = new BulkHelper(connStr, 2_000);
        await bulk.OpenAsync();

        var now       = DateTime.UtcNow;
        var unitRows  = new List<string>();
        var topicRows = new List<string>();

        foreach (var (schoolNum, schoolId) in ctx.Schools)
        {
            int level = ((schoolNum - 1) % 10) + 1;
            if (!ctx.ModuleIds.TryGetValue(level, out var mod)) continue;

            // AssignedBy must be a real user id (column is non-nullable); use the school's
            // principal as the "admin" who assigned the curriculum.
            if (!ctx.PrincipalUserIds.TryGetValue(schoolNum, out var assignedBy)) continue;

            unitRows.Add(
                $"({G(NewGuid())},{G(schoolId)},{G(mod.ModuleId)}," +
                $"{G(assignedBy)},{D(now)},NULL,{D(now)})");

            if (ctx.LessonIdsByLevel.TryGetValue(level, out var lessonIds))
            {
                foreach (var lid in lessonIds)
                {
                    topicRows.Add(
                        $"({G(NewGuid())},{G(schoolId)},{G(lid)}," +
                        $"{G(assignedBy)},{D(now)},NULL,{D(now)})");
                }
            }
        }

        await bulk.BulkInsertAsync("school_unit_assignments",
            "Id,SchoolId,UnitId,AssignedBy,AssignedDate,Notes,CreatedAt",
            unitRows, label: "School Unit Assignments (10)");

        await bulk.BulkInsertAsync("school_topic_assignments",
            "Id,SchoolId,TopicId,AssignedBy,AssignedDate,Notes,CreatedAt",
            topicRows, label: "School Topic Assignments (10)");
    }
}
