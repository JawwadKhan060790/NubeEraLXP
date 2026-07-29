using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamModuleEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Results_exams_ExamId",
                table: "Results");

            migrationBuilder.DropForeignKey(
                name: "FK_Results_schools_SchoolId",
                table: "Results");

            migrationBuilder.DropForeignKey(
                name: "FK_Results_students_StudentId",
                table: "Results");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Results",
                table: "Results");

            migrationBuilder.RenameTable(
                name: "Results",
                newName: "results");

            migrationBuilder.RenameIndex(
                name: "IX_Results_StudentId",
                table: "results",
                newName: "IX_results_StudentId");

            migrationBuilder.RenameIndex(
                name: "IX_Results_SchoolId",
                table: "results",
                newName: "IX_results_SchoolId");

            migrationBuilder.RenameIndex(
                name: "IX_Results_ExamId",
                table: "results",
                newName: "IX_results_ExamId");

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "results",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<decimal>(
                name: "ObtainedMarks",
                table: "results",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)");

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "results",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)");

            migrationBuilder.AlterColumn<string>(
                name: "Grade",
                table: "results",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "PassingMarks",
                table: "exams",
                type: "int",
                nullable: true,
                defaultValue: 40);

            migrationBuilder.AddPrimaryKey(
                name: "PK_results",
                table: "results",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_results_exams_ExamId",
                table: "results",
                column: "ExamId",
                principalTable: "exams",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_results_schools_SchoolId",
                table: "results",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_results_students_StudentId",
                table: "results",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_results_exams_ExamId",
                table: "results");

            migrationBuilder.DropForeignKey(
                name: "FK_results_schools_SchoolId",
                table: "results");

            migrationBuilder.DropForeignKey(
                name: "FK_results_students_StudentId",
                table: "results");

            migrationBuilder.DropPrimaryKey(
                name: "PK_results",
                table: "results");

            migrationBuilder.DropColumn(
                name: "PassingMarks",
                table: "exams");

            migrationBuilder.RenameTable(
                name: "results",
                newName: "Results");

            migrationBuilder.RenameIndex(
                name: "IX_results_StudentId",
                table: "Results",
                newName: "IX_Results_StudentId");

            migrationBuilder.RenameIndex(
                name: "IX_results_SchoolId",
                table: "Results",
                newName: "IX_Results_SchoolId");

            migrationBuilder.RenameIndex(
                name: "IX_results_ExamId",
                table: "Results",
                newName: "IX_Results_ExamId");

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "Results",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(500)",
                oldMaxLength: 500,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<decimal>(
                name: "ObtainedMarks",
                table: "Results",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<bool>(
                name: "IsPublished",
                table: "Results",
                type: "tinyint(1)",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Grade",
                table: "Results",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(10)",
                oldMaxLength: 10,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Results",
                table: "Results",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Results_exams_ExamId",
                table: "Results",
                column: "ExamId",
                principalTable: "exams",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Results_schools_SchoolId",
                table: "Results",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Results_students_StudentId",
                table: "Results",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
