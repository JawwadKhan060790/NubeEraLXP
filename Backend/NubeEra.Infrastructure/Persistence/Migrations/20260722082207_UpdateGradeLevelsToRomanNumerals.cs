using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGradeLevelsToRomanNumerals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SELECT COUNT(*) INTO @exists
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE CONSTRAINT_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'grades' 
                  AND CONSTRAINT_NAME = 'CK_grades_GradeLevel_1_to_12';
                SET @query = IF(@exists > 0, 'ALTER TABLE grades DROP CHECK CK_grades_GradeLevel_1_to_12', 'SELECT 1');
                PREPARE stmt FROM @query;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 3, "Grade I" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 4, "Grade II" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000003"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 5, "Grade III" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000004"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 6, "Grade IV" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000005"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 7, "Grade V" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000006"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 8, "Grade VI" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 9, "Grade VII" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 10, "Grade VIII" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 11, "Grade IX" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 12, "Grade X" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                columns: new[] { "DisplayOrder", "LevelNumber", "Name" },
                values: new object[] { 2, 0, "Foundation Course" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                columns: new[] { "DisplayOrder", "LevelNumber", "Name" },
                values: new object[] { 1, -1, "Boot Camp" });

            migrationBuilder.Sql("UPDATE grades SET GradeLevel = '0', GradeName = 'Foundation Course' WHERE GradeLevelId = '00000000-0000-0000-0000-000000000011';");
            migrationBuilder.Sql("UPDATE grades SET GradeLevel = '-1', GradeName = 'Boot Camp' WHERE GradeLevelId = '00000000-0000-0000-0000-000000000012';");

            migrationBuilder.AddCheckConstraint(
                name: "CK_grades_GradeLevel_minus1_to_10",
                table: "grades",
                sql: "`GradeLevel` REGEXP '^(10|[1-9]|0|-1)(st|nd|rd|th)?$'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_grades_GradeLevel_minus1_to_10",
                table: "grades");

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 1, "1st Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 2, "2nd Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000003"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 3, "3rd Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000004"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 4, "4th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000005"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 5, "5th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000006"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 6, "6th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000007"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 7, "7th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000008"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 8, "8th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000009"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 9, "9th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000010"),
                columns: new[] { "DisplayOrder", "Name" },
                values: new object[] { 10, "10th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000011"),
                columns: new[] { "DisplayOrder", "LevelNumber", "Name" },
                values: new object[] { 11, 11, "11th Grade" });

            migrationBuilder.UpdateData(
                table: "grade_levels",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000012"),
                columns: new[] { "DisplayOrder", "LevelNumber", "Name" },
                values: new object[] { 12, 12, "12th Grade" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_12",
                table: "grades",
                sql: "`GradeLevel` REGEXP '^(12|11|10|[1-9])(st|nd|rd|th)?$'");
        }
    }
}
