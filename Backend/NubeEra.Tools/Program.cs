using System;
using Microsoft.EntityFrameworkCore;
using NubeEra.Infrastructure.Persistence.DbContext;

var connectionString = "Server=localhost;Port=3306;Database=nubeera_db;User=root;Password=root123;";
var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
optionsBuilder.UseMySql(connectionString, serverVersion);

using var context = new AppDbContext(optionsBuilder.Options, null);

// Make students.email nullable (was NOT NULL)
await context.Database.ExecuteSqlRawAsync("ALTER TABLE students MODIFY COLUMN email VARCHAR(150) NULL;");
Console.WriteLine("Migration applied: students.email is now nullable.");

// Verify
var result = await context.Database.ExecuteSqlRawAsync("SELECT COUNT(*) FROM students WHERE email IS NULL;");
Console.WriteLine("Done.");