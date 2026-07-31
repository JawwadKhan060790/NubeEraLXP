using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class schoolupdate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "from_grade_id",
                table: "schools",
                type: "char(36)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "to_grade_id",
                table: "schools",
                type: "char(36)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "grade_levels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    LevelNumber = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "varchar(50)", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_grade_levels", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "grade_levels",
                columns: new[] { "Id", "CreatedAt", "DisplayOrder", "IsActive", "LevelNumber", "Name" },
                values: new object[,] {
                    { new Guid("00000000-0000-0000-0000-000000000001"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 1, true, 1, "1st Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000002"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 2, true, 2, "2nd Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000003"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 3, true, 3, "3rd Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000004"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 4, true, 4, "4th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000005"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 5, true, 5, "5th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000006"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 6, true, 6, "6th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000007"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 7, true, 7, "7th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000008"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 8, true, 8, "8th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000009"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 9, true, 9, "9th Grade" },
                    { new Guid("00000000-0000-0000-0000-000000000010"), new DateTime(2026,1,1,0,0,0,DateTimeKind.Unspecified), 10, true, 10, "10th Grade" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_schools_from_grade_id",
                table: "schools",
                column: "from_grade_id");

            migrationBuilder.CreateIndex(
                name: "IX_schools_to_grade_id",
                table: "schools",
                column: "to_grade_id");

            migrationBuilder.AddForeignKey(
                name: "FK_schools_grade_levels_from_grade_id",
                table: "schools",
                column: "from_grade_id",
                principalTable: "grade_levels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_schools_grade_levels_to_grade_id",
                table: "schools",
                column: "to_grade_id",
                principalTable: "grade_levels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_schools_grade_levels_from_grade_id",
                table: "schools");

            migrationBuilder.DropForeignKey(
                name: "FK_schools_grade_levels_to_grade_id",
                table: "schools");

            migrationBuilder.DropIndex(
                name: "IX_schools_from_grade_id",
                table: "schools");

            migrationBuilder.DropIndex(
                name: "IX_schools_to_grade_id",
                table: "schools");

            migrationBuilder.DropColumn(
                name: "from_grade_id",
                table: "schools");

            migrationBuilder.DropColumn(
                name: "to_grade_id",
                table: "schools");

            migrationBuilder.DropTable(
                name: "grade_levels");
        }
    }
}
