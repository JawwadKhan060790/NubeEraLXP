using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NubeEra.Infrastructure.Persistence.DbContext;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Adds the Latitude/Longitude geolocation columns to the schools table.
    /// These properties already exist on the School entity and SchoolConfiguration
    /// (mapped as decimal(9,6)) but the column was never scaffolded into the
    /// database, causing "Unknown column 's.Latitude' in 'field list'" at runtime.
    /// This migration is purely additive — both columns are nullable so existing
    /// rows are unaffected.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260616130000_AddSchoolLatitudeLongitude")]
    public partial class AddSchoolLatitudeLongitude : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "schools",
                type: "decimal(9,6)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "schools",
                type: "decimal(9,6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Latitude", table: "schools");
            migrationBuilder.DropColumn(name: "Longitude", table: "schools");
        }
    }
}
