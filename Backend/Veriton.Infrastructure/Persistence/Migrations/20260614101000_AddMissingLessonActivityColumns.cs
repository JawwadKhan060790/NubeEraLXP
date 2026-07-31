using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    public partial class AddMissingLessonActivityColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRoboticsActivity",
                table: "lessons",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPythonActivity",
                table: "lessons",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsAiToolActivity",
                table: "lessons",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BrowserUrl",
                table: "lessons",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "IsRoboticsActivity", table: "lessons");
            migrationBuilder.DropColumn(name: "IsPythonActivity", table: "lessons");
            migrationBuilder.DropColumn(name: "IsAiToolActivity", table: "lessons");
            migrationBuilder.DropColumn(name: "BrowserUrl", table: "lessons");
        }
    }
}
