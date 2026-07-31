using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleIdToQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetOtp",
                table: "users");

            migrationBuilder.DropColumn(
                name: "ResetOtpExpiry",
                table: "users");

            migrationBuilder.AddColumn<Guid>(
                name: "ModuleId",
                table: "questions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_questions_ModuleId",
                table: "questions",
                column: "ModuleId");

            migrationBuilder.AddForeignKey(
                name: "FK_questions_modules_ModuleId",
                table: "questions",
                column: "ModuleId",
                principalTable: "modules",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_questions_modules_ModuleId",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_questions_ModuleId",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "ModuleId",
                table: "questions");

            migrationBuilder.AddColumn<string>(
                name: "ResetOtp",
                table: "users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetOtpExpiry",
                table: "users",
                type: "datetime(6)",
                nullable: true);
        }
    }
}
