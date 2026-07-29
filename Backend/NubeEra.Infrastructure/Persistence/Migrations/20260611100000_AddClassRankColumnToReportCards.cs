using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClassRankColumnToReportCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The report_cards table was created before this migration ran,
            // so ClassRank (mapped from entity property Rank) may be absent.
            // ADD COLUMN IF NOT EXISTS is safe to re-run.
            migrationBuilder.Sql(@"
                ALTER TABLE report_cards
                ADD COLUMN IF NOT EXISTS ClassRank INT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE report_cards
                DROP COLUMN IF EXISTS ClassRank;
            ");
        }
    }
}
