using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using NubeEra.Infrastructure.Persistence.DbContext;

namespace NubeEra.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MySql");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "MySQL connection string 'ConnectionStrings:MySql' is missing."
                );
            }

            // Safe auto detection that works even if the target database doesn't exist yet:
            ServerVersion serverVersion;
            try
            {
                var connBuilder = new MySqlConnector.MySqlConnectionStringBuilder(connectionString);
                connBuilder.Database = ""; // Clear database to avoid "Unknown database" error during detection
                serverVersion = ServerVersion.AutoDetect(connBuilder.ConnectionString);
            }
            catch (Exception)
            {
                // Fallback to MySQL 8.0/8.3 if connection/detection fails
                serverVersion = new MySqlServerVersion(new Version(8, 0, 36));
            }

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseMySql(
                    connectionString,
                    serverVersion,
                    mysqlOptions =>
                    {
                        mysqlOptions.MigrationsHistoryTable("__efmigrationshistory");
                        mysqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 10,
                            maxRetryDelay: TimeSpan.FromSeconds(30),
                            errorNumbersToAdd: null
                        );
                        // Raise command timeout to 120 s so paginated COUNT(*) queries
                        // on large tables don't time out before the indexes are in place
                        // (or if an index scan is still slow on first warm-up).
                        // Default is 30 s which is too short for million-row tables.
                        mysqlOptions.CommandTimeout(120);
                    }
                );

                // AppDbContext.OnModelCreating builds its global query filters
                // (school/grade/student/teacher scoping, including the Curriculum
                // Assignment gating for Module/Lesson) from the CURRENT request's
                // identity. EF Core only calls OnModelCreating once per DbContext
                // type by default and caches the result, so without this, those
                // filters would freeze using whichever request happened to build
                // the model first. See TenantModelCacheKeyFactory for details.
                options.ReplaceService<IModelCacheKeyFactory, TenantModelCacheKeyFactory>();
            });

            services.AddScoped(
                typeof(NubeEra.Application.Interfaces.Repositories.IGenericRepository<>),
                typeof(NubeEra.Infrastructure.Repositories.GenericRepository<>)
            );

            // Explicit transaction boundary for multi-step writes that span more than
            // one repository call (e.g. School + its Principal User). See IUnitOfWork
            // for the "half entries" bug this closes.
            services.AddScoped<
                NubeEra.Application.Interfaces.IUnitOfWork,
                NubeEra.Infrastructure.Persistence.UnitOfWork>
            ();

            // Paged repository — exposes GetPagedAsync for list endpoints that need
            // server-side pagination instead of loading every row.
            services.AddScoped(
                typeof(NubeEra.Application.Interfaces.Repositories.IPagedRepository<>),
                typeof(NubeEra.Infrastructure.Repositories.PagedRepository<>)
            );

            services.AddScoped<
                NubeEra.Application.Interfaces.Repositories.IUserRepository,
                NubeEra.Infrastructure.Repositories.UserRepository>
            ();

            services.AddScoped<
                NubeEra.Application.Interfaces.Security.IJwtTokenService,
                NubeEra.Infrastructure.Security.JwtTokenService>
            ();

            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Media.IUploadService,
                NubeEra.Infrastructure.Services.Media.UploadService>
            ();

            // Out-of-band delivery channels — closes QA-documented gap "Email/SMS
            // delivery channel for critical notifications". SmtpEmailService degrades
            // to console simulation when "Smtp:Host" isn't configured, so this is safe
            // to register unconditionally. ConsoleSmsService is an explicit logging
            // stub pending a real provider integration (see its XML doc comments for
            // the swap-in instructions) — no SMS provider account exists in this
            // engagement, so a stub is registered to define the seam without faking
            // a real integration.
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Email.IEmailService,
                NubeEra.Infrastructure.Services.Email.SmtpEmailService>
            ();

            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Sms.ISmsService,
                NubeEra.Infrastructure.Services.Sms.ConsoleSmsService>
            ();

            // Generic Excel Export framework — single ClosedXML-backed workbook
            // generator shared by every module's "export" action (Students,
            // Teachers, …, and any future Reporting framework). See
            // IExcelExportService for the "no duplicate export engines" contract.
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Export.IExcelExportService,
                NubeEra.Infrastructure.Services.Export.ExcelExportService>
            ();

            // Generic Reporting export pipeline — thin orchestrator over the SAME
            // IExcelExportService above (plus a CSV writer for the one genuinely
            // new format). Lives in Infrastructure because it depends on that
            // Infrastructure-level engine, exactly mirroring why IExcelExportService
            // itself is registered here rather than in AddApplication.
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Reporting.IReportExportService,
                NubeEra.Infrastructure.Services.Reporting.ReportExportService>
            ();

            services.AddScoped<
                NubeEra.Application.Interfaces.Services.IBulkImportService,
                NubeEra.Infrastructure.Services.BulkImportService>
            ();

            // Database Backup & Restore module ("Dump File Mechanism") — wraps
            // mysqldump/mysql CLI tools. Lives in Infrastructure (process execution
            // + file system + connection-string parsing are Infrastructure concerns),
            // exposed to the API/Application layers via IBackupService, exactly
            // mirroring IUploadService / IExcelExportService.
            services.AddHttpContextAccessor();
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Backup.IBackupService,
                NubeEra.Infrastructure.Services.Backup.BackupService>
            ();

            // Certificate PDF Service — QuestPDF + QRCoder (Infrastructure concern:
            // file I/O for logo, native PDF rendering library, QR bitmap generation)
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.Certificates.ICertificatePdfService,
                NubeEra.Infrastructure.Services.Certificates.CertificatePdfService>
            ();

            // Report Card PDF Service — QuestPDF + QRCoder
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.ReportCards.IReportCardPdfService,
                NubeEra.Infrastructure.Services.ReportCards.ReportCardPdfService>
            ();

            // Analytics Service — real EF Core aggregation per role
            // (Infrastructure concern: direct AppDbContext access for complex GroupBy queries)
            services.AddScoped<
                NubeEra.Application.Interfaces.Services.IAnalyticsService,
                NubeEra.Infrastructure.Services.Analytics.AnalyticsService>
            ();

            return services;
        }
    }
}
