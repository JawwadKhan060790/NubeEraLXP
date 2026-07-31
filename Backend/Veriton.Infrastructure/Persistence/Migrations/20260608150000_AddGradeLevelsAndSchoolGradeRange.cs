using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Veriton.Infrastructure.Persistence.DbContext;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// SUPERSEDED by 20260609070945_school update — intentionally empty (no-op).
    /// All grade_levels table creation and from_grade_id/to_grade_id column work
    /// is handled by the next migration in the chain.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260608150000_AddGradeLevelsAndSchoolGradeRange")]
    public partial class AddGradeLevelsAndSchoolGradeRange : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder) { }
        protected override void Down(MigrationBuilder migrationBuilder) { }
    }
}
