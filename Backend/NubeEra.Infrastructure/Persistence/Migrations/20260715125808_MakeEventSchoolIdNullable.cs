using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeEventSchoolIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs");

            migrationBuilder.DropForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events");

            migrationBuilder.AlterColumn<Guid>(
                name: "SchoolId",
                table: "events",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "SchoolId",
                table: "eventauditlogs",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs");

            migrationBuilder.DropForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events");

            migrationBuilder.AlterColumn<Guid>(
                name: "SchoolId",
                table: "events",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "SchoolId",
                table: "eventauditlogs",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
