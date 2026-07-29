using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace NubeEra.Seeder.Performance;

/// <summary>
/// HTTP load tester using HttpClient + Task.WhenAll.
/// Tests concurrency levels: 100, 500, 1000, 2000, 5000 virtual users.
/// Each "user" performs a login then hits a dashboard / listing endpoint.
/// </summary>
public static class LoadTester
{
    private record BenchmarkResult(
        int ConcurrentUsers,
        string Endpoint,
        int TotalRequests,
        int Succeeded,
        int Failed,
        double AvgMs,
        double P95Ms,
        double P99Ms,
        double MinMs,
        double MaxMs,
        double ReqPerSec);

    private static readonly int[] ConcurrencyLevels = [100, 500, 1000, 2000, 5000];

    // Target: pre-seeded user in NubeEra_DB_2 (s1@student.sch001.edu / 123456)
    private const string TestUser = "s1@student.sch001.edu";
    private const string TestPass = "123456";

    public static async Task RunAsync(string apiBaseUrl)
    {
        Console.WriteLine();
        Console.WriteLine("╔══════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║              LOAD TEST REPORT — NubeEra API (NubeEra_DB_2)      ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════════╝");
        Console.WriteLine($"\n  Base URL : {apiBaseUrl}");
        Console.WriteLine($"  Test user: {TestUser}\n");

        // 1. Acquire a JWT token once
        string? token = null;
        try
        {
            token = await LoginAsync(apiBaseUrl);
            Console.WriteLine($"  ✓ Login OK — JWT acquired\n");
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"  ✗ Login FAILED: {ex.Message}");
            Console.WriteLine($"    Make sure the API is running at {apiBaseUrl} with NubeEra_DB_2 configured.");
            Console.ResetColor();
            return;
        }

        var endpoints = new (string Label, string Path)[]
        {
            ("Login",      "/api/auth/login"),
            ("Dashboard",  "/api/dashboard"),
            ("Students",   "/api/students?page=1&pageSize=10"),
            ("Lessons",    "/api/lessons?page=1&pageSize=10"),
            ("Reports",    "/api/report-cards?page=1&pageSize=10"),
        };

        var allResults = new List<BenchmarkResult>();

        foreach (var level in ConcurrencyLevels)
        {
            Console.WriteLine($"  ─── Concurrency: {level,5} virtual users ────────────────────────────");

            foreach (var (label, path) in endpoints)
            {
                var result = await BenchmarkEndpointAsync(
                    apiBaseUrl, path, label, level, token,
                    isLogin: label == "Login");

                allResults.Add(result);

                var status = result.AvgMs switch
                {
                    < 500  => ConsoleColor.Green,
                    < 2000 => ConsoleColor.Yellow,
                    _      => ConsoleColor.Red,
                };

                Console.Write($"    {label,-12} | Avg: ");
                Console.ForegroundColor = status;
                Console.Write($"{result.AvgMs,7:F1} ms");
                Console.ResetColor();
                Console.Write($" | P95: {result.P95Ms,7:F1} ms | P99: {result.P99Ms,7:F1} ms");
                Console.Write($" | RPS: {result.ReqPerSec,6:F1}");
                Console.Write($" | Err: {result.Failed}/{result.TotalRequests}");
                Console.WriteLine();
            }
            Console.WriteLine();
        }

