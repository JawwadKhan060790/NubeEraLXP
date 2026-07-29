// ============================================================================
// NubeEra.Seeder  -  Large-Scale Performance Test Data Generator
// Target database : NubeEra_DB_2  (NEVER touches the production database)
// Run             : dotnet run --project NubeEra.Seeder
// ============================================================================
using System.Diagnostics;
using NubeEra.Seeder.Core;
using NubeEra.Seeder.Seeders;
using NubeEra.Seeder.Validation;
using NubeEra.Seeder.Performance;

Console.OutputEncoding = System.Text.Encoding.UTF8;

Banner("NUBEERA LMS -- PERFORMANCE TEST DATA SEEDER");
Console.WriteLine($"  Target Database  : nubeera_db  (existing database)");
Console.WriteLine($"  MySQL Host       : localhost:3306 (root)");
Console.WriteLine($"  Started          : {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
Console.WriteLine();

var totalSw = Stopwatch.StartNew();

// -- Connection strings -------------------------------------------------------
// Targets the existing production/dev database (nubeera_db)
const string SEED_CONN = "Server=localhost;Port=3306;Database=nubeera_db;User=root;Password=root123;" +
                         "AllowPublicKeyRetrieval=true;SslMode=None;" +
                         "DefaultCommandTimeout=600;ConnectionTimeout=60;" +
                         "AllowLoadLocalInfile=true;";

// -- Step 1: Verify database connection -------------------------------------
Step("1/9", "Database Connection Check");
var dbManager = new DatabaseManager(SEED_CONN);
await dbManager.EnsureDatabaseAsync();

// -- Step 2: Seed foundation data -------------------------------------------
Step("2/9", "Foundation: Roles + GradeLevels + Schools");
var ctx = new SeedContext();
await FoundationSeeder.RunAsync(SEED_CONN, ctx);
Console.WriteLine($"         Roles      : {ctx.Roles.Count}");
Console.WriteLine($"         GradeLevels: {ctx.GradeLevels.Count}");
Console.WriteLine($"         Schools    : {ctx.Schools.Count}");

// -- Step 3: Seed academic structure (grades needed before students) --------
Step("3/9", "Academic: Grades -> Modules -> Lessons/Activities");
await AcademicSeeder.RunAsync(SEED_CONN, ctx);
Console.WriteLine($"         Grades     : {ctx.GradeIds.Count}");
Console.WriteLine($"         Modules    : {ctx.ModuleIds.Count}");
Console.WriteLine($"         Lessons    : {ctx.LessonCount}");

// -- Step 4: Seed user accounts ---------------------------------------------
Step("4/9", "Users: Principals, Teachers, Students, Parents");
await UserSeeder.RunAsync(SEED_CONN, ctx);
Console.WriteLine($"         Principals : {ctx.PrincipalUserIds.Count}");
Console.WriteLine($"         Teachers   : {ctx.TeacherIds.Count}");
Console.WriteLine($"         Students   : {ctx.StudentIds.Count}");
Console.WriteLine($"         Parents    : {ctx.ParentUserIds.Count}");

// Units/Topics are school-agnostic now; each school only "has" one once a
// SchoolUnitAssignment/SchoolTopicAssignment row exists. Needs Principals (AssignedBy),
// so it runs here rather than inside AcademicSeeder.
await AcademicSeeder.RunCurriculumAssignmentsAsync(SEED_CONN, ctx);
Console.WriteLine($"         Curriculum Assignments seeded (each school <- its grade level's Unit/Topics)");

// -- Step 5: Seed commerce --------------------------------------------------
Step("5/9", "Commerce: Product Categories + 100 Products");
await CommerceSeeder.RunAsync(SEED_CONN, ctx);

// -- Step 6: Seed events ----------------------------------------------------
Step("6/9", "Events: 100 Events across schools");
await EventSeeder.RunAsync(SEED_CONN, ctx);

// -- Step 7: Seed support tickets -------------------------------------------
Step("7/9", "Support: TicketCategories + 3,000 Tickets + Comments + History");
await SupportSeeder.RunAsync(SEED_CONN, ctx);

// -- Step 8: Seed MCQ exams + operational data ------------------------------
Step("8/9", "MCQ: Exams + 3,000 Questions  |  Schedulers + Attendance + Notifications");
await McqSeeder.RunAsync(SEED_CONN, ctx);
await OperationalSeeder.RunAsync(SEED_CONN, ctx);

// -- Step 9: Validate all counts --------------------------------------------
Step("9/9", "Validation -- Counting all seeded records");
bool allPass = await RecordValidator.RunAsync(SEED_CONN);

totalSw.Stop();

// -- Final summary -----------------------------------------------------------
Banner("SEED COMPLETE");
Console.WriteLine($"  Total elapsed time  : {totalSw.Elapsed:hh\\:mm\\:ss}");
Console.WriteLine($"  Database            : nubeera_db");
Console.WriteLine($"  Validation          : {(allPass ? "ALL CHECKS PASSED" : "Some checks failed - review above")}");

// -- Optional: HTTP benchmark -----------------------------------------------
Console.WriteLine();
Console.Write("  Run HTTP performance benchmark against running API? [y/N]: ");
var answer = Console.ReadLine();
if (answer?.Trim().ToLower() == "y")
{
    Console.Write("  API base URL [http://localhost:5046]: ");
    var rawUrl = Console.ReadLine()?.Trim();
    var apiUrl = string.IsNullOrEmpty(rawUrl) ? "http://localhost:5046" : rawUrl;
    Banner("PERFORMANCE BENCHMARK");
    await LoadTester.RunAsync(apiUrl);
}

Console.WriteLine("\n  Done. Press any key to exit.");
Console.ReadKey();

// -- Helpers -----------------------------------------------------------------
static void Banner(string title)
{
    var line = new string('=', 72);
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine($"\n{line}");
    Console.WriteLine($"  {title}");
    Console.WriteLine(line);
    Console.ResetColor();
}

static void Step(string num, string description)
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.Write($"\n  [{num}] ");
    Console.ResetColor();
    Console.WriteLine(description);
}
