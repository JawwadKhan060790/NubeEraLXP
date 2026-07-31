using MySqlConnector;

namespace Veriton.Seeder.Core;

/// <summary>
/// Verifies connectivity to the existing database (veriton_db).
/// Does NOT drop, recreate, or migrate — schema must already exist.
/// </summary>
public sealed class DatabaseManager
{
    private readonly string _connStr;

    public DatabaseManager(string connStr)
    {
        _connStr = connStr;
    }

    public async Task EnsureDatabaseAsync()
    {
        await using var conn = new MySqlConnection(_connStr);
        await conn.OpenAsync();

        // Confirm the critical tables are present before seeding
        var required = new[] { "roles", "users", "schools", "students", "teachers",
                                "grades", "modules", "lessons", "exams", "questions",
                                "schedulers", "Attendances", "InAppNotifications" };

        await using var cmd = conn.CreateCommand();
        foreach (var table in required)
        {
            cmd.CommandText = $"SELECT COUNT(*) FROM information_schema.tables " +
                              $"WHERE table_schema = DATABASE() AND table_name = '{table}'";
            var exists = Convert.ToInt64(await cmd.ExecuteScalarAsync()) > 0;
            if (!exists)
                throw new Exception($"Required table '{table}' not found in veriton_db. " +
                                    "Run the application migrations first.");
        }

        Console.WriteLine("         Database veriton_db: connected OK");
        Console.WriteLine("         All required tables: present");
    }
}
