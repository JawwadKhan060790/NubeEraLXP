using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class principalisaddedtoschool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrincipalEmail",
                table: "schools",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PrincipalPhone",
                table: "schools",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrincipalEmail",
                table: "schools");

            migrationBuilder.DropColumn(
                name: "PrincipalPhone",
                table: "schools");
        }
    }
}
