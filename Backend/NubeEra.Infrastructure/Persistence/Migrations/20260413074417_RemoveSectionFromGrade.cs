using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSectionFromGrade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_grades_SchoolId_GradeLevel_AcademicYear",
                table: "grades",
                columns: new[] { "SchoolId", "GradeLevel", "AcademicYear" },
                unique: true);

            migrationBuilder.DropIndex(
                name: "IX_grades_SchoolId_GradeLevel_Section_AcademicYear",
                table: "grades");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "grades");

            migrationBuilder.AlterColumn<Guid>(
                name: "ModuleId",
                table: "schedulers",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");


        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_grades_SchoolId_GradeLevel_AcademicYear",
                table: "grades");

            migrationBuilder.AlterColumn<Guid>(
                name: "ModuleId",
                table: "schedulers",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "grades",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_grades_SchoolId_GradeLevel_Section_AcademicYear",
                table: "grades",
                columns: new[] { "SchoolId", "GradeLevel", "Section", "AcademicYear" },
                unique: true);
        }
    }
}
