using Microsoft.EntityFrameworkCore;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;

namespace NubeEra.Infrastructure.Persistence.DbContext;

public class AppDbContext : Microsoft.EntityFrameworkCore.DbContext
{
    private readonly ICurrentUserService? _currentUserService;
    private readonly ITenantService? _tenantService;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ICurrentUserService? currentUserService = null,
        ITenantService? tenantService = null)
        : base(options)
    {
        _currentUserService = currentUserService;
        _tenantService = tenantService;
    }

    // Preserved tables
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<School> Schools { get; set; } = null!;
    public DbSet<Grade> Grades { get; set; } = null!;
    public DbSet<GradeLevel> GradeLevels { get; set; } = null!;
    public DbSet<GradeSection> GradeSections { get; set; } = null!;
    public DbSet<Teacher> Teachers { get; set; } = null!;
    public DbSet<Student> Students { get; set; } = null!;

    // New tables (School Operational LMS)
    public DbSet<Subject> Subjects { get; set; } = null!;
    public DbSet<TeacherSubject> TeacherSubjects { get; set; } = null!;
    public DbSet<StudentSubject> StudentSubjects { get; set; } = null!;
    public DbSet<Module> Modules { get; set; } = null!;
    public DbSet<Lesson> Lessons { get; set; } = null!;
    public DbSet<Scheduler> Schedulers { get; set; } = null!;
    public DbSet<Exam> Exams { get; set; } = null!;
    public DbSet<Question> Questions { get; set; } = null!;
    public DbSet<Result> Results { get; set; } = null!;
    public DbSet<Attendance> Attendances { get; set; } = null!;
    public DbSet<LessonCompletion> LessonCompletions { get; set; } = null!;
    public DbSet<UploadedFile> UploadedFiles { get; set; } = null!;
    public DbSet<StudentNote> StudentNotes { get; set; } = null!;
    public DbSet<StudentPythonCode> StudentPythonCodes { get; set; } = null!;
    public DbSet<StudentDoubt> StudentDoubts { get; set; } = null!;

    // Events Module Tables
    public DbSet<Event> Events { get; set; } = null!;
    public DbSet<EventRegistration> EventRegistrations { get; set; } = null!;
    public DbSet<EventAuditLog> EventAuditLogs { get; set; } = null!;

    // Support System tables
    public DbSet<TicketCategory> TicketCategories { get; set; } = null!;
    public DbSet<Ticket> Tickets { get; set; } = null!;
    public DbSet<TicketComment> TicketComments { get; set; } = null!;
    public DbSet<TicketAttachment> TicketAttachments { get; set; } = null!;
    public DbSet<TicketHistory> TicketHistories { get; set; } = null!;
    public DbSet<InAppNotification> InAppNotifications { get; set; } = null!;
    public DbSet<WebsiteRegistration> WebsiteRegistrations { get; set; } = null!;
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;

    // E-Commerce Module tables
    public DbSet<ProductCategory> ProductCategories { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<CartItem> CartItems { get; set; } = null!;
    public DbSet<WishlistItem> WishlistItems { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<OrderItem> OrderItems { get; set; } = null!;

    // Database Backup & Restore module tables (system-level, not tenant-scoped)
    public DbSet<BackupHistory> BackupHistories { get; set; } = null!;
    public DbSet<BackupAuditLog> BackupAuditLogs { get; set; } = null!;

    // Certificate Management Module tables
    public DbSet<Certificate> Certificates { get; set; } = null!;
    public DbSet<CertificateTemplate> CertificateTemplates { get; set; } = null!;

    // Report Card Module tables
    public DbSet<ReportCard> ReportCards { get; set; } = null!;
    public DbSet<ReportCardSubject> ReportCardSubjects { get; set; } = null!;
    public DbSet<ReportCardActivity> ReportCardActivities { get; set; } = null!;
    public DbSet<ReportCardSkill> ReportCardSkills { get; set; } = null!;
    public DbSet<ReportCardGradingRule> ReportCardGradingRules { get; set; } = null!;

    // ── Teacher Learning Path / Schedule / Syllabus module ───────────────────
    public DbSet<TeacherLessonProgress> TeacherLessonProgresses { get; set; } = null!;
    public DbSet<TeacherSchedulePeriod> TeacherSchedulePeriods  { get; set; } = null!;

    // ── Student Weakness Analysis module ─────────────────────────────────────
    public DbSet<StudentWeakTopic> StudentWeakTopics { get; set; } = null!;

    // ── Teacher Rating module (Student Dashboard "Rate Your Teacher") ────────
    public DbSet<TeacherRating> TeacherRatings { get; set; } = null!;

    // ── School-Based Curriculum Assignment / Multi-School Teacher Management ──
    public DbSet<SchoolUnitAssignment> SchoolUnitAssignments { get; set; } = null!;
    public DbSet<SchoolTopicAssignment> SchoolTopicAssignments { get; set; } = null!;
    public DbSet<TeacherSchool> TeacherSchools { get; set; } = null!;
    public DbSet<CurriculumAssignmentAuditLog> CurriculumAssignmentAuditLogs { get; set; } = null!;
    public DbSet<TeacherSchoolAuditLog> TeacherSchoolAuditLogs { get; set; } = null!;

    // ── Model-cache-key snapshot (see TenantModelCacheKeyFactory) ────────────
    // EF Core caches the model produced by OnModelCreating ONCE per DbContext
    // type by default. Every query filter below closes over the current
    // request's identity (role/school/grade/student/teacher), so without a
    // custom IModelCacheKeyFactory keyed on these same values, only the FIRST
    // request to ever build the model would determine the filters for the
    // entire process lifetime — e.g. an Admin logging in first bakes in the
    // unrestricted Module/Lesson filter, and every Student afterwards would see
    // curriculum units never assigned to their school. These properties expose
    // the exact values OnModelCreating reads, so the factory can key on them.
    internal string? ModelCacheRole => _currentUserService?.Role;
    internal Guid? ModelCacheSchoolId => _tenantService?.GetEffectiveSchoolId() ?? _currentUserService?.SchoolId;
    internal Guid? ModelCacheTeacherId => _currentUserService?.TeacherId;
    internal Guid? ModelCacheStudentId => _currentUserService?.StudentId;
    internal Guid? ModelCacheGradeId => _currentUserService?.GradeId;
    internal Guid? ModelCacheGradeLevelId => _currentUserService?.GradeLevelId;
    internal string? ModelCacheUserId => _currentUserService?.UserId;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Effective school = explicitly switched/selected school (Teacher's X-School-Id,
        // validated by TeacherSchoolAccessMiddleware) when available, else the JWT's
        // home SchoolId. Falling back to the raw claim keeps Student/Principal/anonymous
        // behavior identical to before — only Teacher's switchable-school case changes.
        var schoolId  = _tenantService?.GetEffectiveSchoolId() ?? _currentUserService?.SchoolId;
        var role      = _currentUserService?.Role;
        var teacherId = _currentUserService?.TeacherId;
        var studentId = _currentUserService?.StudentId;
        var gradeId   = _currentUserService?.GradeId;
        // School-agnostic master grade level (1st..10th Grade) — used to scope a student
        // to Units/Topics written at their grade level now that Module/Lesson no longer
        // carry a per-school GradeId.
        var gradeLevelId = _currentUserService?.GradeLevelId;

        bool isPrivileged = string.IsNullOrEmpty(role)
            || role == "SuperAdmin"
            || role == "Admin"
            || role == "admin"
            || role == "Staff"
            || role == "staff"
            || role == "Parent"
            || role == "parent";

        // ── Soft Delete Global Query Filters ─────────────────────────────────────
        // EF Core allows only ONE HasQueryFilter per entity type, so tenant/ownership
        // filters and the soft-delete guard are combined into a single expression.
        // Recycle Bin queries bypass these via .IgnoreQueryFilters() + .Where(x => x.IsDeleted).
        // ─────────────────────────────────────────────────────────────────────────

        if (isPrivileged)
        {
            // Admin / SuperAdmin / anonymous: soft-delete only — no tenant scoping.
            modelBuilder.Entity<School>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Grade>()                .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<GradeLevel>()           .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Teacher>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Student>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Subject>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSubject>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentSubject>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Module>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Lesson>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Scheduler>()            .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Exam>()                 .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Question>()             .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Result>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Attendance>()           .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<LessonCompletion>()     .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentNote>()          .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentPythonCode>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Event>()                .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<EventRegistration>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<EventAuditLog>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketCategory>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Ticket>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketComment>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketAttachment>()     .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketHistory>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<InAppNotification>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<WebsiteRegistration>()  .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ProductCategory>()      .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Product>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<CartItem>()             .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<WishlistItem>()         .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Order>()                .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<OrderItem>()            .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Certificate>()          .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<CertificateTemplate>()  .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCard>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCardSubject>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCardActivity>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCardSkill>()          .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCardGradingRule>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<GradeSection>()             .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherLessonProgress>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSchedulePeriod>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentWeakTopic>()         .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<User>()                     .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherRating>()            .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentDoubt>()             .HasQueryFilter(x => !x.IsDeleted);

            // School-Based Curriculum Assignment / Multi-School Teacher Management —
            // Admin/SuperAdmin/Staff manage the full master catalog and every school's
            // assignments, including inactive Units/Topics, so no IsActive restriction here.
            modelBuilder.Entity<SchoolUnitAssignment>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<SchoolTopicAssignment>()      .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSchool>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<CurriculumAssignmentAuditLog>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSchoolAuditLog>()      .HasQueryFilter(x => !x.IsDeleted);
        }
        else
        {
            // ── Non-Privileged: Soft Delete + Multi-Tenant + Ownership (combined) ───

        // School-scoped entities
        if (schoolId.HasValue)
        {
            modelBuilder.Entity<Grade>()            .HasQueryFilter(x => !x.IsDeleted && (x.SchoolId == schoolId.Value || x.SchoolId == null));
            modelBuilder.Entity<Teacher>()          .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            // Units/Topics are master content — visible to a school once assigned via
            // SchoolUnitAssignment/SchoolTopicAssignment (/admin/curriculum-assignment).
            modelBuilder.Entity<Module>()           .HasQueryFilter(x => !x.IsDeleted && x.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value));
            modelBuilder.Entity<Subject>()          .HasQueryFilter(x => !x.IsDeleted && x.Modules.Any(m => !m.IsDeleted && m.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value)));
            modelBuilder.Entity<Lesson>()           .HasQueryFilter(x => !x.IsDeleted && x.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value));
            modelBuilder.Entity<Exam>()             .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<Scheduler>()        .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<Result>()           .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<Attendance>()       .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<LessonCompletion>() .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<User>()             .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<StudentNote>()      .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<StudentPythonCode>().HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<Event>()            .HasQueryFilter(x => !x.IsDeleted && (x.SchoolId == schoolId.Value || x.SchoolId == null));
            modelBuilder.Entity<EventAuditLog>()    .HasQueryFilter(x => !x.IsDeleted && (x.SchoolId == schoolId.Value || x.SchoolId == null));
            modelBuilder.Entity<TicketCategory>()   .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<GradeSection>()             .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<ReportCard>()               .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<TeacherLessonProgress>()    .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<TeacherSchedulePeriod>()    .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<StudentWeakTopic>()         .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<TeacherRating>()            .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<StudentDoubt>()             .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);

            modelBuilder.Entity<SchoolUnitAssignment>() .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<SchoolTopicAssignment>().HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<CurriculumAssignmentAuditLog>().HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
        }
        else
        {
            modelBuilder.Entity<Grade>()                .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Teacher>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Subject>()              .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSubject>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentSubject>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Module>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Lesson>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Exam>()                 .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Scheduler>()            .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Result>()               .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Attendance>()           .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<LessonCompletion>()     .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<User>()                 .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentNote>()          .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentPythonCode>()    .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Event>()                .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<EventAuditLog>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketCategory>()       .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<GradeSection>()         .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ReportCard>()           .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherLessonProgress>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherSchedulePeriod>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentWeakTopic>()     .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TeacherRating>()        .HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentDoubt>()         .HasQueryFilter(x => !x.IsDeleted);

            // No resolvable school for a non-privileged caller is an edge case that
            // should never legitimately occur — default to deny rather than leaking
            // every school's curriculum (secure-by-default; Requirements 4 & 5).
            modelBuilder.Entity<SchoolUnitAssignment>()  .HasQueryFilter(x => false);
            modelBuilder.Entity<SchoolTopicAssignment>() .HasQueryFilter(x => false);
            modelBuilder.Entity<CurriculumAssignmentAuditLog>().HasQueryFilter(x => false);
        }

        // Entities not tenant-scoped
        modelBuilder.Entity<School>()               .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<GradeLevel>()           .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<Question>()             .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<EventRegistration>()    .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<InAppNotification>()    .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<WebsiteRegistration>()  .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<ProductCategory>()      .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<Product>()              .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<CartItem>()             .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<WishlistItem>()         .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<Order>()                .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<OrderItem>()            .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<Certificate>()          .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<CertificateTemplate>()  .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<ReportCardSubject>()    .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<ReportCardActivity>()   .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<ReportCardSkill>()      .HasQueryFilter(x => !x.IsDeleted);
        modelBuilder.Entity<ReportCardGradingRule>().HasQueryFilter(x => !x.IsDeleted);

        // Student ownership — must come after school-scoped defaults above (last wins per entity)
        if (role == "Student" && studentId.HasValue)
        {
            modelBuilder.Entity<ReportCard>()       .HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value && x.IsVisibleToStudent);
            modelBuilder.Entity<Student>()          .HasQueryFilter(x => !x.IsDeleted && x.Id == studentId.Value);
            modelBuilder.Entity<StudentNote>()      .HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value);
            modelBuilder.Entity<StudentPythonCode>().HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value);
            modelBuilder.Entity<TeacherRating>()    .HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value);
            modelBuilder.Entity<StudentDoubt>()     .HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value);
            modelBuilder.Entity<Subject>()          .HasQueryFilter(x => !x.IsDeleted && x.StudentSubjects.Any(ss => !ss.IsDeleted && ss.StudentId == studentId.Value));

            if (gradeId.HasValue)
            {
                modelBuilder.Entity<Grade>()     .HasQueryFilter(x => !x.IsDeleted && x.Id == gradeId.Value);
                modelBuilder.Entity<Exam>()      .HasQueryFilter(x => !x.IsDeleted && x.GradeId == gradeId.Value);
                modelBuilder.Entity<Scheduler>() .HasQueryFilter(x => !x.IsDeleted && x.GradeId == gradeId.Value);
                modelBuilder.Entity<Result>()    .HasQueryFilter(x => !x.IsDeleted && x.StudentId == studentId.Value && x.IsPublished);
                modelBuilder.Entity<StudentDoubt>() .HasQueryFilter(x => !x.IsDeleted && x.GradeId == gradeId.Value);
            }

            // Units ("Modules") / Topics ("Lessons") are master content shared across every
            // school at a grade level. Grade level alone is no longer school-specific the way
            // the old per-school GradeId was, so a student must be scoped to BOTH their own
            // grade level (GradeLevelId, resolved via JWT claim from their per-school
            // Grade.GradeLevelId) AND their own school's assignment (SchoolUnitAssignment/
            // SchoolTopicAssignment) — otherwise they could see another school's curriculum
            // at the same grade level.
            if (gradeLevelId.HasValue && schoolId.HasValue)
            {
                modelBuilder.Entity<Module>().HasQueryFilter(x => !x.IsDeleted
                    && x.GradeLevelId == gradeLevelId.Value
                    && x.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value)
                    && (x.SubjectId == null || x.Subject!.StudentSubjects.Any(ss => !ss.IsDeleted && ss.StudentId == studentId.Value)));
                modelBuilder.Entity<Lesson>().HasQueryFilter(x => !x.IsDeleted
                    && x.Module.GradeLevelId == gradeLevelId.Value
                    && x.SchoolAssignments.Any(a => !a.IsDeleted && a.SchoolId == schoolId.Value)
                    && (x.Module.SubjectId == null || x.Module.Subject!.StudentSubjects.Any(ss => !ss.IsDeleted && ss.StudentId == studentId.Value)));
            }
            else
            {
                // Fail closed: an unresolved grade level or school must not leak any
                // master curriculum content rather than silently falling back to an
                // unscoped view.
                modelBuilder.Entity<Module>().HasQueryFilter(x => false);
                modelBuilder.Entity<Lesson>().HasQueryFilter(x => false);
            }
        }
        else
        {
            modelBuilder.Entity<Student>().HasQueryFilter(x => !x.IsDeleted && (!schoolId.HasValue || x.SchoolId == schoolId.Value));
        }

        // Teacher ownership
        if (role == "Teacher" && teacherId.HasValue)
        {
            // Exams are school-wide, not per-author: a Teacher must see every Exam
            // scheduled for their school/grade — including ones created by a Staff/Admin
            // account — not only the ones they personally authored. Restricting this to
            // CreatedByTeacherId previously hid Staff-created exams from every Teacher.
            modelBuilder.Entity<Exam>()      .HasQueryFilter(x => !x.IsDeleted && (!schoolId.HasValue || x.SchoolId == schoolId.Value));
            modelBuilder.Entity<Scheduler>() .HasQueryFilter(x => !x.IsDeleted && x.TeacherId == teacherId.Value && (!schoolId.HasValue || x.SchoolId == schoolId.Value));

            // A Teacher who has switched to a non-home school via X-School-Id must still
            // be able to load their OWN Teacher/User row (profile, settings, password
            // change) even though that row's home SchoolId differs from the currently
            // selected effective school. Without this carve-out the generic schoolId
            // filter above would hide the Teacher from themselves while switched.
            modelBuilder.Entity<Teacher>().HasQueryFilter(x => !x.IsDeleted &&
                (x.Id == teacherId.Value || (schoolId.HasValue && x.SchoolId == schoolId.Value)));

            if (Guid.TryParse(_currentUserService?.UserId, out var teacherUserId))
            {
                modelBuilder.Entity<User>().HasQueryFilter(x => !x.IsDeleted &&
                    (x.Id == teacherUserId || (schoolId.HasValue && x.SchoolId == schoolId.Value)));
            }

            // TeacherSchool / TeacherSchoolAuditLog: a Teacher must see ALL of their own
            // school memberships (any school), independent of which school is currently
            // selected — the school-switcher UI needs this full list to populate itself.
            modelBuilder.Entity<TeacherSchool>()        .HasQueryFilter(x => !x.IsDeleted && x.TeacherId == teacherId.Value);
            modelBuilder.Entity<TeacherSchoolAuditLog>().HasQueryFilter(x => !x.IsDeleted && x.TeacherId == teacherId.Value);
            modelBuilder.Entity<Subject>().HasQueryFilter(x => !x.IsDeleted && x.TeacherSubjects.Any(ts => !ts.IsDeleted && ts.TeacherId == teacherId.Value));
        }
        else if (schoolId.HasValue)
        {
            // Principal (single fixed school) or any other school-restricted role:
            // membership rows scoped to their own school only.
            modelBuilder.Entity<TeacherSchool>()        .HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
            modelBuilder.Entity<TeacherSchoolAuditLog>().HasQueryFilter(x => !x.IsDeleted && x.SchoolId == schoolId.Value);
        }
        else
        {
            modelBuilder.Entity<TeacherSchool>()        .HasQueryFilter(x => false);
            modelBuilder.Entity<TeacherSchoolAuditLog>().HasQueryFilter(x => false);
        }

        // Ticket ownership (students/parents/teachers see only their own)
        var userIdStr = _currentUserService?.UserId;
        if (Guid.TryParse(userIdStr, out var currentUserId)
            && (role == "Student" || role == "student"
             || role == "Parent"  || role == "parent"
             || role == "Teacher" || role == "teacher"))
        {
            modelBuilder.Entity<Ticket>().HasQueryFilter(x => !x.IsDeleted && x.RequesterUserId == currentUserId);
            modelBuilder.Entity<TicketComment>().HasQueryFilter(x => !x.IsDeleted && x.Ticket.RequesterUserId == currentUserId);
            modelBuilder.Entity<TicketAttachment>().HasQueryFilter(x => !x.IsDeleted && x.Ticket.RequesterUserId == currentUserId);
            modelBuilder.Entity<TicketHistory>().HasQueryFilter(x => !x.IsDeleted && x.Ticket.RequesterUserId == currentUserId);
        }
        else
        {
            modelBuilder.Entity<Ticket>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketComment>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketAttachment>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<TicketHistory>().HasQueryFilter(x => !x.IsDeleted);
        }
        }

        // Map all table names to lowercase globally to support case-sensitive MySQL on Linux.
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                entity.SetTableName(tableName.ToLowerInvariant());
            }
        }
    }
}
