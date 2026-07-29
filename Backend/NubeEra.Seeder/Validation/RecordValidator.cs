using MySqlConnector;

namespace NubeEra.Seeder.Validation;

/// <summary>
/// Queries every seeded table and prints exact record counts.
/// Returns false if any critical count is below its minimum target.
/// </summary>
public static class RecordValidator
{
    private record TableSpec(string Table, string Label, int MinExpected);

    private static readonly TableSpec[] Tables =
    [
        // Foundation
        new("roles",                "Roles",                    7),
        new("grade_levels",         "GradeLevels",             10),
        new("schools",              "Schools",                500),

        // Users (all roles stored in `users` table)
        new("users",                "Users (total)",         10_700), // 500+200+5000+5000
        new("teachers",             "Teachers",                200),
        new("students",             "Students",              5_000),

        // Academic
        new("grades",               "Grades",                5_000),
        new("modules",              "Modules",              30_000),
        new("lessons",              "Lessons",             300_000),

        // Commerce
        new("ProductCategories",    "ProductCategories",         5),
        new("Products",             "Products",                100),

        // Events
        new("Events",               "Events",                  100),

        // Support
        new("TicketCategories",     "TicketCategories",        500),
        new("Tickets",              "Tickets",               3_000),
        new("TicketComments",       "TicketComments",        3_000),
        new("TicketHistories",      "TicketHistories",       3_000),

        // MCQ
        new("exams",                "Exams",                   300),
        new("questions",            "MCQ Questions",         3_000),

        // Operational
        new("schedulers",           "Schedulers",              500),
        new("Attendances",          "Attendance",           50_000),
        new("InAppNotifications",   "Notifications",         5_000),
    ];

    public static async Task<bool> RunAsync(string connStr)
    {
        Console.WriteLine();
        Console.WriteLine("╔══════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║              RECORD COUNT VALIDATION — NubeEra_DB_2             ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════════╝");
        Console.WriteLine();

        bool allPass = true;
        int  pass    = 0;
        int  fail    = 0;

        await using var conn = new MySqlConnection(connStr);
        await conn.OpenAsync();

        Console.WriteLine($"  {"Table",-30} {"Label",-25} {"Count",10}  {"Min",10}  Status");
        Console.WriteLine($"  {new string('─', 30)} {new string('─', 25)} {new string('─', 10)}  {new string('─', 10)}  ──────");

        long grandTotal = 0;
        foreach (var spec in Tables)
        {
            long count;
            try
            {
                await using var cmd = new MySqlCommand($"SELECT COUNT(*) FROM `{spec.Table}`", conn);
                count = Convert.ToInt64(await cmd.ExecuteScalarAsync());
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  {spec.Table,-30} {spec.Label,-25} {"ERROR",10}  {spec.MinExpected,10}  ✗ ({ex.Message[..Math.Min(40, ex.Message.Length)]})");
                Console.ResetColor();
                allPass = false;
                fail++;
                continue;
            }

            grandTotal += count;
            bool ok     = count >= spec.MinExpected;
            if (!ok) { allPass = false; fail++; }
            else pass++;

            if (ok)
                Console.ForegroundColor = ConsoleColor.Green;
            else
                Console.ForegroundColor = ConsoleColor.Red;

            Console.WriteLine($"  {spec.Table,-30} {spec.Label,-25} {count,10:N0}  {spec.MinExpected,10:N0}  {(ok ? "✓" : "✗ BELOW TARGET")}");
            Console.ResetColor();
        }

        Console.WriteLine();
        Console.WriteLine($"  {"─────────────────────────────────────────────────────────────────",-67}");
        Console.WriteLine($"  Grand total rows across all tables: {grandTotal:N0}");
        Console.WriteLine();

        if (allPass)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"  ✓ ALL {pass} TABLE CHECKS PASSED  — NubeEra_DB_2 is fully seeded.");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"  ⚠  {pass} passed / {fail} failed — Review failing tables above.");
        }
        Console.ResetColor();
        Console.WriteLine();

        return allPass;
    }
}
