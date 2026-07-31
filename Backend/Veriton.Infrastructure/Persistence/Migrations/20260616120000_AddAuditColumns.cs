using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Veriton.Infrastructure.Persistence.DbContext;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Dedicated audit-column migration. Adds ONLY the two generic "last updated"
    /// audit columns — UpdatedDate and UpdatedBy — to every table whose entity
    /// inherits BaseEntity. This migration intentionally does NOT touch CreatedAt,
    /// DeletedDate, or DeletedBy (those remain owned by their original migrations);
    /// it is purely additive and carries zero soft-delete/creation semantics.
    ///
    ///   UpdatedDate DATETIME(6)  NULL  — UTC timestamp of the most recent update.
    ///   UpdatedBy   CHAR(36)     NULL  — Id of the user who performed the update.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260616120000_AddAuditColumns")]
    public partial class AddAuditColumns : Migration
    {
        // Every table backing a BaseEntity-derived entity, as of this migration.
        // Mirrors the table list used by 20260612000001_AddSoftDeleteColumns, plus
        // the tables introduced since then (GradeSections, StudentWeakTopics,
        // TeacherLessonProgresses, TeacherSchedulePeriods).
        //
        // NOTE: "system_settings" (SystemSetting) and "UploadedFiles" (UploadedFile)
        // are intentionally EXCLUDED here even though the legacy soft-delete migration
        // touched them — those two entities do not inherit BaseEntity (SystemSetting is
        // a bare Key/Value row; UploadedFile is a bare Id/FileName/Data row), so they have
        // no UpdatedDate/UpdatedBy properties in the EF model. Adding the columns for them
        // would create DB columns with nothing in the C# model mapped to them, which would
        // make the model snapshot diverge from the database the next time migrations are
        // generated.
        private static readonly string[] _tables =
        [
            "Attendances",
            "backup_audit_logs",
            "backup_histories",
            "CartItems",
            "certificate_templates",
            "certificates",
            "EventAuditLogs",
            "EventRegistrations",
            "Events",
            "exams",
            "grade_levels",
            "grades",
            "GradeSections",
            "InAppNotifications",
            "LessonCompletions",
            "lessons",
            "modules",
            "OrderItems",
            "Orders",
            "ProductCategories",
            "Products",
            "questions",
            "report_card_activities",
            "report_card_grading_rules",
            "report_card_skills",
            "report_card_subjects",
            "report_cards",
            "results",
            "roles",
            "schedulers",
            "schools",
            "StudentNotes",
            "StudentPythonCodes",
            "students",
            "StudentWeakTopics",
            "teachers",
            "TeacherLessonProgresses",
            "TeacherSchedulePeriods",
            "TicketAttachments",
            "TicketCategories",
            "TicketComments",
            "TicketHistories",
            "Tickets",
            "users",
            "WebsiteRegistrations",
            "WishlistItems",
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in _tables)
            {
                migrationBuilder.AddColumn<DateTime>(
                    name: "UpdatedDate",
                    table: table,
                    type: "datetime(6)",
                    nullable: true);

                migrationBuilder.AddColumn<Guid>(
                    name: "UpdatedBy",
                    table: table,
                    type: "char(36)",
                    nullable: true,
                    collation: "ascii_general_ci");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in _tables)
            {
                migrationBuilder.DropColumn(name: "UpdatedBy", table: table);
                migrationBuilder.DropColumn(name: "UpdatedDate", table: table);
            }
        }
    }
}
