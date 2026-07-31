using Veriton.Seeder.Core;
using static Veriton.Seeder.Core.BulkHelper;

namespace Veriton.Seeder.Seeders;

/// <summary>
/// Seeds:
///   10   Schedulers  (1 per teacher/grade/module)
///   ~10  Attendance records  (10 students × 1 working day)
///   ~40  InAppNotifications (various types per user role)
/// </summary>
public static class OperationalSeeder
{
    // Attendance status enum values (must match C# enum order)
    private const int ATT_PRESENT = 0;
    private const int ATT_ABSENT  = 1;
    private const int ATT_LATE    = 2;
    private const int ATT_EXCUSED = 3;

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        await using var bulk = new BulkHelper(connStr, 2_000);
        await bulk.OpenAsync();

        await SeedSchedulersAsync(bulk, ctx);
        await SeedAttendanceAsync(bulk, ctx);
        await SeedNotificationsAsync(bulk, ctx);
    }

    // ── Schedulers (10) ──────────────────────────────────────────────────
    private static async Task SeedSchedulersAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now  = DateTime.UtcNow;
        var rows = new List<string>(10);

        // Time slots for the school day
        (TimeSpan Start, TimeSpan End)[] slots =
        [
            (new TimeSpan(8,  0, 0), new TimeSpan(8,  45, 0)),
            (new TimeSpan(8,  50, 0), new TimeSpan(9,  35, 0)),
            (new TimeSpan(9,  40, 0), new TimeSpan(10, 25, 0)),
            (new TimeSpan(10, 45, 0), new TimeSpan(11, 30, 0)),
            (new TimeSpan(11, 35, 0), new TimeSpan(12, 20, 0)),
            (new TimeSpan(13, 0,  0), new TimeSpan(13, 45, 0)),
            (new TimeSpan(13, 50, 0), new TimeSpan(14, 35, 0)),
        ];

        // Generate 10 scheduler records — 1 per teacher/school/grade/module
        for (int n = 1; n <= 10; n++)
        {
            var id       = NewGuid();
            var tchNum   = ((n - 1) % 10) + 1;

            if (!ctx.TeacherIds.TryGetValue(tchNum, out var tch)) continue;

            var schoolId  = tch.SchoolId;
            var schoolNum = ctx.Schools.FirstOrDefault(s => s.Value == schoolId).Key;
            if (schoolNum == 0) schoolNum = ((tchNum - 1) % 10) + 1;

            var level   = ((schoolNum - 1) % 10) + 1;
            var gradeId = ctx.GradeId(schoolNum, level);
            // Units are keyed by grade level now (school-agnostic); resolve via the
            // school's own grade level rather than a per-school module sequence.
            var modId   = ctx.ModuleIds.TryGetValue(level, out var m) ? (string?)m.ModuleId : null;

            var slot        = slots[(n - 1) % slots.Length];
            var sessionDate = now.Date.AddDays((n - 1) % 10);

            rows.Add(
                $"({G(id)},{G(schoolId)},{G(gradeId)}," +
                $"{(modId != null ? G(modId) : "NULL")}," +
                $"NULL," +
                $"{G(tch.TeacherId)}," +
                $"'{sessionDate:yyyy-MM-dd HH:mm:ss}'," +
                $"'{slot.Start}'," +
                $"'{slot.End}'," +
                $"1,{D(now)})");
        }

        await bulk.BulkInsertAsync("schedulers",
            "Id,SchoolId,GradeId,ModuleId,LessonId,TeacherId,Date,StartTime,EndTime,IsActive,CreatedAt",
            rows, label: "Schedulers (10)");
    }

    // ── Attendance (~10) — 10 students × 1 day ───────────────────────────
    private static async Task SeedAttendanceAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now  = DateTime.UtcNow;
        // 1 working day back from today
        var days = Enumerable.Range(0, 1).Select(i => now.Date.AddDays(-i - 1)).ToArray();

        // Weighted status: 80% Present, 8% Absent, 7% Late, 5% Excused
        var statusPool = new List<int>(100);
        for (int i = 0; i < 80; i++) statusPool.Add(ATT_PRESENT);
        for (int i = 0; i < 8;  i++) statusPool.Add(ATT_ABSENT);
        for (int i = 0; i < 7;  i++) statusPool.Add(ATT_LATE);
        for (int i = 0; i < 5;  i++) statusPool.Add(ATT_EXCUSED);

        var rand = new Random(42);
        int total = 0;
        const int BATCH = 2_000;
        var rows = new List<string>(BATCH);

        // 10 students × 1 day = 10 attendance records
        foreach (var day in days)
        {
            foreach (var (stdNum, std) in ctx.StudentIds)
            {
                var id     = NewGuid();
                var status = statusPool[rand.Next(statusPool.Count)];
                var remark = status switch
                {
                    ATT_ABSENT  => "Student was absent",
                    ATT_LATE    => "Arrived 15 minutes late",
                    ATT_EXCUSED => "Medical leave",
                    _           => (string?)null
                };

                // Assign a teacher for this school (round-robin)
                var tchNum = ((stdNum - 1) % 10) + 1;
                var tId    = ctx.TeacherIds.TryGetValue(tchNum, out var t2) ? (string?)t2.TeacherId : null;

                rows.Add(
                    $"({G(id)},{G(std.SchoolId)}," +
                    $"'{day:yyyy-MM-dd HH:mm:ss}'," +
                    $"{status}," +
                    $"{Q(remark)}," +
                    $"{(tId != null ? G(tId) : "NULL")}," +
                    $"{G(std.StudentId)}," +
                    $"{D(now)})");

                total++;
                if (rows.Count >= BATCH)
                {
                    await bulk.BulkInsertAsync("Attendances",
                        "Id,SchoolId,Date,Status,Remarks,TeacherId,StudentId,CreatedAt",
                        rows, printProgress: false);
                    rows.Clear();
                    Console.Write($"\r  [Attendance] {total:N0} ...");
                }
            }
        }

        if (rows.Count > 0)
            await bulk.BulkInsertAsync("Attendances",
                "Id,SchoolId,Date,Status,Remarks,TeacherId,StudentId,CreatedAt",
                rows, printProgress: false);

        Console.WriteLine($"\r  ✓ Attendances                              : {total,8:N0} rows  [done]");
    }

    // ── InApp Notifications (~40) — 1 per user ───────────────────────────
    private static async Task SeedNotificationsAsync(BulkHelper bulk, SeedContext ctx)
    {
        var now  = DateTime.UtcNow;
        var rows = new List<string>(60);

        // ── Students: 1 notification each (10) ──
        foreach (var (stdNum, std) in ctx.StudentIds)
        {
            var id  = NewGuid();
            var msg = (stdNum % 5) switch
            {
                0 => "Your report card for the mid-term exam is now available.",
                1 => "New lesson uploaded: check your latest module activity.",
                2 => "Reminder: MCQ exam scheduled tomorrow. Please prepare.",
                3 => "Your attendance has been marked for today.",
                _ => "A new event has been posted. Click to view details.",
            };
            var link = (stdNum % 5) switch
            {
                0 => "/report-cards/my",
                1 => "/lessons",
                2 => "/exams",
                3 => "/attendance",
                _ => "/events",
            };
            rows.Add(
                $"({G(id)},{G(std.UserId)}," +
                $"{Q(msg)},{Q(link)},0,{D(now.AddDays(-stdNum % 30))})");
        }

        // ── Teachers: 1 notification each (10) ──
        foreach (var (tchNum, tch) in ctx.TeacherIds)
        {
            var id  = NewGuid();
            var msg = (tchNum % 4) switch
            {
                0 => "New student added to your class. Please review the roster.",
                1 => "Reminder: Submit attendance for today's session.",
                2 => "A support ticket has been assigned to your school.",
                _ => "Your scheduled class starts in 30 minutes.",
            };
            rows.Add(
                $"({G(id)},{G(tch.UserId)}," +
                $"{Q(msg)},{Q("/dashboard")},0,{D(now.AddDays(-tchNum % 15))})");
        }

        // ── Principals: 1 notification each (10) ──
        foreach (var (schNum, principalUserId) in ctx.PrincipalUserIds)
        {
            var id  = NewGuid();
            var msg = (schNum % 3) switch
            {
                0 => "Monthly school performance report is ready.",
                1 => "New teacher registered and awaiting approval.",
                _ => "3 open support tickets require your attention.",
            };
            rows.Add(
                $"({G(id)},{G(principalUserId)}," +
                $"{Q(msg)},{Q("/dashboard")},0,{D(now.AddDays(-schNum % 20))})");
        }

        // ── Parents: 1 notification each (10) ──
        foreach (var (parNum, parentUserId) in ctx.ParentUserIds.Take(10))
        {
            var id  = NewGuid();
            var msg = (parNum % 3) switch
            {
                0 => "Your child's report card is now available. Click to view.",
                1 => "Attendance alert: your child was absent today.",
                _ => "New event registration open at your child's school.",
            };
            var link = parNum % 3 == 0 ? "/report-cards/children" : "/events";
            rows.Add(
                $"({G(id)},{G(parentUserId)}," +
                $"{Q(msg)},{Q(link)},0,{D(now.AddDays(-parNum % 14))})");
        }

        await bulk.BulkInsertAsync("InAppNotifications",
            "Id,UserId,Message,LinkUrl,IsRead,CreatedAt",
            rows, label: $"Notifications ({rows.Count:N0})");
    }
}
