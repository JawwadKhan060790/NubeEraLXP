using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPdfAndPageNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PdfFileUrl",
                table: "modules",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "EndPage",
                table: "lessons",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StartPage",
                table: "lessons",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedByTeacherId",
                table: "exams",
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
            migrationBuilder.DropColumn(
                name: "PdfFileUrl",
                table: "modules");

            migrationBuilder.DropColumn(
                name: "EndPage",
                table: "lessons");

            migrationBuilder.DropColumn(
                name: "StartPage",
                table: "lessons");

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatedByTeacherId",
                table: "exams",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");
        }
    }
}
