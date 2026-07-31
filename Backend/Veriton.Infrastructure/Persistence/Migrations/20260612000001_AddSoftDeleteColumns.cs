using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteColumns : Migration
    {
        // All tables that inherit BaseEntity receive three soft-delete columns:
        //   IsDeleted   TINYINT(1)  NOT NULL  DEFAULT 0
        //   DeletedDate DATETIME(6)     NULL
        //   DeletedBy   CHAR(36)        NULL

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
            "system_settings",
            "teachers",
            "TicketAttachments",
            "TicketCategories",
            "TicketComments",
            "TicketHistories",
            "Tickets",
            "UploadedFiles",
            "users",
            "WebsiteRegistrations",
            "WishlistItems",
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in _tables)
            {
                migrationBuilder.AddColumn<bool>(
                    name: "IsDeleted",
                    table: table,
                    type: "tinyint(1)",
                    nullable: false,
                    defaultValue: false);

                migrationBuilder.AddColumn<DateTime>(
                    name: "DeletedDate",
                    table: table,
                    type: "datetime(6)",
                    nullable: true);

                migrationBuilder.AddColumn<Guid>(
                    name: "DeletedBy",
                    table: table,
                    type: "char(36)",
                    nullable: true,
                    collation: "ascii_general_ci");

                // Index on IsDeleted for efficient query-filter evaluation
                migrationBuilder.CreateIndex(
                    name: $"IX_{table}_IsDeleted",
                    table: table,
                    column: "IsDeleted");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in _tables)
            {
                migrationBuilder.DropIndex(
                    name: $"IX_{table}_IsDeleted",
                    table: table);

                migrationBuilder.DropColumn(name: "DeletedBy",   table: table);
                migrationBuilder.DropColumn(name: "DeletedDate", table: table);
                migrationBuilder.DropColumn(name: "IsDeleted",   table: table);
            }
        }
    }
}
