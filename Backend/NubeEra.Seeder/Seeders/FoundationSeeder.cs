using MySqlConnector;
using NubeEra.Seeder.Core;
using static NubeEra.Seeder.Core.BulkHelper;

namespace NubeEra.Seeder.Seeders;

/// <summary>
/// Seeds: Roles (7), GradeLevels (10), Schools (10)
/// Reads existing rows first so ctx GUIDs always match what is in the DB.
/// </summary>
public static class FoundationSeeder
{
    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        await using var conn = new MySqlConnection(connStr);
        await conn.OpenAsync();

        await LoadOrSeedRolesAsync(conn, ctx);
        await LoadOrSeedGradeLevelsAsync(conn, ctx);
        await SeedSchoolsAsync(conn, ctx);
    }

    // ── Roles ─────────────────────────────────────────────────────────────
    private static async Task LoadOrSeedRolesAsync(MySqlConnection conn, SeedContext ctx)
    {
        // Try to load existing roles first
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, RoleName FROM roles";
            try
            {
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    ctx.Roles[r.GetString(1)] = r.GetString(0);
            }
            catch { /* table may not exist yet */ }
        }

        string[] names = ["SuperAdmin", "Admin", "Staff", "Principal", "Teacher", "Student", "Parent"];
        var now  = DateTime.UtcNow;
        var rows = new List<string>();

        foreach (var name in names)
        {
            if (!ctx.Roles.ContainsKey(name))
            {
                var id = NewGuid();
                ctx.Roles[name] = id;
            }
            // Always insert (IGNORE if exists)
            rows.Add($"({G(ctx.Roles[name])},{Q(name)},1,{D(now)})");
        }

        await using var bulk = new BulkHelper(connStr: null!, batchSize: 500, conn: conn);
        await bulk.OpenAsync();   // disables FK/unique checks on shared conn
        await bulk.BulkInsertAsync("roles", "Id,RoleName,IsActive,CreatedAt", rows, label: "Roles");

        Console.WriteLine($"         Roles      : {ctx.Roles.Count}");
    }

    // ── GradeLevels ───────────────────────────────────────────────────────
    //
    // IMPORTANT: These GUIDs must stay in sync with GradeLevelConfiguration.GradeLevelSeedIds
    // in NubeEra.Infrastructure. They are the system-defined, immutable canonical IDs for the
    // 10 grade levels (1st–10th Grade) seeded by the EF migration.
    //
    // Why hardcode them here instead of generating new GUIDs?
    // BulkHelper.OpenAsync() issues SET unique_checks = 0 which disables InnoDB's unique
    // constraint enforcement. With unique_checks=0, even INSERT IGNORE will insert a new row
    // for every call, bypassing the UNIQUE index on LevelNumber. If we ever generated a fresh
    // GUID for a grade level that already existed, we'd insert a duplicate row on each seeder
    // run. By always using the canonical GUIDs and only inserting levels that are genuinely
    // absent, we guarantee idempotency.
    private static readonly string[] CanonicalGradeLevelIds =
    [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000003",
        "00000000-0000-0000-0000-000000000004",
        "00000000-0000-0000-0000-000000000005",
        "00000000-0000-0000-0000-000000000006",
        "00000000-0000-0000-0000-000000000007",
        "00000000-0000-0000-0000-000000000008",
        "00000000-0000-0000-0000-000000000009",
        "00000000-0000-0000-0000-000000000010",
        "00000000-0000-0000-0000-000000000011",
        "00000000-0000-0000-0000-000000000012",
    ];

    private static async Task LoadOrSeedGradeLevelsAsync(MySqlConnection conn, SeedContext ctx)
    {
        // Load whatever already exists (keyed by LevelNumber)
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, LevelNumber FROM grade_levels ORDER BY LevelNumber";
            try
            {
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                    ctx.GradeLevels[r.GetInt32(1)] = r.GetString(0);
            }
            catch { }
        }

        // Only insert grade levels that are genuinely absent.
        // NEVER insert a row for a level that already exists — BulkHelper.OpenAsync()
        // disables unique_checks, which means INSERT IGNORE does NOT prevent duplicate
        // rows on InnoDB when that session variable is 0.
        var now  = DateTime.UtcNow;
        var rows = new List<string>();

        var levelDefs = new System.Collections.Generic.List<(int LevelNumber, string Name, string CanonicalId, int DisplayOrder)>
        {
            (-1, "Boot Camp", CanonicalGradeLevelIds[11], 1),
            (0, "Foundation Course", CanonicalGradeLevelIds[10], 2),
            (1, "Grade I", CanonicalGradeLevelIds[0], 3),
            (2, "Grade II", CanonicalGradeLevelIds[1], 4),
            (3, "Grade III", CanonicalGradeLevelIds[2], 5),
            (4, "Grade IV", CanonicalGradeLevelIds[3], 6),
            (5, "Grade V", CanonicalGradeLevelIds[4], 7),
            (6, "Grade VI", CanonicalGradeLevelIds[5], 8),
            (7, "Grade VII", CanonicalGradeLevelIds[6], 9),
            (8, "Grade VIII", CanonicalGradeLevelIds[7], 10),
            (9, "Grade IX", CanonicalGradeLevelIds[8], 11),
            (10, "Grade X", CanonicalGradeLevelIds[9], 12)
        };

        foreach (var def in levelDefs)
        {
            if (!ctx.GradeLevels.ContainsKey(def.LevelNumber))
            {
                ctx.GradeLevels[def.LevelNumber] = def.CanonicalId;
                rows.Add($"({G(def.CanonicalId)},{def.LevelNumber},{Q(def.Name)},{def.DisplayOrder},1,{D(now)})");
            }
        }

        if (rows.Count > 0)
        {
            await using var bulk = new BulkHelper(connStr: null!, batchSize: 500, conn: conn);
            await bulk.OpenAsync();
            await bulk.BulkInsertAsync("grade_levels",
                "Id,LevelNumber,Name,DisplayOrder,IsActive,CreatedAt", rows, label: "GradeLevels");
        }

        Console.WriteLine($"         GradeLevels: {ctx.GradeLevels.Count}");
    }

    // ── Schools (10) ──────────────────────────────────────────────────────
    private static async Task SeedSchoolsAsync(MySqlConnection conn, SeedContext ctx)
    {
        var fromGradeId = ctx.GradeLevels[1];
        var toGradeId   = ctx.GradeLevels[10];
        var now         = DateTime.UtcNow;
        var countries   = new[] { "UAE", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman" };
        var cities      = new[] { "Dubai", "Abu Dhabi", "Riyadh", "Doha", "Kuwait City", "Muscat" };

        var rows = Enumerable.Range(1, 10).Select(n =>
        {
            var id      = NewGuid();
            ctx.Schools[n] = id;
            var code    = $"SCH{n:D3}";
            var name    = $"{code} International School";
            var city    = cities[(n - 1) % cities.Length];
            var country = countries[(n - 1) % countries.Length];
            var estDate = $"{2000 + (n % 24):0000}-01-01 00:00:00";
            return
                $"({G(id)},{Q(code)},{Q(name)},NULL," +
                $"{Q($"{n} Education District, {city}")},{Q(city)},NULL,{Q(PostalCode(n))},{Q(country)}," +
                $"{Q($"admin@{code.ToLower()}.edu")},{Q($"+971-{50+n:D2}-{1000000+n:D7}")}," +
                $"NULL,NULL,NULL," +
                $"'{estDate}'," +
                $"{Q($"https://www.{code.ToLower()}.edu")},1," +
                $"{G(fromGradeId)},{G(toGradeId)},{D(now)})";
        });

        await using var bulk = new BulkHelper(connStr: null!, batchSize: 500, conn: conn);
        await bulk.OpenAsync();
        await bulk.BulkInsertAsync("schools",
            "Id,SchoolCode,Name,LogoUrl,Address,City,State,PostalCode,Country," +
            "ContactEmail,ContactPhone,PrincipalName,PrincipalEmail,PrincipalPhone," +
            "EstablishedDate,Website,IsActive,from_grade_id,to_grade_id,CreatedAt",
            rows, label: "Schools (10)");
    }

    private static string PostalCode(int n) => $"{10000 + (n * 97) % 89999:D5}";
}
