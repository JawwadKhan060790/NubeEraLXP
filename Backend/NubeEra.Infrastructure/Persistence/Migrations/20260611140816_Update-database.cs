using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Updatedatabase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_questions_ModuleId",
                table: "questions",
                newName: "IX_questions_module");

            migrationBuilder.RenameIndex(
                name: "IX_questions_ExamId",
                table: "questions",
                newName: "IX_questions_exam");

            migrationBuilder.RenameIndex(
                name: "IX_modules_GradeId",
                table: "modules",
                newName: "IX_modules_grade");

            migrationBuilder.RenameIndex(
                name: "IX_lessons_ModuleId",
                table: "lessons",
                newName: "IX_lessons_module");

            migrationBuilder.CreateIndex(
                name: "IX_questions_school_active",
                table: "questions",
                columns: new[] { "SchoolId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_modules_school_active",
                table: "modules",
                columns: new[] { "SchoolId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_lessons_module_active",
                table: "lessons",
                columns: new[] { "ModuleId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_lessons_school_active",
                table: "lessons",
                columns: new[] { "SchoolId", "IsActive" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_10",
                table: "grades",
                sql: "`GradeLevel` REGEXP '^(10|[1-9])(st|nd|rd|th)?$'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_questions_school_active",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_modules_school_active",
                table: "modules");

            migrationBuilder.DropIndex(
                name: "IX_lessons_module_active",
                table: "lessons");

            migrationBuilder.DropIndex(
                name: "IX_lessons_school_active",
                table: "lessons");

            migrationBuilder.DropCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_10",
                table: "grades");

            migrationBuilder.RenameIndex(
                name: "IX_questions_module",
                table: "questions",
                newName: "IX_questions_ModuleId");

            migrationBuilder.RenameIndex(
                name: "IX_questions_exam",
                table: "questions",
                newName: "IX_questions_ExamId");

            migrationBuilder.RenameIndex(
                name: "IX_modules_grade",
                table: "modules",
                newName: "IX_modules_GradeId");

            migrationBuilder.RenameIndex(
                name: "IX_lessons_module",
                table: "lessons",
                newName: "IX_lessons_ModuleId");
        }
    }
}
