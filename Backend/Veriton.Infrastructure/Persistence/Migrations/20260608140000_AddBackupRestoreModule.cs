using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Veriton.Infrastructure.Persistence.DbContext;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Adds backup and restore module tables. Modified to be idempotent because the tables already exist.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608140000_AddBackupRestoreModule")]
    public partial class AddBackupRestoreModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tables backup_histories and backup_audit_logs already exist.
            // No operation to avoid duplicate creation errors.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally left empty to preserve existing backup data.
        }
    }
}
