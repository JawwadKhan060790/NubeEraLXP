using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;

using Serilog.Events;
using Serilog.Events;
namespace NubeEra.Infrastructure.Logging;

/// <summary>
/// Extension methods that wire Serilog into the host and the HTTP pipeline.
/// Call <see cref="AddSerilogLogging"/> on <see cref="WebApplicationBuilder"/>
/// before <c>builder.Build()</c>, then call <see cref="UseSerilogRequestLogging"/>
/// on the built <see cref="WebApplication"/>.
/// </summary>
public static class SerilogExtensions
{
    /// <summary>
    /// Replaces the default .NET logging with Serilog and configures sinks
    /// (console + rolling file).  Settings can be overridden via <c>appsettings.json</c>
    /// under the <c>Serilog</c> section.
    /// </summary>
    public static WebApplicationBuilder AddSerilogLogging(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)   // Honour appsettings.json overrides
            .Enrich.FromLogContext()
            .Enrich.WithEnvironmentName()
            .Enrich.WithThreadId()
            // ── Fallback defaults (overridden by appsettings if present) ──────
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .MinimumLevel.Override("System", LogEventLevel.Warning)
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: "logs/veriton-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
            .CreateLogger();

        builder.Host.UseSerilog();
        return builder;
    }

    /// <summary>
    /// Adds Serilog's built-in HTTP request logging middleware (replaces the
    /// verbose Microsoft request/response logs with a single structured summary line).
    /// </summary>
    public static WebApplication UseSerilogRequestLogging(this WebApplication app)
    {
        // Invoke Serilog's request logging middleware defined for IApplicationBuilder.
        ((Microsoft.AspNetCore.Builder.IApplicationBuilder)app).UseSerilogRequestLogging();
        return app;
    }
}
