using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGradeCheckConstraintTo12 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_10",
                table: "grades");

            migrationBuilder.AddCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_12",
                table: "grades",
                sql: "`GradeLevel` REGEXP '^(12|11|10|[1-9])(st|nd|rd|th)?$'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_12",
                table: "grades");

            migrationBuilder.AddCheckConstraint(
                name: "CK_grades_GradeLevel_1_to_10",
                table: "grades",
                sql: "`GradeLevel` REGEXP '^(10|[1-9])(st|nd|rd|th)?$'");
        }
    }
}
