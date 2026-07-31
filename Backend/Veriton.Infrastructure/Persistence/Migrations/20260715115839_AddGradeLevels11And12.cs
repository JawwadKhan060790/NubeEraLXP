using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGradeLevels11And12 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "grade_levels",
                columns: new[]
                {
                    "Id",
                    "CreatedAt",
                    "CreatedBy",
                    "DeletedBy",
                    "DeletedDate",
                    "DisplayOrder",
                    "IsActive",
                    "IsDeleted",
                    "LevelNumber",
                    "Name",
                    "UpdatedBy",
                    "UpdatedDate"
                },
                values: new object[,]
                {
                    {
                        new Guid("00000000-0000-0000-0000-000000000011"),
                        new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc),
                        null,
                        null,
                        null,
                        11,
                        true,
                        false,
                        11,
                        "Foundation Course",
                        null,
                        null
                    },
                    {
                        new Guid("00000000-0000-0000-0000-000000000012"),
                        new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc),
                        null,
                        null,
                        null,
                        12,
                        true,
                        false,
                        12,
                        "Boot Camp",
                        null,
                        null
                    }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"));

            migrationBuilder.DeleteData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"));
        }
    }
}
