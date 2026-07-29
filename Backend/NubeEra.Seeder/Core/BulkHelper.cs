using MySqlConnector;
using System.Diagnostics;
using System.Text;

namespace NubeEra.Seeder.Core;

/// <summary>
/// High-performance bulk INSERT helper.
/// Batches rows into multi-value INSERT statements for maximum throughput.
/// Uses a single open connection with FK checks disabled during bulk load.
/// </summary>
public sealed class BulkHelper : IAsyncDisposable
{
    private readonly MySqlConnection _conn;
    private readonly int _batchSize;
    private readonly bool _ownsConnection;  // false when conn is shared

    public BulkHelper(string connStr, int batchSize = 1_000)
    {
        _conn = new MySqlConnection(connStr);
        _batchSize = batchSize;
        _ownsConnection = true;
    }

    /// <summary>Use this overload to share an already-open connection.</summary>
    public BulkHelper(string? connStr, int batchSize, MySqlConnection conn)
    {
        _conn = conn;
        _batchSize = batchSize;
        _ownsConnection = false;
    }

    public async Task OpenAsync()
    {
        if (_ownsConnection)
            await _conn.OpenAsync();
        await ExecAsync("SET foreign_key_checks = 0;");
        await ExecAsync("SET unique_checks = 0;");
        await ExecAsync("SET sql_mode = '';");
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await ExecAsync("SET foreign_key_checks = 1;");
            await ExecAsync("SET unique_checks = 1;");
        }
        catch { /* best-effort */ }
        if (_ownsConnection)
            await _conn.DisposeAsync();
    }

    /// <summary>
    /// Inserts rows in batches. Caller provides the column list and each row as
    /// a pre-formatted SQL value tuple, e.g. "('guid','name',1,NOW())".
    /// </summary>
    public async Task<int> BulkInsertAsync(string table, string columns, IEnumerable<string> rows,
        bool printProgress = true, string label = "")
    {
        var sw = Stopwatch.StartNew();
        var batch = new List<string>(_batchSize);
        int total = 0;

        foreach (var row in rows)
        {
            batch.Add(row);
            if (batch.Count >= _batchSize)
            {
                await FlushAsync(table, columns, batch);
                total += batch.Count;
                batch.Clear();
                if (printProgress)
                    PrintProgress(label, total);
            }
        }

        if (batch.Count > 0)
        {
            await FlushAsync(table, columns, batch);
            total += batch.Count;
        }

        if (printProgress && !string.IsNullOrEmpty(label))
            Console.WriteLine($"\r         {label,-35}: {total,8:N0} rows  [{sw.Elapsed:mm\\:ss}]");

        return total;
    }

    private async Task FlushAsync(string table, string columns, List<string> rows)
    {
        var sb = new StringBuilder();
        sb.Append($"INSERT IGNORE INTO `{table}` ({columns}) VALUES\n");
        sb.AppendJoin(",\n", rows);
        sb.Append(';');
        await ExecAsync(sb.ToString());
    }

    public async Task ExecAsync(string sql)
    {
        await using var cmd = _conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandTimeout = 600;
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<long> CountAsync(string table)
    {
        await using var cmd = _conn.CreateCommand();
        cmd.CommandText = $"SELECT COUNT(*) FROM `{table}`";
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(result);
    }

    private static void PrintProgress(string label, int count)
    {
        Console.Write($"\r         {label,-35}: {count,8:N0} rows...");
    }

    // ── SQL escaping ──────────────────────────────────────────────────────
    public static string Q(string? s) => s is null ? "NULL" : $"'{s.Replace("'", "''")}'";
    public static string G(string guid) => $"'{guid}'";
    public static string D(DateTime dt) => $"'{dt:yyyy-MM-dd HH:mm:ss}'";
    public static string B(bool b) => b ? "1" : "0";
    public static string N(object? v) => v is null ? "NULL" : $"{v}";

    public static string NewGuid() => Guid.NewGuid().ToString();
}
