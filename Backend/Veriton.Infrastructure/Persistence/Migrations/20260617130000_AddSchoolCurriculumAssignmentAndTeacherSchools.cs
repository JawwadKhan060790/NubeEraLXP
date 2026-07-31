using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Veriton.Infrastructure.Persistence.DbContext;

#nullable disable

namespace Veriton.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// School-Based Curriculum Assignment and Multi-School Teacher Management.
    ///
    /// Creates 7 new tables:
    ///   - units / topics                                — master curriculum data (Admin-owned)
    ///   - school_unit_assignments / school_topic_assignments — School-visibility join tables
    ///   - teacher_schools                                — many-to-many Teacher &lt;-&gt; School
    ///   - curriculum_assignment_audit_logs               — history trail for unit/topic assignment
    ///   - teacher_school_audit_logs                       — history trail for teacher-school assignment
    ///
    /// All 7 tables inherit the full BaseEntity column set (Id, CreatedAt, UpdatedDate,
    /// UpdatedBy, IsDeleted, DeletedDate, DeletedBy) baked directly into their CREATE TABLE
    /// statement, since they are created after both 20260612000001_AddSoftDeleteColumns and
    /// 20260616120000_AddAuditColumns already ran — there is no ALTER-on-existing-table step
    /// needed for them the way older tables required.
    ///
    /// FK dependency order: grade_levels / schools / teachers already exist →
    /// units → topics → school_unit_assignments → school_topic_assignments →
    /// teacher_schools → curriculum_assignment_audit_logs → teacher_school_audit_logs.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260617130000_AddSchoolCurriculumAssignmentAndTeacherSchools")]
    public partial class AddSchoolCurriculumAssignmentAndTeacherSchools : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── units ────────────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GradeLevelId = table.Column<Guid>(type: "char(36)", nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_units_grade_levels_GradeLevelId",
                        column: x => x.GradeLevelId,
                        principalTable: "grade_levels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── topics ───────────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "topics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UnitId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_topics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_topics_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── school_unit_assignments ──────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "school_unit_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UnitId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AssignedBy = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AssignedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_unit_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_school_unit_assignments_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_unit_assignments_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── school_topic_assignments ─────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "school_topic_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TopicId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AssignedBy = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AssignedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_topic_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_school_topic_assignments_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_topic_assignments_topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── teacher_schools ──────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "teacher_schools",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TeacherId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    IsPrimary = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    AssignedBy = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AssignedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teacher_schools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_teacher_schools_teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_teacher_schools_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── curriculum_assignment_audit_logs ─────────────────────────────────
            migrationBuilder.CreateTable(
                name: "curriculum_assignment_audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EntityType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EntityId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EntityName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ActionPerformed = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PerformedBy = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Role = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DateTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curriculum_assignment_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_curriculum_assignment_audit_logs_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── teacher_school_audit_logs ────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "teacher_school_audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TeacherId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    SchoolId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TeacherName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SchoolName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ActionPerformed = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PerformedBy = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserName = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Role = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DateTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    DeletedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teacher_school_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_teacher_school_audit_logs_teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_teacher_school_audit_logs_schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── Indexes: units ───────────────────────────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_units_Name", table: "units", column: "Name");
            migrationBuilder.CreateIndex(name: "IX_units_GradeLevelId", table: "units", column: "GradeLevelId");
            migrationBuilder.CreateIndex(name: "IX_units_GradeLevelId_Code", table: "units",
                columns: new[] { "GradeLevelId", "Code" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_units_IsDeleted", table: "units", column: "IsDeleted");

            // ── Indexes: topics ──────────────────────────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_topics_UnitId", table: "topics", column: "UnitId");
            migrationBuilder.CreateIndex(name: "IX_topics_UnitId_Code", table: "topics",
                columns: new[] { "UnitId", "Code" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_topics_IsDeleted", table: "topics", column: "IsDeleted");

            // ── Indexes: school_unit_assignments ────────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_school_unit_assignments_SchoolId_UnitId", table: "school_unit_assignments",
                columns: new[] { "SchoolId", "UnitId" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_school_unit_assignments_SchoolId", table: "school_unit_assignments", column: "SchoolId");
            migrationBuilder.CreateIndex(name: "IX_school_unit_assignments_UnitId", table: "school_unit_assignments", column: "UnitId");
            migrationBuilder.CreateIndex(name: "IX_school_unit_assignments_IsDeleted", table: "school_unit_assignments", column: "IsDeleted");

            // ── Indexes: school_topic_assignments ───────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_school_topic_assignments_SchoolId_TopicId", table: "school_topic_assignments",
                columns: new[] { "SchoolId", "TopicId" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_school_topic_assignments_SchoolId", table: "school_topic_assignments", column: "SchoolId");
            migrationBuilder.CreateIndex(name: "IX_school_topic_assignments_TopicId", table: "school_topic_assignments", column: "TopicId");
            migrationBuilder.CreateIndex(name: "IX_school_topic_assignments_IsDeleted", table: "school_topic_assignments", column: "IsDeleted");

            // ── Indexes: teacher_schools ─────────────────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_teacher_schools_TeacherId_SchoolId", table: "teacher_schools",
                columns: new[] { "TeacherId", "SchoolId" }, unique: true);
            migrationBuilder.CreateIndex(name: "IX_teacher_schools_TeacherId", table: "teacher_schools", column: "TeacherId");
            migrationBuilder.CreateIndex(name: "IX_teacher_schools_SchoolId", table: "teacher_schools", column: "SchoolId");
            migrationBuilder.CreateIndex(name: "IX_teacher_schools_IsDeleted", table: "teacher_schools", column: "IsDeleted");

            // ── Indexes: curriculum_assignment_audit_logs ───────────────────────
            migrationBuilder.CreateIndex(name: "IX_curriculum_assignment_audit_logs_SchoolId", table: "curriculum_assignment_audit_logs", column: "SchoolId");
            migrationBuilder.CreateIndex(name: "IX_curriculum_assignment_audit_logs_EntityType_EntityId", table: "curriculum_assignment_audit_logs",
                columns: new[] { "EntityType", "EntityId" });
            migrationBuilder.CreateIndex(name: "IX_curriculum_assignment_audit_logs_DateTime", table: "curriculum_assignment_audit_logs", column: "DateTime");

            // ── Indexes: teacher_school_audit_logs ──────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_teacher_school_audit_logs_TeacherId", table: "teacher_school_audit_logs", column: "TeacherId");
            migrationBuilder.CreateIndex(name: "IX_teacher_school_audit_logs_SchoolId", table: "teacher_school_audit_logs", column: "SchoolId");
            migrationBuilder.CreateIndex(name: "IX_teacher_school_audit_logs_DateTime", table: "teacher_school_audit_logs", column: "DateTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "teacher_school_audit_logs");
            migrationBuilder.DropTable(name: "curriculum_assignment_audit_logs");
            migrationBuilder.DropTable(name: "teacher_schools");
            migrationBuilder.DropTable(name: "school_topic_assignments");
            migrationBuilder.DropTable(name: "school_unit_assignments");
            migrationBuilder.DropTable(name: "topics");
            migrationBuilder.DropTable(name: "units");
        }
    }
}
