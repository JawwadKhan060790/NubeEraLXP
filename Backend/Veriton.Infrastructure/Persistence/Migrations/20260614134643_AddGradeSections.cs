using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGradeSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "students",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "schedulers",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "exams",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "GradeSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    GradeId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SectionCode = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SectionName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradeSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GradeSections_grades_GradeId",
                        column: x => x.GradeId,
                        principalTable: "grades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GradeSections_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_students_SectionId",
                table: "students",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_schedulers_SectionId",
                table: "schedulers",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_exams_SectionId",
                table: "exams",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeSections_GradeId",
                table: "GradeSections",
                column: "GradeId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeSections_SchoolId_GradeId",
                table: "GradeSections",
                columns: new[] { "SchoolId", "GradeId" });

            migrationBuilder.CreateIndex(
                name: "IX_GradeSections_SchoolId_GradeId_SectionCode",
                table: "GradeSections",
                columns: new[] { "SchoolId", "GradeId", "SectionCode" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_exams_GradeSections_SectionId",
                table: "exams",
                column: "SectionId",
                principalTable: "GradeSections",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_schedulers_GradeSections_SectionId",
                table: "schedulers",
                column: "SectionId",
                principalTable: "GradeSections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_students_GradeSections_SectionId",
                table: "students",
                column: "SectionId",
                principalTable: "GradeSections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exams_GradeSections_SectionId",
                table: "exams");

            migrationBuilder.DropForeignKey(
                name: "FK_schedulers_GradeSections_SectionId",
                table: "schedulers");

            migrationBuilder.DropForeignKey(
                name: "FK_students_GradeSections_SectionId",
                table: "students");

            migrationBuilder.DropTable(
                name: "GradeSections");

            migrationBuilder.DropIndex(
                name: "IX_students_SectionId",
                table: "students");

            migrationBuilder.DropIndex(
                name: "IX_schedulers_SectionId",
                table: "schedulers");

            migrationBuilder.DropIndex(
                name: "IX_exams_SectionId",
                table: "exams");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "exams");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "schedulers");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "students");
        }
    }
}
