using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using System.Text.Json;
using NubeEra.Application;
using NubeEra.API.Extensions;
using NubeEra.Infrastructure;
using NubeEra.Infrastructure.Logging;
using NubeEra.Infrastructure.Security;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Application.Common;
using NubeEra.API.Middleware;

// ── Bootstrap ────────────────────────────────────────────────────────────────

var builder = WebApplication.CreateBuilder(args);

// Structured logging (replaces default .NET logging)
builder.AddSerilogLogging();

// ── Services ─────────────────────────────────────────────────────────────────

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddHealthChecks();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<ITenantService, TenantService>();

builder.Services.AddControllers(options =>
    {
        options.Filters.Add<NubeEra.API.Filters.ApiResponseFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

// Increase upload limits for large Base64 / multipart payloads
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = int.MaxValue);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.ValueLengthLimit       = int.MaxValue;
    o.MultipartBodyLengthLimit = int.MaxValue;
    o.MemoryBufferThreshold  = int.MaxValue;
});

builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorizationPolicies();
builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddSwaggerWithJwt();

// ── Build ─────────────────────────────────────────────────────────────────────

var app = builder.Build();

// ── Database initialisation ───────────────────────────────────────────────────

await app.InitialiseDatabaseAsync();

// ── Middleware pipeline ───────────────────────────────────────────────────────

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseSerilogRequestLogging();     // Single-line structured request logs
// Configure CORS and OPTIONS preflight early to handle requests (and exception responses) correctly
var allowedOrigins = builder.Configuration["ALLOWED_ORIGINS"]
    ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? new[]
    {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://192.168.1.12:5173",
        "http://192.168.1.12:5174",
        "https://lxp.nubeera.tech"
    };

app.UseCors(CorsExtensions.PolicyName);

app.Use(async (context, next) =>
{
    if (HttpMethods.IsOptions(context.Request.Method))
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin) &&
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            context.Response.Headers["Access-Control-Allow-Origin"]      = origin;
            context.Response.Headers["Vary"]                             = "Origin";
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Response.Headers["Access-Control-Allow-Methods"]     = "GET,POST,PUT,DELETE,OPTIONS";
            context.Response.Headers["Access-Control-Allow-Headers"]     = "Authorization,Content-Type,X-Requested-With,X-School-Id";
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return;
        }
    }
    await next();
});

app.UseNubeEraMiddleware();         // Global exception handler
app.UseMiddleware<TenantMiddleware>(); // Reads X-School-Id header → TenantContext

app.MapSwagger().AllowAnonymous();
app.UseSwaggerUI();

app.UseRouting();

// Serve uploaded files from wwwroot/uploads with CORS headers
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider   = new PhysicalFileProvider(uploadsPath),
    RequestPath    = "/uploads",
    ServeUnknownFileTypes = true,
    DefaultContentType    = "application/octet-stream",
    OnPrepareResponse = ctx =>
    {
        var origin = ctx.Context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin) &&
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Access-Control-Allow-Origin"]      = origin;
            ctx.Context.Response.Headers["Vary"]                             = "Origin";
            ctx.Context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
        }
        ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=31536000";
    }
});

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TeacherSchoolAccessMiddleware>(); // Validates Teacher's X-School-Id against TeacherSchools

app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run("http://0.0.0.0:5001");
