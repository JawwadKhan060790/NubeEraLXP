using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionToTeacherLessonProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "TeacherLessonProgresses",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherLessonProgresses_TeacherId_LessonId_SectionId",
                table: "TeacherLessonProgresses",
                columns: new[] { "TeacherId", "LessonId", "SectionId" },
                unique: true);

            migrationBuilder.DropIndex(
                name: "IX_TeacherLessonProgresses_TeacherId_LessonId",
                table: "TeacherLessonProgresses");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherLessonProgresses_SectionId",
                table: "TeacherLessonProgresses",
                column: "SectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherLessonProgresses_GradeSections_SectionId",
                table: "TeacherLessonProgresses",
                column: "SectionId",
                principalTable: "GradeSections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeacherLessonProgresses_GradeSections_SectionId",
                table: "TeacherLessonProgresses");

            migrationBuilder.DropIndex(
                name: "IX_TeacherLessonProgresses_SectionId",
                table: "TeacherLessonProgresses");

            migrationBuilder.DropIndex(
                name: "IX_TeacherLessonProgresses_TeacherId_LessonId_SectionId",
                table: "TeacherLessonProgresses");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "TeacherLessonProgresses");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherLessonProgresses_TeacherId_LessonId",
                table: "TeacherLessonProgresses",
                columns: new[] { "TeacherId", "LessonId" },
                unique: true);
        }
    }
}
