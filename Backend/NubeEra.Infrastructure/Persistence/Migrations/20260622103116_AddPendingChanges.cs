using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS = 0;");
            SafeDropForeignKey(migrationBuilder, "attendances", "FK_attendances_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "attendances", "FK_attendances_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "cartitems", "FK_cartitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "cartitems", "FK_cartitems_users_UserId");

            SafeDropForeignKey(migrationBuilder, "eventauditlogs", "FK_eventauditlogs_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "eventregistrations", "FK_eventregistrations_events_EventId");

            SafeDropForeignKey(migrationBuilder, "eventregistrations", "FK_eventregistrations_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "events", "FK_events_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "exams", "FK_exams_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "gradesections", "FK_gradesections_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "gradesections", "FK_gradesections_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "inappnotifications", "FK_inappnotifications_users_UserId");

            SafeDropForeignKey(migrationBuilder, "lessoncompletions", "FK_lessoncompletions_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "lessoncompletions", "FK_lessoncompletions_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "orderitems", "FK_orderitems_orders_OrderId");

            SafeDropForeignKey(migrationBuilder, "orderitems", "FK_orderitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "orders", "FK_orders_users_UserId");

            SafeDropForeignKey(migrationBuilder, "products", "FK_products_productcategories_CategoryId");

            SafeDropForeignKey(migrationBuilder, "schedulers", "FK_schedulers_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "studentnotes", "FK_studentnotes_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentnotes", "FK_studentnotes_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "studentpythoncodes", "FK_studentpythoncodes_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentpythoncodes", "FK_studentpythoncodes_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "students", "FK_students_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_modules_ModuleId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_modules_ModuleId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_schedulers_SchedulerId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "ticketattachments", "FK_ticketattachments_ticketcomments_TicketCommentId");

            SafeDropForeignKey(migrationBuilder, "ticketattachments", "FK_ticketattachments_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "ticketcategories", "FK_ticketcategories_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "ticketcomments", "FK_ticketcomments_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "ticketcomments", "FK_ticketcomments_users_UserId");

            SafeDropForeignKey(migrationBuilder, "tickethistories", "FK_tickethistories_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "tickethistories", "FK_tickethistories_users_UserId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_ticketcategories_CategoryId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_users_AssignedToUserId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_users_RequesterUserId");

            SafeDropForeignKey(migrationBuilder, "wishlistitems", "FK_wishlistitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "wishlistitems", "FK_wishlistitems_users_UserId");

            SafeDropPrimaryKey(migrationBuilder, "wishlistitems", "PK_wishlistitems");

            SafeDropPrimaryKey(migrationBuilder, "websiteregistrations", "PK_websiteregistrations");

            SafeDropPrimaryKey(migrationBuilder, "uploadedfiles", "PK_uploadedfiles");

            SafeDropPrimaryKey(migrationBuilder, "tickets", "PK_tickets");

            SafeDropPrimaryKey(migrationBuilder, "tickethistories", "PK_tickethistories");

            SafeDropPrimaryKey(migrationBuilder, "ticketcomments", "PK_ticketcomments");

            SafeDropPrimaryKey(migrationBuilder, "ticketcategories", "PK_ticketcategories");

            SafeDropPrimaryKey(migrationBuilder, "ticketattachments", "PK_ticketattachments");

            SafeDropPrimaryKey(migrationBuilder, "teacherscheduleperiods", "PK_teacherscheduleperiods");

            SafeDropPrimaryKey(migrationBuilder, "teacherlessonprogresses", "PK_teacherlessonprogresses");

            SafeDropPrimaryKey(migrationBuilder, "studentweaktopics", "PK_studentweaktopics");

            SafeDropPrimaryKey(migrationBuilder, "studentpythoncodes", "PK_studentpythoncodes");

            SafeDropPrimaryKey(migrationBuilder, "studentnotes", "PK_studentnotes");

            SafeDropPrimaryKey(migrationBuilder, "products", "PK_products");

            SafeDropPrimaryKey(migrationBuilder, "productcategories", "PK_productcategories");

            SafeDropPrimaryKey(migrationBuilder, "orders", "PK_orders");

            SafeDropPrimaryKey(migrationBuilder, "orderitems", "PK_orderitems");

            SafeDropPrimaryKey(migrationBuilder, "lessoncompletions", "PK_lessoncompletions");

            SafeDropPrimaryKey(migrationBuilder, "inappnotifications", "PK_inappnotifications");

            SafeDropPrimaryKey(migrationBuilder, "gradesections", "PK_gradesections");

            SafeDropPrimaryKey(migrationBuilder, "events", "PK_events");

            SafeDropPrimaryKey(migrationBuilder, "eventregistrations", "PK_eventregistrations");

            SafeDropPrimaryKey(migrationBuilder, "eventauditlogs", "PK_eventauditlogs");

            SafeDropPrimaryKey(migrationBuilder, "cartitems", "PK_cartitems");

            SafeDropPrimaryKey(migrationBuilder, "attendances", "PK_attendances");

            SafeRenameTable(migrationBuilder, "wishlistitems", "wishlistitems");

            SafeRenameTable(migrationBuilder, "websiteregistrations", "websiteregistrations");

            SafeRenameTable(migrationBuilder, "uploadedfiles", "uploadedfiles");

            SafeRenameTable(migrationBuilder, "tickets", "tickets");

            SafeRenameTable(migrationBuilder, "tickethistories", "tickethistories");

            SafeRenameTable(migrationBuilder, "ticketcomments", "ticketcomments");

            SafeRenameTable(migrationBuilder, "ticketcategories", "ticketcategories");

            SafeRenameTable(migrationBuilder, "ticketattachments", "ticketattachments");

            SafeRenameTable(migrationBuilder, "teacherscheduleperiods", "teacherscheduleperiods");

            SafeRenameTable(migrationBuilder, "teacherlessonprogresses", "teacherlessonprogresses");

            SafeRenameTable(migrationBuilder, "studentweaktopics", "studentweaktopics");

            SafeRenameTable(migrationBuilder, "studentpythoncodes", "studentpythoncodes");

            SafeRenameTable(migrationBuilder, "studentnotes", "studentnotes");

            SafeRenameTable(migrationBuilder, "products", "products");

            SafeRenameTable(migrationBuilder, "productcategories", "productcategories");

            SafeRenameTable(migrationBuilder, "orders", "orders");

            SafeRenameTable(migrationBuilder, "orderitems", "orderitems");

            SafeRenameTable(migrationBuilder, "lessoncompletions", "lessoncompletions");

            SafeRenameTable(migrationBuilder, "inappnotifications", "inappnotifications");

            SafeRenameTable(migrationBuilder, "gradesections", "gradesections");

            SafeRenameTable(migrationBuilder, "events", "events");

            SafeRenameTable(migrationBuilder, "eventregistrations", "eventregistrations");

            SafeRenameTable(migrationBuilder, "eventauditlogs", "eventauditlogs");

            SafeRenameTable(migrationBuilder, "cartitems", "cartitems");

            SafeRenameTable(migrationBuilder, "attendances", "attendances");

            CleanOrphanedData(migrationBuilder);

            SafeRenameIndex(migrationBuilder, "wishlistitems", "IX_wishlistitems_UserId", "IX_wishlistitems_UserId");

            SafeRenameIndex(migrationBuilder, "wishlistitems", "IX_wishlistitems_ProductId", "IX_wishlistitems_ProductId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_SchoolId", "IX_tickets_SchoolId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_RequesterUserId", "IX_tickets_RequesterUserId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_CategoryId", "IX_tickets_CategoryId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_AssignedToUserId", "IX_tickets_AssignedToUserId");

            SafeRenameIndex(migrationBuilder, "tickethistories", "IX_tickethistories_UserId", "IX_tickethistories_UserId");

            SafeRenameIndex(migrationBuilder, "tickethistories", "IX_tickethistories_TicketId", "IX_tickethistories_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketcomments", "IX_ticketcomments_UserId", "IX_ticketcomments_UserId");

            SafeRenameIndex(migrationBuilder, "ticketcomments", "IX_ticketcomments_TicketId", "IX_ticketcomments_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketcategories", "IX_ticketcategories_SchoolId", "IX_ticketcategories_SchoolId");

            SafeRenameIndex(migrationBuilder, "ticketattachments", "IX_ticketattachments_TicketId", "IX_ticketattachments_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketattachments", "IX_ticketattachments_TicketCommentId", "IX_ticketattachments_TicketCommentId");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_TeacherId_PeriodDate", "IX_teacherscheduleperiods_TeacherId_PeriodDate");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_SchoolId_TeacherId", "IX_teacherscheduleperiods_SchoolId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_SchedulerId_PeriodDate", "IX_teacherscheduleperiods_SchedulerId_PeriodDate");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_GradeId", "IX_teacherscheduleperiods_GradeId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_TeacherId_LessonId_SectionId", "IX_teacherlessonprogresses_TeacherId_LessonId_SectionId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_SectionId", "IX_teacherlessonprogresses_SectionId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_SchoolId_TeacherId", "IX_teacherlessonprogresses_SchoolId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_ModuleId_TeacherId", "IX_teacherlessonprogresses_ModuleId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_LessonId", "IX_teacherlessonprogresses_LessonId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_GradeId_TeacherId", "IX_teacherlessonprogresses_GradeId_TeacherId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_StudentId_LessonId", "IX_studentweaktopics_StudentId_LessonId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_StudentId_IsResolved", "IX_studentweaktopics_StudentId_IsResolved");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_SchoolId_GradeId", "IX_studentweaktopics_SchoolId_GradeId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_ModuleId", "IX_studentweaktopics_ModuleId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_LessonId", "IX_studentweaktopics_LessonId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_GradeId", "IX_studentweaktopics_GradeId");

            SafeRenameIndex(migrationBuilder, "studentpythoncodes", "IX_studentpythoncodes_StudentId", "IX_studentpythoncodes_StudentId");

            SafeRenameIndex(migrationBuilder, "studentpythoncodes", "IX_studentpythoncodes_LessonId", "IX_studentpythoncodes_LessonId");

            SafeRenameIndex(migrationBuilder, "studentnotes", "IX_studentnotes_StudentId", "IX_studentnotes_StudentId");

            SafeRenameIndex(migrationBuilder, "studentnotes", "IX_studentnotes_LessonId", "IX_studentnotes_LessonId");

            SafeRenameIndex(migrationBuilder, "products", "IX_products_CategoryId", "IX_products_CategoryId");

            SafeRenameIndex(migrationBuilder, "orders", "IX_orders_UserId", "IX_orders_UserId");

            SafeRenameIndex(migrationBuilder, "orderitems", "IX_orderitems_ProductId", "IX_orderitems_ProductId");

            SafeRenameIndex(migrationBuilder, "orderitems", "IX_orderitems_OrderId", "IX_orderitems_OrderId");

            SafeRenameIndex(migrationBuilder, "lessoncompletions", "IX_lessoncompletions_StudentId", "IX_lessoncompletions_StudentId");

            SafeRenameIndex(migrationBuilder, "lessoncompletions", "IX_lessoncompletions_LessonId", "IX_lessoncompletions_LessonId");

            SafeRenameIndex(migrationBuilder, "inappnotifications", "IX_inappnotifications_UserId", "IX_inappnotifications_UserId");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_SchoolId_GradeId_SectionCode", "IX_gradesections_SchoolId_GradeId_SectionCode");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_SchoolId_GradeId", "IX_gradesections_SchoolId_GradeId");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_GradeId", "IX_gradesections_GradeId");

            SafeRenameIndex(migrationBuilder, "events", "IX_events_SchoolId", "IX_events_SchoolId");

            SafeRenameIndex(migrationBuilder, "eventregistrations", "IX_eventregistrations_StudentId", "IX_eventregistrations_StudentId");

            SafeRenameIndex(migrationBuilder, "eventregistrations", "IX_eventregistrations_EventId", "IX_eventregistrations_EventId");

            SafeRenameIndex(migrationBuilder, "eventauditlogs", "IX_eventauditlogs_SchoolId", "IX_eventauditlogs_SchoolId");

            SafeRenameIndex(migrationBuilder, "cartitems", "IX_cartitems_UserId", "IX_cartitems_UserId");

            SafeRenameIndex(migrationBuilder, "cartitems", "IX_cartitems_ProductId", "IX_cartitems_ProductId");

            SafeRenameIndex(migrationBuilder, "attendances", "IX_attendances_TeacherId", "IX_attendances_TeacherId");

            SafeRenameIndex(migrationBuilder, "attendances", "IX_attendances_StudentId", "IX_attendances_StudentId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_wishlistitems",
                table: "wishlistitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_websiteregistrations",
                table: "websiteregistrations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_uploadedfiles",
                table: "uploadedfiles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_tickets",
                table: "tickets",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_tickethistories",
                table: "tickethistories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketcomments",
                table: "ticketcomments",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketcategories",
                table: "ticketcategories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketattachments",
                table: "ticketattachments",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_teacherscheduleperiods",
                table: "teacherscheduleperiods",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_teacherlessonprogresses",
                table: "teacherlessonprogresses",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentweaktopics",
                table: "studentweaktopics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentpythoncodes",
                table: "studentpythoncodes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentnotes",
                table: "studentnotes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_products",
                table: "products",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_productcategories",
                table: "productcategories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_orders",
                table: "orders",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_orderitems",
                table: "orderitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_lessoncompletions",
                table: "lessoncompletions",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_inappnotifications",
                table: "inappnotifications",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_gradesections",
                table: "gradesections",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_events",
                table: "events",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_eventregistrations",
                table: "eventregistrations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_eventauditlogs",
                table: "eventauditlogs",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_cartitems",
                table: "cartitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_attendances",
                table: "attendances",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_students_StudentId",
                table: "attendances",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_teachers_TeacherId",
                table: "attendances",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_cartitems_products_ProductId",
                table: "cartitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_cartitems_users_UserId",
                table: "cartitems",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventregistrations_events_EventId",
                table: "eventregistrations",
                column: "EventId",
                principalTable: "events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventregistrations_students_StudentId",
                table: "eventregistrations",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_exams_gradesections_SectionId",
                table: "exams",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_gradesections_grades_GradeId",
                table: "gradesections",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_gradesections_schools_SchoolId",
                table: "gradesections",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_inappnotifications_users_UserId",
                table: "inappnotifications",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessoncompletions_lessons_LessonId",
                table: "lessoncompletions",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessoncompletions_students_StudentId",
                table: "lessoncompletions",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orderitems_orders_OrderId",
                table: "orderitems",
                column: "OrderId",
                principalTable: "orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orderitems_products_ProductId",
                table: "orderitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orders_users_UserId",
                table: "orders",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_products_productcategories_CategoryId",
                table: "products",
                column: "CategoryId",
                principalTable: "productcategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_schedulers_gradesections_SectionId",
                table: "schedulers",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_studentnotes_lessons_LessonId",
                table: "studentnotes",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentnotes_students_StudentId",
                table: "studentnotes",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentpythoncodes_lessons_LessonId",
                table: "studentpythoncodes",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentpythoncodes_students_StudentId",
                table: "studentpythoncodes",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_students_gradesections_SectionId",
                table: "students",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_grades_GradeId",
                table: "studentweaktopics",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_lessons_LessonId",
                table: "studentweaktopics",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_modules_ModuleId",
                table: "studentweaktopics",
                column: "ModuleId",
                principalTable: "modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_schools_SchoolId",
                table: "studentweaktopics",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_students_StudentId",
                table: "studentweaktopics",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_grades_GradeId",
                table: "teacherlessonprogresses",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_gradesections_SectionId",
                table: "teacherlessonprogresses",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_lessons_LessonId",
                table: "teacherlessonprogresses",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_modules_ModuleId",
                table: "teacherlessonprogresses",
                column: "ModuleId",
                principalTable: "modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_schools_SchoolId",
                table: "teacherlessonprogresses",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_teachers_TeacherId",
                table: "teacherlessonprogresses",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_grades_GradeId",
                table: "teacherscheduleperiods",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_schedulers_SchedulerId",
                table: "teacherscheduleperiods",
                column: "SchedulerId",
                principalTable: "schedulers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_schools_SchoolId",
                table: "teacherscheduleperiods",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_teachers_TeacherId",
                table: "teacherscheduleperiods",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketattachments_ticketcomments_TicketCommentId",
                table: "ticketattachments",
                column: "TicketCommentId",
                principalTable: "ticketcomments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ticketattachments_tickets_TicketId",
                table: "ticketattachments",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcategories_schools_SchoolId",
                table: "ticketcategories",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcomments_tickets_TicketId",
                table: "ticketcomments",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcomments_users_UserId",
                table: "ticketcomments",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickethistories_tickets_TicketId",
                table: "tickethistories",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickethistories_users_UserId",
                table: "tickethistories",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_schools_SchoolId",
                table: "tickets",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_ticketcategories_CategoryId",
                table: "tickets",
                column: "CategoryId",
                principalTable: "ticketcategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_users_AssignedToUserId",
                table: "tickets",
                column: "AssignedToUserId",
                principalTable: "users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_users_RequesterUserId",
                table: "tickets",
                column: "RequesterUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_wishlistitems_products_ProductId",
                table: "wishlistitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_wishlistitems_users_UserId",
                table: "wishlistitems",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS = 0;");
            SafeDropForeignKey(migrationBuilder, "attendances", "FK_attendances_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "attendances", "FK_attendances_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "cartitems", "FK_cartitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "cartitems", "FK_cartitems_users_UserId");

            SafeDropForeignKey(migrationBuilder, "eventauditlogs", "FK_eventauditlogs_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "eventregistrations", "FK_eventregistrations_events_EventId");

            SafeDropForeignKey(migrationBuilder, "eventregistrations", "FK_eventregistrations_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "events", "FK_events_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "exams", "FK_exams_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "gradesections", "FK_gradesections_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "gradesections", "FK_gradesections_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "inappnotifications", "FK_inappnotifications_users_UserId");

            SafeDropForeignKey(migrationBuilder, "lessoncompletions", "FK_lessoncompletions_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "lessoncompletions", "FK_lessoncompletions_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "orderitems", "FK_orderitems_orders_OrderId");

            SafeDropForeignKey(migrationBuilder, "orderitems", "FK_orderitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "orders", "FK_orders_users_UserId");

            SafeDropForeignKey(migrationBuilder, "products", "FK_products_productcategories_CategoryId");

            SafeDropForeignKey(migrationBuilder, "schedulers", "FK_schedulers_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "studentnotes", "FK_studentnotes_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentnotes", "FK_studentnotes_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "studentpythoncodes", "FK_studentpythoncodes_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentpythoncodes", "FK_studentpythoncodes_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "students", "FK_students_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_modules_ModuleId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "studentweaktopics", "FK_studentweaktopics_students_StudentId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_gradesections_SectionId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_lessons_LessonId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_modules_ModuleId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "teacherlessonprogresses", "FK_teacherlessonprogresses_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_grades_GradeId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_schedulers_SchedulerId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "teacherscheduleperiods", "FK_teacherscheduleperiods_teachers_TeacherId");

            SafeDropForeignKey(migrationBuilder, "ticketattachments", "FK_ticketattachments_ticketcomments_TicketCommentId");

            SafeDropForeignKey(migrationBuilder, "ticketattachments", "FK_ticketattachments_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "ticketcategories", "FK_ticketcategories_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "ticketcomments", "FK_ticketcomments_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "ticketcomments", "FK_ticketcomments_users_UserId");

            SafeDropForeignKey(migrationBuilder, "tickethistories", "FK_tickethistories_tickets_TicketId");

            SafeDropForeignKey(migrationBuilder, "tickethistories", "FK_tickethistories_users_UserId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_schools_SchoolId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_ticketcategories_CategoryId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_users_AssignedToUserId");

            SafeDropForeignKey(migrationBuilder, "tickets", "FK_tickets_users_RequesterUserId");

            SafeDropForeignKey(migrationBuilder, "wishlistitems", "FK_wishlistitems_products_ProductId");

            SafeDropForeignKey(migrationBuilder, "wishlistitems", "FK_wishlistitems_users_UserId");

            SafeDropPrimaryKey(migrationBuilder, "wishlistitems", "PK_wishlistitems");

            SafeDropPrimaryKey(migrationBuilder, "websiteregistrations", "PK_websiteregistrations");

            SafeDropPrimaryKey(migrationBuilder, "uploadedfiles", "PK_uploadedfiles");

            SafeDropPrimaryKey(migrationBuilder, "tickets", "PK_tickets");

            SafeDropPrimaryKey(migrationBuilder, "tickethistories", "PK_tickethistories");

            SafeDropPrimaryKey(migrationBuilder, "ticketcomments", "PK_ticketcomments");

            SafeDropPrimaryKey(migrationBuilder, "ticketcategories", "PK_ticketcategories");

            SafeDropPrimaryKey(migrationBuilder, "ticketattachments", "PK_ticketattachments");

            SafeDropPrimaryKey(migrationBuilder, "teacherscheduleperiods", "PK_teacherscheduleperiods");

            SafeDropPrimaryKey(migrationBuilder, "teacherlessonprogresses", "PK_teacherlessonprogresses");

            SafeDropPrimaryKey(migrationBuilder, "studentweaktopics", "PK_studentweaktopics");

            SafeDropPrimaryKey(migrationBuilder, "studentpythoncodes", "PK_studentpythoncodes");

            SafeDropPrimaryKey(migrationBuilder, "studentnotes", "PK_studentnotes");

            SafeDropPrimaryKey(migrationBuilder, "products", "PK_products");

            SafeDropPrimaryKey(migrationBuilder, "productcategories", "PK_productcategories");

            SafeDropPrimaryKey(migrationBuilder, "orders", "PK_orders");

            SafeDropPrimaryKey(migrationBuilder, "orderitems", "PK_orderitems");

            SafeDropPrimaryKey(migrationBuilder, "lessoncompletions", "PK_lessoncompletions");

            SafeDropPrimaryKey(migrationBuilder, "inappnotifications", "PK_inappnotifications");

            SafeDropPrimaryKey(migrationBuilder, "gradesections", "PK_gradesections");

            SafeDropPrimaryKey(migrationBuilder, "events", "PK_events");

            SafeDropPrimaryKey(migrationBuilder, "eventregistrations", "PK_eventregistrations");

            SafeDropPrimaryKey(migrationBuilder, "eventauditlogs", "PK_eventauditlogs");

            SafeDropPrimaryKey(migrationBuilder, "cartitems", "PK_cartitems");

            SafeDropPrimaryKey(migrationBuilder, "attendances", "PK_attendances");

            SafeRenameTable(migrationBuilder, "wishlistitems", "wishlistitems");

            SafeRenameTable(migrationBuilder, "websiteregistrations", "websiteregistrations");

            SafeRenameTable(migrationBuilder, "uploadedfiles", "uploadedfiles");

            SafeRenameTable(migrationBuilder, "tickets", "tickets");

            SafeRenameTable(migrationBuilder, "tickethistories", "tickethistories");

            SafeRenameTable(migrationBuilder, "ticketcomments", "ticketcomments");

            SafeRenameTable(migrationBuilder, "ticketcategories", "ticketcategories");

            SafeRenameTable(migrationBuilder, "ticketattachments", "ticketattachments");

            SafeRenameTable(migrationBuilder, "teacherscheduleperiods", "teacherscheduleperiods");

            SafeRenameTable(migrationBuilder, "teacherlessonprogresses", "teacherlessonprogresses");

            SafeRenameTable(migrationBuilder, "studentweaktopics", "studentweaktopics");

            SafeRenameTable(migrationBuilder, "studentpythoncodes", "studentpythoncodes");

            SafeRenameTable(migrationBuilder, "studentnotes", "studentnotes");

            SafeRenameTable(migrationBuilder, "products", "products");

            SafeRenameTable(migrationBuilder, "productcategories", "productcategories");

            SafeRenameTable(migrationBuilder, "orders", "orders");

            SafeRenameTable(migrationBuilder, "orderitems", "orderitems");

            SafeRenameTable(migrationBuilder, "lessoncompletions", "lessoncompletions");

            SafeRenameTable(migrationBuilder, "inappnotifications", "inappnotifications");

            SafeRenameTable(migrationBuilder, "gradesections", "gradesections");

            SafeRenameTable(migrationBuilder, "events", "events");

            SafeRenameTable(migrationBuilder, "eventregistrations", "eventregistrations");

            SafeRenameTable(migrationBuilder, "eventauditlogs", "eventauditlogs");

            SafeRenameTable(migrationBuilder, "cartitems", "cartitems");

            SafeRenameTable(migrationBuilder, "attendances", "attendances");

            SafeRenameIndex(migrationBuilder, "wishlistitems", "IX_wishlistitems_UserId", "IX_wishlistitems_UserId");

            SafeRenameIndex(migrationBuilder, "wishlistitems", "IX_wishlistitems_ProductId", "IX_wishlistitems_ProductId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_SchoolId", "IX_tickets_SchoolId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_RequesterUserId", "IX_tickets_RequesterUserId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_CategoryId", "IX_tickets_CategoryId");

            SafeRenameIndex(migrationBuilder, "tickets", "IX_tickets_AssignedToUserId", "IX_tickets_AssignedToUserId");

            SafeRenameIndex(migrationBuilder, "tickethistories", "IX_tickethistories_UserId", "IX_tickethistories_UserId");

            SafeRenameIndex(migrationBuilder, "tickethistories", "IX_tickethistories_TicketId", "IX_tickethistories_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketcomments", "IX_ticketcomments_UserId", "IX_ticketcomments_UserId");

            SafeRenameIndex(migrationBuilder, "ticketcomments", "IX_ticketcomments_TicketId", "IX_ticketcomments_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketcategories", "IX_ticketcategories_SchoolId", "IX_ticketcategories_SchoolId");

            SafeRenameIndex(migrationBuilder, "ticketattachments", "IX_ticketattachments_TicketId", "IX_ticketattachments_TicketId");

            SafeRenameIndex(migrationBuilder, "ticketattachments", "IX_ticketattachments_TicketCommentId", "IX_ticketattachments_TicketCommentId");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_TeacherId_PeriodDate", "IX_teacherscheduleperiods_TeacherId_PeriodDate");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_SchoolId_TeacherId", "IX_teacherscheduleperiods_SchoolId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_SchedulerId_PeriodDate", "IX_teacherscheduleperiods_SchedulerId_PeriodDate");

            SafeRenameIndex(migrationBuilder, "teacherscheduleperiods", "IX_teacherscheduleperiods_GradeId", "IX_teacherscheduleperiods_GradeId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_TeacherId_LessonId_SectionId", "IX_teacherlessonprogresses_TeacherId_LessonId_SectionId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_SectionId", "IX_teacherlessonprogresses_SectionId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_SchoolId_TeacherId", "IX_teacherlessonprogresses_SchoolId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_ModuleId_TeacherId", "IX_teacherlessonprogresses_ModuleId_TeacherId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_LessonId", "IX_teacherlessonprogresses_LessonId");

            SafeRenameIndex(migrationBuilder, "teacherlessonprogresses", "IX_teacherlessonprogresses_GradeId_TeacherId", "IX_teacherlessonprogresses_GradeId_TeacherId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_StudentId_LessonId", "IX_studentweaktopics_StudentId_LessonId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_StudentId_IsResolved", "IX_studentweaktopics_StudentId_IsResolved");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_SchoolId_GradeId", "IX_studentweaktopics_SchoolId_GradeId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_ModuleId", "IX_studentweaktopics_ModuleId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_LessonId", "IX_studentweaktopics_LessonId");

            SafeRenameIndex(migrationBuilder, "studentweaktopics", "IX_studentweaktopics_GradeId", "IX_studentweaktopics_GradeId");

            SafeRenameIndex(migrationBuilder, "studentpythoncodes", "IX_studentpythoncodes_StudentId", "IX_studentpythoncodes_StudentId");

            SafeRenameIndex(migrationBuilder, "studentpythoncodes", "IX_studentpythoncodes_LessonId", "IX_studentpythoncodes_LessonId");

            SafeRenameIndex(migrationBuilder, "studentnotes", "IX_studentnotes_StudentId", "IX_studentnotes_StudentId");

            SafeRenameIndex(migrationBuilder, "studentnotes", "IX_studentnotes_LessonId", "IX_studentnotes_LessonId");

            SafeRenameIndex(migrationBuilder, "products", "IX_products_CategoryId", "IX_products_CategoryId");

            SafeRenameIndex(migrationBuilder, "orders", "IX_orders_UserId", "IX_orders_UserId");

            SafeRenameIndex(migrationBuilder, "orderitems", "IX_orderitems_ProductId", "IX_orderitems_ProductId");

            SafeRenameIndex(migrationBuilder, "orderitems", "IX_orderitems_OrderId", "IX_orderitems_OrderId");

            SafeRenameIndex(migrationBuilder, "lessoncompletions", "IX_lessoncompletions_StudentId", "IX_lessoncompletions_StudentId");

            SafeRenameIndex(migrationBuilder, "lessoncompletions", "IX_lessoncompletions_LessonId", "IX_lessoncompletions_LessonId");

            SafeRenameIndex(migrationBuilder, "inappnotifications", "IX_inappnotifications_UserId", "IX_inappnotifications_UserId");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_SchoolId_GradeId_SectionCode", "IX_gradesections_SchoolId_GradeId_SectionCode");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_SchoolId_GradeId", "IX_gradesections_SchoolId_GradeId");

            SafeRenameIndex(migrationBuilder, "gradesections", "IX_gradesections_GradeId", "IX_gradesections_GradeId");

            SafeRenameIndex(migrationBuilder, "events", "IX_events_SchoolId", "IX_events_SchoolId");

            SafeRenameIndex(migrationBuilder, "eventregistrations", "IX_eventregistrations_StudentId", "IX_eventregistrations_StudentId");

            SafeRenameIndex(migrationBuilder, "eventregistrations", "IX_eventregistrations_EventId", "IX_eventregistrations_EventId");

            SafeRenameIndex(migrationBuilder, "eventauditlogs", "IX_eventauditlogs_SchoolId", "IX_eventauditlogs_SchoolId");

            SafeRenameIndex(migrationBuilder, "cartitems", "IX_cartitems_UserId", "IX_cartitems_UserId");

            SafeRenameIndex(migrationBuilder, "cartitems", "IX_cartitems_ProductId", "IX_cartitems_ProductId");

            SafeRenameIndex(migrationBuilder, "attendances", "IX_attendances_TeacherId", "IX_attendances_TeacherId");

            SafeRenameIndex(migrationBuilder, "attendances", "IX_attendances_StudentId", "IX_attendances_StudentId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_wishlistitems",
                table: "wishlistitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_websiteregistrations",
                table: "websiteregistrations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_uploadedfiles",
                table: "uploadedfiles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_tickets",
                table: "tickets",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_tickethistories",
                table: "tickethistories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketcomments",
                table: "ticketcomments",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketcategories",
                table: "ticketcategories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ticketattachments",
                table: "ticketattachments",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_teacherscheduleperiods",
                table: "teacherscheduleperiods",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_teacherlessonprogresses",
                table: "teacherlessonprogresses",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentweaktopics",
                table: "studentweaktopics",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentpythoncodes",
                table: "studentpythoncodes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_studentnotes",
                table: "studentnotes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_products",
                table: "products",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_productcategories",
                table: "productcategories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_orders",
                table: "orders",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_orderitems",
                table: "orderitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_lessoncompletions",
                table: "lessoncompletions",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_inappnotifications",
                table: "inappnotifications",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_gradesections",
                table: "gradesections",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_events",
                table: "events",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_eventregistrations",
                table: "eventregistrations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_eventauditlogs",
                table: "eventauditlogs",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_cartitems",
                table: "cartitems",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_attendances",
                table: "attendances",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_students_StudentId",
                table: "attendances",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_attendances_teachers_TeacherId",
                table: "attendances",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_cartitems_products_ProductId",
                table: "cartitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_cartitems_users_UserId",
                table: "cartitems",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventauditlogs_schools_SchoolId",
                table: "eventauditlogs",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventregistrations_events_EventId",
                table: "eventregistrations",
                column: "EventId",
                principalTable: "events",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_eventregistrations_students_StudentId",
                table: "eventregistrations",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_events_schools_SchoolId",
                table: "events",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_exams_gradesections_SectionId",
                table: "exams",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_gradesections_grades_GradeId",
                table: "gradesections",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_gradesections_schools_SchoolId",
                table: "gradesections",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_inappnotifications_users_UserId",
                table: "inappnotifications",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessoncompletions_lessons_LessonId",
                table: "lessoncompletions",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessoncompletions_students_StudentId",
                table: "lessoncompletions",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orderitems_orders_OrderId",
                table: "orderitems",
                column: "OrderId",
                principalTable: "orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orderitems_products_ProductId",
                table: "orderitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_orders_users_UserId",
                table: "orders",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_products_productcategories_CategoryId",
                table: "products",
                column: "CategoryId",
                principalTable: "productcategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_schedulers_gradesections_SectionId",
                table: "schedulers",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_studentnotes_lessons_LessonId",
                table: "studentnotes",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentnotes_students_StudentId",
                table: "studentnotes",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentpythoncodes_lessons_LessonId",
                table: "studentpythoncodes",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_studentpythoncodes_students_StudentId",
                table: "studentpythoncodes",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_students_gradesections_SectionId",
                table: "students",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_grades_GradeId",
                table: "studentweaktopics",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_lessons_LessonId",
                table: "studentweaktopics",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_modules_ModuleId",
                table: "studentweaktopics",
                column: "ModuleId",
                principalTable: "modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_schools_SchoolId",
                table: "studentweaktopics",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_studentweaktopics_students_StudentId",
                table: "studentweaktopics",
                column: "StudentId",
                principalTable: "students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_gradesections_SectionId",
                table: "teacherlessonprogresses",
                column: "SectionId",
                principalTable: "gradesections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_grades_GradeId",
                table: "teacherlessonprogresses",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_lessons_LessonId",
                table: "teacherlessonprogresses",
                column: "LessonId",
                principalTable: "lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_modules_ModuleId",
                table: "teacherlessonprogresses",
                column: "ModuleId",
                principalTable: "modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_schools_SchoolId",
                table: "teacherlessonprogresses",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherlessonprogresses_teachers_TeacherId",
                table: "teacherlessonprogresses",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_grades_GradeId",
                table: "teacherscheduleperiods",
                column: "GradeId",
                principalTable: "grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_schedulers_SchedulerId",
                table: "teacherscheduleperiods",
                column: "SchedulerId",
                principalTable: "schedulers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_schools_SchoolId",
                table: "teacherscheduleperiods",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_teacherscheduleperiods_teachers_TeacherId",
                table: "teacherscheduleperiods",
                column: "TeacherId",
                principalTable: "teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketattachments_ticketcomments_TicketCommentId",
                table: "ticketattachments",
                column: "TicketCommentId",
                principalTable: "ticketcomments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ticketattachments_tickets_TicketId",
                table: "ticketattachments",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcategories_schools_SchoolId",
                table: "ticketcategories",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcomments_tickets_TicketId",
                table: "ticketcomments",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ticketcomments_users_UserId",
                table: "ticketcomments",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickethistories_tickets_TicketId",
                table: "tickethistories",
                column: "TicketId",
                principalTable: "tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickethistories_users_UserId",
                table: "tickethistories",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_ticketcategories_CategoryId",
                table: "tickets",
                column: "CategoryId",
                principalTable: "ticketcategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_schools_SchoolId",
                table: "tickets",
                column: "SchoolId",
                principalTable: "schools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_users_AssignedToUserId",
                table: "tickets",
                column: "AssignedToUserId",
                principalTable: "users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_tickets_users_RequesterUserId",
                table: "tickets",
                column: "RequesterUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_wishlistitems_products_ProductId",
                table: "wishlistitems",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_wishlistitems_users_UserId",
                table: "wishlistitems",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        
            migrationBuilder.Sql("SET FOREIGN_KEY_CHECKS = 1;");
        }
    
        private void SafeDropForeignKey(MigrationBuilder migrationBuilder, string table, string name)
        {
            migrationBuilder.Sql($@"
                DROP PROCEDURE IF EXISTS DropFkIfExists;
                CREATE PROCEDURE DropFkIfExists()
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                        WHERE CONSTRAINT_SCHEMA = DATABASE() 
                          AND TABLE_NAME = '{table}' 
                          AND CONSTRAINT_NAME = '{name}' 
                          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                    ) THEN
                        SET @sql = CONCAT('ALTER TABLE ', '{table}', ' DROP FOREIGN KEY ', '{name}', '');
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;
                CALL DropFkIfExists();
                DROP PROCEDURE IF EXISTS DropFkIfExists;
            ");
        }

        private void SafeDropPrimaryKey(MigrationBuilder migrationBuilder, string table, string name)
        {
            migrationBuilder.Sql($@"
                DROP PROCEDURE IF EXISTS DropPkIfExists;
                CREATE PROCEDURE DropPkIfExists()
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                        WHERE CONSTRAINT_SCHEMA = DATABASE() 
                          AND TABLE_NAME = '{table}' 
                          AND CONSTRAINT_NAME = 'PRIMARY'
                    ) THEN
                        SET @sql = CONCAT('ALTER TABLE ', '{table}', ' DROP PRIMARY KEY');
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;
                CALL DropPkIfExists();
                DROP PROCEDURE IF EXISTS DropPkIfExists;
            ");
        }

        private void SafeRenameIndex(MigrationBuilder migrationBuilder, string table, string oldName, string newName)
        {
            migrationBuilder.Sql($@"
                DROP PROCEDURE IF EXISTS RenameIndexIfExists;
                CREATE PROCEDURE RenameIndexIfExists()
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM INFORMATION_SCHEMA.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                          AND TABLE_NAME = '{table}' 
                          AND INDEX_NAME = '{oldName}'
                    ) THEN
                        SET @sql = CONCAT('ALTER TABLE ', '{table}', ' RENAME INDEX ', '{oldName}', ' TO ', '{newName}', '');
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;
                CALL RenameIndexIfExists();
                DROP PROCEDURE IF EXISTS RenameIndexIfExists;
            ");
        }

        private void SafeRenameTable(MigrationBuilder migrationBuilder, string oldName, string newName)
        {
            if (oldName == newName) return;
            migrationBuilder.Sql($@"
                DROP PROCEDURE IF EXISTS RenameTableIfExists;
                CREATE PROCEDURE RenameTableIfExists()
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM INFORMATION_SCHEMA.TABLES 
                        WHERE TABLE_SCHEMA = DATABASE() 
                          AND TABLE_NAME = '{oldName}'
                    ) AND NOT EXISTS (
                        SELECT 1 
                        FROM INFORMATION_SCHEMA.TABLES 
                        WHERE TABLE_SCHEMA = DATABASE() 
                          AND TABLE_NAME = '{newName}'
                    ) THEN
                        SET @sql = CONCAT('RENAME TABLE ', '{oldName}', ' TO ', '{newName}', '');
                        PREPARE stmt FROM @sql;
                        EXECUTE stmt;
                        DEALLOCATE PREPARE stmt;
                    END IF;
                END;
                CALL RenameTableIfExists();
                DROP PROCEDURE IF EXISTS RenameTableIfExists;
            ");
        }

        private void CleanOrphanedData(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM studentweaktopics WHERE LessonId IS NOT NULL AND LessonId NOT IN (SELECT Id FROM lessons);");
            migrationBuilder.Sql("DELETE FROM studentweaktopics WHERE ModuleId IS NOT NULL AND ModuleId NOT IN (SELECT Id FROM modules);");
            migrationBuilder.Sql("DELETE FROM studentweaktopics WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM studentweaktopics WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE GradeId IS NOT NULL AND GradeId NOT IN (SELECT Id FROM grades);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE SectionId IS NOT NULL AND SectionId NOT IN (SELECT Id FROM gradesections);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE LessonId IS NOT NULL AND LessonId NOT IN (SELECT Id FROM lessons);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE ModuleId IS NOT NULL AND ModuleId NOT IN (SELECT Id FROM modules);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM teacherlessonprogresses WHERE TeacherId IS NOT NULL AND TeacherId NOT IN (SELECT Id FROM teachers);");
            migrationBuilder.Sql("DELETE FROM teacherscheduleperiods WHERE GradeId IS NOT NULL AND GradeId NOT IN (SELECT Id FROM grades);");
            migrationBuilder.Sql("DELETE FROM teacherscheduleperiods WHERE SchedulerId IS NOT NULL AND SchedulerId NOT IN (SELECT Id FROM schedulers);");
            migrationBuilder.Sql("DELETE FROM teacherscheduleperiods WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM teacherscheduleperiods WHERE TeacherId IS NOT NULL AND TeacherId NOT IN (SELECT Id FROM teachers);");
            migrationBuilder.Sql("DELETE FROM ticketattachments WHERE TicketCommentId IS NOT NULL AND TicketCommentId NOT IN (SELECT Id FROM ticketcomments);");
            migrationBuilder.Sql("DELETE FROM ticketattachments WHERE TicketId IS NOT NULL AND TicketId NOT IN (SELECT Id FROM tickets);");
            migrationBuilder.Sql("DELETE FROM ticketcategories WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM ticketcomments WHERE TicketId IS NOT NULL AND TicketId NOT IN (SELECT Id FROM tickets);");
            migrationBuilder.Sql("DELETE FROM ticketcomments WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM tickethistories WHERE TicketId IS NOT NULL AND TicketId NOT IN (SELECT Id FROM tickets);");
            migrationBuilder.Sql("DELETE FROM tickethistories WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM tickets WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM tickets WHERE CategoryId IS NOT NULL AND CategoryId NOT IN (SELECT Id FROM ticketcategories);");
            migrationBuilder.Sql("DELETE FROM tickets WHERE AssignedToUserId IS NOT NULL AND AssignedToUserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM tickets WHERE RequesterUserId IS NOT NULL AND RequesterUserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM wishlistitems WHERE ProductId IS NOT NULL AND ProductId NOT IN (SELECT Id FROM products);");
            migrationBuilder.Sql("DELETE FROM wishlistitems WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM attendances WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM attendances WHERE TeacherId IS NOT NULL AND TeacherId NOT IN (SELECT Id FROM teachers);");
            migrationBuilder.Sql("DELETE FROM cartitems WHERE ProductId IS NOT NULL AND ProductId NOT IN (SELECT Id FROM products);");
            migrationBuilder.Sql("DELETE FROM cartitems WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM eventauditlogs WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM eventregistrations WHERE EventId IS NOT NULL AND EventId NOT IN (SELECT Id FROM events);");
            migrationBuilder.Sql("DELETE FROM eventregistrations WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM events WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM exams WHERE SectionId IS NOT NULL AND SectionId NOT IN (SELECT Id FROM gradesections);");
            migrationBuilder.Sql("DELETE FROM gradesections WHERE GradeId IS NOT NULL AND GradeId NOT IN (SELECT Id FROM grades);");
            migrationBuilder.Sql("DELETE FROM gradesections WHERE SchoolId IS NOT NULL AND SchoolId NOT IN (SELECT Id FROM schools);");
            migrationBuilder.Sql("DELETE FROM inappnotifications WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM lessoncompletions WHERE LessonId IS NOT NULL AND LessonId NOT IN (SELECT Id FROM lessons);");
            migrationBuilder.Sql("DELETE FROM lessoncompletions WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM orderitems WHERE OrderId IS NOT NULL AND OrderId NOT IN (SELECT Id FROM orders);");
            migrationBuilder.Sql("DELETE FROM orderitems WHERE ProductId IS NOT NULL AND ProductId NOT IN (SELECT Id FROM products);");
            migrationBuilder.Sql("DELETE FROM orders WHERE UserId IS NOT NULL AND UserId NOT IN (SELECT Id FROM users);");
            migrationBuilder.Sql("DELETE FROM products WHERE CategoryId IS NOT NULL AND CategoryId NOT IN (SELECT Id FROM productcategories);");
            migrationBuilder.Sql("DELETE FROM schedulers WHERE SectionId IS NOT NULL AND SectionId NOT IN (SELECT Id FROM gradesections);");
            migrationBuilder.Sql("DELETE FROM studentnotes WHERE LessonId IS NOT NULL AND LessonId NOT IN (SELECT Id FROM lessons);");
            migrationBuilder.Sql("DELETE FROM studentnotes WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM studentpythoncodes WHERE LessonId IS NOT NULL AND LessonId NOT IN (SELECT Id FROM lessons);");
            migrationBuilder.Sql("DELETE FROM studentpythoncodes WHERE StudentId IS NOT NULL AND StudentId NOT IN (SELECT Id FROM students);");
            migrationBuilder.Sql("DELETE FROM students WHERE SectionId IS NOT NULL AND SectionId NOT IN (SELECT Id FROM gradesections);");
            migrationBuilder.Sql("DELETE FROM studentweaktopics WHERE GradeId IS NOT NULL AND GradeId NOT IN (SELECT Id FROM grades);");
        }
    }
}