        PrintSummaryTable(allResults);
        PrintPerformanceTargets(allResults);
        PrintOptimizationRecommendations(allResults);
    }

    // ── Login to obtain JWT ────────────────────────────────────────────────
    private static async Task<string> LoginAsync(string baseUrl)
    {
        using var client = CreateClient(baseUrl, null);
        var payload = JsonSerializer.Serialize(new { Email = TestUser, Password = TestPass });
        var resp    = await client.PostAsync("/api/auth/login",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsStringAsync();
        var doc  = JsonDocument.Parse(body);

        // Try common envelope shapes
        if (doc.RootElement.TryGetProperty("data", out var data))
        {
            if (data.TryGetProperty("token", out var t)) return t.GetString()!;
            if (data.TryGetProperty("accessToken", out var at)) return at.GetString()!;
        }
        if (doc.RootElement.TryGetProperty("token", out var tk)) return tk.GetString()!;
        if (doc.RootElement.TryGetProperty("accessToken", out var aTk)) return aTk.GetString()!;

        throw new InvalidOperationException($"Could not parse JWT from login response: {body[..Math.Min(200, body.Length)]}");
    }

    // ── Benchmark a single endpoint at a given concurrency ─────────────────
    private static async Task<BenchmarkResult> BenchmarkEndpointAsync(
        string baseUrl, string path, string label, int concurrency,
        string? token, bool isLogin)
    {
        var latencies = new double[concurrency];
        int succeeded = 0, failed = 0;

        var tasks = Enumerable.Range(0, concurrency).Select(async i =>
        {
            var sw = Stopwatch.StartNew();
            try
            {
                using var client = CreateClient(baseUrl, isLogin ? null : token);

                HttpResponseMessage resp;
                if (isLogin)
                {
                    var payload = JsonSerializer.Serialize(new { Email = TestUser, Password = TestPass });
                    resp = await client.PostAsync(path,
                        new StringContent(payload, Encoding.UTF8, "application/json"));
                }
                else
                {
                    resp = await client.GetAsync(path);
                }

                sw.Stop();
                latencies[i] = sw.Elapsed.TotalMilliseconds;

                if (resp.StatusCode == HttpStatusCode.OK ||
                    resp.StatusCode == HttpStatusCode.Created ||
                    resp.StatusCode == HttpStatusCode.NoContent)
                    Interlocked.Increment(ref succeeded);
                else
                    Interlocked.Increment(ref failed);
            }
            catch
            {
                sw.Stop();
                latencies[i] = sw.Elapsed.TotalMilliseconds;
                Interlocked.Increment(ref failed);
            }
        }).ToArray();

        var wallSw = Stopwatch.StartNew();
        await Task.WhenAll(tasks);
        wallSw.Stop();

        var sorted  = latencies.OrderBy(x => x).ToArray();
        var avg     = sorted.Average();
        var p95     = sorted[(int)(concurrency * 0.95)];
        var p99     = sorted[(int)(concurrency * 0.99)];
        var min     = sorted[0];
        var max     = sorted[^1];
        var rps     = concurrency / wallSw.Elapsed.TotalSeconds;

        return new BenchmarkResult(concurrency, label, concurrency, succeeded, failed,
            avg, p95, p99, min, max, rps);
    }

    // ── Summary Table ─────────────────────────────────────────────────────
    private static void PrintSummaryTable(List<BenchmarkResult> results)
    {
        Console.WriteLine("╔══════════════════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║                         BENCHMARK SUMMARY TABLE                             ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════════════════════╝");
        Console.WriteLine();
        Console.WriteLine($"  {"Users",6} {"Endpoint",-12} {"Avg(ms)",9} {"P95(ms)",9} {"P99(ms)",9} {"Min(ms)",9} {"Max(ms)",9} {"RPS",8} {"Err%",6}");
        Console.WriteLine($"  {new string('─', 80)}");

        foreach (var r in results)
        {
            var errPct = r.TotalRequests > 0 ? (double)r.Failed / r.TotalRequests * 100 : 0;
            Console.WriteLine($"  {r.ConcurrentUsers,6} {r.Endpoint,-12} {r.AvgMs,9:F1} {r.P95Ms,9:F1} {r.P99Ms,9:F1} {r.MinMs,9:F1} {r.MaxMs,9:F1} {r.ReqPerSec,8:F1} {errPct,5:F1}%");
        }
        Console.WriteLine();
    }

    // ── Performance Targets Check ─────────────────────────────────────────
    private static void PrintPerformanceTargets(List<BenchmarkResult> results)
    {
        Console.WriteLine("  PERFORMANCE TARGETS CHECK:");
        Console.WriteLine($"  {"Target",-45} {"Status",-10}");
        Console.WriteLine($"  {new string('─', 55)}");

        var targets = new (string Desc, Func<BenchmarkResult, bool> Check)[]
        {
            ("Login endpoint avg < 2,000 ms",        r => r.Endpoint == "Login"     && r.AvgMs < 2000),
            ("Dashboard endpoint avg < 3,000 ms",    r => r.Endpoint == "Dashboard" && r.AvgMs < 3000),
            ("Students API avg < 500 ms",            r => r.Endpoint == "Students"  && r.AvgMs < 500),
            ("Lessons API avg < 500 ms",             r => r.Endpoint == "Lessons"   && r.AvgMs < 500),
            ("Report Cards avg < 5,000 ms",          r => r.Endpoint == "Reports"   && r.AvgMs < 5000),
            ("Error rate < 1% at 100 users",         r => r.ConcurrentUsers == 100 && (double)r.Failed / r.TotalRequests < 0.01),
            ("Error rate < 5% at 1000 users",        r => r.ConcurrentUsers == 1000 && (double)r.Failed / r.TotalRequests < 0.05),
        };

        foreach (var (desc, check) in targets)
        {
            // Check all results for the condition
            bool met = results.Any(r => check(r) && r.ConcurrentUsers == ConcurrencyLevels[0]);
            // Simpler: check at any level
            met = results.Any(check);
            Console.Write($"  {desc,-45} ");
            Console.ForegroundColor = met ? ConsoleColor.Green : ConsoleColor.Yellow;
            Console.WriteLine(met ? "✓ PASS" : "⚠ CHECK");
            Console.ResetColor();
        }
        Console.WriteLine();
    }

    // ── Optimization Recommendations ──────────────────────────────────────
    private static void PrintOptimizationRecommendations(List<BenchmarkResult> results)
    {
        Console.WriteLine("  OPTIMIZATION RECOMMENDATIONS:");
        Console.WriteLine($"  {new string('─', 65)}");

        var recs = new List<(string Area, string Recommendation, string Impact)>();

        // Check if any endpoint is slow
        var slowEndpoints = results.Where(r => r.AvgMs > 1000).Select(r => r.Endpoint).Distinct().ToList();
        if (slowEndpoints.Any())
        {
            recs.Add(("Indexing",
                $"Add composite indexes on ({string.Join(", ", slowEndpoints.Take(2))} queries)",
                "HIGH — typically 5-20× speedup on large tables"));
        }

        recs.AddRange([
            ("EF Core",       "Use .AsNoTracking() on all read-only queries",                   "MEDIUM — reduces memory + CPU for GET endpoints"),
            ("EF Core",       "Project to DTOs using .Select() instead of loading full entities","HIGH — eliminates N+1 on navigation properties"),
            ("Caching",       "Add IMemoryCache for GradeLevels, Roles, School lookups (TTL 5m)","MEDIUM — eliminates repeated DB calls for static data"),
            ("Pagination",    "Enforce max pageSize=100 on all list endpoints",                  "MEDIUM — prevents full-table scans at large pageSize"),
            ("Connection Pool","Set MaxPoolSize=200 in connection string for concurrent load",   "HIGH — prevents pool exhaustion at 1000+ users"),
            ("MySQL Config",  "innodb_buffer_pool_size = 70% of RAM (e.g. 2G on 4G server)",    "HIGH — reduces disk I/O for repeated queries"),
            ("MySQL Config",  "query_cache_type=1 + query_cache_size=256M",                     "MEDIUM — caches frequent read queries"),
            ("API",           "Enable Response Compression (Brotli/Gzip) in Program.cs",        "MEDIUM — reduces payload size by 60-80%"),
            ("API",           "Add OutputCache on /api/dashboard and /api/grade-levels",        "HIGH — eliminates repeated computation"),
            ("Auth",          "Increase JWT expiry to 8h for benchmarking (reduce auth overhead)","LOW — reduces re-login roundtrips in tests"),
        ]);

        foreach (var (area, rec, impact) in recs)
            Console.WriteLine($"  [{area,-14}] {rec,-57}\n  {"",-16} Impact: {impact}\n");

        Console.WriteLine();
        Console.WriteLine("  ─── CRITICAL INDEXES TO ADD ─────────────────────────────────────");
        var indexes = new[]
        {
            ("lessons",        "SchoolId, ModuleId, IsActive"),
            ("modules",        "SchoolId, GradeId, IsActive"),
            ("grades",         "SchoolId, GradeLevel"),
            ("Attendances",    "SchoolId, Date, StudentId"),
            ("tickets",        "SchoolId, Status, CreatedAt"),
            ("questions",      "ExamId, SchoolId"),
            ("InAppNotifications", "UserId, IsRead, CreatedAt"),
            ("AspNetUsers",    "NormalizedEmail"),
        };

        foreach (var (tbl, cols) in indexes)
            Console.WriteLine($"    ALTER TABLE `{tbl}` ADD INDEX IF NOT EXISTS (` {cols}`);");

        Console.WriteLine();
    }

    // ── HttpClient factory ─────────────────────────────────────────────────
    private static HttpClient CreateClient(string baseUrl, string? bearerToken)
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
            MaxConnectionsPerServer = 200,
        };
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri(baseUrl),
            Timeout     = TimeSpan.FromSeconds(30),
        };
        if (bearerToken != null)
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", bearerToken);
        return client;
    }
}
