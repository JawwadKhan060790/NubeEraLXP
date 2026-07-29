using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompleteStudentDoubtAndLessons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Safely drop existing elements to allow EF Core migrations to recreate them cleanly
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS=0;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS student_doubts;");
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS=1;");

            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS DropLessonsVideoUrlsColumn;
                CREATE PROCEDURE DropLessonsVideoUrlsColumn()
                BEGIN
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'lessons'
                          AND COLUMN_NAME = 'VideoUrls'
                    ) THEN
                        ALTER TABLE lessons DROP COLUMN VideoUrls;
                    END IF;
                END;
                CALL DropLessonsVideoUrlsColumn();
                DROP PROCEDURE DropLessonsVideoUrlsColumn;
            ");

            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS DropTeacherProgressIndices;
                CREATE PROCEDURE DropTeacherProgressIndices()
                BEGIN
                    IF NOT EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'teacherlessonprogresses'
                          AND INDEX_NAME = 'IX_teacherlessonprogresses_TeacherId'
                    ) THEN
                        CREATE INDEX IX_teacherlessonprogresses_TeacherId ON teacherlessonprogresses (TeacherId);
                    END IF;
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'teacherlessonprogresses'
                          AND INDEX_NAME = 'IX_teacherlessonprogresses_TeacherId_LessonId_SectionId'
                    ) THEN
                        ALTER TABLE teacherlessonprogresses DROP INDEX IX_teacherlessonprogresses_TeacherId_LessonId_SectionId;
                    END IF;
                    IF EXISTS (
                        SELECT * FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'teacherlessonprogresses'
                          AND INDEX_NAME = 'IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId'
                    ) THEN
                        ALTER TABLE teacherlessonprogresses DROP INDEX IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId;
                    END IF;
                END;
                CALL DropTeacherProgressIndices();
                DROP PROCEDURE DropTeacherProgressIndices;
            ");

            migrationBuilder.AddColumn<string>(
                name: "VideoUrls",
                table: "lessons",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "student_doubts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    StudentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    GradeId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SectionId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    LessonId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    ModuleId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ScreenshotUrl = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: "Open")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TeacherReply = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RepliedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RepliedByTeacherId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    ClosedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ClosedByUserId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_doubts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_doubts_grades_GradeId",
                        column: x => x.GradeId,
                        principalTable: "grades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_student_doubts_gradesections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "gradesections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_student_doubts_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_student_doubts_modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_student_doubts_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_doubts_students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_student_doubts_teachers_RepliedByTeacherId",
                        column: x => x.RepliedByTeacherId,
                        principalTable: "teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId",
                table: "teacherlessonprogresses",
                columns: new[] { "TeacherId", "GradeId", "LessonId", "SectionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_grade_school",
                table: "student_doubts",
                columns: new[] { "GradeId", "SchoolId" });

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_LessonId",
                table: "student_doubts",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_ModuleId",
                table: "student_doubts",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_RepliedByTeacherId",
                table: "student_doubts",
                column: "RepliedByTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_school_status",
                table: "student_doubts",
                columns: new[] { "SchoolId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_SectionId",
                table: "student_doubts",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_student_doubts_student",
                table: "student_doubts",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "student_doubts");

            migrationBuilder.DropIndex(
                name: "IX_teacherlessonprogresses_TeacherId_GradeId_LessonId_SectionId",
                table: "teacherlessonprogresses");

            migrationBuilder.DropColumn(
                name: "VideoUrls",
                table: "lessons");

            migrationBuilder.CreateIndex(
                name: "IX_teacherlessonprogresses_TeacherId_LessonId_SectionId",
                table: "teacherlessonprogresses",
                columns: new[] { "TeacherId", "LessonId", "SectionId" },
                unique: true);
        }
    }
}
