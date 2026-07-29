using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Adds performance indexes on lessons, modules, and questions tables.
    /// These indexes eliminate full-table scans on the hot query paths used by the
    /// new server-side pagination endpoints (GET /api/lessons/paged,
    /// GET /api/modules/paged, GET /api/questions/paged).
    ///
    /// Root cause: after large data insertion the missing indexes caused the DB to
    /// scan every row in lessons (~N*500 schools), modules, and questions on every
    /// list request, resulting in multi-second response times.
    /// </summary>
    public partial class AddAcademicPerformanceIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── lessons ──────────────────────────────────────────────────────────
            // Primary query path: WHERE SchoolId = ? AND IsActive = 1
            migrationBuilder.CreateIndex(
                name: "IX_lessons_school_active",
                table: "lessons",
                columns: new[] { "SchoolId", "IsActive" });

            // Module filter: WHERE ModuleId = ?
            migrationBuilder.CreateIndex(
                name: "IX_lessons_module",
                table: "lessons",
                column: "ModuleId");

            // Module + active filter combined (covers the most common lesson list query)
            migrationBuilder.CreateIndex(
                name: "IX_lessons_module_active",
                table: "lessons",
                columns: new[] { "ModuleId", "IsActive" });

            // ── modules ──────────────────────────────────────────────────────────
            // The unique index (SchoolId, GradeId, Name) already exists.
            // Add a (SchoolId, IsActive) index for the active-only filtered list.
            migrationBuilder.CreateIndex(
                name: "IX_modules_school_active",
                table: "modules",
                columns: new[] { "SchoolId", "IsActive" });

            // GradeId alone — used by grade-filter queries without SchoolId leading
            migrationBuilder.CreateIndex(
                name: "IX_modules_grade",
                table: "modules",
                column: "GradeId");

            // ── questions ────────────────────────────────────────────────────────
            // Primary query path: WHERE SchoolId = ? AND IsActive = 1
            migrationBuilder.CreateIndex(
                name: "IX_questions_school_active",
                table: "questions",
                columns: new[] { "SchoolId", "IsActive" });

            // ExamId FK — used heavily for exam-question lookup (was a FK without an index)
            migrationBuilder.CreateIndex(
                name: "IX_questions_exam",
                table: "questions",
                column: "ExamId");

            // ModuleId — questions can also be scoped to a module
            migrationBuilder.CreateIndex(
                name: "IX_questions_module",
                table: "questions",
                column: "ModuleId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_lessons_school_active",  table: "lessons");
            migrationBuilder.DropIndex(name: "IX_lessons_module",         table: "lessons");
            migrationBuilder.DropIndex(name: "IX_lessons_module_active",  table: "lessons");

            migrationBuilder.DropIndex(name: "IX_modules_school_active",  table: "modules");
            migrationBuilder.DropIndex(name: "IX_modules_grade",          table: "modules");

            migrationBuilder.DropIndex(name: "IX_questions_school_active", table: "questions");
            migrationBuilder.DropIndex(name: "IX_questions_exam",          table: "questions");
            migrationBuilder.DropIndex(name: "IX_questions_module",        table: "questions");
        }
    }
}
