using AutoMapper;
using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Mappings;
using Veriton.Application.Services;
using Veriton.Application.Validators;
using Veriton.Application.Interfaces.Services.Ecommerce;
using Veriton.Application.Services.Ecommerce;
using Veriton.Application.Interfaces.Services.SupportTicket;
using Veriton.Application.Services.SupportTicket;
using Veriton.Application.Interfaces.Services.Event;
using Veriton.Application.Services.Event;
using Veriton.Application.Interfaces.Services.WebsiteRegistrations;
using Veriton.Application.Services.WebsiteRegistrations;
using Veriton.Application.Interfaces.Services.AI;
using Veriton.Application.Services.AI;
using Veriton.Application.Interfaces.Services.Reporting;
using Veriton.Application.Services.Reporting;
using Veriton.Application.Reporting.Providers;
using Veriton.Application.Interfaces.Services.Certificates;
using Veriton.Application.Services.Certificates;
using Veriton.Application.Interfaces.Services.ReportCards;
using Veriton.Application.Services.ReportCards;

namespace Veriton.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // School Service
        services.AddScoped<IGenericService<SchoolCreateDto, SchoolUpdateDto, SchoolDto>, GenericSchoolService>();

        // Grade Service — registered as IGradeService (specific contract used by GradesController)
        // and also aliased as IGenericService<> so any code that resolves the generic interface
        // still works. Same pattern as IStudentService / StudentService.
        services.AddScoped<IGradeService, GradeService>();
        services.AddScoped<IGenericService<GradeCreateDto, GradeUpdateDto, GradeDto>>(
            sp => sp.GetRequiredService<IGradeService>());

        // Centralized Grade Visibility / Access services — the SINGLE SOURCE OF TRUTH for
        // which grades (1st-10th) are visible to a school / the current user. Every module
        // (dropdowns, filters, search, registration, reports, APIs, security checks, ...)
        // must resolve grade visibility through these — no module implements its own
        // grade filtering logic (see IGradeAccessService / ISchoolGradeRangeService docs).
        services.AddScoped<ISchoolGradeRangeService, SchoolGradeRangeService>();
        services.AddScoped<IGradeAccessService, GradeAccessService>();

        // Teacher Service
        services.AddScoped<IGenericService<TeacherCreateDto, TeacherUpdateDto, TeacherDto>, TeacherService>();

        // Student Service
        // Register as IStudentService (the named, specific interface that the controller depends on).
        // Also expose it as IGenericService<...> so any existing code that resolves the generic
        // interface still works — both registrations point at the same instance per request.
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IGenericService<StudentCreateDto, StudentUpdateDto, StudentDto>>(
            sp => sp.GetRequiredService<IStudentService>());

        // Subject Service
        services.AddScoped<ISubjectService, SubjectService>();
        services.AddScoped<IGenericService<SubjectCreateDto, SubjectUpdateDto, SubjectDto>>(
            sp => sp.GetRequiredService<ISubjectService>());

        // Student Promotion / Transfer Service (single-student slice — see StudentPromotionRequestDto scope note)
        services.AddScoped<IStudentPromotionService, StudentPromotionService>();

        // Module (Subject) Service — registered as IModuleService (exposes GetPagedAsync)
        // and aliased as IGenericService<> so existing code that resolves the generic interface works.
        services.AddScoped<IModuleService, ModuleService>();
        services.AddScoped<IGenericService<ModuleCreateDto, ModuleUpdateDto, ModuleDto>>(
            sp => sp.GetRequiredService<IModuleService>());

        // Lesson Service
        services.AddScoped<ILessonService, LessonService>();
        services.AddScoped<IGenericService<LessonCreateDto, LessonUpdateDto, LessonDto>>(sp => sp.GetRequiredService<ILessonService>());

        // Scheduler Service
        services.AddScoped<IGenericService<SchedulerCreateDto, SchedulerUpdateDto, SchedulerDto>, SchedulerService>();

        // Exam Service
        services.AddScoped<IGenericService<ExamCreateDto, ExamUpdateDto, ExamDto>, ExamService>();

        // Question Service — registered as IQuestionService (exposes GetPagedAsync)
        // and aliased as IGenericService<> so existing code still resolves.
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IGenericService<QuestionCreateDto, QuestionUpdateDto, QuestionDto>>(
            sp => sp.GetRequiredService<IQuestionService>());

        // Dashboard Stats Service
        services.AddScoped<IDashboardService, DashboardService>();

        // Result Service
        services.AddScoped<IGenericService<ResultCreateDto, ResultUpdateDto, ResultDto>, ResultService>();

        // Attendance Service
        services.AddScoped<IAttendanceService, AttendanceService>();

        // Student Personal Note Service
        services.AddScoped<IStudentNoteService, StudentNoteService>();

        // Student Python Code Service
        services.AddScoped<IStudentPythonCodeService, StudentPythonCodeService>();

        // Student Doubt Hub Service
        services.AddScoped<IStudentDoubtService, StudentDoubtService>();

        // Parent Service
        services.AddScoped<IParentService, ParentService>();

        // Ecommerce Cart Service
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<IWishlistService, WishlistService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IProductCategoryService, ProductCategoryService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IEcommerceDashboardService, EcommerceDashboardService>();

        // Support Tickets Service
        services.AddScoped<ITicketService, TicketService>();

        // Events Service
        services.AddScoped<IEventService, EventService>();

        // Website Registrations / Leads Service
        services.AddScoped<IWebsiteRegistrationService, WebsiteRegistrationService>();

        // AI Copilot Service
        services.AddScoped<IAiService, AiService>();

        // ── Generic Reporting Framework ──────────────────────────────────────
        // Engine: ONE service for all 18 report categories (no per-category
        // services — see IReportService doc for why). IReportExportService is
        // registered in AddInfrastructure (it depends on the shared
        // IExcelExportService, an Infrastructure concern, exactly like the pilot
        // Excel Export framework). Every IReportDataProvider below is a thin,
        // independent data-access slice — adding report #19 means adding one more
        // line here, never touching ReportService.
        services.AddScoped<IReportService, ReportService>();

        services.AddScoped<IReportDataProvider, StudentEnrollmentReportProvider>();
        services.AddScoped<IReportDataProvider, StudentAttendanceReportProvider>();
        services.AddScoped<IReportDataProvider, StudentPerformanceReportProvider>();
        services.AddScoped<IReportDataProvider, ParentChildProgressReportProvider>();
        services.AddScoped<IReportDataProvider, TeacherWorkloadReportProvider>();
        services.AddScoped<IReportDataProvider, StaffDirectoryReportProvider>();
        services.AddScoped<IReportDataProvider, PrincipalSchoolOverviewReportProvider>();
        services.AddScoped<IReportDataProvider, AttendanceDailySummaryReportProvider>();
        services.AddScoped<IReportDataProvider, EnrollmentTrendReportProvider>();
        services.AddScoped<IReportDataProvider, CourseCatalogReportProvider>();
        services.AddScoped<IReportDataProvider, AssessmentResultsReportProvider>();
        services.AddScoped<IReportDataProvider, ExaminationScheduleReportProvider>();
        services.AddScoped<IReportDataProvider, CertificateEligibilityReportProvider>();
        services.AddScoped<IReportDataProvider, EventParticipationReportProvider>();
        services.AddScoped<IReportDataProvider, LearningProgressReportProvider>();
        services.AddScoped<IReportDataProvider, PerformanceLeaderboardReportProvider>();
        services.AddScoped<IReportDataProvider, FinancialOrdersReportProvider>();
        services.AddScoped<IReportDataProvider, AuditActivityLogReportProvider>();
        services.AddScoped<IReportDataProvider, UserActivityReportProvider>();
        services.AddScoped<IReportDataProvider, CustomStudentDirectoryReportProvider>();

        // ── Certificate Management Module ────────────────────────────────────
        services.AddScoped<ICertificateService, CertificateService>();

        // ── Report Card Module ───────────────────────────────────────────────
        services.AddScoped<IReportCardService, ReportCardService>();

        // ── Recycle Bin ──────────────────────────────────────────────────────
        services.AddScoped<IRecycleBinService, RecycleBinService>();

        // ── Teacher Learning Path / Schedule / Syllabus ───────────────────────
        services.AddScoped<ITeacherLearningPathService, TeacherLearningPathService>();
        services.AddScoped<ITeacherSchedulePeriodService, TeacherSchedulePeriodService>();
        services.AddScoped<IStudentCalendarService, StudentCalendarService>();

        // ── Student Weakness Analysis ─────────────────────────────────────────
        services.AddScoped<IStudentWeakTopicService, StudentWeakTopicService>();

        // ── Teacher Rating (Student Dashboard) ────────────────────────────────
        services.AddScoped<ITeacherRatingService, TeacherRatingService>();

        // ── Grade Section Management ──────────────────────────────────────────
        services.AddScoped<IGradeSectionService, GradeSectionService>();

        // ── School-Based Curriculum Assignment (Requirement 1/4/5/6/7.1/7.3) ──
        // Unit/Topic master catalog + the School assignment join-table service
        // that backs the EF Core global query filters' school-visibility checks.
        services.AddScoped<ISchoolCurriculumAssignmentService, SchoolCurriculumAssignmentService>();

        // ── Multi-School Teacher Assignment (Requirement 2/3/7.2) ─────────────
        services.AddScoped<ITeacherSchoolService, TeacherSchoolService>();

        // ── AutoMapper ───────────────────────────────────────────────────────
        services.AddAutoMapper(cfg =>
        {
            cfg.AddProfile<AuthMappingProfile>();
            cfg.AddProfile<StudentMappingProfile>();
            cfg.AddProfile<TeacherMappingProfile>();
            cfg.AddProfile<SchoolMappingProfile>();
            cfg.AddProfile<AcademicMappingProfile>();
            cfg.AddProfile<AttendanceMappingProfile>();
            cfg.AddProfile<EventMappingProfile>();
            cfg.AddProfile<SupportTicketMappingProfile>();
        });

        // ── FluentValidation Validators ──────────────────────────────────────
        // Ecommerce
        services.AddScoped<IValidator<CreateCartItemRequest>, CreateCartItemRequestValidator>();
        services.AddScoped<IValidator<UpdateCartItemQuantityRequest>, UpdateCartItemQuantityRequestValidator>();
        // Backup
        services.AddScoped<IValidator<RestoreConfirmationDto>, RestoreConfirmationDtoValidator>();
        services.AddScoped<IValidator<BackupHistoryQueryDto>, BackupHistoryQueryDtoValidator>();
        // School grade-range (FromGrade/ToGrade: 1-10, From <= To, required for activation)
        services.AddScoped<IValidator<SchoolCreateDto>, SchoolCreateDtoValidator>();
        services.AddScoped<IValidator<SchoolUpdateDto>, SchoolUpdateDtoValidator>();
        // Auth
        services.AddScoped<IValidator<LoginRequestDto>, LoginRequestValidator>();
        services.AddScoped<IValidator<RegisterRequestDto>, RegisterRequestValidator>();
        services.AddScoped<IValidator<ChangePasswordRequestDto>, ChangePasswordRequestValidator>();
        services.AddScoped<IValidator<ForgotPasswordRequestDto>, ForgotPasswordRequestValidator>();
        services.AddScoped<IValidator<ResetPasswordRequestDto>, ResetPasswordRequestValidator>();
        // Students
        services.AddScoped<IValidator<StudentCreateDto>, StudentCreateValidator>();
        services.AddScoped<IValidator<StudentUpdateDto>, StudentUpdateValidator>();
        // Subjects
        services.AddScoped<IValidator<SubjectCreateDto>, SubjectCreateValidator>();
        services.AddScoped<IValidator<SubjectUpdateDto>, SubjectUpdateValidator>();
        // Teachers
        services.AddScoped<IValidator<TeacherCreateDto>, TeacherCreateValidator>();
        services.AddScoped<IValidator<TeacherUpdateDto>, TeacherUpdateValidator>();
        // Grades
        services.AddScoped<IValidator<GradeCreateDto>, GradeCreateValidator>();
        services.AddScoped<IValidator<GradeUpdateDto>, GradeUpdateValidator>();
        // Academic
        services.AddScoped<IValidator<ModuleCreateDto>, ModuleCreateValidator>();
        services.AddScoped<IValidator<ModuleUpdateDto>, ModuleUpdateValidator>();
        services.AddScoped<IValidator<ExamCreateDto>, ExamCreateValidator>();
        services.AddScoped<IValidator<ExamUpdateDto>, ExamUpdateValidator>();
        // Attendance
        services.AddScoped<IValidator<AttendanceDto>, AttendanceDtoValidator>();
        services.AddScoped<IValidator<List<AttendanceDto>>, BulkAttendanceValidator>();
        // Events
        services.AddScoped<IValidator<CreateEventDto>, CreateEventValidator>();
        services.AddScoped<IValidator<SubmitRegistrationDto>, SubmitRegistrationValidator>();
        // Support Tickets
        services.AddScoped<IValidator<CreateTicketDto>, CreateTicketValidator>();
        services.AddScoped<IValidator<CreateCommentDto>, CreateCommentDtoValidator>();
        services.AddScoped<IValidator<CreateCategoryDto>, CreateCategoryValidator>();


        return services;
    }
}
