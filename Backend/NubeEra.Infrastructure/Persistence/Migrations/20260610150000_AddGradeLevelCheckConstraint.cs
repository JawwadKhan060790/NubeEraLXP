using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGradeLevelCheckConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add a database-level CHECK constraint so no row can be inserted into
            // grades with a GradeLevel outside the standardized 1st-10th master.
            // Accepts plain numeric strings ("1"–"10") and ordinal suffixes ("1st"–"10th").
            // This is the third enforcement layer (service validation + FluentValidation + DB constraint).
            migrationBuilder.Sql(@"
                ALTER TABLE `grades`
                ADD CONSTRAINT `CK_grades_GradeLevel_1_to_10`
                CHECK (`GradeLevel` REGEXP '^(10|[1-9])(st|nd|rd|th)?$');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE `grades`
                DROP CHECK `CK_grades_GradeLevel_1_to_10`;
            ");
        }
    }
}
