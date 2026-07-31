using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonAndActivityTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LessonId",
                table: "questions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<bool>(
                name: "IsActivity",
                table: "lessons",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "LessonId",
                table: "exams",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_questions_LessonId",
                table: "questions",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_exams_LessonId",
                table: "exams",
                column: "LessonId");

            migrationBuilder.AddForeignKey(
                name: "FK_exams_lessons_LessonId",
                table: "exams",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_questions_lessons_LessonId",
                table: "questions",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exams_lessons_LessonId",
                table: "exams");

            migrationBuilder.DropForeignKey(
                name: "FK_questions_lessons_LessonId",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_questions_LessonId",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_exams_LessonId",
                table: "exams");

            migrationBuilder.DropColumn(
                name: "LessonId",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "IsActivity",
                table: "lessons");

            migrationBuilder.DropColumn(
                name: "LessonId",
                table: "exams");
        }
    }
}
